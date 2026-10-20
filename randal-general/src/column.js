import * as T from 'three';
import {makeColumn as makeStudioColumn} from './base-column.js';
import {columnFormat} from './configuration.js';
export const COLUMN_SPEC=Object.freeze({width:.30,height:1.50,depth:.27,bottom:.28,panel:.019});
export function makeColumn(settings={}){
 const form=columnFormat(settings.columnModel),root=new T.Group(),count=form.collection==='brent'&&form.width===60?2:1,parts=[];let hinge='left',angle=0;
 const wood=new T.MeshPhysicalMaterial({color:'#c4ae94',roughness:.45,clearcoat:.12}),frontWood=wood.clone(),metal=new T.MeshStandardMaterial({color:'#afb2b3',metalness:.85,roughness:.3});
 const box=(parent,w,h,d,mat,x,y,z,name)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const body=(form.height-(form.legHeight||0))/100,base=(form.base+(form.legHeight||0))/100;
 for(let i=0;i<count;i++){
  const asset=makeStudioColumn(),scale=new T.Vector3(form.width/count/38,body/1.32,form.depth/27);asset.root.scale.copy(scale);asset.root.position.set((i-(count-1)/2)*form.width/count/100,base-.28*scale.y,-.23+.23*scale.z);
  asset.root.traverse(o=>{if(o.material===asset.wood)o.material=wood;if(o.material===asset.frontWood)o.material=frontWood;});
  const f=asset.door.children.find(o=>o.name.startsWith('Facade_'));
  if(form.collection==='brent'){
   for(const x of [0.012,.364])box(asset.door,.02,1.316,.01,frontWood,x,.658,.018,'Cadre_colonne_Brent');
   for(const y of [.01,1.306])box(asset.door,.376,.02,.01,frontWood,.188,y,.018,'Traverse_colonne_Brent');
  }
  box(asset.door,form.collection==='luce'?.17:.075,.009,.02,metal,.265,.73,.026,'Poignee_colonne');
  root.add(asset.root);parts.push(asset);
 }
 if(form.legHeight)for(const x of [-1,1])for(const z of [-1,1])box(root,.022,form.legHeight/100,.022,metal,x*(form.width/200-.025),form.legHeight/200,z*(form.depth/200-.03)-.23+form.depth/200,'Pied_colonne_Brent');
 const door={rotation:{get y(){return angle;},set y(v){angle=v;parts.forEach((p,i)=>p.door.rotation.y=count===2&&i===1?-v:v);}}};
 return {root,wood,frontWood,door,spec:{width:form.width/100,height:form.height/100,depth:form.depth/100,bottom:form.base/100},setMetalFinish(id){metal.color.set(form.collection==='luce'||id.includes('or-vieilli')?'#b49a60':'#afb2b3');},setHingeSide(side){hinge=side;parts.forEach((p,i)=>p.setHingeSide(count===2&&i===1?'right':side));return true;},getHingeSide:()=>hinge,getHingeSign:()=>hinge==='left'?1:-1};
}
