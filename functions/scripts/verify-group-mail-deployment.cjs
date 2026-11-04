'use strict';

// Read the active deployed source without changing a function, schedule or mail.
const { GoogleAuth } = require('google-auth-library');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

async function verify() {
  if (process.env.GOOGLE_CLOUD_PROJECT !== 'le-roy-factory') throw new Error('Unexpected Firebase project.');
  const client = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] }).getClient();
  const allowed = ['sendGroupEmail', 'scheduleGroupEmail', 'processScheduledEmails'];
  const names = process.env.MAIL_VERIFY_FUNCTIONS ? process.env.MAIL_VERIFY_FUNCTIONS.split(',').map(value=>value.trim()).filter(Boolean) : allowed;
  if (!names.length || names.some(name=>!allowed.includes(name))) throw new Error('Unexpected mail verification target.');
  const expected = ['index.js', 'group-mail-history.js'].map(name => ({
    name, hash: sha256(fs.readFileSync(path.join(__dirname, '..', name)))
  }));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-group-mail-'));
  try {
    for (const name of names) {
      const { data: fn } = await client.request({ url: `https://cloudfunctions.googleapis.com/v2/projects/le-roy-factory/locations/us-central1/functions/${name}` });
      if (fn.state !== 'ACTIVE' || new Date(fn.updateTime) < new Date('2026-11-02T07:00:00Z')) {
        throw new Error(`The requested mail release is not active: ${name}`);
      }
      const source = fn.buildConfig?.source?.storageSource;
      if (!source?.bucket || !source?.object) throw new Error(`No deployed source found: ${name}`);
      const url = new URL(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(source.bucket)}/o/${encodeURIComponent(source.object)}`);
      url.searchParams.set('alt', 'media');
      if (source.generation) url.searchParams.set('generation', source.generation);
      const { data: archive } = await client.request({ url: url.toString(), responseType: 'arraybuffer' });
      const filename = path.join(directory, `${name}.zip`);
      fs.writeFileSync(filename, Buffer.from(archive), { mode: 0o600 });
      for (const file of expected) {
        const deployed = execFileSync('unzip', ['-p', filename, file.name], { maxBuffer: 1024 * 1024 });
        if (sha256(deployed) !== file.hash) throw new Error(`Deployed mail source does not match the reviewed release: ${name}`);
      }
      console.log(JSON.stringify({ function: name, state: fn.state, revision: fn.serviceConfig?.revision, sourceVerified: true }));
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

verify().catch(error => { console.error(error.message); process.exitCode = 1; });
