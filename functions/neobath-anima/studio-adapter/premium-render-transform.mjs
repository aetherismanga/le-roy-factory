import {parse} from 'acorn';

function amendFunction(source,name,change){
 const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(node=>node.type==='FunctionDeclaration'&&node.id?.name===name);
 if(!node)throw Error('Studio One premium rendering contract changed: '+name);
 return source.slice(0,node.start)+change(source.slice(node.start,node.end))+source.slice(node.end);
}
const filterMaps=`for(const texture of [map,front,bump,frontBump,ribelleFront,ribelleFrontBump]){texture.wrapS=texture.wrapT=T.MirroredRepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=Math.min(16,typeof renderer==='object'?renderer.capabilities?.getMaxAnisotropy?.()||8:8);texture.needsUpdate=true;}`;
function cabinetMaps(source){
 source=source.replace('f.frontTexture?await loadTexture(tileAssetURL(f.frontTexture),profile):map.clone()','f.frontTexture?(await loadTexture(tileAssetURL(f.frontTexture),profile)).clone():map.clone()')
  .replace('const frontBump=bump.clone();','const frontBump=front.clone();frontBump.colorSpace=T.NoColorSpace;')
  .replace('const bump=map.clone();',"const ribelleFront=f.ribelleFrontTexture?(await loadTexture(tileAssetURL(f.ribelleFrontTexture),profile)).clone():front.clone();ribelleFront.wrapS=ribelleFront.wrapT=T.RepeatWrapping;ribelleFront.colorSpace=T.SRGBColorSpace;ribelleFront.repeat.copy(front.repeat);ribelleFront.center.set(.5,.5);ribelleFront.rotation=0;const ribelleFrontBump=ribelleFront.clone();ribelleFrontBump.colorSpace=T.NoColorSpace;const bump=map.clone();")
  .replace('return {map,front,bump,frontBump,profile};',filterMaps+'return {map,front,bump,frontBump,ribelleFront,ribelleFrontBump,profile};');
 return source;
}
function previewMaps(source){
 source=source.replace('const frontBump=bump.clone();','const frontBump=front.clone();frontBump.colorSpace=T.NoColorSpace;')
  .replace('const bump=t.clone();',"const ribelleFront=definition.ribelleFrontTexture?await new T.TextureLoader().loadAsync(__animaAsset(definition.ribelleFrontTexture)):front.clone();ribelleFront.wrapS=ribelleFront.wrapT=T.RepeatWrapping;ribelleFront.colorSpace=T.SRGBColorSpace;ribelleFront.repeat.copy(front.repeat);ribelleFront.center.set(.5,.5);ribelleFront.rotation=0;const ribelleFrontBump=ribelleFront.clone();ribelleFrontBump.colorSpace=T.NoColorSpace;const bump=t.clone();")
  .replace('return {map:t,front,bump,frontBump};',filterMaps.replace('[map,','[t,')+'return {map:t,front,bump,frontBump,ribelleFront,ribelleFrontBump};');
 source=source.replaceAll('front?tx.front:tx.map',"front?(item.asset.spec?.facade==='RIBELLE'?tx.ribelleFront||tx.front:tx.front):tx.map")
  .replaceAll('front?tx.frontBump:tx.bump',"front?(item.asset.spec?.facade==='RIBELLE'?tx.ribelleFrontBump||tx.frontBump:tx.frontBump):tx.bump")
  .replace('for(const m of [item.asset.wood,item.asset.frontWood]){m.color.set(\'#fff\');m.map=tx.map;m.bumpMap=tx.bump;',"for(const [m,front]of [[item.asset.wood,false],[item.asset.frontWood,true]]){m.color.set('#fff');m.map=front?(item.asset.spec?.facade==='RIBELLE'?tx.ribelleFront||tx.front:tx.front):tx.map;m.bumpMap=front?(item.asset.spec?.facade==='RIBELLE'?tx.ribelleFrontBump||tx.frontBump:tx.frontBump):tx.bump;");
 // The original preview paints wood after building geometry. Reapply a cover
 // which follows furniture finish after those maps, and await plan textures.
 source=source.replace('m.needsUpdate=true;}}\n  const shape=',"m.needsUpdate=true;}item.asset.furniturePlanTextures={map:tx.front,bump:tx.frontBump};item.asset.setSurface?.(item.settings,{onReady:invalidate});}\n  await Promise.all(current.items.map(item=>item.asset.prepareSurface?.()));const shape=");
 return source;
}

// Root invokes this last, after the original Studio One reuse and premium UI
// adapters. No edit is applied to either original RANDAL application.
export function transformPremiumRendering(source,relativePath){
 if(relativePath==='app.js'){
  source=amendFunction(source,'requestFinishAssets',cabinetMaps);
  source=amendFunction(source,'applyFurnitureMaterial',body=>body
   .replace('const tx=finishTextures[finish.id];',"const tx=finishTextures[finish.id],ribelle=asset.spec?.facade==='RIBELLE';asset.furniturePlanTextures=tx?{map:tx.front,bump:tx.frontBump}:null;")
   .replaceAll('front?tx.front:tx.map','front?(ribelle?tx.ribelleFront||tx.front:tx.front):tx.map')
   .replaceAll('front?tx.frontBump:tx.bump','front?(ribelle?tx.ribelleFrontBump||tx.frontBump:tx.frontBump):tx.bump')
   .replace(/\n\}$/, "\n asset.setSurface?.({},{onReady:()=>invalidate(false,false)});\n}"));
  source=amendFunction(source,'selectBasinColor',body=>body.replace('saveCabinetState();',"if(color&&color.ceramic!==false)model.setBasinAppearance?.(color);saveCabinetState();"));
  source=amendFunction(source,'paintAsset',body=>body.replace('item.asset.setSurface?.(item.settings',"if(c&&c.ceramic!==false)item.asset.setBasinAppearance?.(c);item.asset.setSurface?.(item.settings"));
 }
 if(relativePath==='commerce/live-preview.js')source=previewMaps(source);
 if(relativePath==='commerce/preview-model.js')source=source.replaceAll('item.asset.ceramic.clearcoat=c.clearcoat;', 'item.asset.ceramic.clearcoat=c.clearcoat;item.asset.setBasinAppearance?.(c);item.asset.setSurface?.(s);')
  .replace(/(?<![\w.])asset\.ceramic\.clearcoat=c\.clearcoat;/g,'asset.ceramic.clearcoat=c.clearcoat;asset.setBasinAppearance?.(c);asset.setSurface?.(s);');
 return source;
}
