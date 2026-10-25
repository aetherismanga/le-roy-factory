// Genuine workshop models. No alternate drawer, basin, column or mirror geometry.
import * as T from 'three';
import {makeModel,FINISHES} from '../model.js';
import {makeColumn} from '../column.js';
import {makeCatalogueMirror,mirrorGeometry,mirrorSpec} from '../mirrors.js';
import {basinColors} from '../basins.js';
import {cabinetFormat} from '../configuration.js';
import {canonicalPoints,partitionGeometry} from '../room.js';
export {FINISHES,mirrorGeometry,mirrorSpec};
// Finishes and basin styles can change on the existing parametric model.
// Rebuild only when dimensions, plumbing, placement or mirror geometry change.
export function previewStructure(project){return JSON.stringify(project.items.map(i=>[i.id,i.type,i.placement,i.type==='cabinet'?[i.settings.format,i.settings.width,i.settings.basinLayout]:i.type==='mirror'?i.settings:null]));}
export function applyPreviewSettings(preview,project){
 const byId=new Map(project.items.map(i=>[i.id,i]));
 for(const item of preview.items){const raw=byId.get(item.id);if(!raw)continue;const s=item.settings={...raw.settings};
  if(item.type==='cabinet'){item.asset.setTop(s.top);item.asset.setTopDrawer(s.topDrawer);const c=basinColors(s.top,s.width,s.format,s.basinLayout).find(c=>c.id===s.basinColor);if(c){item.asset.ceramic.color.set(c.hex);item.asset.ceramic.roughness=c.roughness;item.asset.ceramic.clearcoat=c.clearcoat;}}
  if(item.type==='cabinet'||item.type==='column'){const f=FINISHES.find(f=>f.id===s.finish);if(f)for(const m of [item.asset.wood,item.asset.frontWood]){m.color.set(f.hex);m.roughness=f.roughness;m.map=null;m.bumpMap=null;m.needsUpdate=true;}}
 }
 return preview;
}
export function buildPreview(project){const group=new T.Group(),items=[],points=canonicalPoints(project.room.points),walls=points.map((a,i)=>({a,b:points[(i+1)%points.length]}));for(const part of partitionGeometry(project.room))for(const side of [0,1]){const a=side?part.b:part.a,b=side?part.a:part.b,normal=side?part.normal.clone().negate():part.normal;walls.push({a:[a[0]+normal.x*part.thickness/2,a[1]+normal.z*part.thickness/2],b:[b[0]+normal.x*part.thickness/2,b[1]+normal.z*part.thickness/2]});}
 for(const raw of project.items){const s=raw.settings,base=raw.type==='cabinet'?cabinetFormat(s.format).base:raw.type==='column'?.28:raw.type==='mirror'?1.4:0;let asset;
  if(raw.type==='cabinet'){asset=makeModel({width:s.width/100,format:s.format,basinLayout:s.basinLayout,basinTop:s.top,topDrawer:s.topDrawer,includeMirror:false});asset.setTop(s.top);const c=basinColors(s.top,s.width,s.format,s.basinLayout).find(c=>c.id===s.basinColor);if(c){asset.ceramic.color.set(c.hex);asset.ceramic.roughness=c.roughness;asset.ceramic.clearcoat=c.clearcoat;}}
  else if(raw.type==='column')asset=makeColumn();else if(raw.type==='mirror')asset=makeCatalogueMirror(s);else continue;
  const f=FINISHES.find(f=>f.id===s.finish);if(f)for(const m of [asset.wood,asset.frontWood]){m.color.set(f.hex);m.roughness=f.roughness;}
  const wrapper=new T.Group(),w=walls[raw.placement.wall];if(!w)continue;const dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],length=Math.hypot(dx,dz),u=raw.placement.u/100,offset=.23+(raw.placement.offset||0)/100;wrapper.position.set(w.a[0]+dx/length*u-dz/length*offset,raw.placement.height/100-base,w.a[1]-.23+dz/length*u+dx/length*offset);wrapper.rotation.y=-Math.atan2(dz,dx);wrapper.add(asset.root);group.add(wrapper);items.push({...raw,asset,wrapper});
 }group.updateMatrixWorld(true);return {group,items};}
export function visibleBounds(group){const box=new T.Box3();group.updateMatrixWorld(true);group.traverseVisible(o=>{if(o.isMesh){o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});return box;}
