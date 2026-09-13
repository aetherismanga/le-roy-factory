const fs = require('fs');

const DEFAULT = {
  enabled: true,
  runs: 1,
  devices: ['desktop-chrome', 'iphone-webkit', 'android-chrome'],
  scope: 'all',
  intensity: 'normal',
  schedule: { enabled: true, cadence: 'daily', time: '07:00', weekday: 1 }
};

function clamp(value, min, max, fallback) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function normalize(raw = {}) {
  const c = raw.config || raw || {};
  const allowedDevices = new Set(DEFAULT.devices);
  const allowedScopes = new Set(['all', 'navigation', 'accueil', 'selections', 'elios', 'configurateurs', 'catalogues', 'contact']);
  const allowedIntensities = new Set(['quick', 'normal', 'full']);
  const allowedCadences = new Set(['hourly', '6h', '12h', 'daily', 'weekdays', 'weekly']);
  const devices = Array.isArray(c.devices) ? c.devices.filter((d) => allowedDevices.has(d)) : [];
  const s = c.schedule && typeof c.schedule === 'object' ? c.schedule : {};
  return {
    enabled: c.enabled !== false,
    runs: clamp(c.runs, 1, 20, 1),
    devices: devices.length ? [...new Set(devices)] : [...DEFAULT.devices],
    scope: allowedScopes.has(c.scope) ? c.scope : 'all',
    intensity: allowedIntensities.has(c.intensity) ? c.intensity : 'normal',
    schedule: {
      enabled: s.enabled !== false,
      cadence: allowedCadences.has(s.cadence) ? s.cadence : 'daily',
      time: /^\d{2}:\d{2}$/.test(String(s.time || '')) ? String(s.time) : '07:00',
      weekday: clamp(s.weekday, 1, 7, 1)
    }
  };
}

function parisParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  const year = Number(parts.year), month = Number(parts.month), day = Number(parts.day);
  const hour = Number(parts.hour), minute = Number(parts.minute);
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  const jsWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return {
    year, month, day, hour, minute,
    dayNumber,
    weekday: jsWeekday === 0 ? 7 : jsWeekday,
    dateKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    absoluteMinute: dayNumber * 1440 + hour * 60 + minute
  };
}

function targetMinutes(time) {
  const [h, m] = String(time || '07:00').split(':').map(Number);
  return Math.min(23, Math.max(0, h || 0)) * 60 + Math.min(59, Math.max(0, m || 0));
}

function scheduledDecision(config, now = new Date()) {
  if (!config.enabled || !config.schedule.enabled) return { due: false, key: '' };
  const p = parisParts(now);
  const target = targetMinutes(config.schedule.time);
  const tolerance = 34;
  const cadence = config.schedule.cadence;

  if (cadence === 'hourly' || cadence === '6h' || cadence === '12h') {
    const period = cadence === 'hourly' ? 60 : cadence === '6h' ? 360 : 720;
    const slotIndex = Math.floor((p.absoluteMinute - target) / period);
    const slotMinute = slotIndex * period + target;
    const lag = p.absoluteMinute - slotMinute;
    return { due: lag >= 0 && lag <= tolerance, key: `scheduled-${cadence}-${slotIndex}` };
  }

  const todayTarget = p.dayNumber * 1440 + target;
  const lag = p.absoluteMinute - todayTarget;
  if (lag < 0 || lag > tolerance) return { due: false, key: '' };
  if (cadence === 'weekdays' && p.weekday > 5) return { due: false, key: '' };
  if (cadence === 'weekly' && p.weekday !== config.schedule.weekday) return { due: false, key: '' };
  return { due: true, key: `scheduled-${cadence}-${p.dateKey}` };
}

function setOutput(name, value) {
  const line = `${name}=${String(value).replace(/\r?\n/g, ' ')}`;
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`);
  else console.log(line);
}

function loadControl() {
  try {
    const path = process.env.CONTROL_FILE || 'control.json';
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (_) {
    return null;
  }
}

const eventName = process.env.EVENT_NAME || 'schedule';
let config = { ...DEFAULT, schedule: { ...DEFAULT.schedule } };
let shouldRun = false;
let runKey = '';
let source = eventName;

if (eventName === 'push') {
  shouldRun = true;
  runKey = `push-${process.env.GITHUB_SHA || Date.now()}`;
} else if (eventName === 'workflow_dispatch') {
  config = normalize({
    enabled: true,
    runs: process.env.INPUT_RUNS || 1,
    devices: (process.env.INPUT_DEVICES || DEFAULT.devices.join(',')).split(',').map((s) => s.trim()).filter(Boolean),
    scope: process.env.INPUT_SCOPE || 'all',
    intensity: process.env.INPUT_INTENSITY || 'normal',
    schedule: DEFAULT.schedule
  });
  shouldRun = true;
  runKey = `github-manual-${process.env.GITHUB_RUN_ID || Date.now()}`;
} else {
  const payload = loadControl();
  if (payload) {
    config = normalize(payload);
    const manual = payload.manualRequest || null;
    const requestedAt = manual?.requestedAt ? new Date(manual.requestedAt).getTime() : 0;
    const age = Date.now() - requestedAt;
    if (manual?.id && Number.isFinite(requestedAt) && age >= -120000 && age <= 60 * 60 * 1000) {
      shouldRun = true;
      source = 'dashboard-manual';
      runKey = `manual-${String(manual.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)}`;
    } else {
      const scheduled = scheduledDecision(config);
      shouldRun = scheduled.due;
      runKey = scheduled.key;
      source = 'dashboard-schedule';
    }
  }
}

setOutput('should_run', shouldRun ? 'true' : 'false');
setOutput('run_key', runKey || `noop-${Date.now()}`);
setOutput('source', source);
setOutput('runs', config.runs);
setOutput('devices', config.devices.join(','));
setOutput('scope', config.scope);
setOutput('intensity', config.intensity);
setOutput('enabled', config.enabled ? 'true' : 'false');
