import {PMREMGenerator,Vector3,Color} from 'three';

// The salon has its own daylight and colour contrast. The bathroom's exact
// environment, exposure and fog return when leaving; no project setting changes.
export function createShowroomLighting({scene,renderer,camera,getHall,makeEnvironment=texture=>{
 const generator=new PMREMGenerator(renderer);try{return generator.fromEquirectangular(texture);}finally{generator.dispose();}
}}){
 let saved=null,source=null,environment=null,activeHall=null;
 const outsideLights=new Map();
 const local=new Vector3();
 function isolateLights(hall){
  scene.traverse(object=>{
   if(!object.isLight)return;
   for(let ancestor=object;ancestor;ancestor=ancestor.parent)if(ancestor===hall.root)return;
   if(!outsideLights.has(object))outsideLights.set(object,object.visible);
   object.visible=false;
  });
 }
 function restore(){
  if(saved){scene.environment=saved.environment;scene.environmentIntensity=saved.intensity;renderer.toneMappingExposure=saved.exposure;if(saved.toneMapping!==undefined)renderer.toneMapping=saved.toneMapping;if(renderer.shadowMap&&saved.shadowEnabled!==undefined)renderer.shadowMap.enabled=saved.shadowEnabled;if(scene.fog&&saved.fog){scene.fog.near=saved.fog.near;scene.fog.far=saved.fog.far;scene.fog.color.copy(saved.fog.color);}saved=null;}
  for(const [light,visible]of outsideLights)light.visible=visible;outsideLights.clear();
  environment?.dispose();environment=null;source=null;activeHall=null;
 }
 function update(){
  const hall=getHall?.();let inside=false;
  if(hall?.root){hall.root.updateWorldMatrix(true,false);local.copy(camera.position);hall.root.worldToLocal(local);if(typeof hall.containsPoint==='function')inside=!!hall.containsPoint(local);else if(typeof hall.canWalk==='function')inside=hall.canWalk(local,0)===true;else{const b=hall.navigableBounds;inside=!!b&&local.z<-.15&&local.z>b.minZ&&Math.abs(local.x)<hall.dimensions.width/2;}}
  if(!inside){restore();return false;}
  if(activeHall&&activeHall!==hall)restore();activeHall=hall;
  if(!saved)saved={environment:scene.environment,intensity:scene.environmentIntensity,exposure:renderer.toneMappingExposure,toneMapping:renderer.toneMapping,shadowEnabled:renderer.shadowMap?.enabled,fog:scene.fog?{near:scene.fog.near,far:scene.fog.far,color:scene.fog.color.clone()}:null};
  const sky=hall.skyTexture;
  if(sky&&source!==sky){environment?.dispose();environment=null;source=sky;try{environment=makeEnvironment(sky);}catch{scene.environment=saved.environment;}}
  if(environment?.texture)scene.environment=environment.texture;
  const look=hall.appearance||{};scene.environmentIntensity=look.environmentIntensity??.88;renderer.toneMappingExposure=look.exposure??.88;
  if(look.toneMapping!==undefined)renderer.toneMapping=look.toneMapping;
  if(scene.fog){scene.fog.near=look.fogNear??32;scene.fog.far=look.fogFar??105;scene.fog.color.copy(new Color(look.fogColor||'#d8e3e5'));}
  hall.updateLighting?.(local,renderer);isolateLights(hall);
  return true;
 }
 return {update,restore,dispose:restore,get active(){return !!saved}};
}
