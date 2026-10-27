import * as T from 'three';
import {createResident} from '../../shared/lrf-3d/resident.js';
import {createVisitorInteraction} from '../../shared/lrf-3d/visitor-interaction.js';
import {createVisitInteractions} from '../../shared/lrf-3d/visit-interactions.js';
import {makeModel as makeStudio} from '../../studio-one/src/model.js';
import {makeModel as makeGeneral} from '../../randal-general/src/model.js';
import {makeOpening} from '../../shared/lrf-3d/openings.js';
import {disposeObject} from '../../studio-one/src/composition.js';

// Deliberately small manual renderer: no continuous RAF, reflections, AO,
// transmission passes or high-resolution shadow maps. The actual rig and
// actual mechanism remain unchanged, with their real texture assets.
const scene=new T.Scene();scene.background=new T.Color('#e8e5df');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(540,540);renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=false;
document.body.style.margin='0';document.body.append(renderer.domElement);
scene.add(new T.HemisphereLight('#fff9f0','#777b70',2.3));
for(const [x,y,z,intensity] of [[2,4,3,2],[-2,2,-2,1.1]]){const light=new T.DirectionalLight('#ffffff',intensity);light.position.set(x,y,z);scene.add(light);}
const floor=new T.Mesh(new T.PlaneGeometry(5,5),new T.MeshStandardMaterial({color:'#d5d0c5',roughness:.92}));floor.rotation.x=-Math.PI/2;floor.position.y=-.002;scene.add(floor);
const camera=new T.PerspectiveCamera(48,1,.02,20);camera.position.set(1.9,1.35,1.2);camera.lookAt(0,.87,.35);
const profiles={jerome:{model:'resident.glb',height:1.65,noJewelry:true,noOpacity:true,maps:{head_color:'head.webp',body_color:'body.webp',head_normal:'head-normal.webp',body_normal:'body-normal.webp'}}};
const actor=createResident(scene,renderer,{profiles,baseURL:'/assets/avatar/jerome-v1/',prepareModel:({root})=>root.traverse(object=>{
 if(!object.isMesh)return;
 for(const material of Array.isArray(object.material)?object.material:[object.material]){
  if(/head/i.test(material.name)){material.roughness=.64;material.normalScale?.set(.1,.1);}
  if(/body/i.test(material.name)){material.roughness=.92;material.normalScale?.set(.18,.18);}
  if(/Jerome_(pantalon|chaussures)/i.test(material.name)){material.map=null;material.normalMap=null;material.color.set(/chaussures/i.test(material.name)?'#242121':'#303138');material.roughness=.9;material.needsUpdate=true;}
 }
})});
await actor.load('jerome');actor.setVisible(true);
let fixture=null,item=null,driver=null,controller=null,hit=null,time=0,commits=0;
const position=new T.Vector3(),samples=[];
function setup(kind='studio'){
 controller?.end();driver?.dispose();if(fixture){fixture.removeFromParent();disposeObject(fixture);}
 const asset=kind==='door'?makeOpening('door',{width:83,height:204}):kind==='general'?makeGeneral({includeMirror:false}):makeStudio({includeMirror:false});
 fixture=new T.Group();fixture.add(asset.root);scene.add(fixture);
 asset.wood?.color.set('#96826b');asset.frontWood?.color.set('#ab987d');
 item={id:'preview-item',type:kind==='door'?'door':'cabinet',root:fixture,asset,settings:{drawers:(asset.drawers||[]).map(()=>0),doorOpen:false,locked:true},motion:{drawers:(asset.drawers||[]).map(()=>0),door:0}};
 position.set(kind==='door'?.23:0,0,kind==='door'?.24:.55);actor.place(position,Math.PI);actor.animate(0,{moving:false,speed:0,distance:0});
 time=0;commits=0;samples.length=0;
 driver=createVisitorInteraction({getActorRoot:()=>actor.getRoot(),getHandContactPosition:side=>actor.getHandContactPosition(side),getPosition:()=>position,getHeading:()=>Math.PI,isActive:()=>true});
 controller=createVisitInteractions({getItems:()=>[item],onBeforeAction:action=>driver.start(action),onCancelAction:()=>driver.cancel('coordinator'),onChange:event=>{if(!event.restored)commits++;}});
 controller.begin({transient:true});
 const part=kind==='door'?asset.door:asset.drawers[0];let object;
 part.traverse(o=>{if(!object&&o.isMesh&&/Facade|Bequille|Poign|Vantail/.test(o.name))object=o;});hit={itemId:item.id,object:object||part};
 render();return {kind,hitObject:hit.object.name};
}
function render(){scene.updateMatrixWorld(true);renderer.render(scene,camera);}
function step(seconds){
 for(let i=0;i<Math.round(seconds*60);i++){
  const asset=item.asset,dt=1/60;time+=dt;
  for(let index=0;index<(asset.drawers?.length||0);index++){
   const target=(item.settings.drawers[index]||0)*(index===0?.2:.315);
   item.motion.drawers[index]+=(target-item.motion.drawers[index])*(1-Math.exp(-dt*8));asset.drawers[index].position.z=item.motion.drawers[index];
  }
  item.motion.door+=((item.settings.doorOpen?1:0)-item.motion.door)*(1-Math.exp(-dt*8));
  if(asset.setOpenProgress)asset.setOpenProgress(item.motion.door);else asset.setDoorProgress?.(item.motion.door);
  const interaction=driver.tick(dt);actor.animate(dt,{moving:false,speed:0,distance:0,interaction});
  samples.push({time,commits,interaction,pose:actor.diagnostics.interaction});
 }
 render();return diagnostics();
}
function diagnostics(){return {time,commits,drawers:[...(item?.settings.drawers||[])],doorOpen:item?.settings.doorOpen,driver:driver?.diagnostics(),actor:actor.diagnostics,sample:samples.at(-1)};}
setup('studio');
window.gestureQA={ready:true,setup,step,diagnostics,begin:()=>controller.tap(hit),cancel:()=>controller.end(),front(){camera.position.set(2.0,1.35,.1);camera.lookAt(.1,.95,.1);render();},side(){camera.position.set(1.9,1.35,1.2);camera.lookAt(0,.87,.35);render();},dispose(){controller.end();driver.dispose();actor.dispose();renderer.dispose();}};
