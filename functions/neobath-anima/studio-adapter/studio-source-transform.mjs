// Build-only data and branding adaptations of the real Studio One source.
import {transformContinuousPlans,transformContinuousPreview} from './continuous-plan-transform.mjs';
const STUDIO_ORIGIN='https://studio-one-beta-test-v2.vercel.app/';
const PRIVATE_URL='https://leroyfactory.fr/neobath-anima-configurateur.html';
const navigationPrelude=`
function __animaLocation(){return new URL(window.__ANIMA_ROUTE_URL__||${JSON.stringify(PRIVATE_URL)});}
const __animaHistory={state:null,pushState(state,_title,url){this.state=state;window.__ANIMA_ROUTE_URL__=new URL(url,__animaLocation()).href;window.animaHistory?.(window.__ANIMA_ROUTE_URL__,false);},replaceState(state,_title,url){this.state=state;window.__ANIMA_ROUTE_URL__=new URL(url,__animaLocation()).href;window.animaHistory?.(window.__ANIMA_ROUTE_URL__,true);}};
function __animaGo(path){const url=new URL(path,${JSON.stringify(STUDIO_ORIGIN)});window.animaNavigate?.(url.pathname.endsWith('/atelier.html')?'atelier':'home',url.search,url.hash);}
document.addEventListener('click',event=>{if(event.defaultPrevented)return;const a=event.target.closest?.('a[href]');if(!a||a.hasAttribute('download')||a.target==='_blank')return;const href=a.getAttribute('href');if(!href||href.startsWith('#')||href.startsWith('mailto:')||href.startsWith('blob:')||href.startsWith('data:'))return;const u=new URL(href,${JSON.stringify(STUDIO_ORIGIN)});if(u.origin===${JSON.stringify(new URL(STUDIO_ORIGIN).origin)}&&/\\/(?:index|accueil|atelier)\\.html$/.test(u.pathname)){event.preventDefault();__animaGo(u.href);}});
`;
const assetPrelude=`const __animaAsset=value=>/^(?:https?:|data:|blob:)/i.test(String(value))?String(value):new URL(String(value).replace(/^\\//,''),${JSON.stringify(STUDIO_ORIGIN+'assets/')}).href;\n`;
const topPrelude="import {isIntegratedTop as __animaIntegrated,isVesselTop as __animaVessel,topSelection as __animaTopSelection} from '@anima-adapter/anima-data.js';\n";
const routePrelude=`
function __animaLocation(){return new URL(window.__ANIMA_ROUTE_URL__||${JSON.stringify(PRIVATE_URL)});}
const __animaHistory={state:null,replaceState(state,_title,url){this.state=state;window.__ANIMA_ROUTE_URL__=new URL(url,__animaLocation()).href;window.animaHistory?.(window.__ANIMA_ROUTE_URL__,true);},pushState(state,_title,url){this.state=state;window.__ANIMA_ROUTE_URL__=new URL(url,__animaLocation()).href;window.animaHistory?.(window.__ANIMA_ROUTE_URL__,false);}};
`;

