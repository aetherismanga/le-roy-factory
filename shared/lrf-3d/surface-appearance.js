// Visual response is an approximation of the selected commercial finish.
// It never turns a colour preview into a reference-verified manufacturer face.
const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function selectedCommercialSurface(finish={},options=[]){
 return options.find(product=>product.key===finish.catalogueKey)||options.find(product=>finish.reference&&product.reference===finish.reference)||options.find(product=>finish.finish&&product.finish===finish.finish)||options[0]||null;
}
export function surfaceFinishAppearance({collection='',finish='',roughness=.8,bumpScale=0,clearcoat=0,clearcoatRoughness=.24}={}){
 const label=clean(finish),base={roughness,bumpScale,clearcoat,clearcoatRoughness,approximate:false};
 if(/3d\s*honed|honed|satin|satinato|satinado/.test(label))return {...base,roughness:.32,clearcoat:.12,clearcoatRoughness:.38,approximate:true};
 if(/grip|outdoor|antislip|anti.?slip|r11|r12/.test(label))return {...base,roughness:.94,bumpScale:Math.min(.002,Math.max(bumpScale,bumpScale*1.2)),clearcoat:0,approximate:true};
 if(collection==='Stone Icon'&&/matt|matte|natural/.test(label))return {...base,roughness:.8,clearcoat:0,approximate:true};
 return base;
}
export function texturePhysicalCrop(choice={},layout={}){
 const [sourceWidth,sourceHeight]=choice.texturePhysicalSize||[],width=Number(layout.width),height=Number(layout.height);
 if(![sourceWidth,sourceHeight,width,height].every(value=>Number.isFinite(value)&&value>0))return null;
 // Direction rotates the plank geometry; nominal plank UVs retain width/height.
 const repeat=[width/sourceWidth,height/sourceHeight];
 if(repeat.some(value=>value>1.00001))return null;
 return {repeat:repeat.map(value=>Math.min(1,value)),offset:repeat.map(value=>(1-Math.min(1,value))/2)};
}
const disposalInstalled=new WeakSet();
export function disposeSurfaceTextureClones(material){
 for(const key of ['lrfTileMapClone','lrfTileBumpClone']){const texture=material[key];if(texture){if(material.map===texture)material.map=null;if(material.bumpMap===texture)material.bumpMap=null;texture.dispose();delete material[key];}}
}
export function applySurfaceTextureMapping(material,{map=null,bumpMap=null,choice={},layout={},mapped=false,rotation}={}){
 disposeSurfaceTextureClones(material);material.map=map;material.bumpMap=bumpMap;
 if(!disposalInstalled.has(material)){material.addEventListener?.('dispose',()=>disposeSurfaceTextureClones(material));disposalInstalled.add(material);}
 const crop=texturePhysicalCrop(choice,layout),image=map?.image;
 const autoRotation=!crop&&!mapped&&!Number.isFinite(rotation)&&image&&((image.width||1)<(image.height||1))===(Number(layout.width)>=Number(layout.height))&&Math.max(image.width,image.height)/Math.max(1,Math.min(image.width,image.height))>1.5?Math.PI/2:0;
 const needsCrop=crop&&(crop.repeat.some(value=>Math.abs(value-1)>.00001)||crop.offset.some(value=>Math.abs(value)>.00001));
 if(needsCrop||autoRotation){for(const [key,source,property]of [['lrfTileMapClone',map,'map'],['lrfTileBumpClone',bumpMap,'bumpMap']]){if(!source)continue;const clone=source.clone();if(needsCrop){clone.center.set(0,0);clone.rotation=0;clone.repeat.fromArray(crop.repeat);clone.offset.fromArray(crop.offset);}else{clone.center.set(.5,.5);clone.rotation=autoRotation;}clone.needsUpdate=true;material[key]=clone;material[property]=clone;}}
 material.userData.lrfTexturePhysicalCrop=crop;return crop;
}
