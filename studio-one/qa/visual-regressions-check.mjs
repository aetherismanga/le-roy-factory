import assert from 'node:assert/strict';
import * as T from 'three';
import {tiledPolygonGeometry} from '../src/room.js';
import {captureMirrorScene} from '../src/mirror-reflection.js';
import {initialDraft,draftProject} from '../src/commerce/guided.js';
import {buildPreview,visibleBounds} from '../src/commerce/preview-model.js';

for(const layout of [{},{direction:'vertical',pattern:'offset',x:7,y:13},{width:.6,height:.6},{width:.3,height:.6,groutWidth:3}]){
 const g=tiledPolygonGeometry([[0,0],[3,0],[3,2.6],[0,2.6]],layout),p=g.attributes.position,n=g.attributes.normal;let area=0;
 for(let i=0;i<p.count;i+=3){
  const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2);
  if(n.getZ(i)>.99)area+=b.sub(a).cross(c.sub(a)).length()/2;
  else{const xs=[a.x,b.x,c.x],ys=[a.y,b.y,c.y];assert.ok(Math.max(...xs)-Math.min(...xs)<1e-6||Math.max(...ys)-Math.min(...ys)<1e-6,'A rectangular wall must not contain diagonal extrusion faces');}
 }
 assert.ok(Math.abs(area-g.userData.cells.reduce((sum,c)=>sum+c.area,0))<1e-5);assert.equal(g.userData.faceCells.length,p.count/3);g.dispose();
}
const front=new T.Group(),opposite=new T.Group(),window=new T.Group(),profile=new T.Group(),mirror=new T.Group(),other=new T.Group();
opposite.visible=window.visible=profile.visible=false;
const state={room:{walls:[{group:front},{group:opposite}]},items:[{type:'window',root:window,asset:{}},{type:'mirror',asset:{reflector:mirror}},{type:'mirror',asset:{reflector:other}}],profiles:{children:[profile]},reflector:mirror};
const capture=()=>{assert.equal(opposite.visible,true);assert.equal(window.visible,true);assert.equal(profile.visible,true);assert.equal(mirror.visible,true);assert.equal(other.visible,false);};
captureMirrorScene(state,capture);assert.equal(opposite.visible,false);assert.equal(window.visible,false);assert.equal(profile.visible,false);assert.equal(other.visible,true);
assert.throws(()=>captureMirrorScene(state,()=>{capture();throw Error('render interrupted');}));assert.equal(opposite.visible,false);assert.equal(other.visible,true);
const p=draftProject({...initialDraft(),column:true,columnFinish:'NOGAL'}),preview=buildPreview(p),column=preview.items.find(i=>i.type==='column');
assert.ok(column);assert.equal(column.settings.finish,'NOGAL');assert.equal(column.asset.spec.reference,'14177');
const all=visibleBounds(preview.group);for(const i of preview.items)i.wrapper.visible=i.type==='column';const isolated=visibleBounds(preview.group);
assert.ok(Math.abs(isolated.getSize(new T.Vector3()).y-1.32)<.001);assert.ok(all.getSize(new T.Vector3()).x>isolated.getSize(new T.Vector3()).x);
console.log('Visual regressions PASS: no internal diagonal caps; complete room in mirror captures; column 14177 can be isolated with its selected finish.');
