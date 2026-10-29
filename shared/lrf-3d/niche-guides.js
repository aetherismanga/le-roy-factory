import * as T from 'three';
import {Line2} from 'three/addons/lines/Line2.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';

// These are editor aids, never part of a project's architectural geometry.
// Real depth testing clips them behind furniture and other walls. Two dashed
// strokes keep the outline legible on both light and dark tiles.
export function makeNicheGuide(width,height,{preview=false,invalid=false}={}){
 const group=new T.Group();group.name='Repere_niche';group.userData.editorGuide=true;
 const positions=[0,0,.004,width,0,.004,width,height,.004,0,height,.004,0,0,.004];
 for(const [color,linewidth,order] of [[0xffffff,4.5,20],[invalid?0xa13929:preview?0x294b3f:0x253b33,2.2,21]]){
  const geometry=new LineGeometry();geometry.setPositions(positions);
  const material=new LineMaterial({color,linewidth,dashed:true,dashSize:.045,gapSize:.03,depthTest:true,depthWrite:false,toneMapped:false});
  const line=new Line2(geometry,material);line.computeLineDistances();line.renderOrder=order;line.raycast=()=>{};group.add(line);
 }
 return group;
}

export function disposeNicheGuide(group){
 group.removeFromParent();group.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});
}

// Synchronous render transaction, including a failure in the renderer/encoder.
// Used by thumbnails, HD exports and mirror rendering in both applications.
export function withoutEditorGuides(root,render){
 const hidden=[];root?.traverse(object=>{if(object.userData.editorGuide){hidden.push([object,object.visible]);object.visible=false;}});
 try{return render();}finally{for(const [object,visible] of hidden)object.visible=visible;}
}
