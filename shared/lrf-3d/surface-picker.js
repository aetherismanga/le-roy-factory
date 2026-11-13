import {COLLECTIONS,formatsForColor} from './surface-catalog.js';
import {surfaceColorIssue} from './surface-quality.js';
import {RAL_SCREEN_NOTE} from './ral-colors.js';
import {SEGMENTO,segmentoSelection,segmentoCompositions,segmentoPreview,segmentoComposition} from './segmento.js';
import {enhanceVisualSelect,openVisualPreview,attachVisualPreview} from './visual-choice.js';

const collator=new Intl.Collator('fr',{sensitivity:'base',numeric:true});
// The inspector replaces its picker element after applying a composition.
// Retain browsing filters on its stable body, separately for floor and wall.
const segmentoPickerFilters=new WeakMap();
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
 .surface-preview-card{display:grid;align-content:start;gap:3px;min-width:0}.surface-preview-card>.surface-color,.surface-preview-card>.segmento-choice{width:100%;height:100%}.surface-picker .surface-preview-action{min-height:44px;padding:5px;font-size:10px;background:#f7f5ed;color:#5e7154}.surface-picker .surface-preview-action:focus-visible{outline:2px solid #887858;outline-offset:2px}
 .surface-picker-note{margin:0;padding:10px;border-radius:8px;background:#f1eee3;font-size:12px;line-height:1.5;color:#716247}
 .grout-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;width:100%}
 .grout-choice{display:flex;align-items:center;gap:6px;min-width:0;min-height:44px;padding:7px;border:1px solid #cdd3c3;border-radius:8px;background:#fffdf7;color:#29483e;font-size:12px;cursor:pointer}
 .grout-choice[aria-checked=true]{border:2px solid #294b3f;background:#e9eddf;padding:6px;font-weight:600}
 .grout-choice input{appearance:auto!important;width:16px!important;height:16px!important;margin:0!important;accent-color:#294b3f;flex-shrink:0}
 .grout-choice-sample{width:16px;height:16px;flex-shrink:0;border:1px solid #b0b4aa;border-radius:3px}
 .segmento-pattern-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.segmento-composition-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.surface-picker .segmento-choice{display:grid;gap:5px;padding:5px;font-size:11px;min-width:0;align-content:start;text-align:left}.segmento-choice[aria-pressed=true]{border:2px solid #887858;background:#f1ecdf}.segmento-preview{display:block;width:100%;aspect-ratio:1;overflow:hidden;background:#eee;border-radius:4px}.segmento-preview img,.segmento-preview svg{display:block;width:100%;height:100%;object-fit:contain}.segmento-choice-label{overflow-wrap:anywhere}.segmento-choice-detail{font-size:10px;color:#71816d;line-height:1.3}
 .segmento-current{display:grid;grid-template-columns:58px minmax(0,1fr);gap:9px;align-items:center;padding:9px;border:1px solid #cdd3c3;border-radius:8px;background:#f1ecdf}.segmento-current-copy{display:grid;gap:2px;min-width:0}.segmento-current-copy strong{font-size:12px;overflow-wrap:anywhere}.segmento-current-copy>small:first-child{font-size:10px;text-transform:uppercase;letter-spacing:.04em}
 .segmento-reference-row{display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px}.segmento-reference-row button{font-size:11px}.segmento-search-label{display:grid;gap:4px;font-size:11px;color:#4b5e50}.segmento-search-label input{width:100%;min-width:0;min-height:44px;border:1px solid #cbd2c2;border-radius:8px;padding:10px 11px;color:#29483e;background:#fffdf7}.segmento-filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.segmento-filter-label{display:grid;gap:4px;font-size:11px;color:#4b5e50}.segmento-results-bar{display:flex;align-items:center;justify-content:space-between;gap:7px}.surface-picker .segmento-reset{font-size:11px;padding:6px 8px;flex-shrink:0}.segmento-results{display:grid;gap:13px}.segmento-group{display:grid;gap:6px;min-width:0}.segmento-group h4{font-size:12px;margin:0;color:#4b5e50}.segmento-empty{margin:0;padding:12px;background:#f1eee3;border-radius:8px;font-size:12px}.segmento-pattern-browser{border:1px solid #d5dacb;border-radius:8px;padding:0 8px}.segmento-pattern-browser summary{cursor:pointer;min-height:44px;padding:12px 0;font-size:12px}.segmento-pattern-browser[open]{padding-bottom:8px}.segmento-pattern-grid .segmento-choice{font-size:10px;text-align:center}
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
 if(Object.values(color?.textureVariantsByReference||{}).some(mapping=>mapping.verified&&mapping.format==='120x278'&&mapping.textureProvenance?.kind==='manufacturer-portal-original'))return '4 faces fabricant HD en 120 × 278. Aperçu limité pour le 60 × 120.';
 if(color?.textureProvenance?.kind==='manufacturer-transfer-original')return 'Visuel original transmis par le fabricant.';
 if(color?.textureProvenance?.kind==='product-platform-image')return `Visuel produit · ${(color.resolution||[]).join(' × ')} px · source Tilelook.`;
 if(color?.textureProvenance?.kind==='ai-reconstruction')return 'Reconstitution visuelle · '+(color.textureProvenance.facesPerColor||color.faces?.length||8)+' tampons par couleur · teinte indicative.';
 if(Object.values(color?.textureVariantsByReference||{}).some(mapping=>mapping.verified&&mapping.textureProvenance?.kind==='product-platform-image'))return 'Visuels produit disponibles pour le 60 × 90 Tumbled. Les autres formats conservent leur échantillon catalogue.';
 if(color?.definitionLimited&&color?.previewReviewed&&color.textureProvenance?.kind==='manufacturer-sample')return 'Échantillon officiel du fabricant · définition limitée. Les couleurs et références sont conservées.';
 if(color?.definitionLimited&&color?.previewReviewed)return 'Échantillon du catalogue fabricant · définition limitée. La référence et la finition choisies sont conservées.';
 return color?.definitionLimited?'Visuel fabricant en définition limitée. Les dimensions et la référence du décor sont conservées.':'';
}

// Every entry point uses the same manufacturer → series → colour → size flow.
// Only the current series' thumbnails load; full tile faces remain on demand.
export function renderSurfacePicker(parent,{kind,collection,color,format,urlFor,onCollection,onColor,onFormat,onPaint,paintHex,layout={},onSegmento,allowPaint=kind==='wall',previews=false}){
 installStyle();
 const root=document.createElement('div');root.className='surface-picker';root.dataset.surfacePicker=kind;
 let draft={brand:COLLECTIONS[collection]?.brand||'ELIOS',collection,color,format};
 const visualSelects=new Map(),previewSource=value=>typeof value==='string'&&value.startsWith('assets/')?'https://leroyfactory.fr/'+value:value;
 const colorPreview=co=>previewSource(co?.preview||co?.file||co?.faces?.[0]||'');
 function syncVisualSelect(select,entries,label){let choice=visualSelects.get(select);if(!choice){choice=enhanceVisualSelect(select,{entries,label,urlFor,previews,searchPlaceholder:'Rechercher un nom ou une référence…'});choice.element.dataset.surfaceVisualField=select.dataset.surfaceField||select.dataset.segmentoFilter||(select.dataset.segmentoReference?'segmento-reference':'');choice.trigger.dataset.surfaceFocusField=select.dataset.surfaceField||(select.dataset.segmentoFilter?'segmento-'+select.dataset.segmentoFilter:'segmento-reference');visualSelects.set(select,choice);}else choice.sync(entries);return choice;}
 function withPreview(button,entry){
  if(!previews||!entry.image&&!entry.swatch)return button;
  const card=document.createElement('div'),preview=document.createElement('button');card.className='surface-preview-card';preview.type='button';preview.className='surface-preview-action';preview.textContent='Agrandir';preview.setAttribute('aria-label','Agrandir '+entry.label);preview.dataset.visualChoicePreview=String(entry.value);preview.dataset.surfacePreview=String(entry.value);preview.onclick=event=>{event?.preventDefault?.();event?.stopPropagation?.();openVisualPreview(entry,{urlFor,opener:preview});};
  attachVisualPreview(button,entry,{urlFor});attachVisualPreview(preview,entry,{urlFor});card.append(button,preview);return card;
 }
 const step=(n,title)=>{const field=document.createElement('div');field.className='surface-picker-step';const label=document.createElement('div');label.className='surface-picker-label';const number=document.createElement('span');number.textContent=n;const text=document.createElement('span');text.textContent=title;label.append(number,text);field.append(label);root.append(field);return field;};
 const factories=step('1','Usine'),buttons=document.createElement('div');buttons.className='surface-factories';buttons.setAttribute('role','group');buttons.setAttribute('aria-label','Usine du revêtement');factories.append(buttons);
 const seriesStep=step('2','Série'),series=document.createElement('select'),count=document.createElement('small');series.dataset.surfaceField='collection';series.setAttribute('aria-label','Série du carrelage');seriesStep.append(series,count);
 const segmentoStep=step('3','Segmento · motifs et compositions');
 const colorStep=step('3','Couleur'),colors=document.createElement('div');colors.className='surface-picker-colors';colors.setAttribute('role','group');colors.setAttribute('aria-label','Couleur du revêtement');colorStep.append(colors);
 const ralStep=step('RAL','Nuancier peinture RAL Classic'),ralSearch=document.createElement('input'),ralSelect=document.createElement('select'),ralPreview=document.createElement('small');ralStep.classList.add('surface-ral-picker');ralSearch.type='search';ralSearch.dataset.surfaceField='ral-search';ralSearch.value='';ralSearch.placeholder='Rechercher un code ou une teinte';ralSearch.setAttribute('aria-label','Rechercher une peinture RAL');ralSelect.setAttribute('aria-label','Couleur de peinture RAL');ralSelect.dataset.surfaceField='ral';ralPreview.className='surface-ral-preview';ralStep.append(ralSearch,ralSelect,ralPreview);
 const formatStep=step('4','Format'),sizes=document.createElement('select');sizes.dataset.surfaceField='format';sizes.setAttribute('aria-label','Format du carrelage');const formatNote=document.createElement('small');formatNote.className='surface-format-note';formatStep.append(sizes,formatNote);
 const segmentoSingle=document.createElement('button'),segmentoReference=document.createElement('select'),segmentoPatterns=document.createElement('div'),segmentoVariants=document.createElement('div'),segmentoNote=document.createElement('small'),segmentoCurrent=document.createElement('div'),segmentoCurrentPreview=document.createElement('span'),segmentoCurrentCopy=document.createElement('div'),segmentoCurrentTitle=document.createElement('strong'),segmentoCurrentMeta=document.createElement('small');
 segmentoStep.dataset.segmentoPicker=kind;segmentoSingle.type='button';segmentoSingle.textContent='Référence seule';segmentoSingle.dataset.segmentoComposition='';segmentoReference.dataset.segmentoReference='true';segmentoReference.setAttribute('aria-label','Choisir un carreau Segmento seul, sans composition');
 segmentoCurrent.className='segmento-current';segmentoCurrent.dataset.segmentoCurrent='true';segmentoCurrentPreview.className='segmento-preview';segmentoCurrentCopy.className='segmento-current-copy';const currentLabel=document.createElement('small');currentLabel.textContent='Appliqué à cette surface';segmentoCurrentCopy.append(currentLabel,segmentoCurrentTitle,segmentoCurrentMeta);segmentoCurrent.append(segmentoCurrentPreview,segmentoCurrentCopy);
 const referenceRow=document.createElement('div');referenceRow.className='segmento-reference-row';referenceRow.append(segmentoSingle,segmentoReference);
 const segmentoSearchLabel=document.createElement('label'),segmentoSearch=document.createElement('input');segmentoSearchLabel.className='segmento-search-label';segmentoSearchLabel.textContent='Rechercher une composition';segmentoSearch.type='search';segmentoSearch.placeholder='Nom, référence, motif ou composition…';segmentoSearch.setAttribute('aria-label','Rechercher une composition Segmento par nom, référence ou numéro');segmentoSearch.dataset.segmentoFilter='search';segmentoSearch.dataset.surfaceField='segmento-search';segmentoSearchLabel.append(segmentoSearch);
 const segmentoFilters=document.createElement('div'),segmentoPatternFilter=document.createElement('select'),segmentoColorFilter=document.createElement('select');segmentoFilters.className='segmento-filters';
 for(const [control,title,name]of [[segmentoPatternFilter,'Motif','pattern'],[segmentoColorFilter,'Couleur présente','color']]){const label=document.createElement('label');label.className='segmento-filter-label';label.textContent=title;control.dataset.segmentoFilter=name;control.setAttribute('aria-label',title+' des compositions Segmento');label.append(control);segmentoFilters.append(label);}
 const segmentoBrowser=document.createElement('details'),segmentoBrowserTitle=document.createElement('summary');segmentoBrowser.className='segmento-pattern-browser';segmentoBrowserTitle.textContent='Voir les 12 motifs en images';segmentoPatterns.className='segmento-pattern-grid';segmentoPatterns.setAttribute('role','group');segmentoPatterns.setAttribute('aria-label','Parcourir les motifs Segmento sans les appliquer');segmentoBrowser.append(segmentoBrowserTitle,segmentoPatterns);
 const segmentoResultsBar=document.createElement('div'),segmentoCount=document.createElement('small'),segmentoReset=document.createElement('button');segmentoResultsBar.className='segmento-results-bar';segmentoCount.dataset.segmentoCount='true';segmentoCount.setAttribute('role','status');segmentoCount.setAttribute('aria-live','polite');segmentoReset.type='button';segmentoReset.className='segmento-reset';segmentoReset.dataset.segmentoReset='true';segmentoReset.textContent='Réinitialiser';segmentoResultsBar.append(segmentoCount,segmentoReset);
 segmentoVariants.className='segmento-results';segmentoVariants.setAttribute('aria-label','Compositions Segmento');segmentoNote.textContent='12 motifs · 48 compositions du fabricant · 15 × 15 cm. Parcourez les motifs, puis choisissez une composition pour l’appliquer. Quantités et boîtes par référence.';segmentoStep.append(segmentoCurrent,referenceRow,segmentoNote,segmentoSearchLabel,segmentoFilters,segmentoBrowser,segmentoResultsBar,segmentoVariants);
 let composition=segmentoSelection(layout);
 const segmentoFilterHost=parent.closest?.('#object-editor-body')||parent,segmentoHostFilters=segmentoPickerFilters.get(segmentoFilterHost)||new Map(),segmentoFilter=segmentoHostFilters.get(kind)||{pattern:'',color:'',search:''},searchText=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),motifLabel=pattern=>'Motif '+(pattern.id.match(/\d+/)?.[0]||pattern.id);
 const compositionColors=item=>SEGMENTO.colors.filter(co=>item.tiles.some(tile=>tile.color===co.id));
 const matchesSearch=item=>{const terms=searchText(segmentoFilter.search).split(/\s+/).filter(Boolean),pattern=SEGMENTO.patterns.find(p=>p.id===item.patternId),parts=[item.id,item.label,item.description,pattern?.label,pattern?.name,pattern&&motifLabel(pattern),...compositionColors(item).flatMap(co=>[co.id,co.label,co.name,co.ref])],text=searchText(parts.join(' ')),compact=text.replace(/\s+/g,'');return terms.every(term=>text.includes(term)||compact.includes(term));};
 const chooseSegmento=id=>{composition=segmentoComposition(id);populateSegmento();onSegmento?.(composition?.id||null);};
 segmentoSingle.onclick=()=>chooseSegmento(null);
 segmentoReference.onchange=()=>{if(!segmentoReference.value)return;draft.color=segmentoReference.value;composition=null;populateColors();onColor?.(draft.color);};
 segmentoSearch.oninput=()=>{segmentoFilter.search=segmentoSearch.value;populateSegmento();};segmentoPatternFilter.onchange=()=>{segmentoFilter.pattern=segmentoPatternFilter.value;populateSegmento();};segmentoColorFilter.onchange=()=>{segmentoFilter.color=segmentoColorFilter.value;populateSegmento();};
 segmentoReset.onclick=()=>{segmentoFilter.pattern=segmentoFilter.color=segmentoFilter.search='';populateSegmento();};
 function populateSegmento(){
  segmentoStep.hidden=draft.collection!=='Segmento'||!onSegmento;if(segmentoStep.hidden)return;
  segmentoHostFilters.set(kind,segmentoFilter);segmentoPickerFilters.set(segmentoFilterHost,segmentoHostFilters);
  segmentoSingle.setAttribute('aria-pressed',String(!composition));segmentoPatterns.replaceChildren();segmentoVariants.replaceChildren();
  const selectedColor=SEGMENTO.colors.find(co=>co.id===draft.color),labelFor=co=>(co.label||co.name||co.id)+' · '+co.ref;
  segmentoReference.replaceChildren(new Option('Choisir une référence seule…',''),...SEGMENTO.colors.map(co=>new Option(labelFor(co),co.id)));segmentoReference.value=composition?'':draft.color;
  const colorEntries=SEGMENTO.colors.map(co=>({value:co.id,label:labelFor(co),detail:'Segmento · '+co.ref+' · 15 × 15 cm',image:colorPreview(co)}));
  syncVisualSelect(segmentoReference,[{value:'',label:'Choisir une référence seule…'},...colorEntries],'Choisir un carreau Segmento seul, sans composition');
  segmentoCurrentPreview.replaceChildren();segmentoCurrentPreview.innerHTML=composition?segmentoPreview(composition,urlFor):'';
  if(!composition&&selectedColor){const sample=COLLECTIONS.Segmento.colors.find(co=>co.id===draft.color),img=document.createElement('img');img.src=urlFor(sample.file||sample.faces[0]);img.alt='';segmentoCurrentPreview.append(img);}
  segmentoCurrentTitle.textContent=composition?composition.label:'Carreau seul · '+(selectedColor?labelFor(selectedColor):draft.color);segmentoCurrentMeta.textContent=composition?composition.description:'15 × 15 cm · quantités et boîtes pour cette référence';
  segmentoPatternFilter.replaceChildren(new Option('Tous les motifs · 48',''),...SEGMENTO.patterns.map(pattern=>new Option(motifLabel(pattern)+' · '+segmentoCompositions(pattern.id).length,pattern.id)));segmentoPatternFilter.value=segmentoFilter.pattern;
  segmentoColorFilter.replaceChildren(new Option('Toutes les couleurs',''),...SEGMENTO.colors.map(co=>new Option(labelFor(co),co.id)));segmentoColorFilter.value=segmentoFilter.color;segmentoSearch.value=segmentoFilter.search;
  syncVisualSelect(segmentoPatternFilter,[{value:'',label:'Tous les motifs · 48 compositions'},...SEGMENTO.patterns.map(pattern=>{const variants=segmentoCompositions(pattern.id);return {value:pattern.id,label:motifLabel(pattern),detail:variants.length+' compositions',image:previewSource(variants[0]?.preview)};})],'Parcourir les motifs Segmento');
  syncVisualSelect(segmentoColorFilter,[{value:'',label:'Toutes les couleurs'},...colorEntries],'Couleur présente dans les compositions Segmento');
  const makeChoice=(item,label,active,attribute,select,detail='')=>{const button=document.createElement('button');button.type='button';button.className='segmento-choice';button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',label+(detail?' · '+detail:''));button.dataset[attribute]=attribute==='segmentoPattern'?item.patternId:item.id;const image=document.createElement('span');image.className='segmento-preview';image.innerHTML=segmentoPreview(item,urlFor);const caption=document.createElement('span');caption.className='segmento-choice-label';caption.textContent=label;button.append(image,caption);if(detail){const text=document.createElement('span');text.className='segmento-choice-detail';text.textContent=detail;button.append(text);}button.onclick=select;return withPreview(button,{value:attribute==='segmentoPattern'?item.patternId:item.id,label,detail,image:previewSource(item.preview)});};
  for(const pattern of SEGMENTO.patterns){const variants=segmentoCompositions(pattern.id),first=variants[0];if(first)segmentoPatterns.append(makeChoice(first,pattern.name||pattern.label||pattern.id,segmentoFilter.pattern===pattern.id,'segmentoPattern',()=>{segmentoFilter.pattern=pattern.id;segmentoBrowser.open=false;populateSegmento();(visualSelects.get(segmentoPatternFilter)?.trigger||segmentoPatternFilter).focus?.();},variants.length+' compositions'));}
  const filtered=SEGMENTO.compositions.filter(item=>(!segmentoFilter.pattern||item.patternId===segmentoFilter.pattern)&&(!segmentoFilter.color||item.tiles.some(tile=>tile.color===segmentoFilter.color))&&matchesSearch(item));
  segmentoCount.textContent=filtered.length+' composition'+(filtered.length>1?'s':'')+' sur '+SEGMENTO.compositions.length;segmentoReset.disabled=!segmentoFilter.pattern&&!segmentoFilter.color&&!segmentoFilter.search;
  for(const pattern of SEGMENTO.patterns){const variants=filtered.filter(item=>item.patternId===pattern.id);if(!variants.length)continue;const group=document.createElement('section'),heading=document.createElement('h4'),grid=document.createElement('div');group.className='segmento-group';group.dataset.segmentoGroup=pattern.id;heading.textContent=(pattern.name||pattern.label||pattern.id)+' · '+variants.length+' composition'+(variants.length>1?'s':'');grid.className='segmento-composition-grid';grid.setAttribute('role','group');grid.setAttribute('aria-label',heading.textContent);for(const variant of variants)grid.append(makeChoice(variant,variant.label||variant.id,composition?.id===variant.id,'segmentoComposition',()=>chooseSegmento(variant.id),variant.description));group.append(heading,grid);segmentoVariants.append(group);}
  if(!filtered.length){const empty=document.createElement('p');empty.className='segmento-empty';empty.textContent='Aucune composition ne correspond. Modifiez la recherche ou réinitialisez les filtres.';segmentoVariants.append(empty);}
 }
 const paint=document.createElement('label');paint.className='surface-picker-step surface-paint-custom';paint.textContent='Votre couleur de peinture';const input=document.createElement('input');input.type='color';input.value=paintHex||'#eeeae0';input.setAttribute('aria-label','Couleur personnalisée de peinture');input.oninput=()=>onPaint?.(input.value);paint.append(input);root.append(paint);
 const note=document.createElement('p');note.className='surface-picker-note';note.setAttribute('role','status');root.append(note);
 const source=document.createElement('a');source.textContent='Consulter la collection fabricant ↗';source.target='_blank';source.rel='noopener noreferrer';root.append(source);
 function populateFormats(){const eligible=availableColors(draft.collection).some(c=>c.id===draft.color),fs=eligible?formatsForColor(draft.collection,draft.color):[];sizes.replaceChildren(...fs.map(f=>new Option(f.label||f.id.replace('x',' × ')+' cm',f.id)));if(!fs.some(f=>f.id===draft.format))draft.format=fs[0]?.id||'';sizes.value=draft.format;sizes.disabled=!availableColors(draft.collection).some(c=>c.id===draft.color);formatStep.hidden=draft.collection==='Peinture'||draft.collection==='Segmento'&&!!onSegmento||!draft.collection||!eligible;const selected=fs.find(f=>f.id===draft.format);formatNote.hidden=!selected?.note;formatNote.textContent=selected?.note||'';}
 function populateRal(){
  const choices=availableColors(draft.collection).filter(c=>c.id.startsWith('ral-'));ralStep.hidden=draft.collection!=='Peinture'||!choices.length;if(ralStep.hidden)return;
  const query=ralSearch.value.trim().toLocaleLowerCase('fr'),filtered=choices.filter(c=>(c.name+' '+(c.code||'')).toLocaleLowerCase('fr').includes(query));
  ralSelect.replaceChildren(new Option(filtered.length?'Choisir une teinte RAL…':'Aucune teinte correspondante',''),...filtered.map(c=>new Option(c.name,c.id)));ralSelect.value=filtered.some(c=>c.id===draft.color)?draft.color:'';
  const selected=choices.find(c=>c.id===draft.color);ralPreview.textContent=(selected?selected.name+' · ':'')+RAL_SCREEN_NOTE;ralPreview.style.setProperty('--ral-preview',selected?.hex||'#eeeae0');
  syncVisualSelect(ralSelect,[{value:'',label:filtered.length?'Choisir une teinte RAL…':'Aucune teinte correspondante'},...filtered.map(co=>({value:co.id,label:co.name,detail:RAL_SCREEN_NOTE,swatch:co.hex}))],'Choisir une couleur de peinture RAL');
 }
 ralSearch.oninput=populateRal;ralSelect.onchange=()=>{if(!ralSelect.value)return;draft.color=ralSelect.value;populateColors();onColor?.(draft.color);};
 function populateColors(){populateSegmento();colors.replaceChildren();const c=COLLECTIONS[draft.collection],choices=availableColors(draft.collection);colorStep.hidden=!choices.length||draft.collection==='Segmento'&&!!onSegmento;paint.hidden=draft.collection!=='Peinture'||!onPaint;note.hidden=true;source.hidden=!c?.source;if(c?.source)source.href=c.source;
  for(const co of choices.filter(c=>!c.id.startsWith('ral-'))){const b=document.createElement('button');b.type='button';b.className='surface-color';b.dataset.surfaceColor=co.id;b.dataset.surfaceKind=kind;b.setAttribute('aria-pressed',String(co.id===draft.color));b.setAttribute('aria-label',co.name);const sample=document.createElement('span');sample.className='surface-color-sample';if(co.file){const img=document.createElement('img');img.src=urlFor(colorPreview(co));img.alt='';img.loading='lazy';img.decoding='async';sample.append(img);}else if(co.hex)sample.style.backgroundColor=co.hex;const name=document.createElement('span');name.className='surface-color-name';name.textContent=co.name;b.append(sample,name);b.onclick=()=>{draft.color=co.id;composition=null;populateColors();populateFormats();onColor?.(co.id);};colors.append(withPreview(b,{value:co.id,label:co.name,detail:[draft.collection,surfacePreviewNote(co)].filter(Boolean).join(' · '),image:colorPreview(co),swatch:co.hex}));}
  if(c&&draft.color&&!choices.some(co=>co.id===draft.color)){note.hidden=false;note.textContent=choices.length?'Le coloris enregistré reste appliqué. Choisissez une couleur pour le remplacer.':'Ce revêtement est conservé dans votre projet. Choisissez une série pour le remplacer.';}
  const previewNote=surfacePreviewNote(choices.find(co=>co.id===draft.color));if(previewNote){const prior=note.hidden?'':note.textContent+' ';note.hidden=false;note.textContent=prior+previewNote;}
  if(choices.find(co=>co.id===draft.color)?.continuousDecor){const detail=note.hidden?'':note.textContent+' ';note.hidden=false;note.textContent=(choices.find(co=>co.id===draft.color)?.decorRotations?'Décor complet sur 4 carreaux (2 × 2) · rotations automatiques. ':'Décor à raccord continu · pose droite, horizontale ou verticale. ')+detail;}
  populateRal();populateFormats();
 }
 function populateSeries(placeholder=false){const entries=surfaceSeries(draft.brand,kind),current=entries.some(([name])=>name===draft.collection);series.replaceChildren();if(!current&&COLLECTIONS[draft.collection]){const legacy=new Option(draft.collection+' · référence enregistrée',draft.collection,true,true);legacy.disabled=true;legacy.dataset.legacyMaterial='true';series.append(legacy);}else if(placeholder||!current)series.append(new Option('Choisir une série…',''));for(const [name]of entries)series.append(new Option(name,name));series.value=current||COLLECTIONS[draft.collection]?draft.collection:'';count.textContent=entries.length+' série'+(entries.length>1?'s':'');seriesStep.hidden=draft.brand==='Peinture';syncVisualSelect(series,Array.from(series.options||series.children).map(option=>{const sample=availableColors(option.value).find(co=>co.file||co.hex);return {value:option.value,label:option.textContent,detail:option.value?'Collection · aperçu représentatif':'',image:colorPreview(sample),swatch:sample?.hex,disabled:option.disabled};}),'Choisir une collection de carrelage');populateColors();}
 for(const brand of ['ELIOS','VIEW',...(allowPaint?['Peinture']:[])].filter(name=>surfaceSeries(name,kind).length)){const b=document.createElement('button');b.type='button';b.textContent=brand;b.dataset.surfaceBrand=brand;b.setAttribute('aria-pressed',String(draft.brand===brand));b.onclick=()=>{if(draft.brand===brand)return;draft.brand=brand;draft.collection=brand==='Peinture'?'Peinture':'';draft.color=brand==='Peinture'?'white':'';draft.format='';for(const button of buttons.children)button.setAttribute('aria-pressed',String(button===b));populateSeries(brand!=='Peinture');if(brand==='Peinture')onCollection?.('Peinture');};buttons.append(b);}
 series.onchange=()=>{draft.collection=series.value;composition=null;const c=COLLECTIONS[draft.collection];draft.color=availableColors(draft.collection)[0]?.id||c?.colors[0]?.id||'';draft.format='';populateColors();if(availableColors(draft.collection).length)onCollection?.(draft.collection);};
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
