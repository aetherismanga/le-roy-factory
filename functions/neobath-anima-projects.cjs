'use strict';
const {readFileSync} = require('node:fs');
const {join} = require('node:path');

const COLLECTION = 'neobath_anima_projects';
const AGENTS = new Set(['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr']);
const failure = (message, status = 400) => Object.assign(new Error(message), {status});
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
function text(value, max = 160) {
  if (typeof value !== 'string' || value.length > max) throw failure('Texte de projet invalide.');
  return value.trim();
}
function number(value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw failure('Dimensions ou position du projet invalides.');
  return value;
}
function projectId(value) {
  if (typeof value !== 'string' || !/^anima-[a-zA-Z0-9-]{6,80}$/.test(value)) throw failure('Identifiant de projet invalide.');
  return value;
}
function revision(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw failure('Version du projet invalide.');
  return value;
}
function normalizeProject(input, catalogue) {
  if (!plain(input) || input.schema !== 'neobath-anima-project' || input.version !== 1) throw failure('Format de projet Anima non reconnu.');
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > 600000) throw failure('Ce projet est trop volumineux.');
  if (!Array.isArray(input.items) || input.items.length > 60) throw failure('Un projet peut contenir au maximum 60 éléments.');
  const products = new Map(catalogue.products.map(p => [p.id, p]));
  const finishes = new Set(catalogue.finishes.map(p => p.id));
  const reference = (value, optional = false, category) => {
    if (optional && (value === '' || value == null)) return '';
    if (typeof value !== 'string' || !products.has(value) || (category && products.get(value).category !== category)) throw failure('Un article du projet ne figure pas dans la bonne famille du catalogue Anima.');
    return value;
  };
  const variant = (id, value) => {
    const prices = products.get(id)?.prices;
    const key = text(value || prices?.[0]?.key || 'standard', 60);
    if (id && prices?.length && !prices.some(p => p.key === key)) throw failure('Une finition tarifaire du projet ne figure pas au catalogue Anima.');
    return key;
  };
  const keys = new Set();
  const items = input.items.map(item => {
    if (!plain(item)) throw failure('Élément du projet invalide.');
    const key = text(item.key, 100);
    if (!/^[a-zA-Z0-9-]{6,100}$/.test(key) || keys.has(key)) throw failure('Identifiant d’élément invalide ou en double.');
    keys.add(key);
    if (!finishes.has(item.finishId)) throw failure('Finition Anima non reconnue.');
    if (!['left', 'right'].includes(item.hinge) || !['black', 'chrome'].includes(item.handle)) throw failure('Option d’ouverture invalide.');
    return {key, productId: reference(item.productId, false, 'module'), finishId: item.finishId,
      priceKey: variant(item.productId, item.priceKey), handle: item.handle, hinge: item.hinge,
      x: number(item.x, -2000, 2000), bottom: number(item.bottom, 0, 600), z: number(item.z, -2000, 2000),
      topId: reference(item.topId, true, 'worktop'), topPriceKey: variant(item.topId, item.topPriceKey),
      topWidth: item.topWidth == null ? null : number(item.topWidth, 10, 600), topOffset: number(item.topOffset ?? 0, -600, 600), grass: item.grass === true,
      ncsCode: text(item.ncsCode || '', 40).toUpperCase(),
      basinId: reference(item.basinId, true, 'basin'), basinPriceKey: variant(item.basinId, item.basinPriceKey),
      mirrorId: reference(item.mirrorId, true, 'mirror'), mirrorPriceKey: variant(item.mirrorId, item.mirrorPriceKey),
      lightId: reference(item.lightId, true, 'lighting'), lightPriceKey: variant(item.lightId, item.lightPriceKey),
      accessoryId: reference(item.accessoryId, true, 'accessory'), accessoryPriceKey: variant(item.accessoryId, item.accessoryPriceKey)};
  });
  const room = input.room;
  if (!plain(room) || !/^#[0-9a-f]{6}$/i.test(room.wall) || !/^#[0-9a-f]{6}$/i.test(room.floor)) throw failure('Paramètres de pièce invalides.');
  if (!['studio', 'room'].includes(input.view) || !['normal', 'minimum'].includes(input.quality)) throw failure('Mode de visualisation invalide.');
  return {schema: 'neobath-anima-project', version: 1, id: projectId(input.id), revision: revision(input.revision),
    title: text(input.title, 160) || 'Ma composition Anima', items,
    room: {width: number(room.width, 60, 2000), depth: number(room.depth, 60, 2000), height: number(room.height, 100, 600), wall: room.wall, floor: room.floor},
    view: input.view, quality: input.quality};
}

function createNeobathProjectStore({db, loadCatalogue = () => JSON.parse(readFileSync(join(__dirname, 'neobath-anima/catalogue.json'), 'utf8'))}) {
  const collection = db.collection(COLLECTION);
  let studio;
  const studioStore = () => studio ||= require('./neobath-anima-studio-projects.cjs').createNeobathStudioProjectStore({db});
  function agentAccount(agent) {
    if (!agent?.uid || !AGENTS.has(agent.email)) throw failure('Accès agent requis.', 403);
  }
  const legacy = {
    async ['projects-list'](_body, agent) {
      agentAccount(agent);
      const snapshot = await collection.orderBy('updatedAt', 'desc').limit(200).get();
      return {success: true, projects: snapshot.docs.map(d => d.data()).filter(p => !p.deleted)};
    },
    async ['projects-save'](body, agent) {
      agentAccount(agent);
      const project = normalizeProject(body.project, loadCatalogue());
      const ref = collection.doc(project.id);
      const saved = await db.runTransaction(async tx => {
        const snap = await tx.get(ref), old = snap.exists ? snap.data() : null;
        if (old?.deleted) throw failure('Ce projet a été supprimé. Dupliquez-le pour créer une nouvelle copie.', 410);
        if (project.revision !== (old?.revision || 0)) throw failure('Ce projet a été modifié sur un autre appareil. Rechargez sa version en ligne avant de le modifier.', 409);
        const now = new Date().toISOString();
        const record = {...project, revision: (old?.revision || 0) + 1, createdAt: old?.createdAt || now,
          updatedAt: now, createdBy: old?.createdBy || agent.email, updatedBy: agent.email};
        tx.set(ref, record);
        return record;
      });
      return {success: true, project: saved};
    },
    async ['projects-delete'](body, agent) {
      agentAccount(agent);
      const id = projectId(body.id), expected = revision(body.revision);
      const ref = collection.doc(id);
      await db.runTransaction(async tx => {
        const snap = await tx.get(ref), old = snap.exists ? snap.data() : null;
        if (old?.deleted) return;
        if (expected !== (old?.revision || 0)) throw failure('Ce projet a été modifié sur un autre appareil. Actualisez la liste avant de le supprimer.', 409);
        tx.set(ref, {id, deleted: true, revision: expected + 1, updatedAt: new Date().toISOString(), updatedBy: agent.email});
      });
      return {success: true, id};
    }
  };
  return Object.fromEntries(['projects-list','projects-save','projects-delete','projects-email','projects-order'].map(action => [action, async (body, agent) => {
    if (body?.profile === 'studio-one') return studioStore()[action](body, agent);
    if (!legacy[action]) throw failure('Action de projet incompatible.', 400);
    return legacy[action](body, agent);
  }]));
}

module.exports = {createNeobathProjectStore, normalizeProject};
