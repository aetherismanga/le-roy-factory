import {COLLECTIONS,formatsForColor} from './surface-catalog.js';
import {surfaceColorIssue} from './surface-quality.js';
import {RAL_SCREEN_NOTE} from './ral-colors.js';

const collator=new Intl.Collator('fr',{sensitivity:'base',numeric:true});
export const surfaceSeries=(brand,kind)=>Object.entries(COLLECTIONS)
 .filter(([name,c])=>c.brand===brand&&(kind==='wall'||name!=='Peinture')&&(!c.surfaces||c.surfaces.includes(kind))&&availableColors(name).length>0)
 .sort(([a],[b])=>collator.compare(a,b));
export const availableColors=collection=>(COLLECTIONS[collection]?.colors||[]).filter(c=>surfaceColorIssue(collection,c)===null);
export function selectedFormat(collection,color,layout={}){
 const formats=formatsForColor(collection,color);
 return formats.find(f=>Math.abs(f.width-layout.width)<.001&&Math.abs(f.height-layout.height)<.001)?.id||formats[0]?.id||'';
}

function installStyle(){
 if(document.getElementById('surface-picker-style'))return;
 const style=document.createElement('style');style.id='surface-picker-style';style.textContent=`
 .surface-picker{display:grid;gap:14px;min-width:0;width:100%;font:13px/1.4 Arial,sans-serif;color:#29483e;box-sizing:border-box}
 .surface-picker *{box-sizing:border-box}.surface-picker [hidden]{display:none!important}
 .surface-picker-step{display:grid;gap:7px;min-width:0;margin:0}
 .surface-picker-label{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:#4b5e50}
 .surface-picker-label>span:first-child{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#e9eddf;font-size:10px}
 .surface-factories{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
 .surface-factories:has(button:nth-child(3)){grid-template-columns:repeat(3,minmax(0,1fr))}
 .surface-picker button,.surface-picker select,.surface-picker input{font:inherit;touch-action:manipulation}
 .surface-picker button{cursor:pointer;color:#29483e;border:1px solid #cdd3c3;border-radius:8px;background:#fffdf7;min-height:44px;padding:8px}
 .surface-factories button{font-size:12px;font-weight:600;min-width:0}
 .surface-factories button[aria-pressed=true]{background:#294b3f;border-color:#294b3f;color:#fff}
 .surface-picker select{display:block;width:100%;min-width:0;min-height:44px;border:1px solid #cbd2c2;border-radius:8px;padding:10px 30px 10px 11px;color:#29483e;background:#fffdf7;font-size:13px}
 .surface-picker small{font-size:11px;color:#71816d}
 .surface-picker-colors{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
 .surface-picker .surface-color{display:grid;grid-template-rows:48px auto;gap:6px;align-content:start;min-width:0;padding:5px;border:1px solid #d5dacb;text-align:center;font-size:11px;overflow:hidden}
 .surface-picker .surface-color[aria-pressed=true]{border:2px solid #887858;padding:4px;background:#f1ecdf}
 .surface-color-sample{display:block;width:100%;height:48px;border-radius:4px;border:1px solid #263b241a;background:#edece4;overflow:hidden}
 .surface-color-sample img{display:block;width:100%;height:100%;object-fit:cover}
 .surface-color-name{overflow-wrap:anywhere;line-height:1.3}.surface-picker button:disabled{opacity:.5;cursor:default}
 .surface-picker-note{margin:0;padding:10px;border-radius:8px;background:#f1eee3;font-size:12px;line-height:1.5;color:#716247}
 .grout-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;width:100%}
 .grout-choice{display:flex;align-items:center;gap:6px;min-width:0;min-height:44px;padding:7px;border:1px solid #cdd3c3;border-radius:8px;background:#fffdf7;color:#29483e;font-size:12px;cursor:pointer}
 .grout-choice[aria-checked=true]{border:2px solid #294b3f;background:#e9eddf;padding:6px;font-weight:600}
 .grout-choice input{appearance:auto!important;width:16px!important;height:16px!important;margin:0!important;accent-color:#294b3f;flex-shrink:0}
 .grout-choice-sample{width:16px;height:16px;flex-shrink:0;border:1px solid #b0b4aa;border-radius:3px}
 .surface-picker a{color:#5e7154;text-underline-offset:3px;font-size:11px}
 .surface-ral-picker{display:grid;gap:7px}.surface-ral-picker input{width:100%;min-height:44px;border:1px solid #cbd2c2;border-radius:8px;padding:10px;background:#fffdf7}.surface-ral-preview{display:flex;align-items:center;gap:8px}.surface-ral-preview:before{content:'';display:block;width:28px;height:28px;flex-shrink:0;border:1px solid #b0b4aa;border-radius:4px;background:var(--ral-preview,#eeeae0)}
 .surface-paint-custom input{width:100%;height:44px;padding:3px;border:1px solid #cbd2c2;border-radius:8px;background:white}
 #viewer .object-editor.surface-context{z-index:50}.surface-context #object-editor-body{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:12px!important;overflow-x:hidden!important;min-width:0}
 .surface-context .object-editor-heading{position:sticky;top:-14px;z-index:2;background:#fafbf5;padding:5px 0 10px}
 .surface-context .object-actions{flex-wrap:wrap!important;flex-shrink:0}.surface-context .renovation-actions{margin:8px 0}
 @media(max-width:760px){#viewer .object-editor.surface-context{max-height:min(62dvh,calc(100% - 70px));padding:12px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable}
 .surface-context .object-editor-heading{top:-12px;margin-bottom:8px}.surface-context .object-editor-heading h2{font-size:15px}.surface-context .object-editor-heading .eyebrow{display:none}
 .surface-context .surface-picker{gap:11px}.surface-context .surface-picker-step{gap:6px}.surface-context .surface-picker-colors{grid-template-columns:repeat(4,minmax(0,1fr))}
 .surface-context .surface-picker .surface-color{font-size:11px;grid-template-rows:40px auto}.surface-context .surface-color-sample{height:40px}.surface-context .object-actions button{min-height:44px}
 }
 `;document.head.append(style);
}


