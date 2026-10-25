import {formatsForColor} from './surface-catalog.js';
import {availableColors,renderSurfacePicker} from './surface-picker.js';
const clone=value=>JSON.parse(JSON.stringify(value));
function choice(parent,label,value,options,onChange,key){
 const field=document.createElement('label');field.className='context-field';field.textContent=label;
 const select=document.createElement('select');select.dataset.trayControl=key;
 for(const [id,name] of options){const option=document.createElement('option');option.value=id;option.textContent=name;select.append(option);}select.value=String(value);select.onchange=()=>onChange(select.value);field.append(select);parent.append(field);return select;
}
function style(){if(document.getElementById('tiled-shower-tray-style'))return;const tag=document.createElement('style');tag.id='tiled-shower-tray-style';tag.textContent=`
#object-editor .fixture-fields:has(>.tray-covering-controls){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;min-width:0;width:100%;box-sizing:border-box}
#object-editor .fixture-fields:has(>.tray-covering-controls)>.context-field{min-width:0;width:auto}
#object-editor .tray-covering-controls{grid-column:1/-1;display:grid;gap:12px;min-width:0;width:100%}
#object-editor .tray-covering-controls label{display:grid;gap:7px;min-width:0;width:100%}
#object-editor .tray-covering-controls select{box-sizing:border-box;width:100%;min-width:0;min-height:40px;padding:9px;border:1px solid #c7d1bd;border-radius:4px;background:#fff;color:inherit;font:inherit}
#object-editor .lrf-mobile-options:has(.tray-covering-controls),#object-editor .lrf-mobile-option-content:has(.tray-covering-controls){display:block;min-width:0;width:100%;box-sizing:border-box}
#object-editor .lrf-mobile-options:not([open])>.lrf-mobile-option-content:has(.tray-covering-controls){display:none}
#object-editor .tray-covering-controls .surface-picker{min-width:0;width:100%}
`;document.head.append(tag);}
export function renderTiledTrayControls(parent,item,{floorFinish,update,urlFor}){
 style();const settings=item.settings;
 choice(parent,'Pose du receveur',settings.trayInstallation||'flush',[['flush','Encastré · à fleur du sol'],['raised','Surélevé']],trayInstallation=>update({trayInstallation}), 'installation');
 if(settings.trayInstallation==='raised'){
  const label=document.createElement('label');label.className='context-field';label.textContent='Hauteur finie (cm)';const input=document.createElement('input');input.type='number';input.min=3;input.max=40;input.step=1;input.value=settings.trayHeight||12;input.dataset.trayControl='height';const changeHeight=()=>{const value=Number(input.value);if(value===Number(settings.trayHeight||12))return;input.onchange=null;if(update({trayHeight:value})===false&&input.isConnected)input.onchange=changeHeight;};input.onchange=changeHeight;label.append(input);parent.append(label);
 }
 choice(parent,'Profilé de rive',settings.trayProfile?'on':'off',[['off','Sans profilé'],['on','Avec profilé']],value=>update({trayProfile:value==='on'}),'profile');
 if(settings.trayProfile)choice(parent,'Finition du profilé',settings.trayProfileColor||'Argent',[['Argent','Argent'],['Noir','Noir'],['Doré','Doré'],['Bronze','Bronze']],trayProfileColor=>update({trayProfileColor}),'profile-color');
 const wrapper=document.createElement('section');wrapper.className='tray-covering-controls';parent.append(wrapper);
 const mode=settings.trayCovering?.mode||'inherit';
 const base=floorFinish?.collection&&floorFinish.collection!=='Peinture'?floorFinish:{collection:'Shell',color:availableColors('Shell')[0]?.id};
 const canonical=value=>{const finish=clone(value?.collection?value:base);finish.format=finish.format||formatsForColor(finish.collection,finish.color)[0]?.id;return finish;};
 let top=canonical(settings.trayCovering?.top),reveal=canonical(settings.trayCovering?.reveal);
 const emit=nextMode=>update({trayCovering:{mode:nextMode,...(['all','split'].includes(nextMode)?{top:clone(top)}:{}),...(nextMode==='split'?{reveal:clone(reveal)}:{})}});
 choice(wrapper,'Carrelage du receveur',mode,[['inherit','Assorti au sol'],['all','Même carrelage partout'],['split','Dessus et rebords différents']],emit,'covering');
 const picker=(part,title)=>{
  const heading=document.createElement('h4');heading.textContent=title;wrapper.append(heading);const host=document.createElement('div');wrapper.append(host);
  const get=()=>part==='top'?top:reveal,put=value=>{if(part==='top')top=value;else reveal=value;emit(mode);};const current=get();
  renderSurfacePicker(host,{kind:'floor',allowPaint:false,collection:current.collection,color:current.color,format:current.format,urlFor,
   onCollection:collection=>{const color=availableColors(collection)[0]?.id;put({collection,color,format:formatsForColor(collection,color)[0]?.id,tiles:{}});},
   onColor:color=>{const value={...get(),color,tiles:{}};value.format=formatsForColor(value.collection,color).some(format=>format.id===value.format)?value.format:formatsForColor(value.collection,color)[0]?.id;for(const key of ['catalogueKey','reference','sourceColorId','colorId','fidelity','contractVersion','finish'])delete value[key];put(value);},
   onFormat:format=>{const value={...get(),format};for(const key of ['catalogueKey','reference','sourceColorId','colorId','fidelity','contractVersion','finish'])delete value[key];put(value);}});
 };
 if(mode==='all'||mode==='split')picker('top',mode==='all'?'Carrelage du receveur':'Carrelage du dessus');
 if(mode==='split'&&settings.trayInstallation==='raised')picker('reveal','Carrelage des rebords');
 const note=document.createElement('small');note.textContent='Receveur à carreler sur mesure · matériaux relevés séparément, prix du support à confirmer.';wrapper.append(note);
 return wrapper;
}
