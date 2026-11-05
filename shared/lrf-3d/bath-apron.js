import {createSurface} from './room.js';
import {COLLECTIONS,tileFormat,formatsForColor,normalizeLayout} from './surface-catalog.js';
import {renderSurfacePicker,availableColors} from './surface-picker.js';

export const APRON_FACES=[{id:'front',name:'Face centrale'},{id:'left',name:'Côté gauche'},{id:'right',name:'Côté droit'}];
const selectedFaces=new WeakMap();
export function apronFinish(settings,part='front'){
 const legacy={collection:settings.apronCollection||'Creta',color:settings.apronColor||'avena',format:settings.apronFormat,catalogueKey:settings.apronCatalogueKey};
 const finish=settings.apronFaces?.[part]?{...settings.apronFaces[part]}:legacy;finish.format=finish.format||tileFormat(finish.collection)?.id;return finish;
}
export function apronFacesError(settings){
 if(settings.apronFaces===undefined)return '';
 const faces=settings.apronFaces;
 if(!faces||typeof faces!=='object'||Array.isArray(faces)||Object.keys(faces).some(k=>!APRON_FACES.some(f=>f.id===k)))return 'Faces du tablier invalides.';
 for(const finish of Object.values(faces))if(!finish||typeof finish!=='object'||!COLLECTIONS[finish.collection]?.colors?.some(c=>c.id===finish.color)||!formatsForColor(finish.collection,finish.color).some(f=>f.id===finish.format))return 'Revêtement du tablier invalide.';
 return '';
}
export function collectApronFinishes(items=[]){return items.filter(item=>item.type==='bath'&&item.settings.apron==='tile'&&item.settings.kind!=='island').flatMap(item=>APRON_FACES.map(face=>apronFinish(item.settings,face.id)));}
export function createBathAprons(root,settings,width,depth,carriers=[]){
 return ['front','right','left'].map((part,index)=>{
  const w=index===0?width:depth,face=createSurface([[0,0],[w,0],[w,.558],[0,.558]],'Tablier_'+part),finish=apronFinish(settings,part);
  face.part=part;face.mat=face.material;face.length=w;face.height=.558;face.group.userData.apronPart=part;
  face.setLayout(normalizeLayout(tileFormat(finish.collection,finish.format),finish.collection,finish.format,finish.color));
  if(index===0)face.group.position.set(-width/2,0,-.23+depth+.002);
  else if(index===1){face.group.position.set(width/2+.002,0,-.23+depth);face.group.rotation.y=Math.PI/2;}
  else{face.group.position.set(-width/2-.002,0,-.23);face.group.rotation.y=-Math.PI/2;}
  if(carriers[index])carriers[index].userData.apronPart=part;
  face.group.visible=settings.apron==='tile';root.add(face.group);return face;
 });
}
export function selectApronFace(item,hit){
 if(item?.type!=='bath')return false;
 for(let object=hit?.object;object;object=object.parent)if(APRON_FACES.some(f=>f.id===object.userData.apronPart)){selectedFaces.set(item,object.userData.apronPart);return true;}
 return false;
}
export function applyBathApron(item,applySurface){
 if(item.type!=='bath')return;
 item.asset.setApron(null);
 if(item.settings.apron!=='tile')return;
 for(const face of item.asset.tileAprons||[]){const finish=apronFinish(item.settings,face.part);applySurface(face,finish);}
}
export function renderApronPicker(parent,item,{update,urlFor}){
 const settings=item.settings,part=selectedFaces.get(item)||'front',label=document.createElement('label'),select=document.createElement('select');
 label.textContent='Face du tablier';select.setAttribute('aria-label','Face du tablier');
 for(const face of APRON_FACES){const option=document.createElement('option');option.value=face.id;option.textContent=face.name;select.append(option);}select.value=part;label.append(select);parent.append(label);
 const picker=document.createElement('div');parent.append(picker);
 const draw=()=>{
  const face=select.value,finish=apronFinish(settings,face),save=next=>update({apronFaces:{...settings.apronFaces,[face]:next}});
  renderSurfacePicker(picker,{kind:'wall',allowPaint:false,collection:finish.collection,color:finish.color,format:finish.format,urlFor,
   onCollection:collection=>{const color=availableColors(collection)[0]?.id;save({collection,color,format:formatsForColor(collection,color)[0]?.id});},
   onColor:color=>save({collection:finish.collection,color,format:formatsForColor(finish.collection,color).some(f=>f.id===finish.format)?finish.format:formatsForColor(finish.collection,color)[0]?.id}),
   onFormat:format=>save({...finish,format,catalogueKey:undefined,reference:undefined,pack:undefined,packs:undefined})});
 };
 select.onchange=()=>{selectedFaces.set(item,select.value);draw();};draw();
 const note=document.createElement('small');note.textContent='Cliquez sur une face dans la vue 3D pour choisir son carrelage. Chaque face conserve son revêtement.';parent.append(note);
}