export function transformCommonStudioSource(input,relativePath){
 let source=input.replace(/(['"])studio-one(?=[-'"])/g,'$1neobath-anima-studio').replaceAll('STUDIO ONE','NEOBATH ANIMA').replaceAll('RANDAL','NEOBATH').replaceAll("'ROBLE'","'rovere-alba'").replaceAll('https://leroyfactory.fr/configurateurs-randal.html','https://leroyfactory.fr/configurateurs.html');
 if(relativePath==='commerce/appearance.js'){
  source=source.replace("';background-image:url(assets/'+f.texture+');background-size:cover'","';background-image:url('+__animaAsset(f.texture)+');background-size:cover'");source=assetPrelude+source;
 }
 if(relativePath==='commerce/live-preview.js'){
  source=source.replace("'assets/'+(definition.textureVariants?.[profile]||definition.texture)","__animaAsset(definition.textureVariants?.[profile]||definition.texture)")
   .replace(')).then(t=>{t.colorSpace=T.SRGBColorSpace;',')).then(async t=>{t.colorSpace=T.SRGBColorSpace;')
   .replace('const front=t.clone();','const front=definition.frontTexture?await new T.TextureLoader().loadAsync(__animaAsset(definition.frontTexture)):t.clone();front.colorSpace=T.SRGBColorSpace;front.wrapS=front.wrapT=T.RepeatWrapping;')
   .replaceAll("[item.asset.frontWood,item.type==='cabinet']","[item.asset.frontWood,['cabinet','column'].includes(item.type)]");source=assetPrelude+source;
 }
 if(relativePath==='commerce/preview-model.js'){
  source="import {animaColumnDimensions} from '@anima-adapter/configuration.js';\n"+source.replace("raw.type==='column'?.28","raw.type==='column'?animaColumnDimensions(s).base").replace("else if(raw.type==='column')asset=makeColumn();","else if(raw.type==='column')asset=makeColumn(s);");
  source=transformContinuousPreview(source);
 }
 if(relativePath==='commerce/visuals.js'){
  source=source.replace("if(!m)return '';","if(!m)return '';width=m.allowedWidths?.includes(width)?width:m.allowedWidths?.[0]||width;")
   .replace("const n=m.id==='three'?3:m.id==='one-xl'?1:2,","const n=m.doors||m.trueDrawers||m.drawers||1,")
   .replace('dx=30,dy=18;','dx=30*(m.depth||46)/46,dy=18*(m.depth||46)/46;')
   .replace('const top=y+i*H/n,h=H/n;return', 'const top=m.doors?y:y+i*H/n,h=m.doors?H:H/n,left=m.doors?frontX+i*frontW/n:frontX,wide=m.doors?frontW/n:frontW;const ribs=m.facade===\'RIBELLE\'?Array.from({length:Math.floor(wide/3)},(_,k)=>`<path d="M${left+2+k*3} ${top+2}v${h-4}" stroke="#88765e" stroke-width=".6"/>`).join(\'\'):\'\';return')
   .replace('M${frontX} ${top+2}h${frontW}v${h-4}H${frontX}Z','M${left} ${top+2}h${wide}v${h-4}H${left}Z')
   .replaceAll('M${frontX+1} ${top+','M${left+1} ${top+').replaceAll('h${frontW-2}', 'h${wide-2}')
   .replace('stroke-width="1.7"/>`;}).join', 'stroke-width="1.7"/>${ribs}`;}).join')
   .replaceAll('profondeur 46 cm','profondeur ${m.depth||46} cm')
   .replace("range?'L. 40–120 cm'", "range?'L. '+(m.allowedWidths||[40,120]).join(' / ')+' cm'")
   .replace('text-anchor="middle">46</text>','text-anchor="middle">${m.depth||46}</text>')
   .replace('largeur 38, hauteur 132, profondeur 27 cm','largeur 40, hauteur 140, profondeur 22 cm')
   .replace('>132</text>','>140</text>').replace('>38</text>','>40</text>').replace('>27</text>','>22</text>');
 }
 if(relativePath==='composition.js'){
  const old="type==='cabinet'?{width:(settings.width||80)/100,height:cabinetFormat(settings.format).height+.02+(settings.top==='neris'?.14:settings.top==='torne'?.12:0),depth:.46,base:cabinetFormat(settings.format).base}:type==='column'?{width:.38,height:1.32,depth:.27,base:.28}:";
  if(!source.includes(old))throw Error('Studio One composition dimensions changed; review Anima adapter.');
  source="import {animaCabinetDimensions,animaColumnDimensions} from '@anima-adapter/configuration.js';\n"+source.replace(old,"type==='cabinet'?animaCabinetDimensions(settings):type==='column'?animaColumnDimensions(settings):");
 }
 if(relativePath==='app.js')source=transformAtelierSource(source);
 if(relativePath==='app.js'||relativePath==='commerce/home.js'){
  source=source.replace(/location\.href\s*=\s*(demoRoute\([^;\n]+)\s*;/g,'__animaGo($1);').replaceAll('location.replace(demoRoute(','__animaGo(demoRoute(')
   .replace(/\blocation\.(href|search|hash|pathname)\b/g,'__animaLocation().$1').replace(/\bhistory(?=\.|\[)/g,'__animaHistory');source=navigationPrelude+source;
 }
 return source;
}

function transformAtelierSource(source){
 source=topPrelude+source.replace(/\['sella','tampa'\]\.includes\(([^)]+)\)/g,'__animaIntegrated($1)').replace(/\['neris','torne'\]\.includes\(([^)]+)\)/g,'__animaVessel($1)');
 for(const value of ['state.top','wantedTop'])source=source.replaceAll(`${value}==='sella'||${value}==='tampa'`,`__animaIntegrated(${value})`);
 source=source.replace("const remembered=id==='tampa'?state.tampaColor:id==='neris'||id==='torne'?state.vesselColor:'gloss';","const offered=basinColors(id,state.width,state.format,state.basinLayout);const remembered=offered.some(c=>c.id===state.basinColor)?state.basinColor:offered[0]?.id||'standard';")
  .replaceAll("state.basinColor=color?.id||'gloss'","state.basinColor=color?.id||'standard'").replaceAll("state.top==='neris'||state.top==='torne'","__animaVessel(state.top)")
  .replaceAll("selectTop('sella')","selectTop('bare')").replace('const front=map.clone();','const front=f.frontTexture?await loadTexture(tileAssetURL(f.frontTexture),profile):map.clone();front.wrapS=front.wrapT=T.RepeatWrapping;');
 source=source.replaceAll('topAvailable(id,state.width)','topAvailable(id,state.width,state.format)').replaceAll('topAvailable(b.dataset.top,state.width)','topAvailable(b.dataset.top,state.width,state.format)')
  .replaceAll("topAvailable('sella',state.width)","topAvailable(TOP_OPTIONS.find(o=>o.category==='integrated')?.id,state.width,state.format)").replaceAll('topAvailable(wantedTop,cm)','topAvailable(wantedTop,cm,state.format)')
  .replaceAll('topAvailable(s.top,s.width)','topAvailable(s.top,s.width,s.format)').replaceAll('validWidth(s.width)','validWidth(s.width,s.format)').replaceAll('validWidth(cm)','validWidth(cm,state.format)');
 source=source.replaceAll("type==='column'?makeColumn()","type==='column'?makeColumn(s)").replaceAll("raw.type==='column'?makeColumn()","raw.type==='column'?makeColumn(s)")
  .replace("'tampaColor','vesselColor'];","'tampaColor','vesselColor','grass','ncsCode'];");
 source=source.replace("{width:60,height:60,mirrorModel:'round'}","{width:MIRRORS[0].sizes[0][0],height:MIRRORS[0].sizes[0][1],mirrorModel:MIRRORS[0].id}")
  .replace("composition.add('mirror',{root:frame,reflector:mirror},{},{wall:","composition.add('mirror',{root:frame,reflector:mirror},{mirrorModel:MIRRORS[0].id,width:MIRRORS[0].sizes[0][0],height:MIRRORS[0].sizes[0][1],mirrorFinish:'Argent',led:!!MIRRORS[0].led},{wall:")
  .replace("if(type==='cabinet')settings.topDrawer=", "if(type==='cabinet'){const form=cabinetFormat(settings.format);if(!form.allowedWidths.includes(settings.width))settings.width=form.allowedWidths[0];}if(type==='cabinet')settings.topDrawer=")
  .replace("mirrorFinish:'Noir'","mirrorFinish:'Argent'")
  .replace("if(spec.metal)field(parent,'Cadre',item.settings.mirrorFinish||'Noir',['Noir','Argent','Doré','Bronze'].map", "if(spec.metal)field(parent,'Cadre',item.settings.mirrorFinish||'Argent',['Argent'].map")
  .replace('colors[item.settings.mirrorFinish]||colors.Noir','colors[item.settings.mirrorFinish]||colors.Argent')
  .replace("[asset.frontWood,type==='cabinet']", "[asset.frontWood,['cabinet','column'].includes(type)]")
  .replace('asset.spec.bottom+asset.spec.height+.024','asset.spec.bottom+asset.spec.height+(asset.spec.topHeight||.018)+.006');
 source=source.replace("]:[{name:{column:'Colonne · 1 porte'", "]:type==='column'?[{name:'Colonne Pura',description:'40 × 140 × 22 cm',options:{columnModel:'pura-column',facade:'PURA'},icon:'column'},{name:'Colonne Ribelle',description:'40 × 140 × 22 cm',options:{columnModel:'ribelle-column',facade:'RIBELLE'},icon:'column'}]:[{name:{column:'Colonne · 1 porte'");
 source=source.replace('settings={...item.settings,format:id,drawers:Array(form.drawers).fill(0)}',"settings=(()=>{const value={...item.settings,format:id,drawers:Array(form.drawers).fill(0)};if(!form.allowedWidths.includes(value.width))value.width=form.allowedWidths[0];if(!topAvailable(value.top,value.width,id))value.top='bare';return value;})()");
 source=source.replace("if(!validWidth(cm,state.format)){$('#width-status').textContent='Saisissez une largeur entière entre 40 et 120 cm.';","if(!validWidth(cm,state.format)){$('#width-status').textContent='Largeurs disponibles : '+cabinetFormat(state.format).allowedWidths.join(', ')+' cm.';")
  .replace('const active=Number(b.dataset.width)===state.width;b.classList','const allowed=cabinetFormat(state.format).allowedWidths.includes(Number(b.dataset.width));b.hidden=!allowed;b.disabled=!allowed;const active=Number(b.dataset.width)===state.width;b.classList');
 source=source.replaceAll("selected.asset.drawers.length===1?'Tiroir XL'","cabinetFormat(selected.settings.format).doors?(i===0?'Porte gauche':'Porte droite'):selected.asset.drawers.length===1?'Tiroir'")
  .replaceAll("item.asset.drawers.length===1?'Tiroir XL'","cabinetFormat(item.settings.format).doors?(i===0?'Porte gauche':'Porte droite'):item.asset.drawers.length===1?'Tiroir'");
 source=source.replace("'+f.name+' · prises de main à 45°'","'+f.name+' · façades '+f.facade");
 source=source.replace('name.textContent=option.name;const description',"name.textContent=option.name;if(option.image){const image=document.createElement('img');image.src=option.image;image.alt=option.name;image.loading='lazy';image.style.cssText='width:100%;height:86px;object-fit:contain';b.append(image);}const description");
 source=source.replaceAll("cabinetHeightLabel(f)+' · P 46 cm'",'cabinetHeightLabel(f)')
  .replaceAll("'38 × 132 × 27 cm'","'40 × 140 × 22 cm'").replaceAll("item.type==='column'?' · 38 cm'","item.type==='column'?' · 40 cm'")
  .replace("(cabinetFormat(selected.settings.format).height*100)+' × 46 cm'","(cabinetFormat(selected.settings.format).height*100)+' × '+Math.round(cabinetFormat(selected.settings.format).depth*100)+' cm'")
  .replace('`${state.width} × ${cabinetFormat(state.format).height*100} × 46 cm`','`${state.width} × ${cabinetFormat(state.format).height*100} × ${Math.round(cabinetFormat(state.format).depth*100)} cm`')
  .replace("cabinetFormat(state.format).height*100+' × 46 cm'","cabinetFormat(state.format).height*100+' × '+Math.round(cabinetFormat(state.format).depth*100)+' cm'")
  .replace("$('#detail-top-size').textContent=`${state.width} × 46 × 2 cm`;","$('#detail-top-size').textContent=__animaTopSize();")
  .replace(/\$\('#basin-description'\)\.textContent=[^;]+;/,"$('#basin-description').textContent=state.top==='bare'?'Caisson seul · sans plan de travail ni vasque':__animaTopSize();")
  .replace("+' · '+selected?.name","+(selected?.name?' · '+selected.name:'')").replace("+' · '+selected.name","+(selected?.name?' · '+selected.name:'')")
  .replace("cm===40?'Format 40 cm à confirmer auprès du fabricant.':''","''").replace("if(cm===40)notices.push('Format 40 cm à confirmer auprès du fabricant.');",'')
  .replace("+(widths.includes(40)?' · 40 cm à confirmer':'')",'')
  .replace("facadeChoice.dataset.objectControl='cabinet-facade-mode';","facadeChoice.dataset.objectControl='cabinet-facade-mode';facadeChoice.closest('label').hidden=true;")
  .replace("facadeNote.textContent='Chants gauche et droit visibles de 19 mm, dans la finition du meuble.';","facadeNote.hidden=true;facadeNote.textContent='';")
  .replace("note.textContent='P 46 cm · au-delà de 120 cm : plusieurs caissons';","note.textContent='P '+Math.round(cabinetFormat(item.settings.format).depth*100)+' cm · plusieurs caissons contigus pour un plan de 140 ou 160 cm';")
  .replace(/compatibility\.textContent=topAvailable\([^;]+;/,"compatibility.textContent='Plans et vasques Neobath compatibles avec les caissons. Les plans de 140 et 160 cm sont disponibles sur des caissons contigus de même profondeur et de même hauteur.';");
 source="function __animaTopSize(){const s=__animaTopSelection(state.top,state.width,state.format,state.basinLayout,state.topSpan);return s?.top?`${s.topWidth} × ${s.top.depth} × ${s.top.height} cm · ${s.top.label}`:'Sans plan ni vasque';}\n"+source;
 source=transformContinuousPlans(source).replaceAll('basinColors(','__animaTopColors(')
  .replace("?wantedTop:'plain'","?wantedTop:'bare'")
  .replace("top:topAvailable(selected.settings.top,width)?selected.settings.top:'plain'","top:topAvailable(selected.settings.top,width,selected.settings.format)?selected.settings.top:'bare'")
  .replace("if(color){model.ceramic.color.set(color.hex);","if(color&&color.ceramic!==false){model.ceramic.color.set(color.hex);")
  .replace("if(c){item.asset.ceramic.color.set(c.hex);","if(c&&c.ceramic!==false){item.asset.ceramic.color.set(c.hex);")
  .replace("'Neris nécessite au moins 50 cm : le plan assorti est sélectionné.'","'Le plan précédent ne correspond pas à cette largeur. Le caisson est conservé sans plan ni vasque.'")
  .replace('`En ${cm} cm, le plan assorti remplace la vasque encastrée.`','`En ${cm} cm, choisissez un plan et une vasque compatibles avec ce caisson.`');
 return `function __animaTopColors(top,width,format,layout,span){const colors=basinColors(top,width,format,layout,span);if(colors.length)return colors;const selection=__animaTopSelection(top,width,format,layout,span),product=selection?.product;return (product?.prices||[]).map(entry=>({id:entry.key,name:entry.label||entry.key,hex:/black|noir/i.test(entry.key+' '+entry.label)?'#292c2a':'#f6f5f1',roughness:.56,clearcoat:0,ceramic:false}));}\n`+source;
}

export function transformSharedStudioSource(input,path){
 let source=input;
 if(path==='shared/lrf-3d/i18n/index.js')source=routePrelude+source.replace(/\blocation\.(href|search|hash|pathname|origin)\b/g,'__animaLocation().$1').replace(/\bhistory(?=\.|\[)/g,'__animaHistory');
 if(path==='shared/lrf-3d/drawer-options.js')source="import {TOP_OPTIONS as __animaDrawerTops} from '@anima-adapter/anima-data.js';\n"+source.replace("export const fullTopDrawerAvailable=top=>['plain','neris','torne'].includes(top);","export const fullTopDrawerAvailable=top=>top==='plain'||__animaDrawerTops.some(option=>option.id===top&&['cover','countertop'].includes(option.category));");
 if(path==='shared/lrf-3d/public-compositions.js')return 'export const PUBLIC_COMPOSITIONS=Object.freeze([]);export const publicComposition=()=>null;export const publicCompositionProject=()=>null;\n';
 if(path==='shared/lrf-3d/cabinet-options-ui.js'){
  source=source.replace("export const topOptionPhoto=id=>['sella','tampa','neris','torne'].includes(id)?media+'basin-'+id+'.webp':null;","export const topOptionPhoto=id=>{const v=globalThis.NEOBATH_ANIMA_VISUALS?.products?.[id];return typeof v==='string'?v:v?.image||v?.photo||null;};")
   .replace(/const groups=\[[^;]+;/,"const groups=[{title:'Sans vasque',kind:'cover'},{title:'Vasque intégrée au plan',kind:'integrated'},{title:'Plan avec vasque à poser',kind:'countertop'}];")
   .replace('group.ids.includes(option.id)',"group.kind==='cover'?['bare','none','plain'].includes(option.id)||option.category==='cover':option.category===group.kind").replaceAll('Visuel catalogue RANDAL','Visuel catalogue NEOBATH ANIMA');
 }
 if(path==='shared/lrf-3d/commerce/navigation.js')source=source.replace(/export function returnToRandal\(\)\{[\s\S]*?\nexport function createProjectNavigation/,"export function returnToRandal(){try{window.top.location.href='https://leroyfactory.fr/configurateurs.html';}catch{window.location.assign('https://leroyfactory.fr/configurateurs.html');}}\nexport function createProjectNavigation");
 return source;
}

export function studioBody(source,formats=[]){
 const body=source.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];if(body===undefined)throw Error('Studio One template body not found.');
 let html=body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
  .replace(/<img\b[^>]*class="randal-partner-logo"[^>]*>\s*<svg\b[^>]*class="studio-logo"[\s\S]*?<\/svg>/gi,'<span class="anima-maker">NEOBATH</span><span class="anima-collection">ANIMA</span>')
  .replaceAll('STUDIO ONE','NEOBATH ANIMA').replaceAll('Studio One','Anima').replaceAll('RANDAL','NEOBATH').replaceAll('configurateurs-randal.html','configurateurs.html');
 html=html.replaceAll('NEOBATH NEOBATH ANIMA','NEOBATH ANIMA').replace('<span class="loading-mark">s<span>o</span></span>','<span class="loading-mark">n<span>a</span></span>');
 if(formats.length){const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));html=html.replace(/(<select\b[^>]*id="cabinet-format"[^>]*>)[\s\S]*?<\/select>/,(_,start)=>start+formats.map(f=>'<option value="'+esc(f.id)+'">'+esc(f.name)+' · H '+Math.round(f.height*100)+' cm</option>').join('')+'</select>');}
 html=html.replace('<label class="full-field">Façade du meuble<select id="cabinet-facade-mode">','<label class="full-field" hidden>Façade du meuble<select id="cabinet-facade-mode">')
  .replace('<p class="control-note">Chants gauche et droit visibles de 19 mm, dans la finition du meuble.</p>','')
  .replace(/<p>Atelier expérimental indépendant\.[\s\S]*?<\/p>/,'<p>Collection NEOBATH ANIMA : façades Pura et Ribelle, 42 modules et six finitions fabricant. Dimensions actuelles : <span id="about-current-size"></span>.</p>')
  .replace(/<dl>[\s\S]*?<\/dl>/,'<dl><div><dt>Plan et vasque Anima</dt><dd id="detail-sella-ref">Référence de la sélection</dd></div><div><dt>Dimensions du plan</dt><dd id="detail-top-size"></dd></div></dl>');
 html=html.replace('H 54 cm · P 46 cm','H 52 cm · P 46 cm')
  .replace('id="size-summary">80 × 54 × 46 cm','id="size-summary">80 × 52 × 46 cm')
  .replace('class="section-meta">H 54 · P 46 cm','class="section-meta">H 52 · P 46 cm')
  .replace('id="model-size-title">2 tiroirs · 80 cm','id="model-size-title">Pura · 2 tiroirs · 80 cm')
  .replace('id="finish-counter">1 / 8','id="finish-counter">6 / 6')
  .replace('aria-label="Huit finitions NEOBATH ANIMA"','aria-label="Six finitions NEOBATH ANIMA"')
  .replace('id="selected-finish">Roble Amazona','id="selected-finish">Rovere Alba')
  .replace('id="selected-description">Meuble suspendu · 2 tiroirs · prises de main à 45°','id="selected-description">Pura · sous-vasque · 2 tiroirs · façade lisse')
  .replace('id="basin-summary">Sella blanc brillant','id="basin-summary">Meuble seul — sans plan')
  .replace('id="basin-description">Vasque encastrée · miroir rond Ø 60','id="basin-description">Caisson seul · sans plan de travail ni vasque')
  .replace('id="add-menu-mirror" type="button">Miroir rond · Ø 60 cm','id="add-menu-mirror" type="button">Miroirs Neobath Anima')
  .replace('<strong>Miroir</strong><small>Ø 60 cm</small>','<strong>Miroir</strong><small>Formats catalogue</small>')
  .replace('<strong>Meuble</strong><small>4 formats</small>','<strong>Meuble</strong><small>16 formats Anima</small>')
  .replace(/Les six familles de miroirs NEOBATH[^<]+/,'Les miroirs NEOBATH ANIMA sont proposés selon les modèles et les dimensions du catalogue. Les dispositifs électroniques d’antibuée ou de capteur ne sont pas simulés.')
  .replace('cette expérience n’écrit ni sur le site de production, ni dans Firebase, ni dans le CRM.','les projets Anima sont enregistrés dans votre espace privé.')
  .replace(/<p>Les bois utilisent les échantillons d’origine[\s\S]*?<\/p>/,'<p>Les finitions utilisent les visuels HD NEOBATH ANIMA et leur sens de fil adapté aux façades et côtés. Les couleurs doivent être validées sur les échantillons du fabricant. Les miroirs reflètent la scène ; le rendu interactif conserve les éclairages et ombres de Studio One.</p>');
 return html;
}
export const brandCSS='\n/* Studio One cards, sized for the eight source models in each Anima facade. */\n#about{display:none!important}.anima-maker{font:600 20px/1 Arial,sans-serif;letter-spacing:2px;margin-right:14px}.anima-collection{font:400 26px/1 Georgia,serif;letter-spacing:3px}.brand{display:flex;align-items:center}.brand-signature{margin-left:12px}body[data-view=wizard][data-step="0"] .step-content.model-step{overflow-y:auto;overflow-x:hidden}.model-step>.model-grid{height:auto;flex:none;grid-template-rows:none;grid-auto-rows:200px}@media(max-width:700px){.model-step>.model-grid{grid-auto-rows:205px}}@media(max-width:620px){.anima-maker{font-size:14px;margin-right:8px;letter-spacing:1px}.anima-collection{font-size:20px;letter-spacing:2px}}\n';
