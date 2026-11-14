import * as T from 'three';
// Keep this export policy independent of the native room/catalogue module graph.
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const onSegment=(a,b,p)=>Math.abs(cross(a,b,p))<1e-9&&p[0]>=Math.min(a[0],b[0])-1e-9&&p[0]<=Math.max(a[0],b[0])+1e-9&&p[1]>=Math.min(a[1],b[1])-1e-9&&p[1]<=Math.max(a[1],b[1])+1e-9;
const intersect=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b);
function inside(p,ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if(onSegment(a,b,p))return true;if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}

// This module only creates the Unreal export view. Never change native materials
// or the catalogue's colour, references, finish selection or texture provenance.
export const UNREAL_PHYSICAL_VERSION=1;
const absentArchitecture=new WeakSet();
export function configureUnrealRoom(room){
 if(!room)return;
 for(const wall of room.walls)if(wall.expoEnabled===false)absentArchitecture.add(wall.group);else absentArchitecture.delete(wall.group);
 if(room.shadowCeiling){if(room.walls.some(w=>w.expoEnabled===false||w.height<room.height-.01))absentArchitecture.add(room.shadowCeiling);else absentArchitecture.delete(room.shadowCeiling);}
}
export function cutawayRoot(o){return o.userData.wallIndex!==undefined||!o.isMesh&&/^wall:/.test(o.userData.editTarget||'')||['window','door'].includes(o.userData.editTarget);}
export function keepInUnreal(o){
 for(let p=o;p;p=p.parent)if(absentArchitecture.has(p))return false;
 if(o.name==='Plafond_occlusion_lumiere')return true;
 for(let p=o;p;p=p.parent)if(!p.visible&&!cutawayRoot(p))return false;
 return true;
}
export function unrealSolidShadow(o,m){return o.name!=='Vue_exterieure_jardin'&&!(m.transmission>0||m.transparent&&m.opacity<1);}
export function unrealGeometry(o){
 // The native floor joint is an infinitely thin sheet ending at the wall
 // face. A small physical backing below it seals the sub-millimetre daylight
 // gap at the wall foot. Shapes retain their concave outline and cut-outs;
 // the visible tile geometry, UVs and quantity calculations are untouched.
 if(o.parent?.userData.editTarget==='floor'&&!o.name&&o.material?.roughness===.96&&o.geometry.parameters?.shapes){
  const g=new T.ExtrudeGeometry(o.geometry.parameters.shapes,{depth:.03,steps:1,bevelEnabled:true,bevelThickness:.002,bevelSize:.003,bevelSegments:1});
  g.translate(0,0,-.032);
  // Flatten the top bevel into a 3 mm overlap under the wall, so its outer
  // lip closes the opening instead of leaving another sloping light slit.
  const positions=g.attributes.position;for(let i=0;i<positions.count;i++)if(positions.getZ(i)>=-.00201)positions.setZ(i,0);
  g.computeVertexNormals();return g;
 }
 return o.geometry.clone();
}
export function unrealSurfaceParams(m,o){
 const params={color:m.color?.toArray()||[1,1,1],roughness:m.roughness??1,metalness:m.metalness??0,clearcoat:m.clearcoat??0,clearcoatRoughness:m.clearcoatRoughness??0};
 if(o.isReflector)return {...params,color:[1,1,1],roughness:.002,metalness:1,clearcoat:0};
 if(m.transmission>=.8&&m.roughness<.12&&(m.thickness||0)<=.015){params.color=[.995,1,.999];params.roughness=m.userData?.architecturalGlass?.008:.015;}
 if(furnitureGrain(m)){
  // Keep the selected manufacturer's albedo. The varnish, not the photograph's
  // dark printed knots, determines the strength of the specular response.
  params.roughness=Math.max(.32,Math.min(.58,params.roughness*.9));
  params.clearcoat=.2;params.clearcoatRoughness=.28;
 }
 // A catalogue matte tile remains matte. Preserve honed/gloss and grip finishes.
 if(/^Carreaux/.test(o.name)&&params.roughness>=.65&&params.roughness<.9)params.roughness*=.86;
 return params;
}
export function furnitureGrain(m){return !!(m.userData?.lrfFurnitureKind==='Bois'&&m.map&&m.bumpMap&&m.bumpScale>=.0002&&m.roughness>=.25);}
const grainMaps=new WeakMap();
export function furnitureMicroMaps(m){
 const texture=m.bumpMap,image=texture?.image;if(!image)return null;
 const key=[texture.version,m.bumpScale,...texture.repeat.toArray(),...texture.offset.toArray(),...texture.center.toArray(),texture.rotation,texture.flipY,texture.channel].join(':');
 const previous=grainMaps.get(texture);if(previous?.key===key)return previous;
 const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
 if(!iw||!ih||image.data)return null;
 const factor=Math.min(1,1536/Math.max(iw,ih)),w=Math.round(iw*factor),h=Math.round(ih*factor);
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,w,h);
 const pixels=context.getImageData(0,0,w,h).data,values=new Float32Array(w*h);
 for(let i=0;i<values.length;i++)values[i]=(.2126*pixels[i*4]+.7152*pixels[i*4+1]+.0722*pixels[i*4+2])/255;
 const at=(x,y)=>values[((y+h)%h)*w+(x+w)%w],normal=new Uint8Array(w*h*4),roughness=new Uint8Array(w*h*4);
 // Appearance approximation only: no measured height map was supplied.
 // Bounded slopes avoid engraving every dark knot into the lacquer.
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const dx=clamp((at(x+1,y)-at(x-1,y))*.00012*w,-.1,.1),dy=clamp((at(x,y+1)-at(x,y-1))*.00012*h,-.1,.1);
  const length=Math.hypot(dx,dy,1),i=(y*w+x)*4;
  normal[i]=Math.round((-.5*dx/length+.5)*255);normal[i+1]=Math.round((.5*dy/length+.5)*255);normal[i+2]=Math.round((.5/length+.5)*255);normal[i+3]=255;
  const detail=at(x,y)-(at(x-2,y)+at(x+2,y)+at(x,y-2)+at(x,y+2))/4;
  roughness[i]=roughness[i+1]=roughness[i+2]=Math.round(clamp(.92-detail*.35,.82,1)*255);roughness[i+3]=255;
 }
 const make=data=>{const result=new T.DataTexture(data,w,h);for(const property of ['wrapS','wrapT','rotation','flipY','channel'])result[property]=texture[property];for(const property of ['repeat','offset','center'])result[property].copy(texture[property]);result.generateMipmaps=true;result.minFilter=T.LinearMipmapLinearFilter;result.magFilter=T.LinearFilter;result.anisotropy=16;result.needsUpdate=true;return result;};
 // GLTFExporter packs roughness/metalness through drawImage: unlike a normal
 // map, its packing stage requires a CanvasImageSource, not a DataTexture.
 const roughCanvas=document.createElement('canvas');roughCanvas.width=w;roughCanvas.height=h;
 const roughContext=roughCanvas.getContext('2d'),roughImage=roughContext.createImageData(w,h);roughImage.data.set(roughness);roughContext.putImageData(roughImage,0,0);
 const roughMap=new T.CanvasTexture(roughCanvas);for(const property of ['wrapS','wrapT','rotation','flipY','channel'])roughMap[property]=texture[property];for(const property of ['repeat','offset','center'])roughMap[property].copy(texture[property]);roughMap.anisotropy=16;
 const result={key,normal:make(normal),roughness:roughMap};grainMaps.set(texture,result);return result;
}
let ceramicNormal;
export function ceramicMicroNormal(){
 if(ceramicNormal)return ceramicNormal;
 const size=256,data=new Uint8Array(size*size*4);let seed=8713;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<data.length;i+=4){data[i]=Math.round(128+(random()-.5)*8);data[i+1]=Math.round(128+(random()-.5)*8);data[i+2]=255;data[i+3]=255;}
 ceramicNormal=new T.DataTexture(data,size,size);ceramicNormal.wrapS=ceramicNormal.wrapT=T.RepeatWrapping;ceramicNormal.needsUpdate=true;return ceramicNormal;
}
export function applyUnrealSurface(out,m,o){
 // The native shadow-only ceiling contains "lumiere" in its name. It is an
 // occluder, never an LED panel. Keep a neutral diffuse bounce surface.
 if(o.name==='Plafond_occlusion_lumiere'){out.emissive.set(0);out.emissiveIntensity=1;out.color.setRGB(.78,.78,.78);out.roughness=.9;return;}
 const p=unrealSurfaceParams(m,o);out.roughness=p.roughness;out.metalness=p.metalness;
 if(out.isMeshPhysicalMaterial){out.clearcoat=p.clearcoat;out.clearcoatRoughness=p.clearcoatRoughness;}
 if(furnitureGrain(m)){
  const maps=furnitureMicroMaps(m);if(maps){out.normalMap=maps.normal;out.normalScale=new T.Vector2(1,1);out.roughnessMap=maps.roughness;out.bumpMap=null;}
 }
 if(/^Carreaux/.test(o.name)&&!out.normalMap&&!out.bumpMap){out.normalMap=ceramicMicroNormal();out.normalScale=new T.Vector2(1,1);}
 // Fresnel/transmission already determine clear glazing. Alpha blending on top
 // removes the reflected surface a second time and produces a ghost window.
 if(out.transmission>0){out.opacity=1;out.transparent=true;if(out.transmission>=.8)out.transmission=1;}
 if(m.transmission>=.8&&m.roughness<.12&&(m.thickness||0)<=.015){
  // Clear thin glass: tint accumulates through volume, not opaque green faces.
  out.color.setRGB(.995,1,.999);out.roughness=m.userData?.architecturalGlass?.008:.015;
  out.ior=1.5;out.attenuationColor=new T.Color(.90,.98,.96);out.attenuationDistance=1.5;
 }
 if(o.name==='Vue_exterieure_jardin'){out.emissiveIntensity=512;return;}
 if(out.emissiveIntensity>0&&out.emissive&&(out.emissive.r>0||out.emissive.g>0||out.emissive.b>0))out.emissiveIntensity*=128;
}
const profiles={
 day:{key:80,fill:25,rim:20,window:1400,sun:3500,pendant:15,sky:2},
 warm:{key:240,fill:70,rim:350,window:180,sun:0,pendant:180,sky:1},
 showroom:{key:800,fill:110,rim:260,window:400,sun:500,pendant:75,sky:2}
};
const fittedSources=new WeakMap();
function fitInteriorSource(light,room){
 if(!room?.floor?.usableRegions?.length)return light;
 const regions=room.floor.usableRegions.map(rings=>rings.map(ring=>ring.map(p=>[p[0]/100,-p[1]/100-.23])));
 const key=JSON.stringify([regions,light.position,light.width,light.height]);
 let cache=fittedSources.get(room);if(!cache){cache=new Map();fittedSources.set(room,cache);}
 if(cache.has(key))return {...light,...cache.get(key)};
 const fits=(x,z,w,h)=>{const pad=.025,corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>[x+a*(w/2+pad),z+b*(h/2+pad)]);
  return regions.some(rings=>corners.every(p=>inside(p,rings[0])&&!rings.slice(1).some(hole=>inside(p,hole)))&&!rings.slice(1).some(hole=>inside(hole[0],corners))&&!rings.some(ring=>ring.some((p,i)=>corners.some((c,j)=>intersect(c,corners[(j+1)%4],p,ring[(i+1)%ring.length])))));
 };
 const [x,y,z]=light.position;if(fits(x,z,light.width,light.height))return light;
 const min=room.bounds.min,max=room.bounds.max;
 let found;
 for(const scale of [1,.75,.5,.25,.1]){
  let distance=Infinity;const w=light.width*scale,h=light.height*scale;
  for(let ix=0;ix<32;ix++)for(let iz=0;iz<32;iz++){
   const px=min.x+(max.x-min.x)*(ix+.5)/32,pz=min.z+(max.z-min.z)*(iz+.5)/32,d=(px-x)**2+(pz-z)**2;
   if(d<distance&&fits(px,pz,w,h)){distance=d;found={position:[px,y,pz],width:w,height:h};}
  }
  if(found)break;
 }
 // An extremely narrow valid plan can have no room for even the smallest
 // panel. Disable that virtual source instead of placing it outside a wall.
 const adjustment=found||{intensity:0};if(cache.size>24)cache.clear();cache.set(key,adjustment);
 return {...light,...adjustment};
}
export function physicalLighting(lights,settings){
 if(!settings)return {lights,lighting:null};
 const preset=Object.hasOwn(profiles,settings.preset)?settings.preset:'day',p=profiles[preset];
 const windowed=lights.some(l=>l.name==='Lumiere_diffuse_fenetre');
 const color=new T.Color();
 const k=Math.max(2700,Math.min(6500,Number(settings.temperature)||5500))/100;
 const r=k<=66?255:329.6987*Math.pow(k-60,-.1332),g=k<=66?99.4708*Math.log(k)-161.1196:288.1222*Math.pow(k-60,-.0755),b=k>=66?255:k<=19?0:138.5177*Math.log(k-10)-305.0448;
 color.setRGB(T.MathUtils.clamp(r/255,0,1),T.MathUtils.clamp(g/255,0,1),T.MathUtils.clamp(b/255,0,1),T.SRGBColorSpace);
 const result=lights.map(l=>{
  const role=settings.roles?.[l.id]||(l.name==='Lumiere_diffuse_fenetre'?'window':null),out={...l};
  delete out.id;delete out.name;
  if(role){out.intensity=role==='sun'?(windowed?p.sun:0):p[role];
   if(['key','fill','rim','pendant'].includes(role))out.color=color.toArray();
   if(role==='window')out.color=new T.Color(preset==='warm'?'#b5cdff':'#e9f1ff').toArray();
   if(role==='sun')out.color=new T.Color('#fff6e7').toArray();
   if(['key','fill','rim'].includes(role)&&settings.bounds){
    // Place the broad interior sources against the ceiling, entirely inside
    // the room. Oversized vertical studio cards used to intersect walls and
    // appear as arbitrary white rectangles in the bathroom mirrors.
    const [min,max]=settings.bounds,span=max.map((n,i)=>n-min[i]),center=min.map((n,i)=>(n+max[i])/2);
    const x=role==='key'?-.18:role==='fill'?.18:0,z=role==='key'?.55:role==='fill'?.7:.22;
    out.position=[center[0]+span[0]*x,max[1]-.08,min[2]+span[2]*z];
    out.direction=[0,-1,0];out.up=[0,0,-1];
    out.width=Math.min(l.width,span[0]*.35);out.height=Math.min(l.height,span[2]*.22);
   }
  }else out.intensity*=128;
  return ['key','fill','rim'].includes(role)?fitInteriorSource(out,settings.room):out;
 });
 return {lights:result,lighting:{version:1,preset,brightness:T.MathUtils.clamp(Number(settings.brightness)||100,25,200),temperature:k*100,sky:p.sky}};
}