export function surfacePreviewNote(color){
 if(color?.textureProvenance?.kind==='ai-reconstruction')return 'Reconstitution visuelle · '+(color.textureProvenance.facesPerColor||color.faces?.length||8)+' tampons par couleur · teinte indicative.';
 if(color?.definitionLimited&&color?.previewReviewed)return 'Échantillon du catalogue fabricant · définition limitée. La référence et la finition choisies sont conservées.';
 return color?.definitionLimited?'Visuel fabricant en définition limitée. Les dimensions et la référence du décor sont conservées.':'';
}

// Every entry point uses the same manufacturer → series → colour → size flow.
// Only the current series' thumbnails load; full tile faces remain on demand.
export function renderSurfacePicker(parent,{kind,collection,color,format,urlFor,onCollection,onColor,onFormat,onPaint,paintHex,allowPaint=kind==='wall'}){
 installStyle();
 const root=document.createElement('div');root.className='surface-picker';root.dataset.surfacePicker=kind;
 let draft={brand:COLLECTIONS[collection]?.brand||'ELIOS',collection,color,format};
 const step=(n,title)=>{const field=document.createElement('div');field.className='surface-picker-step';const label=document.createElement('div');label.className='surface-picker-label';const number=document.createElement('span');number.textContent=n;const text=document.createElement('span');text.textContent=title;label.append(number,text);field.append(label);root.append(field);return field;};
 const factories=step('1','Usine'),buttons=document.createElement('div');buttons.className='surface-factories';buttons.setAttribute('role','group');buttons.setAttribute('aria-label','Usine du revêtement');factories.append(buttons);
 const seriesStep=step('2','Série'),series=document.createElement('select'),count=document.createElement('small');series.dataset.surfaceField='collection';series.setAttribute('aria-label','Série du carrelage');seriesStep.append(series,count);
 const colorStep=step('3','Couleur'),colors=document.createElement('div');colors.className='surface-picker-colors';colors.setAttribute('role','group');colors.setAttribute('aria-label','Couleur du revêtement');colorStep.append(colors);
 const ralStep=step('RAL','Nuancier peinture RAL Classic'),ralSearch=document.createElement('input'),ralSelect=document.createElement('select'),ralPreview=document.createElement('small');ralStep.classList.add('surface-ral-picker');ralSearch.type='search';ralSearch.value='';ralSearch.placeholder='Rechercher un code ou une teinte';ralSearch.setAttribute('aria-label','Rechercher une peinture RAL');ralSelect.setAttribute('aria-label','Couleur de peinture RAL');ralSelect.dataset.surfaceField='ral';ralPreview.className='surface-ral-preview';ralStep.append(ralSearch,ralSelect,ralPreview);
 const formatStep=step('4','Format'),sizes=document.createElement('select');sizes.dataset.surfaceField='format';sizes.setAttribute('aria-label','Format du carrelage');const formatNote=document.createElement('small');formatNote.className='surface-format-note';formatStep.append(sizes,formatNote);
 const paint=document.createElement('label');paint.className='surface-picker-step surface-paint-custom';paint.textContent='Votre couleur de peinture';const input=document.createElement('input');input.type='color';input.value=paintHex||'#eeeae0';input.setAttribute('aria-label','Couleur personnalisée de peinture');input.oninput=()=>onPaint?.(input.value);paint.append(input);root.append(paint);
 const note=document.createElement('p');note.className='surface-picker-note';note.setAttribute('role','status');root.append(note);
 const source=document.createElement('a');source.textContent='Consulter la collection fabricant ↗';source.target='_blank';source.rel='noopener noreferrer';root.append(source);
 function populateFormats(){const eligible=availableColors(draft.collection).some(c=>c.id===draft.color),fs=eligible?formatsForColor(draft.collection,draft.color):[];sizes.replaceChildren(...fs.map(f=>new Option(f.label||f.id.replace('x',' × ')+' cm',f.id)));if(!fs.some(f=>f.id===draft.format))draft.format=fs[0]?.id||'';sizes.value=draft.format;sizes.disabled=!availableColors(draft.collection).some(c=>c.id===draft.color);formatStep.hidden=draft.collection==='Peinture'||!draft.collection||!eligible;const selected=fs.find(f=>f.id===draft.format);formatNote.hidden=!selected?.note;formatNote.textContent=selected?.note||'';}
 function populateRal(){
  const choices=availableColors(draft.collection).filter(c=>c.id.startsWith('ral-'));ralStep.hidden=draft.collection!=='Peinture'||!choices.length;if(ralStep.hidden)return;
  const query=ralSearch.value.trim().toLocaleLowerCase('fr'),filtered=choices.filter(c=>(c.name+' '+(c.code||'')).toLocaleLowerCase('fr').includes(query));
  ralSelect.replaceChildren(new Option(filtered.length?'Choisir une teinte RAL…':'Aucune teinte correspondante',''),...filtered.map(c=>new Option(c.name,c.id)));ralSelect.value=filtered.some(c=>c.id===draft.color)?draft.color:'';
  const selected=choices.find(c=>c.id===draft.color);ralPreview.textContent=(selected?selected.name+' · ':'')+RAL_SCREEN_NOTE;ralPreview.style.setProperty('--ral-preview',selected?.hex||'#eeeae0');
 }
 ralSearch.oninput=populateRal;ralSelect.onchange=()=>{if(!ralSelect.value)return;draft.color=ralSelect.value;populateColors();onColor?.(draft.color);};
 function populateColors(){colors.replaceChildren();const c=COLLECTIONS[draft.collection],choices=availableColors(draft.collection);colorStep.hidden=!choices.length;paint.hidden=draft.collection!=='Peinture'||!onPaint;note.hidden=true;source.hidden=!c?.source;if(c?.source)source.href=c.source;
  for(const co of choices.filter(c=>!c.id.startsWith('ral-'))){const b=document.createElement('button');b.type='button';b.className='surface-color';b.dataset.surfaceColor=co.id;b.dataset.surfaceKind=kind;b.setAttribute('aria-pressed',String(co.id===draft.color));b.setAttribute('aria-label',co.name);const sample=document.createElement('span');sample.className='surface-color-sample';if(co.file){const img=document.createElement('img');img.src=urlFor(co.file);img.alt='';img.loading='lazy';img.decoding='async';sample.append(img);}else if(co.hex)sample.style.backgroundColor=co.hex;const name=document.createElement('span');name.className='surface-color-name';name.textContent=co.name;b.append(sample,name);b.onclick=()=>{draft.color=co.id;populateColors();populateFormats();onColor?.(co.id);};colors.append(b);}
  if(c&&draft.color&&!choices.some(co=>co.id===draft.color)){note.hidden=false;note.textContent=choices.length?'Le coloris enregistré reste appliqué. Choisissez une couleur pour le remplacer.':'Ce revêtement est conservé dans votre projet. Choisissez une série pour le remplacer.';}
  const previewNote=surfacePreviewNote(choices.find(co=>co.id===draft.color));if(previewNote){const prior=note.hidden?'':note.textContent+' ';note.hidden=false;note.textContent=prior+previewNote;}
  if(choices.find(co=>co.id===draft.color)?.continuousDecor){const detail=note.hidden?'':note.textContent+' ';note.hidden=false;note.textContent='Décor à raccord continu · pose droite, horizontale ou verticale. '+detail;}
  populateRal();populateFormats();
 }
 function populateSeries(placeholder=false){const entries=surfaceSeries(draft.brand,kind),current=entries.some(([name])=>name===draft.collection);series.replaceChildren();if(!current&&COLLECTIONS[draft.collection]){const legacy=new Option(draft.collection+' · référence enregistrée',draft.collection,true,true);legacy.disabled=true;legacy.dataset.legacyMaterial='true';series.append(legacy);}else if(placeholder||!current)series.append(new Option('Choisir une série…',''));for(const [name]of entries)series.append(new Option(name,name));series.value=current||COLLECTIONS[draft.collection]?draft.collection:'';count.textContent=entries.length+' série'+(entries.length>1?'s':'');seriesStep.hidden=draft.brand==='Peinture';populateColors();}
 for(const brand of ['ELIOS','VIEW',...(allowPaint?['Peinture']:[])].filter(name=>surfaceSeries(name,kind).length)){const b=document.createElement('button');b.type='button';b.textContent=brand;b.dataset.surfaceBrand=brand;b.setAttribute('aria-pressed',String(draft.brand===brand));b.onclick=()=>{if(draft.brand===brand)return;draft.brand=brand;draft.collection=brand==='Peinture'?'Peinture':'';draft.color=brand==='Peinture'?'white':'';draft.format='';for(const button of buttons.children)button.setAttribute('aria-pressed',String(button===b));populateSeries(brand!=='Peinture');if(brand==='Peinture')onCollection?.('Peinture');};buttons.append(b);}
 series.onchange=()=>{draft.collection=series.value;const c=COLLECTIONS[draft.collection];draft.color=availableColors(draft.collection)[0]?.id||c?.colors[0]?.id||'';draft.format='';populateColors();if(availableColors(draft.collection).length)onCollection?.(draft.collection);};
 sizes.onchange=()=>{draft.format=sizes.value;populateFormats();onFormat?.(sizes.value);};populateSeries();parent.replaceChildren(root);return root;
}

// A visible checked control accompanies the colour sample. aria-pressed alone
// was not apparent in the compact inspector's generic action-button styling.
export function renderGroutChoices(parent,{colors,value,onChange}){
 installStyle();const group=document.createElement('div');group.className='grout-choices';group.setAttribute('role','radiogroup');group.setAttribute('aria-label','Couleur du joint');
 const groupName='grout-'+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
 for(const [name,hex]of Object.entries(colors)){
  const label=document.createElement('label');label.className='grout-choice';label.setAttribute('aria-checked',String(name===value));
  const input=document.createElement('input');input.type='radio';input.name=groupName;input.value=name;input.checked=name===value;input.setAttribute('aria-label',name);
  const sample=document.createElement('span');sample.className='grout-choice-sample';sample.style.backgroundColor=hex;sample.setAttribute('aria-hidden','true');
  const text=document.createElement('span');text.textContent=name;label.append(input,sample,text);group.append(label);
  input.onchange=()=>{if(!input.checked)return;for(const child of group.children)child.setAttribute('aria-checked',String(child===label));onChange?.(name,hex);};
 }
 parent.append(group);return group;
}
