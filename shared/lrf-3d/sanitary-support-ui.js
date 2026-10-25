import {formatsForColor} from './surface-catalog.js';
import {availableColors,renderSurfacePicker} from './surface-picker.js';
import {supportCoveringMode} from './sanitary-support.js';
const clone=value=>JSON.parse(JSON.stringify(value));
const HEX=/^#[a-f0-9]{6}$/i;
function installSupportStyle(){
 if(document.getElementById('sanitary-support-style'))return;
 const style=document.createElement('style');style.id='sanitary-support-style';style.textContent=`
 #object-editor:has(.support-covering-controls) #object-editor-body{display:block;min-width:0;overflow-x:hidden}
 #object-editor .fixture-fields:has(>.support-covering-controls){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:8px;min-width:0;width:100%;box-sizing:border-box}
 #object-editor .fixture-fields:has(>.support-covering-controls)>.context-field{width:auto;min-width:0}
 #object-editor .lrf-mobile-options:has(.support-covering-controls),#object-editor .lrf-mobile-option-content:has(.support-covering-controls){display:block;width:100%;min-width:0;box-sizing:border-box}
 #object-editor .lrf-mobile-options:not([open])>.lrf-mobile-option-content:has(.support-covering-controls){display:none}
 #object-editor .support-covering-controls .surface-picker{min-width:0;width:100%}
 `;document.head.append(style);
}

// Uses the same manufacturer/collection/colour/format picker as a niche. The
// caller retains authority for read-only state, geometry updates and history.
export function renderSupportCoveringControls(parent,settings,wallFinish,{onChange,urlFor}){
 installSupportStyle();
 const wrapper=document.createElement('section');wrapper.className='support-covering-controls';Object.assign(wrapper.style,{gridColumn:'1 / -1',display:'grid',gap:'12px',minWidth:'0',width:'100%'});parent.append(wrapper);
 const label=document.createElement('label');label.textContent='Revêtement du bâti-support';Object.assign(label.style,{display:'grid',gap:'7px',minWidth:'0'});
 const select=document.createElement('select');select.dataset.supportCovering='mode';
 Object.assign(select.style,{boxSizing:'border-box',width:'100%',minWidth:'0',minHeight:'40px',padding:'9px',border:'1px solid #c7d1bd',borderRadius:'4px',background:'#fff',color:'inherit',font:'inherit'});
 for(const [id,name] of [['inherit','Assorti au mur'],['all','Même carrelage partout'],['split','Façade et côtés différents'],['paint','Peinture unie']]){const option=document.createElement('option');option.value=id;option.textContent=name;select.append(option);}
 const mode=supportCoveringMode(settings);select.value=mode;label.append(select);wrapper.append(label);
 const base=wallFinish?.collection&&wallFinish.collection!=='Peinture'?wallFinish:{collection:'Creta',color:availableColors('Creta')[0]?.id};
 const canonical=finish=>{const value=clone(finish?.collection?finish:base);value.format=value.format||formatsForColor(value.collection,value.color)[0]?.id;return value;};
 let back=canonical(settings.supportCovering?.back),reveal=canonical(settings.supportCovering?.reveal);
 const emit=patch=>onChange({supportCovering:{mode:select.value,...(['all','split'].includes(select.value)?{back:clone(back)}:{}),...(select.value==='split'?{reveal:clone(reveal)}:{})},...patch});
 select.onchange=()=>emit(select.value==='paint'?{supportColor:HEX.test(settings.supportColor||'')?settings.supportColor:'#d6cabb'}:{});
 if(mode==='paint'){
  const color=document.createElement('input');color.type='color';color.value=settings.supportColor||'#d6cabb';color.setAttribute('aria-label','Couleur de l’habillage du bâti-support');color.onchange=()=>emit({supportColor:color.value});wrapper.append(color);
 }
 const editor=(part,title)=>{
  const heading=document.createElement('h4');heading.textContent=title;wrapper.append(heading);const host=document.createElement('div');wrapper.append(host);
  const get=()=>part==='back'?back:reveal,put=value=>{if(part==='back')back=value;else reveal=value;emit({});};
  const current=get();renderSurfacePicker(host,{kind:'wall',allowPaint:false,collection:current.collection,color:current.color,format:current.format,urlFor,
   onCollection:collection=>{const color=availableColors(collection)[0]?.id;put({collection,color,format:formatsForColor(collection,color)[0]?.id,tiles:{}});},
   onColor:color=>{const value={...get(),color,tiles:{}};value.format=formatsForColor(value.collection,color).some(format=>format.id===value.format)?value.format:formatsForColor(value.collection,color)[0]?.id;for(const key of ['catalogueKey','reference','sourceColorId','colorId','fidelity','contractVersion','finish'])delete value[key];put(value);},
   onFormat:format=>{const value={...get(),format};for(const key of ['catalogueKey','reference','sourceColorId','colorId','fidelity','contractVersion','finish'])delete value[key];put(value);}});
 };
 if(mode==='all'||mode==='split')editor('back',mode==='all'?'Carrelage du bâti-support':'Carrelage de la façade');
 if(mode==='split')editor('reveal','Carrelage des côtés et du dessus');
 return wrapper;
}

export function renderSupportControls(parent,item,{wallFinish,update,urlFor}){
 return renderSupportCoveringControls(parent,item.settings,wallFinish,{onChange:update,urlFor});
}
