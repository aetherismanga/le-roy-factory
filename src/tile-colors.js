import {COLLECTIONS} from './surface-catalog.js';
import {quantityForSurface} from './quantities.js';
export function validTileColors(surface,finish){const keys=new Set(surface.tiles.geometry.userData.cells.map(c=>c.key)),colors=new Set(COLLECTIONS[finish.collection]?.colors.map(c=>c.id)||[]);return Object.fromEntries(Object.entries(finish.tiles||{}).slice(0,2000).filter(([key,color])=>keys.has(key)&&colors.has(color)&&color!==finish.color));}
export function applyTileColors(surface,finish,createMaterial){
 const previous=surface.tileMaterials||[];previous.forEach(m=>m.dispose());surface.tileMaterials=[];
 const colors=validTileColors(surface,finish),ids=[...new Set(Object.values(colors))],materials=[surface.material,...ids.map(id=>createMaterial(id))];surface.tileMaterials=materials.slice(1);surface.tiles.material=materials.length>1?materials:surface.material;
 const g=surface.tiles.geometry,faces=g.userData.faceCells||[];g.clearGroups();let start=0,last=-1;
 for(let i=0;i<=faces.length;i++){const index=i===faces.length?-2:colors[faces[i]]?ids.indexOf(colors[faces[i]])+1:0;if(index!==last){if(last>=0)g.addGroup(start*3,(i-start)*3,last);start=i;last=index;}}
 return colors;
}
export function coloredQuantityRows(surface,finish,layout,loss,label){
 const colors=validTileColors(surface,finish);if(!Object.keys(colors).length||finish.collection==='Peinture')return [quantityForSurface(surface,finish,layout,loss,label)];
 const cells=surface.tiles.geometry.userData.cells,base=quantityForSurface(surface,finish,layout,loss,label),sum=cells.reduce((n,c)=>n+c.area,0),groups=new Map();for(const cell of cells){const color=colors[cell.key]||finish.color;if(!groups.has(color))groups.set(color,[]);groups.get(color).push(cell);}
 return [...groups].map(([color,group])=>quantityForSurface({...surface,quantityAreaOverride:base.area*group.reduce((n,c)=>n+c.area,0)/sum,tiles:{geometry:{userData:{cells:group}}}},{...finish,color},layout,loss,label+' · '+(COLLECTIONS[finish.collection].colors.find(c=>c.id===color)?.name||color)));
}
