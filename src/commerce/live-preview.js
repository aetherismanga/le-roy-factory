import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {makeMirrorReflector} from '../mirror-reflection.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {applyMirrorLighting} from '../mirror-lighting.js';
import {buildPreview,visibleBounds,previewStructure,applyPreviewSettings,FINISHES,mirrorGeometry} from './preview-model.js';
import {configureColourRendering} from '../colour-rendering.js';
export function createPreview(host){
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Votre composition STUDIO ONE en 3D. Faites glisser pour tourner, pincez pour zoomer.');canvas.tabIndex=0;host.prepend(canvas);
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1.5:2));configureColourRendering(renderer);renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const scene=new T.Scene();scene.background=new T.Color('#eae6dc');const camera=new T.PerspectiveCamera(36,1,.05,100),controls=new OrbitControls(camera,canvas);controls.minDistance=.8;controls.maxDistance=8;controls.maxPolarAngle=Math.PI*.58;controls.enablePan=false;
 const pmrem=new T.PMREMGenerator(renderer),environment=new RoomEnvironment(),env=pmrem.fromScene(environment);scene.environment=env.texture;scene.environmentIntensity=.45;environment.dispose();pmrem.dispose();
 RectAreaLightUniformsLib.init();scene.add(new T.HemisphereLight('#ffffff','#8e8069',.35));
 for(const [x,power]of [[-1.1,3],[1.1,1]]){const l=new T.RectAreaLight('#ffffff',power,1.4,1.8);l.position.set(x,2.2,2);l.lookAt(0,.8,0);scene.add(l);}
 const sun=new T.DirectionalLight('#ffffff',.9);sun.position.set(-2,3,3);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-3,right:3,top:3,bottom:-2,near:.1,far:12});sun.shadow.normalBias=.0015;scene.add(sun);
 const floor=new T.Mesh(new T.PlaneGeometry(12,12),new T.MeshStandardMaterial({color:'#dedbd2',roughness:.94}));floor.rotation.x=-Math.PI/2;floor.position.y=-.005;floor.receiveShadow=true;scene.add(floor);
 const wall=new T.Mesh(new T.PlaneGeometry(12,6),new T.MeshStandardMaterial({color:'#e5e1d6',roughness:.95}));wall.position.set(0,2.7,-.26);wall.receiveShadow=true;scene.add(wall);
 let current=null,revision=0,frame=0,active=true,lastShape='',lastStructure='',lastConfiguration='',lastProject=null,width=0,height=0,geometryBuilds=0,renders=0,thumbnailRenders=0;const textures=new Map(),thumbnails=new Map();
 function draw(){frame=0;if(!active||!host.clientWidth||!host.clientHeight)return;renderer.render(scene,camera);renders++;}
 const invalidate=()=>{if(!frame)frame=requestAnimationFrame(draw);};controls.addEventListener('change',invalidate);
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h||w===width&&h===height)return;width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();fit();invalidate();};
 const observer=new ResizeObserver(resize);observer.observe(host);
 function fit(group=current?.group){if(!group)return;const bounds=visibleBounds(group);if(bounds.isEmpty())return;const center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),distance=Math.max(size.y/2/Math.tan(T.MathUtils.degToRad(18)),size.x/2/Math.tan(T.MathUtils.degToRad(18))/camera.aspect)*1.18+size.z;const elevation=group===current?.group&&current.items.some(i=>i.type==='cabinet'&&i.asset.spec.legHeight)?.28:.12;camera.position.copy(center).add(new T.Vector3(distance*.25,distance*elevation,distance));controls.target.copy(center);camera.lookAt(center);controls.update();}
 function disposeCurrent(){if(!current)return;scene.remove(current.group);current.group.traverse(o=>{if(o.isReflector)o.getRenderTarget().dispose();if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});current=null;}
 async function texture(id){if(textures.has(id))return textures.get(id);const definition=FINISHES.find(f=>f.id===id);if(!definition?.texture)return null;const promise=new T.TextureLoader().loadAsync('assets/'+definition.texture).then(t=>{t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());const front=t.clone();front.center.set(.5,.5);front.rotation=Math.PI/2;front.needsUpdate=true;const bump=t.clone();bump.colorSpace=T.NoColorSpace;bump.needsUpdate=true;const frontBump=bump.clone();frontBump.center.set(.5,.5);frontBump.rotation=Math.PI/2;frontBump.needsUpdate=true;return {map:t,front,bump,frontBump};}).catch(e=>{textures.delete(id);throw e;});textures.set(id,promise);return promise;}
 async function update(project){lastProject=project;const turn=++revision,configuration=JSON.stringify(project.items);if(configuration===lastConfiguration&&current){invalidate();return true;}
  // Resolve materials first. The previous complete image remains on screen while
  // a finish loads; a superseded request never replaces the latest selection.
  const finishes=await Promise.all([...new Set(project.items.filter(i=>i.type==='cabinet'||i.type==='column').map(i=>i.settings.finish))].map(async id=>[id,await texture(id)]));if(turn!==revision)return false;
  const structure=previewStructure(project);
  if(!current||structure!==lastStructure){const next=buildPreview(project);for(const item of next.items)if(item.type==='mirror'){applyMirrorLighting(item,innerWidth<700);const reflector=makeMirrorReflector(mirrorGeometry(item.settings,.009),{textureWidth:innerWidth<700?256:512,textureHeight:innerWidth<700?256:512,clipBias:.003});reflector.position.z=.009;item.asset.root.add(reflector);}disposeCurrent();current=next;scene.add(current.group);lastStructure=structure;geometryBuilds++;}
  applyPreviewSettings(current,project);const loaded=new Map(finishes);
  for(const item of current.items){const tx=loaded.get(item.settings.finish);if(!tx)continue;for(const [m,front]of [[item.asset.wood,false],[item.asset.frontWood,item.type==='cabinet']]){m.color.set('#fff');m.map=front?tx.front:tx.map;m.bumpMap=front?tx.frontBump:tx.bump;m.bumpScale=.00045;m.needsUpdate=true;}}
  const shape=JSON.stringify(project.items.map(i=>[i.type,i.settings.format,i.settings.width,i.settings.height,i.placement]));if(shape!==lastShape){fit();lastShape=shape;}invalidate();
  lastConfiguration=configuration;return true;
 }
 async function renderThumbnail(project){
  const candidate=buildPreview({...project,items:project.items.filter(i=>i.type==='column')});
  try{
   for(const item of candidate.items){const tx=await texture(item.settings.finish);if(tx)for(const m of [item.asset.wood,item.asset.frontWood]){m.color.set('#fff');m.map=tx.map;m.bumpMap=tx.bump;m.bumpScale=.00045;m.needsUpdate=true;}}
   if(!active||!current||!candidate.items.length)return null;
   // Render to a separate framebuffer, never resize or overwrite the live canvas.
   // This shares the existing WebGL context on smartphones.
   const target=new T.WebGLRenderTarget(240,280,{depthBuffer:true});target.texture.colorSpace=T.SRGBColorSpace;
   const prior={position:camera.position.clone(),target:controls.target.clone(),aspect:camera.aspect,renderTarget:renderer.getRenderTarget(),visible:current.group.visible},group=current.group;
   let result;
   try{group.visible=false;scene.add(candidate.group);camera.aspect=240/280;camera.updateProjectionMatrix();fit(candidate.group);renderer.setRenderTarget(target);renderer.render(scene,camera);thumbnailRenders++;const pixels=new Uint8Array(240*280*4);renderer.readRenderTargetPixels(target,0,0,240,280,pixels);const portrait=document.createElement('canvas');portrait.width=240;portrait.height=280;const context=portrait.getContext('2d'),data=context.createImageData(240,280);for(let row=0;row<280;row++)data.data.set(pixels.subarray((279-row)*240*4,(280-row)*240*4),row*240*4);context.putImageData(data,0,0);result=portrait.toDataURL('image/png');}
   finally{renderer.setRenderTarget(prior.renderTarget);target.dispose();scene.remove(candidate.group);group.visible=prior.visible;camera.aspect=prior.aspect;camera.updateProjectionMatrix();camera.position.copy(prior.position);controls.target.copy(prior.target);controls.update();invalidate();}
   return result;
  }finally{candidate.group.traverse(o=>{o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])m.dispose();});}
 }
 function thumbnail(project){const key=JSON.stringify(project.items.filter(i=>i.type==='column').map(i=>i.settings));if(thumbnails.has(key))return thumbnails.get(key);const pending=renderThumbnail(project).then(png=>{if(!png)thumbnails.delete(key);return png;}).catch(error=>{thumbnails.delete(key);throw error;});thumbnails.set(key,pending);return pending;}
 canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','+','-'].includes(e.key)){e.preventDefault();const delta=camera.position.clone().sub(controls.target);if(e.key==='+'||e.key==='-')delta.multiplyScalar(e.key==='+'?.9:1.1);else delta.applyAxisAngle(new T.Vector3(0,1,0),e.key==='ArrowLeft'?-.12:.12);camera.position.copy(controls.target).add(delta);camera.lookAt(controls.target);controls.update();invalidate();}});
 resize();return {update,thumbnail,diagnostics:()=>({geometryBuilds,renders,thumbnailRenders,revision,items:current?.items.map(i=>({id:i.id,type:i.type,settings:{...i.settings}}))||[],camera:camera.position.toArray(),target:controls.target.toArray(),size:[width,height]}),setActive(value){if(active===value)return;active=value;if(active){resize();invalidate();}},reset(){fit();invalidate();},snapshot({thumbnail=false}={}){draw();if(!thumbnail)return canvas.toDataURL('image/png');const image=document.createElement('canvas'),scale=Math.min(320/canvas.width,220/canvas.height,1);image.width=Math.max(1,Math.round(canvas.width*scale));image.height=Math.max(1,Math.round(canvas.height*scale));image.getContext('2d').drawImage(canvas,0,0,image.width,image.height);return image.toDataURL('image/webp',.75);},retry(){lastConfiguration='';return lastProject?update(lastProject):Promise.resolve();},dispose(){revision++;observer.disconnect();cancelAnimationFrame(frame);disposeCurrent();controls.dispose();renderer.dispose();env.dispose();canvas.remove();}};
}
