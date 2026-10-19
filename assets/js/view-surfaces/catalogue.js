/* VIEW adapter. The ELIOS catalogue and its resolver remain unchanged. */
(() => {
 'use strict';
 const previous=window.RandalSurfaceCatalogue,view=window.ViewSurfaceCollections;
 if(!previous||!Array.isArray(view))throw Error('Catalogue VIEW indisponible.');
 const fixedGrout=s=>s?{...s,groutWidth:2,groutColor:window.StudioOneAmbience.nearest(s.groutColor)}:null;
 const collections=previous.collections.concat(view),aliases={corso:'view-corso','golden-stone':'view-golden-stone'};
 function resolve(value,surface){
  const input=typeof value==='string'?{key:value}:{...value};if(input.legacy)input.key=input.legacy;
  let id=input.collection,color=input.color,format=input.format;
  if(!id&&input.key){const parts=input.key.split(':');id=aliases[parts[0]]||parts[0];color=color||parts[1];format=format||parts[2];if(!format&&aliases[parts[0]])format=parts[0]==='corso'?'60x90':'60x120';if(input.key==='view-coco-beige'){id='view-coco';color='beige';format='40x60';}}
  const c=view.find(c=>c.id===id);if(!c)return fixedGrout(previous.resolve(value));
  if(!c.available3d||surface&&!c.surfaces.includes(surface))return null;
  const co=color?c.colors.find(co=>co.id===color):c.colors.find(co=>co.available3d);if(!co?.available3d||!co.faces.length)return null;
  const formats=c.formats.filter(f=>co.formats.includes(f.id)),f=format?formats.find(f=>f.id===format):formats[0];if(!f)return null;
  return fixedGrout({collection:c.id,brand:'view',color:co.id,format:f.id,width:f.width,height:f.height,shape:f.shape||'rectangle',orientation:input.orientation==='vertical'?'vertical':'horizontal',layout:input.layout==='staggered'?'staggered':'straight',groutWidth:Math.max(1,Math.min(5,Math.round(Number(input.groutWidth)||2))),groutColor:/^#[\da-f]{6}$/i.test(input.groutColor)?input.groutColor:'#b9b5ac',quality:['auto','high','balanced','economy'].includes(input.quality)?input.quality:'auto',pattern:'tiles',faces:co.faces,source:co.source||c.source,resolution:co.resolution,roughness:c.roughness,finish:c.finish,relief:c.relief,surfaces:c.surfaces,label:c.name+' · '+co.name});
 }
 window.RandalSurfaceCatalogue=Object.freeze({collections,resolve,isView(value){const v=typeof value==='string'?value:value?.collection||value?.key||value?.legacy||'';return /^view-/.test(v)||Object.keys(aliases).some(a=>v.startsWith(a+':'));},key(value){const s=resolve(value);return s?s.collection+':'+s.color+':'+s.format:'';},describe(value){const s=resolve(value);return s?s.label+' · '+s.format+' cm':'';}});
})();
