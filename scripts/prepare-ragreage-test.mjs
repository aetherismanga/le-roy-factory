import {cpSync,existsSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const target=process.argv[2]?resolve(process.argv[2]):null;
const origin=process.argv[3]?new URL(process.argv[3]).origin:null;
if(!target||!origin||target===root||root.startsWith(target+'/'))throw Error('Usage: node scripts/prepare-ragreage-test.mjs TARGET_CHECKOUT SITE_ORIGIN');
const manifest=JSON.parse(readFileSync(join(target,'.openai/hosting.json'),'utf8'));
if(!manifest.project_id||manifest.static?.directory!=='dist')throw Error('Existing private test Site required');
const dist=join(target,'dist');mkdirSync(dist,{recursive:true});
const assets=['assets/css/ragreage.css','assets/js/ragreage-ui.mjs','assets/js/ragreage-core.mjs','assets/js/ragreage-catalog.mjs','assets/img/ragreage-monogram.svg'];
const copy=(from,to)=>{mkdirSync(dirname(to),{recursive:true});cpSync(from,to,{recursive:true});};
for(const p of assets)copy(join(root,p),join(dist,p));
cpSync(join(root,'assets/img/ragreage'),join(dist,'assets/img/ragreage'),{recursive:true});
let page=readFileSync(join(root,'configurateur-ragreage.html'),'utf8').replaceAll('https://leroyfactory.fr/configurateur-ragreage.html',origin+'/');
page=page.replace('<meta name="theme-color" content="#273f36">','<meta name="theme-color" content="#273f36">\n  <meta name="robots" content="noindex,nofollow">');
for(const name of ['index.html','contact.html'])page=page.replaceAll('href="'+name+'"','href="https://leroyfactory.fr/'+name+'"');
page=page.replace('<body>','<body>\n<div class="test-banner" style="background:#e7dfc3;color:#273f36;text-align:center;padding:10px 16px;font:600 11px/1.5 Arial,sans-serif;letter-spacing:.6px">VERSION DE TEST · Essayez librement le calculateur avant sa mise en ligne sur Leroy Factory.</div>');
for(const p of ['index.html','configurateur-ragreage.html'])writeFileSync(join(dist,p),page);
const launcher=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Configurateurs — aperçu LRF</title><link rel="stylesheet" href="assets/css/ragreage.css?v=20261103-4"></head><body><header class="site-bar"><a class="brand" href="index.html"><img src="assets/img/ragreage-monogram.svg" width="54" height="54" alt="LRF"><span>LE ROY FACTORY<small>VERSION DE TEST</small></span></a><a href="index.html" class="return-link">Ouvrir le calculateur →</a></header><main style="max-width:1000px;margin:55px auto;padding:0 20px"><p class="eyebrow">LES OUTILS DU CHANTIER</p><h1 style="font-size:48px">Nos configurateurs.</h1><p style="color:#63716b;line-height:1.7">Aperçu de la carte du nouveau calculateur avec son animation.</p><article class="panel" style="max-width:430px;margin:35px 0"><picture><source media="(prefers-reduced-motion: reduce)" srcset="assets/img/ragreage/tiler-pouring-poster.png"><img src="assets/img/ragreage/tiler-pouring.gif" alt="Un carreleur verse le ragréage" width="320" height="200" style="width:100%;height:auto;border-radius:10px"></picture><h2>Calculateur de ragréage</h2><p style="color:#63716b;font-size:14px;line-height:1.7">Votre fabricant, le bon ragréage, le primaire et le nombre de sacs pour votre chantier.</p><a href="index.html" class="calculate-button" style="text-decoration:none">Calculer mon ragréage <span>↗</span></a></article></main></body></html>`;
writeFileSync(join(dist,'configurateurs.html'),launcher);
const qa=join(dist,'qa-mobile.html');if(existsSync(qa))rmSync(qa);
// Retain canonical source and manufacturer provenance in the private source
// repository. These files are outside the deployed static directory.
const source=join(target,'source/lrf-ragreage');
for(const p of [...assets,'assets/img/ragreage','assets/data/ragreage','configurateur-ragreage.html','configurateurs.html','suite-version.json','tests/ragreage.test.mjs','scripts/build-ragreage-catalog.mjs','scripts/prepare-ragreage-test.mjs'])copy(join(root,p),join(source,p));
writeFileSync(join(source,'README.md'),'# LE ROY FACTORY — calculateur de ragréage\n\nSources canoniques du lot multimarques du 3 novembre 2026, conservées avec la version de test privée. Le site principal n’est pas publié par ce script.\n\nDépôt cible : aetherismanga/le-roy-factory. La PR 169 contient la première version seulement ; intégrer ce nouveau lot et ses médias avant toute publication, après validation de Jérôme.\n\nLes catalogues par pays sont dans assets/data/ragreage. Reconstruire le module avec node scripts/build-ragreage-catalog.mjs. Vérifier les calculs avec node --test tests/ragreage.test.mjs. Les médias et leur provenance figurent dans media.json.\n\nINDEX reste visible avec demande de documentation actuelle ; aucune formule historique n’est recommandée.\n');
console.log(JSON.stringify({project_id:manifest.project_id,staticDirectory:'dist',canonicalSourcePreserved:true}));
