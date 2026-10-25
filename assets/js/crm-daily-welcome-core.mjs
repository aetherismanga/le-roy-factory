/** Daily welcome: local calendar dates, authenticated identity, no remote writes. */
export const DAILY_MESSAGES = Object.freeze([
  "Une belle journée pour faire avancer vos projets !",
  "Chaque rencontre est une nouvelle opportunité.",
  "Aujourd’hui, de belles choses peuvent commencer.",
  "Un appel, une visite, une opportunité !",
  "Votre énergie fait la différence sur le terrain.",
  "Une nouvelle journée pour développer de belles relations.",
  "Les plus belles réussites commencent souvent par une rencontre.",
  "De nouveaux projets vous attendent aujourd’hui !",
  "Une bonne organisation, c’est déjà une longueur d’avance.",
  "Chaque client mérite une attention particulière.",
  "Un suivi attentionné fait grandir la confiance.",
  "Prenez le temps d’écouter : les bonnes idées commencent là.",
  "Une visite bien préparée ouvre de nouvelles portes.",
  "Aujourd’hui, une petite avancée peut faire une grande différence.",
  "Vos conseils donnent vie aux projets de vos clients.",
  "Un contact entretenu, c’est une relation qui grandit.",
  "Gardez le cap, un rendez-vous à la fois.",
  "La confiance se construit aussi dans les petits détails.",
  "Un bon échange peut lancer un beau projet.",
  "Faites découvrir le produit qui répond au bon besoin.",
  "Votre connaissance du terrain est un bel atout.",
  "Un compte-rendu clair prépare la prochaine bonne visite.",
  "Une relance au bon moment peut tout débloquer.",
  "De belles collaborations se préparent aujourd’hui.",
  "Une tournée bien pensée laisse plus de place aux rencontres.",
  "Chaque retour client aide à mieux conseiller.",
  "Votre régularité construit des relations solides.",
  "Un peu de préparation, beaucoup de possibilités.",
  "Aujourd’hui, prenez plaisir à partager votre savoir-faire.",
  "Un besoin bien compris, c’est un projet bien lancé.",
  "Les échanges simples font souvent avancer les choses.",
  "Votre disponibilité compte pour vos partenaires.",
  "Une idée utile peut devenir une belle commande.",
  "Commencez par l’essentiel, la journée prendra forme.",
  "Un dossier à jour, c’est du temps gagné pour le terrain.",
  "Vos clients apprécient les engagements tenus.",
  "Faites une place aux nouvelles rencontres.",
  "La prochaine visite réserve peut-être une bonne surprise.",
  "Un conseil précis inspire confiance.",
  "De beaux projets naissent d’une écoute attentive.",
  "Votre expérience aide vos clients à choisir sereinement.",
  "Une action concrète vaut déjà une belle avancée.",
  "Prenez un instant pour préparer votre prochain échange.",
  "Les bonnes relations se cultivent au fil des visites.",
  "Un merci sincère entretient les liens.",
  "Une nouveauté à présenter, une conversation à ouvrir.",
  "Chaque étape accomplie rapproche du prochain projet.",
  "Vos idées peuvent donner un nouvel élan à un showroom.",
  "Un suivi simple et régulier fait la différence.",
  "Aujourd’hui, misez sur la qualité des échanges.",
  "Un partenaire bien accompagné avance avec confiance.",
  "Les bonnes questions révèlent les vrais besoins.",
  "La curiosité aide à trouver la bonne solution.",
  "Votre prochain appel peut ouvrir une piste intéressante.",
  "Un planning clair permet de mieux profiter du terrain.",
  "Partagez une idée, elle fera peut-être son chemin.",
  "Une journée utile commence par une priorité bien choisie.",
  "Vos petites attentions renforcent les grandes relations.",
  "Un projet qui avance, c’est une équipe qui se réjouit.",
  "Aujourd’hui, donnez une suite aux bonnes conversations.",
  "Le terrain a toujours quelque chose à vous apprendre.",
  "Une présentation soignée met vos collections en valeur.",
  "Chaque échange est l’occasion de mieux connaître un client.",
  "Le bon produit commence par le bon conseil.",
  "Une information partagée au bon moment rend service.",
  "Avancez à votre rythme, avec des objectifs clairs.",
  "Un projet en attente mérite parfois un simple appel.",
  "Votre implication se voit dans la qualité du suivi.",
  "Aujourd’hui, faites place aux solutions concrètes.",
  "Une belle relation commerciale se construit ensemble."
]);

const pad = value => String(value).padStart(2, '0');
export function localDateKey(date = new Date()) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new TypeError('Date locale invalide.');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** UTC is used only to count local calendar days, never to choose today's date. */
export function dailyMessage(date = new Date()) {
  localDateKey(date);
  const ordinal = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return DAILY_MESSAGES[((ordinal % DAILY_MESSAGES.length) + DAILY_MESSAGES.length) % DAILY_MESSAGES.length];
}

export function authenticatedFirstName(profile) {
  if (!profile || typeof profile.uid !== 'string' || !profile.uid.trim()) return '';
  const name = [profile.firstName, profile.name, profile.displayName]
    .find(value => typeof value === 'string' && value.trim());
  if (!name) return '';
  const first = name.trim().replace(/\s+/g, ' ').split(' ')[0];
  // Never show an email address or an unexpected identifier as a first name.
  return /^[\p{L}\p{M}’'\-]{1,40}$/u.test(first) ? first : '';
}

export function welcomeStorageKey(uid) {
  if (typeof uid !== 'string' || !uid.trim()) return null;
  return `lrf:crm:daily-welcome:v2:${encodeURIComponent(uid)}`;
}

/**
 * Store only UID-scoped last-display dates. If storage is unavailable, memory
 * prevents repeat greetings during this page lifetime; persistence cannot be
 * guaranteed across full reloads in a browser that denies persistent storage.
 */
export function createWelcomeTracker(storage, memory = new Map()) {
  function claim(profile, date = new Date()) {
    const key = welcomeStorageKey(profile?.uid);
    if (!key) return { show: false, persisted: false };
    const today = localDateKey(date);
    let stored;
    try { stored = storage?.getItem(key); } catch (_) { /* private/blocked storage */ }
    if (stored === today || memory.get(key) === today) return { show: false, date: today, key, persisted: stored === today };
    memory.set(key, today);
    let persisted = false;
    try {
      storage?.setItem(key, today);
      persisted = storage?.getItem(key) === today;
    } catch (_) { /* memory remains valid for this document */ }
    return { show: true, date: today, key, persisted };
  }
  return { claim };
}

export function millisecondsUntilNextLocalDay(date = new Date()) {
  localDateKey(date);
  return Math.max(1, new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime() - date.getTime());
}
