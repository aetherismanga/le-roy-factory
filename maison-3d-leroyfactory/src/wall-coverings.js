import * as T from 'three';
import {tileGeometry,tileCounts,geometryArea} from './takeoff.js';
import {surfaceProduct} from './products.js';
import {reverseFace} from './geometry.js';
// Tile the manufacturer's real formats over the same door/window-cut wall polygons.
export function createWallCoverings(surfaces,textures){
 const rooms=new Map();
 async function set(id,spec){
  const records=surfaces.filter(s=>s.room===id);if(!records.length)throw Error('Murs de pièce introuvables.');
  let prepared=[];
  try{
   if(spec){const product=surfaceProduct(spec);if(!product.collection.surfaces.includes('wall'))throw Error('Ce revêtement n’est pas admis au mur.');const source=await textures.tile(spec);
    for(const record of records){
     const base=record.originalGeometry||record.mesh.geometry,shape=base.parameters.shapes,points=shape.extractPoints(12),poly=points.shape.map(p=>p.toArray()),holes=points.holes.map(h=>h.map(p=>p.toArray()));
     const geometry=tileGeometry(poly,holes,{width:product.format.width+spec.groutWidth/1000,height:product.format.height+spec.groutWidth/1000,pattern:spec.pattern,direction:spec.direction,groutWidth:spec.groutWidth,x:spec.x,y:spec.y,origin:[0,0]});
     const normal=base.attributes.normal.getZ(0);if(normal<0){geometry.scale(1,1,-1);geometry.setIndex(Array.from({length:geometry.attributes.position.count},(_,i)=>i));reverseFace(geometry);}
     const materials=source.map(m=>{const c=m.clone();c.polygonOffset=true;c.polygonOffsetFactor=-1;c.polygonOffsetUnits=-1;return c;});
     geometry.clearGroups();const cells=geometry.userData.faceCells;for(let i=0;i<cells.length;i++)geometry.addGroup(i*3,3,Math.abs((cells[i].split(':').map(Number).reduce((a,b)=>a+b,0)))%materials.length);
     prepared.push({record,geometry,materials,counts:tileCounts(geometry,product.format,geometryArea(base),spec.waste,product.pack)});
    }
    source.forEach(m=>m.dispose());
   }
  }catch(e){prepared.forEach(p=>{p.geometry.dispose();p.materials.forEach(m=>m.dispose());});throw e;}
  const oldMaps=new Set();
  for(const r of records){
   if(!r.originalGeometry){r.originalGeometry=r.mesh.geometry;r.originalMaterial=r.mesh.material;}
   if(r.mesh.geometry!==r.originalGeometry){r.mesh.geometry.dispose();(Array.isArray(r.mesh.material)?r.mesh.material:[r.mesh.material]).forEach(m=>{if(m.map)oldMaps.add(m.map);m.dispose();});}
   if(r.backing){r.backing.removeFromParent();r.backing.material.dispose();r.backing=null;}
   const part=prepared.find(p=>p.record===r);
   if(part){
    const backing=new T.Mesh(r.originalGeometry,new T.MeshStandardMaterial({color:spec.grout,roughness:1,side:T.DoubleSide}));backing.position.copy(r.mesh.position);backing.position.z-=Math.sign(r.originalGeometry.attributes.normal.getZ(0))*.0007;backing.rotation.copy(r.mesh.rotation);backing.userData.room=id;backing.userData.wall=r.wall;backing.name='Joint_mural_'+id;backing.castShadow=false;backing.receiveShadow=true;r.mesh.parent.add(backing);r.backing=backing;
    r.mesh.geometry=part.geometry;r.mesh.material=part.materials;r.counts=part.counts;
   }else{r.mesh.geometry=r.originalGeometry;r.mesh.material=r.originalMaterial;delete r.counts;}
  }
  oldMaps.forEach(t=>t.dispose());
  if(spec){
   const product=surfaceProduct(spec),counts=prepared.reduce((a,p)=>({used:a.used+p.counts.used,whole:a.whole+p.counts.whole,cut:a.cut+p.counts.cut,area:a.area+p.counts.area}),{used:0,whole:0,cut:0,area:0});
   counts.waste=spec.waste;counts.order=Math.ceil(counts.used*(1+spec.waste/100));counts.pcsBox=product.pack?.pcsBox||null;counts.boxes=counts.pcsBox?Math.ceil(counts.order/counts.pcsBox):null;counts.tileArea=product.format.width*product.format.height;counts.orderArea=(counts.boxes?counts.boxes*counts.pcsBox:counts.order)*counts.tileArea;
   rooms.set(id,{spec:structuredClone(spec),product,counts});
  }else rooms.delete(id);
 }
 return {set,rooms};
}
