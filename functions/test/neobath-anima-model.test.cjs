'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const T = require('three');
const modulePromise = import('data:text/javascript;base64,' + Buffer.from(readFileSync(join(__dirname,'../neobath-anima/model.js'),'utf8')).toString('base64'));
const makeItem=(values={})=>({id:'test',category:'module',subtype:'vanity',width:80,height:52,depth:46,facade:'PURA',drawers:2,...values});
const close=(a,b,tol=.00001)=>assert.ok(Math.abs(a-b)<tol, `${a} ≠ ${b}`);
function healthy(root) {
  root.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.position.array;assert.ok(Array.from(a).every(Number.isFinite),o.name+' has invalid geometry');}});
}
test('Pura and Ribelle every cabinet format retain catalogue envelope',async()=>{
 const {createAnimaModel}=await modulePromise;
 for(const facade of ['PURA','RIBELLE'])for(const height of [26,52])for(const width of [60,80,100,120])for(const subtype of ['vanity','base']){
  const model=createAnimaModel(T,makeItem({facade,height,width,subtype,drawers:height===26?1:2}),{color:'#84947f'});
  const b=new T.Box3().setFromObject(model.root),s=b.getSize(new T.Vector3());
  close(s.x,width/100);close(s.y,height/100);close(s.z,.46);close(b.min.y,0);
  assert.equal(model.openings.length,height===26?1:2);healthy(model.root);model.dispose();model.dispose();
 }
});
test('drawer open movement goes forward with inner boxes attached and can be closed',async()=>{
 const {createAnimaModel}=await modulePromise,model=createAnimaModel(T,makeItem(),{});
 model.setOpen(1,0);assert.ok(model.openings[0].object.position.z>.3);assert.equal(model.openings[1].object.position.z,0);
 model.setOpen(0);assert.ok(model.openings.every(o=>o.object.position.z===0));model.dispose();
});
test('door fronts swing outward, columns have one reversible opening and four glass shelves',async()=>{
 const {createAnimaModel}=await modulePromise;
 for(const subtype of ['base','wall','column'])for(const hinge of ['left','right']){
  const column=subtype==='column',wall=subtype==='wall';
  const model=createAnimaModel(T,makeItem({subtype,width:40,height:column?140:wall?70:52,depth:column||wall?22:46,drawers:0,doors:1}),{},{hinge});
  assert.equal(model.openings.length,1);const before=new T.Box3().setFromObject(model.root);model.setOpen(1);
  const after=new T.Box3().setFromObject(model.root);assert.ok(after.max.z>before.max.z+.3,'door should extend outside cabinet');
  let glass=0;model.root.traverse(o=>{if(o.name==='Etagere_verre')glass++;});assert.equal(glass,column?4:1);healthy(model.root);model.dispose();
 }
});
test('worktops, basins, mirrors, lighting and composed attachments produce healthy independent geometry',async()=>{
 const {createAnimaModel}=await modulePromise;
 const top={id:'top',ref:'TK80',category:'worktop',subtype:'integrated',width:81,height:1.8,depth:46.5,basinCount:1};
 const basin={id:'basin',ref:'FO01',category:'basin',subtype:'countertop',width:40,height:13,depth:40,shape:'round'};
 const mirror={id:'mirror',label:'Miroir rond',category:'mirror',width:80,height:80,depth:2,shape:'round'};
 for(const item of [top,basin,mirror,{category:'lighting',width:80,height:1,depth:5}]){const m=createAnimaModel(T,item,{});healthy(m.root);assert.ok(m.root.children.length);m.dispose();}
 const m=createAnimaModel(T,makeItem(),{},{top,mirror});assert.equal(m.attachments.length,2);assert.equal(m.attachments[0].root.parent,m.root);healthy(m.root);m.dispose();
});
test('invalid dimensions fail before creating a misleading model',async()=>{
 const {createAnimaModel}=await modulePromise;
 for(const width of [0,null,undefined,-1,NaN,Infinity])assert.throws(()=>createAnimaModel(T,makeItem({width}),{}),/Dimensions/);
});

test('all 42 catalogue modules use the actual manufacturing formats and facade selections',async()=>{
 const {createAnimaModel}=await modulePromise;
 const catalogue=JSON.parse(readFileSync(join(__dirname,'../neobath-anima/catalogue.json'),'utf8'));
 const modules=catalogue.products.filter(p=>p.category==='module');assert.equal(modules.length,42);
 for(const p of modules){
  const model=createAnimaModel(T,p,{color:'#84947f'}),b=new T.Box3().setFromObject(model.root),s=b.getSize(new T.Vector3());
  close(s.x,p.width/100);close(s.y,p.height/100);close(s.z,p.depth/100);assert.equal(model.openings.length,p.drawers||p.doors,p.id);healthy(model.root);
  let ribs=0;model.root.traverse(o=>{if(o.name==='Cannelures_verticales')ribs++;});assert.equal(ribs>0,p.facade==='RIBELLE',p.id);model.dispose();
 }
});

test('actual catalogue equipment dispatches to sinks, lamps and frames, with offsets and no unknown-dimension proxy',async()=>{
 const {createAnimaModel}=await modulePromise;
 const catalogue=JSON.parse(readFileSync(join(__dirname,'../neobath-anima/catalogue.json'),'utf8'));
 const find=ref=>{const p=catalogue.products.find(p=>p.ref===ref);assert.ok(p,ref);return p;};
 const p=catalogue.products.find(p=>p.category==='module'&&p.subtype==='vanity'&&p.width===80&&p.drawers===2);
 const top=find('TK80'),basin=find('FO01'),light=find('DIAMANTE45'),rail=find('SIDEBAR'),bench=find('BRIDGE100');
 const mirror={...find('ARL100'),depth:1.2};
 const model=createAnimaModel(T,p,{},{top,basin,mirror,light,accessory:rail,topOffset:7});
 assert.deepEqual(model.attachments.map(a=>a.root.userData.attachmentKind),['top','basin','mirror','light','accessory']);
 close(model.attachments[0].root.position.x,.07);close(model.attachments[1].root.position.x,.07);
 assert.ok(model.attachments[0].root.getObjectByName('Plan_perce_cuve'));
 assert.ok(model.attachments[1].root.getObjectByName('Cuve_reconstituee'));
 assert.ok(model.attachments[2].root.getObjectByName('Miroir'));
 assert.ok(model.attachments[3].root.getObjectByName('Diffuseur_LED'));
 assert.ok(model.attachments[4].root.getObjectByName('Barre_porte_serviette'));
 const lamp=model.attachments[3].root;close(lamp.position.y,.52+.018+.22+1);healthy(model.root);model.dispose();
 const framed=createAnimaModel(T,p,{},{accessory:bench});assert.ok(framed.attachments[0].root.getObjectByName('Pied_structure'));close(framed.attachments[0].root.position.y,-.35);framed.dispose();
 const unknown=createAnimaModel(T,p,{},{accessory:find('TOUCH'),light:find('MOON60')});assert.equal(unknown.attachments.length,0);unknown.dispose();
});
