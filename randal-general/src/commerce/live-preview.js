import {prepareFinishTexture,finishTextureURL} from '../finish-texture.js';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {applyMirrorLighting} from '../mirror-lighting.js';
import {buildPreview,visibleBounds,FINISHES,mirrorGeometry} from './preview-model.js';
import {configureColourRendering} from '../colour-rendering.js';
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
 let current=null,revision=0,frame=0,active=true,lastShape='',lastProject=null;const textures=new Map();
 function draw(){frame=0;if(!active||!host.clientWidth||!host.clientHeight)return;renderer.render(scene,camera);}
 const invalidate=()=>{if(!frame)frame=requestAnimationFrame(draw);};controls.addEventListener('change',invalidate);
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();fit();invalidate();};
 const observer=new ResizeObserver(resize);observer.observe(host);
 function fit(){if(!current)return;const bounds=visibleBounds(current.group);if(bounds.isEmpty())return;const center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),distance=Math.max(size.y/2/Math.tan(T.MathUtils.degToRad(18)),size.x/2/Math.tan(T.MathUtils.degToRad(18))/camera.aspect)*1.28+size.z;camera.position.copy(center).add(new T.Vector3(distance*.25,distance*.12,distance));controls.target.copy(center);camera.lookAt(center);controls.update();}
 function disposeCurrent(){if(!current)return;scene.remove(current.group);current.group.traverse(o=>{if(o.isReflector)o.getRenderTarget().dispose();if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});current=null;}
 async function texture(id){if(textures.has(id))return textures.get(id);const definition=FINISHES.find(f=>f.id===id);if(!definition?.texture)return null;const promise=new T.TextureLoader().loadAsync(finishTextureURL(definition)).then(raw=>{const t=prepareFinishTexture(raw,definition);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());const front=t.clone();front.center.set(.5,.5);front.rotation=Math.PI/2;front.needsUpdate=true;const bump=t.clone();bump.colorSpace=T.NoColorSpace;bump.needsUpdate=true;const frontBump=bump.clone();frontBump.center.set(.5,.5);frontBump.rotation=Math.PI/2;frontBump.needsUpdate=true;return {map:t,front,bump,frontBump};}).catch(e=>{textures.delete(id);throw e;});textures.set(id,promise);return promise;}
 async function update(project){lastProject=project;const turn=++revision;disposeCurrent();current=buildPreview(project);scene.add(current.group);
  for(const item of current.items){if(item.type==='mirror'){applyMirrorLighting(item,innerWidth<700);const reflector=new Reflector(mirrorGeometry(item.settings,.009),{textureWidth:innerWidth<700?256:512,textureHeight:innerWidth<700?256:512,color:0xdbe0de,clipBias:.003});reflector.position.z=.009;item.asset.root.add(reflector);}
  }
  const shape=JSON.stringify(project.items.map(i=>[i.type,i.settings.format,i.settings.width,i.settings.height,i.placement]));if(shape!==lastShape){fit();lastShape=shape;}invalidate();
  const assets=current.items.filter(i=>i.type==='cabinet'||i.type==='column');await Promise.all(assets.map(async item=>{const tx=await texture(item.settings.finish);if(turn!==revision||!tx)return;for(const [m,front]of [[item.asset.wood,false],[item.asset.frontWood,item.type==='cabinet']]){m.color.set('#fff');m.map=front?tx.front:tx.map;m.bumpMap=front?tx.frontBump:tx.bump;m.bumpScale=.00045;m.needsUpdate=true;}invalidate();}));await Promise.all(assets.filter(i=>i.asset.topWood).map(async item=>{const f=FINISHES.find(f=>f.id===item.settings.topFinish);if(!f)return;const tx=await texture(f.id);if(turn!==revision)return;const m=item.asset.topWood;m.color.set(tx?'#fff':f.hex);m.map=tx?.front||null;m.roughness=f.roughness;m.needsUpdate=true;invalidate();}));
 }
 canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','+','-'].includes(e.key)){e.preventDefault();const delta=camera.position.clone().sub(controls.target);if(e.key==='+'||e.key==='-')delta.multiplyScalar(e.key==='+'?.9:1.1);else delta.applyAxisAngle(new T.Vector3(0,1,0),e.key==='ArrowLeft'?-.12:.12);camera.position.copy(controls.target).add(delta);camera.lookAt(controls.target);controls.update();invalidate();}});
 resize();return {update,setActive(value){active=value;if(active)resize();},reset(){fit();invalidate();},snapshot(){draw();return canvas.toDataURL('image/png');},retry(){return lastProject?update(lastProject):Promise.resolve();},dispose(){observer.disconnect();disposeCurrent();controls.dispose();renderer.dispose();env.dispose();canvas.remove();}};
}
