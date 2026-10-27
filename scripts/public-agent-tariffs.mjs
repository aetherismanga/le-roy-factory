import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';

export const PROTECTED_TARIFF_SCRIPTS=[
 'assets/js/inspirations-view-data.js',
 'assets/js/inspirations-view-data-lot2.js',
 'assets/js/inspirations-view-data-lot3.js',
 'assets/js/inspirations-view-tariff-2026-10-15.js',
 'assets/js/inspirations-elios-pricing.js',
 'assets/js/inspirations-elios-thickness-overrides.js'
];
// The 3D legacy page owns local-project recovery on the historical origin.
const LEGACY_STUDIO_PAGES=new Set(['randal-studio-one.html']);
const BOOTSTRAP='assets/js/agent-tariffs.js';

export function legacyStudioRedirect(){
 return '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RANDAL Studio One</title><meta http-equiv="refresh" content="0;url=studio-one-configurateur.html"><body><p>Ouverture de RANDAL Studio One… <a href="studio-one-configurateur.html">Continuer</a></p><script>const u=new URL("studio-one-configurateur.html",location.href);u.search=location.search;u.hash=location.hash;location.replace(u.href);</script></body></html>\n';
}

// Build gate: plaintext source rates must be protected before any public copy.
// The one-off conversion lives outside the public artifact; later builds only
// publish the checked public projections and encrypted server data.
export async function preparePublicAgentTariffs({root,out,files=[]}){
 let checked=0,injected=0;
 for(const path of PROTECTED_TARIFF_SCRIPTS){
  const source=join(root,path);
  if(!existsSync(source))continue;
  const text=readFileSync(source,'utf8');
  if(!text.includes('__LRF_PUBLIC_TARIFFS_V1__'))throw Error('Unprotected agent tariff source: '+path);
  if(/\b(?:proPrice|proPalette|proDetail|purchaseHT|purchasePaletteHT|amount)\s*[:=]\s*\d/.test(text))throw Error('Purchase rate in public projection: '+path);
  if(/\d+(?:[,.]\d+)?\s*€\s*(?:HT|net)/i.test(text))throw Error('Purchase amount in public comment or label: '+path);
  const target=join(out,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,text);checked++;
 }
 for(const path of files.filter(path=>path.endsWith('.html'))){
  const target=join(out,path);if(!existsSync(target))continue;
  if(LEGACY_STUDIO_PAGES.has(path)){writeFileSync(target,legacyStudioRedirect());continue;}
  let text=readFileSync(target,'utf8');
  if(!/inspirations-(?:view|elios)|secure-tariff-links\.js|RANDAL-STUDIO-ONE-VASQUES-TARIF-PRO-HT\.pdf/.test(text)||text.includes('src="'+BOOTSTRAP))continue;
  const tag='<script type="module" src="'+BOOTSTRAP+'?v=20261027-logo-pro2"></script>';
  text=text.includes('</body>')?text.replace('</body>',tag+'\n</body>'):text+'\n'+tag;
  writeFileSync(target,text);injected++;
 }
 const legacy=join(out,'assets/js/studio-one/catalog.js');
 if(existsSync(legacy))writeFileSync(legacy,'/* Legacy purchase catalogue retired. Use RANDAL Studio One. */\n');
 if(existsSync(join(root,'assets/pdf/RANDAL-STUDIO-ONE-VASQUES-TARIF-PRO-HT.pdf')))throw Error('Private RANDAL PDF must be protected before publication');
 if(checked&&!existsSync(join(root,'randal-general/server/data/agent-tariffs.enc.json')))throw Error('Protected agent tariff asset is missing');
 return {publicTariffScripts:checked,agentBootstrapPages:injected,legacyStudioRedirected:true};
}
