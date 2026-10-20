import assert from 'node:assert/strict';
import * as T from 'three';
import {makeModel,FINISHES} from '../src/model.js';
import {TOP_OPTIONS} from '../src/tops.js';
import {SURFACE_COLORS} from '../src/surfaces.js';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const m=makeModel();const close=(a,b,tol=.00001)=>assert(Math.abs(a-b)<tol,`${a} differs from ${b}`);
assert.equal(TOP_OPTIONS.length,5);const result=[];
for(const mode of ['neris','sella','tampa','torne','plain','neris','tampa','torne','sella']){
 assert(m.setTop(mode));assert.equal(m.getTop(),mode);m.root.updateMatrixWorld(true);
 assert.equal(m.insetGroup.visible,mode==='sella');assert.equal(m.tops.root.visible,mode!=='sella'&&mode!=='tampa');assert.equal(m.insets.tampa.visible,mode==='tampa');assert.equal(m.faucet.visible,mode!=='plain');
 assert.equal(m.tops.solid.visible,mode==='plain');assert.equal(m.tops.drilled.visible,mode==='neris'||mode==='torne');
 for(const kind of ['neris','torne'])assert.equal(m.tops.vessels[kind].group.visible,mode===kind);
 if(mode==='neris'||mode==='torne'){
  const v=m.tops.vessels[mode],bounds=new T.Box3().setFromObject(v.bowl),size=bounds.getSize(new T.Vector3());
  close(size.x,mode==='neris'?.46:.37);close(size.y,mode==='neris'?.14:.12);close(size.z,mode==='neris'?.33:.37);close(bounds.min.y,.84);
  const ray=new T.Raycaster(new T.Vector3(.05,1.3,.02),new T.Vector3(0,-1,0));const hits=ray.intersectObject(v.bowl);assert(hits.length>0);assert(hits[0].point.y<bounds.max.y-.03,'Bowl must be hollow');assert(hits[0].point.y>bounds.min.y,'Bowl must have a solid floor');
  const drain=new T.Raycaster(new T.Vector3(0,1.2,.02),new T.Vector3(0,-1,0));assert.equal(drain.intersectObject(m.tops.drilled).length,0,'Waste opening must remain open through countertop');
  const tap=new T.Raycaster(new T.Vector3(0,1.2,-.190),new T.Vector3(0,-1,0));assert.equal(tap.intersectObject(m.tops.drilled).length,0,'Tap and countertop hole must align');
  const body=new T.Box3().setFromObject(m.faucet.getObjectByName('Corps'));assert(body.max.z<bounds.min.z,'Tall mixer must stay behind bowl');
  const outlet=new T.Box3().setFromObject(m.faucet.getObjectByName('Mousseur'));assert(outlet.min.y>bounds.max.y+.08,'Spout must clear the rim');
 }
 if(mode==='tampa'){
  const bowl=m.insets.tampa.getObjectByName('Vasque_TAMPA_coque_3D');
  const bounds=new T.Box3().setFromObject(bowl);close(bounds.max.y-bounds.min.y,.15);
  const ray=new T.Raycaster(new T.Vector3(.05,1.2,.027),new T.Vector3(0,-1,0));const hits=ray.intersectObject(bowl);assert(hits.length&&hits[0].point.y<.75,'Tampa has a genuinely recessed bowl');
  const plate=m.insets.tampa.children[0];assert.equal(ray.intersectObject(plate).length,0,'Tampa plate has an open bowl aperture');
 }
 if(mode==='plain'){
  const bounds=new T.Box3().setFromObject(m.tops.solid),size=bounds.getSize(new T.Vector3());close(size.x,.8);close(size.y,.02);close(size.z,.46);close(bounds.min.y,.82);close(bounds.max.y,.84);
  const ray=new T.Raycaster(new T.Vector3(0,1.2,.02),new T.Vector3(0,-1,0));assert(ray.intersectObject(m.tops.solid).length>0,'Plain countertop has no hole');
 }
 assert.equal(m.tops.solid.material,m.frontWood);assert.equal(m.tops.drilled.material,m.frontWood);
 result.push({mode,passed:true});
}
assert.equal(m.setTop('unknown'),false);assert.equal(m.getTop(),'sella');
for(const finish of FINISHES){m.frontWood.color.set(finish.hex);assert.equal(m.tops.solid.material.color.getHexString(),finish.hex.slice(1));assert.equal(m.tops.drilled.material.color.getHexString(),finish.hex.slice(1));}
const origins=JSON.parse(readFileSync('qa/surface-colors.json','utf8'));
assert.equal(SURFACE_COLORS.floor.length,6);assert.equal(SURFACE_COLORS.wall.length,8);
let imageBytes=0;for(const [kind,choices]of Object.entries(SURFACE_COLORS))for(const c of choices){const original=origins[kind==='floor'?'shell':'creta'].find(o=>o.id===c.id);assert(original);const b=readFileSync('dist/assets/'+c.file);assert.equal(createHash('sha256').update(b).digest('hex'),original.sha256);imageBytes+=b.length;}
const html=readFileSync('dist/index.html','utf8');for(const id of ['top-options','floor-colors','wall-colors','floor-color-name','wall-color-name','floor-summary','wall-summary','basin-summary','basin-description'])assert(html.includes(`id="${id}"`));
const report={passed:true,at:new Date().toISOString(),checks:['mode switches are mutually exclusive and reversible','solid countertop 800x460x20mm','Tampa real recessed 150mm ceramic shell and perforated plate','Neris 460x330x140mm','Torne diameter370mm height120mm','real recessed vessel interiors','aligned drain and tap holes','tall mixer clears both vessel rims and bodies','countertop shares exact furniture finish material','all 14 textures preserve original SHA256','UI targets exist'],floorColors:SURFACE_COLORS.floor.map(c=>c.name),wallColors:SURFACE_COLORS.wall.map(c=>c.name),topModes:result,imageBytes};writeFileSync('qa/options-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
