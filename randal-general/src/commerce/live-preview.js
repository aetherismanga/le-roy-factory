import {localStorage} from '../../../shared/lrf-3d/demo-session.js';
import {furnitureThumbnail} from '../furniture-thumbnails.js';
import {prepareFinishTexture,finishTextureURL} from '../finish-texture.js';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {applyMirrorLighting} from '../mirror-lighting.js';
import {buildPreview,visibleBounds,FINISHES,mirrorGeometry} from './preview-model.js';
import {configureColourRendering} from '../colour-rendering.js';
import {fitTexture,disposeTextures} from '../texture-quality.js';
import {FINISH_VARIANTS} from '../material-variants.js';
import {createHDCapture,captureSize} from '../hd-capture.js';
export function createPreview(host){
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Votre composition RANDAL GÉNÉRAL en 3D. Faites glisser pour tourner, pincez pour zoomer.');canvas.tabIndex=0;host.prepend(canvas);
 const renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1.5:2));configureColourRendering(renderer);renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const scene=new T.Scene();scene.background=new T.Color('#eae6dc');const camera=new T.PerspectiveCamera(36,1,.05,100),controls=new OrbitControls(camera,canvas);controls.minDistance=.8;controls.maxDistance=8;controls.maxPolarAngle=Math.PI*.58;controls.enablePan=false;
 const pmrem=new T.PMREMGenerator(renderer),environment=new RoomEnvironment(),env=pmrem.fromScene(environment);scene.environment=env.texture;scene.environmentIntensity=.45;environment.dispose();pmrem.dispose();
 RectAreaLightUniformsLib.init();scene.add(new T.HemisphereLight('#ffffff','#8e8069',.35));
 for(const [x,power]of [[-1.1,3],[1.1,1]]){const l=new T.RectAreaLight('#ffffff',power,1.4,1.8);l.position.set(x,2.2,2);l.lookAt(0,.8,0);scene.add(l);}
 const sun=new T.DirectionalLight('#ffffff',.9);sun.position.set(-2,3,3);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-3,right:3,top:3,bottom:-2,near:.1,far:12});sun.shadow.normalBias=.0015;scene.add(sun);
 const floor=new T.Mesh(new T.PlaneGeometry(12,12),new T.MeshStandardMaterial({color:'#dedbd2',roughness:.94}));floor.rotation.x=-Math.PI/2;floor.position.y=-.005;floor.receiveShadow=true;scene.add(floor);
 const wall=new T.Mesh(new T.PlaneGeometry(12,6),new T.MeshStandardMaterial({color:'#e5e1d6',roughness:.95}));wall.position.set(0,2.7,-.26);wall.receiveShadow=true;scene.add(wall);
 let current=null,revision=0,frame=0,active=true,lastShape='',lastProject=null,capturing=false,pendingTextureUpdate=Promise.resolve();const textures=new Map();
 const workProfile=()=>{try{const mode=localStorage.getItem('randal-general-render-quality');return ['fluid','max'].includes(mode)?mode:'balanced';}catch{return 'balanced';}};
 function draw(){frame=0;if(capturing||!active||!host.clientWidth||!host.clientHeight)return;renderer.render(scene,camera);}
 const invalidate=()=>{if(!frame)frame=requestAnimationFrame(draw);};controls.addEventListener('change',invalidate);
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();fit();invalidate();};
 const observer=new ResizeObserver(resize);observer.observe(host);
 function fit(){if(!current)return;const bounds=visibleBounds(current.group);if(bounds.isEmpty())return;const center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),distance=Math.max(size.y/2/Math.tan(T.MathUtils.degToRad(18)),size.x/2/Math.tan(T.MathUtils.degToRad(18))/camera.aspect)*1.28+size.z;camera.position.copy(center).add(new T.Vector3(distance*.25,distance*.12,distance));controls.target.copy(center);camera.lookAt(center);controls.update();}
 function disposeCurrent(){if(!current)return;scene.remove(current.group);current.group.traverse(o=>{if(o.isReflector)o.getRenderTarget().dispose();if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});current=null;}
 async function texture(id,profile=workProfile()){const key=id+'|'+profile;if(textures.has(key))return textures.get(key);const definition=FINISHES.find(f=>f.id===id);if(!definition?.texture)return null;const variant=FINISH_VARIANTS[id]?.[profile]||definition.textureVariants?.[profile];const promise=new T.TextureLoader().loadAsync(variant||finishTextureURL(definition)).then(raw=>{const t=fitTexture(prepareFinishTexture(raw,variant?{...definition,materialSample:null,textureCrop:false}:definition),profile,renderer);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;if(definition.textureRepeat)t.repeat.fromArray(definition.textureRepeat);t.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());if(definition.materialSample==='aruba-flat-nogal'){t.center.set(.5,.5);t.rotation=Math.PI/2;}const front=t.clone();front.center.set(.5,.5);front.rotation=definition.frontRotation??(definition.collection==='aruba-rainure'||definition.materialSample==='aruba-flat-nogal'?0:Math.PI/2);if(definition.frontRepeat)front.repeat.fromArray(definition.frontRepeat);front.needsUpdate=true;const bump=t.clone();bump.colorSpace=T.NoColorSpace;bump.needsUpdate=true;const frontBump=bump.clone();frontBump.center.set(.5,.5);frontBump.rotation=front.rotation;frontBump.repeat.copy(front.repeat);frontBump.needsUpdate=true;return {map:t,front,bump,frontBump};}).catch(e=>{textures.delete(key);throw e;});textures.set(key,promise);return promise;}
 async function update(project){lastProject=project;const turn=++revision;disposeCurrent();current=buildPreview(project);scene.add(current.group);
  for(const item of current.items){if(item.type==='mirror'){applyMirrorLighting(item,innerWidth<700);const reflector=new Reflector(mirrorGeometry(item.settings,.009),{textureWidth:innerWidth<700?256:512,textureHeight:innerWidth<700?256:512,color:0xdbe0de,clipBias:.003});reflector.position.z=.009;item.asset.root.add(reflector);}
  }
  const shape=JSON.stringify(project.items.map(i=>[i.type,i.settings.format,i.settings.width,i.settings.height,i.placement]));if(shape!==lastShape){fit();lastShape=shape;}invalidate();
  pendingTextureUpdate=applyTextures(turn);await pendingTextureUpdate;pruneTextures();
 }
 async function settleTextures(tasks){const results=await Promise.allSettled(tasks),failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;}
 async function applyTextures(turn=revision,profile=workProfile()){
  const assets=current.items.filter(i=>i.type==='cabinet'||i.type==='column');await settleTextures(assets.map(async item=>{const tx=await texture(item.settings.finish,profile);if(turn!==revision||!tx)return;for(const [m,front]of [[item.asset.wood,false],[item.asset.frontWood,item.type==='cabinet']]){m.color.set('#fff');m.map=front?tx.front:tx.map;m.bumpMap=front?tx.frontBump:tx.bump;m.bumpScale=.00045;m.needsUpdate=true;}invalidate();}));await settleTextures(assets.filter(i=>i.asset.topWood).map(async item=>{const f=FINISHES.find(f=>f.id===item.settings.topFinish);if(!f)return;const tx=await texture(f.id,profile);if(turn!==revision)return;const m=item.asset.topWood;m.color.set(tx?'#fff':f.hex);m.map=tx?.front||null;m.roughness=f.roughness;m.needsUpdate=true;invalidate();}));
 }
 function pruneTextures(){
  const ids=new Set(current?.items.flatMap(i=>[i.settings.finish,i.settings.topFinish]).filter(Boolean)||[]),profile=workProfile();
  for(const [key,promise]of textures)if(!ids.has(key.split('|')[0])||!key.endsWith('|'+profile)){textures.delete(key);promise.then(disposeTextures).catch(()=>{});}
 }
 function materialSnapshot(){const materials=[];current?.group.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.push([m,{map:m.map,bumpMap:m.bumpMap,color:m.color?.clone(),roughness:m.roughness}]);});return materials;}
 const captureHD=createHDCapture({
  snapshot:()=>{const bodyInert=document.body.inert;document.body.inert=true;capturing=true;const materials=materialSnapshot();return {bodyInert,materials,ratio:renderer.getPixelRatio(),size:renderer.getSize(new T.Vector2()),enabled:controls.enabled,keys:new Set(textures.keys())};},
  prepare:async previous=>{controls.enabled=false;await pendingTextureUpdate;previous.materials=materialSnapshot();previous.keys=new Set(textures.keys());await applyTextures(revision,'max');await renderer.compileAsync(scene,camera);},
  render:({width=1920}={})=>{const size=captureSize(width,camera.aspect,renderer.capabilities.maxTextureSize);renderer.setPixelRatio(1);renderer.setSize(size.width,size.height,false);renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);return canvas.toDataURL('image/png');},
  restore:previous=>{try{for(const [m,v]of previous.materials){m.map=v.map;m.bumpMap=v.bumpMap;if(v.color)m.color.copy(v.color);m.roughness=v.roughness;m.needsUpdate=true;}for(const [key,promise]of textures)if(!previous.keys.has(key)){textures.delete(key);promise.then(disposeTextures).catch(()=>{});}renderer.setPixelRatio(previous.ratio);renderer.setSize(previous.size.x,previous.size.y,false);controls.enabled=previous.enabled;}finally{document.body.inert=previous.bodyInert;capturing=false;invalidate();}}
 });
 canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','+','-'].includes(e.key)){e.preventDefault();const delta=camera.position.clone().sub(controls.target);if(e.key==='+'||e.key==='-')delta.multiplyScalar(e.key==='+'?.9:1.1);else delta.applyAxisAngle(new T.Vector3(0,1,0),e.key==='ArrowLeft'?-.12:.12);camera.position.copy(controls.target).add(delta);camera.lookAt(controls.target);controls.update();invalidate();}});
 resize();return {update,async thumbnail(type,settings){const tx=await texture(settings.finish);return furnitureThumbnail(renderer,scene.environment,{[settings.finish]:tx},type,settings);},setActive(value){active=value;if(active)resize();},reset(){fit();invalidate();},snapshot({thumbnail=false}={}){if(!thumbnail)return captureHD();draw();const image=document.createElement('canvas'),scale=Math.min(320/canvas.width,220/canvas.height,1);image.width=Math.max(1,Math.round(canvas.width*scale));image.height=Math.max(1,Math.round(canvas.height*scale));image.getContext('2d').drawImage(canvas,0,0,image.width,image.height);return image.toDataURL('image/webp',.75);},retry(){return lastProject?update(lastProject):Promise.resolve();},dispose(){observer.disconnect();disposeCurrent();controls.dispose();for(const promise of textures.values())promise.then(disposeTextures).catch(()=>{});textures.clear();renderer.dispose();env.dispose();canvas.remove();}};
}
