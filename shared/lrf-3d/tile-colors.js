import {COLLECTIONS} from './surface-catalog.js';
import {quantityForSurface} from './quantities.js';
import {resolveSurfaceTexture,finishForSurface} from './surface-texture-selection.js';
import {segmentoSelection} from './segmento.js';
export function validTileColors(surface,finish){const cells=surface.tiles.geometry.userData.cells,keys=new Set(cells.map(c=>c.key)),colors=new Set(COLLECTIONS[finish.collection]?.colors.map(c=>c.id)||[]),pattern=finish.collection==='Segmento'&&segmentoSelection(surface.layout)?Object.fromEntries(cells.filter(c=>c.segmentoColor).map(c=>[c.key,c.segmentoColor])):{};return Object.fromEntries(Object.entries({...pattern,...finish.tiles}).slice(0,12000).filter(([key,color])=>keys.has(key)&&colors.has(color)&&color!==finish.color));}
const positiveModulo=(value,period)=>((value%period)+period)%period;
const decorDimension=value=>Number.isInteger(value)&&value>0&&value<=64?value:1;
function decorQuarterTurn(definition,col,row){
 const rotations=definition?.decorRotations,columns=decorDimension(rotations?.columns),rows=decorDimension(rotations?.rows),turn=rotations?.quarterTurns?.[positiveModulo(row,rows)*columns+positiveModulo(col,columns)];
 return Number.isInteger(turn)?positiveModulo(turn,4):0;
}
function orientContinuousDecor(surface,finish){
 if(!surface.tiles.geometry.userData.originalTileUV&&!COLLECTIONS[finish.collection]?.colors.some(c=>c.continuousDecor)){surface.tiles.geometry.userData.continuousDecor=false;return;}
 const definitions=(COLLECTIONS[finish.collection]?.colors||[]).filter(c=>c.continuousDecor),continuous=new Map(definitions.map(c=>[c.id,c])),colors=validTileColors(surface,finish),enabled=[finish.color,...Object.values(colors)].some(id=>continuous.has(id));
 // A half-tile stagger cannot join these full-panel drawings. Rebuild older
 // saved layouts on a straight grid before assigning their material groups.
 if(enabled&&surface.layout?.pattern&&surface.layout.pattern!=='straight'&&surface.setLayout){surface.setLayout({...surface.layout,pattern:'straight'});return orientContinuousDecor(surface,finish);}
 const g=surface.tiles.geometry,data=g.userData,uv=g.attributes.uv;data.continuousDecor=enabled;
 if(!uv||!enabled&&!data.originalTileUV)return;
 const signature=JSON.stringify([finish.collection,finish.color,colors,definitions.map(c=>[c.id,c.decorRepeat,c.decorRotations])]);if(data.tileOrientationKey===signature)return;
 const original=data.originalTileUV??=uv.array.slice(),source=data.sourceFaceCells||data.faceCells||[];
 // Tile geometry keeps natural materials varied by turning alternate slabs.
 // Restore the unturned UVs only for the selected continuous decor, including
 // partial tiles at openings. Keep the source order when groups are reindexed.
 for(let face=0;face<source.length;face++){
  const key=source[face],[col=0,row=0]=key.split(':').map(Number),definition=continuous.get(colors[key]||finish.color),unturn=!!definition&&Math.abs(col*13+row*7)%2===1;
  // Some manufacturer pictures contain a complete 2 × 2 tile panel. Sample
  // each physical tile's matching quadrant instead of shrinking all four
  // tiles into every cell. A positive modulo preserves the panel phase when
  // a drawing starts before the origin or is clipped by a door/window.
  const columns=decorDimension(definition?.decorRepeat?.columns),rows=decorDimension(definition?.decorRepeat?.rows),phaseX=positiveModulo(col,columns),phaseY=positiveModulo(row,rows),turn=decorQuarterTurn(definition,col,row);
  // A single quarter-motif picture is different from a full-panel atlas:
  // keep its whole face on each tile, rotating the samples by the documented
  // quarter turns. The table is bottom-row-first in the physical UV grid;
  // one turn samples [1-v,u]. Never rotate a clipped fragment around its own
  // bounds: use its original full-tile UVs so openings retain the same phase.
  for(let i=face*6;i<face*6+6;i+=2){let u=unturn?1-original[i]:original[i],v=unturn?1-original[i+1]:original[i+1];if(turn===1)[u,v]=[1-v,u];else if(turn===2)[u,v]=[1-u,1-v];else if(turn===3)[u,v]=[v,1-u];uv.array[i]=definition?(phaseX+u)/columns:original[i];uv.array[i+1]=definition?(phaseY+v)/rows:original[i+1];}
 }
 data.tileOrientationKey=signature;uv.needsUpdate=true;
}
export function applyTileColors(surface,finish,createMaterial){
 orientContinuousDecor(surface,finish);
 for(const m of surface.tileMaterials||[]){m.lrfTileMapClone?.dispose();m.dispose();}surface.tileMaterials=[];
 const colors=validTileColors(surface,finish),g=surface.tiles.geometry,source=g.userData.sourceFaceCells||g.userData.faceCells||[];g.userData.sourceFaceCells=source;
 const materials=[],buckets=[],lookup=new Map(),faceCounts=new Map();
 const countFor=color=>{if(!faceCounts.has(color)){const definition=COLLECTIONS[finish.collection]?.colors.find(c=>c.id===color),selection=resolveSurfaceTexture(finish.collection,color,'max',finishForSurface(finish.collection,color,surface.layout,finish));faceCounts.set(color,Math.min(40,(color===finish.color&&surface.material.userData.lrfTextureFaceCount)||(selection.mapped?selection.files.length:definition?.faces?.length)||1));}return faceCounts.get(color);};
 for(let face=0;face<source.length;face++){
  const key=source[face],color=colors[key]||finish.color,faceCount=countFor(color),[col=0,row=0,part=0]=key.split(':').map(Number),variant=((col+row*3+part*7)%faceCount+faceCount)%faceCount,id=color+'|'+variant;
  if(!lookup.has(id)){const m=color===finish.color&&variant===0?surface.material:createMaterial(color,variant);lookup.set(id,materials.length);materials.push(m);buckets.push([]);if(m!==surface.material)surface.tileMaterials.push(m);}
  buckets[lookup.get(id)].push(face);
 }
 if(!materials.length){surface.tiles.material=surface.material;return colors;}
 const indices=[],faces=[];g.clearGroups();buckets.forEach((bucket,index)=>{const start=indices.length;for(const face of bucket){indices.push(face*3,face*3+1,face*3+2);faces.push(source[face]);}g.addGroup(start,indices.length-start,index);});g.setIndex(indices);g.userData.faceCells=faces;surface.tiles.material=materials.length>1?materials:materials[0];return colors;
}
export function coloredQuantityRows(surface,finish,layout,loss,label){
 if(finish.collection==='Segmento'&&segmentoSelection(layout))return [quantityForSurface(surface,finish,layout,loss,label)];
 const colors=validTileColors(surface,finish);if(!Object.keys(colors).length||finish.collection==='Peinture')return [quantityForSurface(surface,finish,layout,loss,label)];
 const cells=surface.tiles.geometry.userData.cells,base=quantityForSurface(surface,finish,layout,loss,label),sum=cells.reduce((n,c)=>n+c.area,0),groups=new Map();for(const cell of cells){const color=colors[cell.key]||finish.color;if(!groups.has(color))groups.set(color,[]);groups.get(color).push(cell);}
 return [...groups].map(([color,group])=>quantityForSurface({...surface,quantityAreaOverride:base.area*group.reduce((n,c)=>n+c.area,0)/sum,tiles:{geometry:{userData:{cells:group}}}},{...finish,color},layout,loss,label+' · '+(COLLECTIONS[finish.collection].colors.find(c=>c.id===color)?.name||color)));
}
