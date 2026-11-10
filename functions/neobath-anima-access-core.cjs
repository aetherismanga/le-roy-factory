'use strict';

const AGENTS = new Set(['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr']);
const ORIGINS = new Set(['https://leroyfactory.fr', 'https://www.leroyfactory.fr']);
const {createHash} = require('node:crypto');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {gunzipSync} = require('node:zlib');

function readStudioAsset(directory, name) {
  try {return readFileSync(join(directory, name), 'utf8');}
  catch (error) {
    if (error.code !== 'ENOENT' || !name.endsWith('.js')) throw error;
    return gunzipSync(readFileSync(join(directory, name + '.gz'))).toString('utf8');
  }
}

const PROJECT_ACTIONS = new Set(['projects-list', 'projects-save', 'projects-delete', 'projects-email', 'projects-order']);

function createStudioApplicationLoader({readAsset}) {
  let applications;
  return view => {
    if (!applications) {
      const release = JSON.parse(readAsset('release.json'));
      const assets = {};
      for (const file of ['accueil.html','accueil.css','accueil.js','atelier.html','atelier.css','app.js','catalogue.json','visuals.json']) {
        assets[file] = readAsset(file);
        if (createHash('sha256').update(assets[file]).digest('hex') !== release.assets[file]) throw Error('Private release integrity mismatch');
      }
      for (const html of ['accueil.html','atelier.html']) if (/<script\b/i.test(assets[html])) throw Error('Private HTML must not load another application');
      const shared = {catalogue: JSON.parse(assets['catalogue.json']), visuals: JSON.parse(assets['visuals.json'])};
      applications = Object.fromEntries([['home', 'accueil.html','accueil.css','accueil.js'], ['atelier','atelier.html','atelier.css','app.js']].map(([key, html, css, module]) => [key, {
        ...shared,
        release: {id: release.id, appSha256: release.assets[module], source: 'studio-one'},
        html: assets[html], css: assets[css], module: assets[module]
      }]));
    }
    return applications[view];
  };
}

function createNeobathAnimaHandler({getAgent, getClient=async()=>null, quoteClient, publicCatalogue, loadApplication, projectStore, releaseId}) {
  return async (req, res) => {
    const origin = String(req.headers?.origin || '');
    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Vary', 'Origin, Authorization');
    if (releaseId) res.set('X-LRF-Anima-Version', releaseId);
    if (origin && !ORIGINS.has(origin)) return res.status(403).json({success: false, error: 'Origine non autorisée.'});
    if (origin) res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({success: false, error: 'Méthode non autorisée.'});
    try {
      // getAgent verifies the Firebase token with revocation checking. Neither
      // PRO sessions nor client-supplied roles/email addresses grant access.
      const action = req.body?.action || 'application';
      if(action === 'catalogue' && publicCatalogue)return res.json({success:true,...await publicCatalogue()});
      const agent = await getAgent(req);
      const client = agent ? null : await getClient(req);
      if (!agent && !client) return res.status(401).json({success: false, error: 'Connectez-vous à votre espace agent.'});
      if (agent && !AGENTS.has(agent.email)) return res.status(403).json({success: false, error: 'Atelier réservé à Jérôme et Coryne.'});
      if (Buffer.byteLength(JSON.stringify(req.body || {}), 'utf8') > 1048576) return res.status(413).json({success: false, error: 'Le projet dépasse la taille autorisée.'});
      if (action === 'quote' && client && quoteClient)return res.json({success:true,...await quoteClient(req.body,client)});
      if (action === 'authorize') return res.json({success: true});
      if (PROJECT_ACTIONS.has(action)) {
        if(!agent)return res.status(403).json({success:false,error:'Les projets de l’équipe sont réservés aux agents. Votre projet reste sur cet appareil.'});
        if (!projectStore || typeof projectStore[action] !== 'function') throw Error('Project store unavailable');
        try {
          return res.json(await projectStore[action](req.body, agent));
        } catch (error) {
          const code = Number(error?.status);
          if ([400, 404, 409, 410, 413, 429].includes(code)) return res.status(code).json({success: false, error: error.message});
          throw error;
        }
      }
      if (action !== 'application') return res.status(400).json({success: false, error: 'Action inconnue.'});
      const view = req.body?.view || 'home';
      if (!['home', 'atelier'].includes(view)) return res.status(400).json({success: false, error: 'Vue Anima inconnue.'});
      const application = await loadApplication(view);
      return res.json({success: true, html: application.html, css: application.css, module: application.module, catalogue: application.catalogue, visuals: application.visuals || {}, view, engine: 'studio-one', assetBase: 'https://studio-one-beta-test-v2.vercel.app/', release: application.release || null, identity: agent ? {uid: agent.uid, email: agent.email} : {uid:'client-'+client.id,client:{id:client.id,codeClient:client.codeClient,societe:client.societe||'',email:client.email||''},neobathAllowed:true}});
    } catch (_) {
      return res.status(503).json({success: false, error: 'Atelier momentanément indisponible. Réessayez dans un instant.'});
    }
  };
}

module.exports = {createNeobathAnimaHandler, createStudioApplicationLoader, readStudioAsset};
