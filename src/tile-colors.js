import {COLLECTIONS} from './surface-catalog.js';
import {quantityForSurface} from './quantities.js';
export function validTileColors(surface,finish){const keys=new Set(surface.tiles.geometry.userData.cells.map(c=>c.key)),colors=new Set(COLLECTIONS[finish.collection]?.colors.map(c=>c.id)||[]);return Object.fromEntries(Object.entries(finish.tiles||{}).slice(0,12000).filter(([key,color])=>keys.has(key)&&colors.has(color)&&color!==finish.color));}
export function applyTileColors(surface,finish,createMaterial){
 for(const m of surface.tileMaterials||[]){m.lrfTileMapClone?.dispose();m.dispose();}surface.tileMaterials=[];
 const colors=validTileColors(surface,finish),g=surface.tiles.geometry,source=g.userData.sourceFaceCells||g.userData.faceCells||[];g.userData.sourceFaceCells=source;
 const materials=[],buckets=[],lookup=new Map();
 for(let face=0;face<source.length;face++){
  const key=source[face],color=colors[key]||finish.color,definition=COLLECTIONS[finish.collection]?.colors.find(c=>c.id===color),faceCount=Math.min(40,definition?.faces?.length||1),[col=0,row=0,part=0]=key.split(':').map(Number),variant=((col+row*3+part*7)%faceCount+faceCount)%faceCount,id=color+'|'+variant;
  if(!lookup.has(id)){const m=color===finish.color&&variant===0?surface.material:createMaterial(color,variant);lookup.set(id,materials.length);materials.push(m);buckets.push([]);if(m!==surface.material)surface.tileMaterials.push(m);}
  buckets[lookup.get(id)].push(face);
 }
 if(!materials.length){surface.tiles.material=surface.material;return colors;}
 const indices=[],faces=[];g.clearGroups();buckets.forEach((bucket,index)=>{const start=indices.length;for(const face of bucket){indices.push(face*3,face*3+1,face*3+2);faces.push(source[face]);}g.addGroup(start,indices.length-start,index);});g.setIndex(indices);g.userData.faceCells=faces;surface.tiles.material=materials.length>1?materials:materials[0];return colors;
}
export function coloredQuantityRows(surface,finish,layout,loss,label){
 const colors=validTileColors(surface,finish);if(!Object.keys(colors).length||finish.collection==='Peinture')return [quantityForSurface(surface,finish,layout,loss,label)];
 const cells=surface.tiles.geometry.userData.cells,base=quantityForSurface(surface,finish,layout,loss,label),sum=cells.reduce((n,c)=>n+c.area,0),groups=new Map();for(const cell of cells){const color=colors[cell.key]||finish.color;if(!groups.has(color))groups.set(color,[]);groups.get(color).push(cell);}
 return [...groups].map(([color,group])=>quantityForSurface({...surface,quantityAreaOverride:base.area*group.reduce((n,c)=>n+c.area,0)/sum,tiles:{geometry:{userData:{cells:group}}}},{...finish,color},layout,loss,label+' · '+(COLLECTIONS[finish.collection].colors.find(c=>c.id===color)?.name||color)));
}
