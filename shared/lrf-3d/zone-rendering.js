import {createSurface} from './room.js';

export function renderSurfaceZones(surface,zones,material,layoutFor,disposeObject,zonePolygon){
 const layouts=zones.map(layoutFor),geometrySignature=JSON.stringify(zones.map((z,i)=>[z.id,z.x,z.y,z.width,z.height,layouts[i]])),holesSignature=JSON.stringify(zones.map(zonePolygon));
 // A colour, finish or trim edit reuses the physical tile mesh. Only a size,
 // position or tile-layout change needs new cuts and cell geometry.
 if(surface.zoneGeometrySignature!==geometrySignature){
  for(const z of surface.decorativeZones||[]){z.group.removeFromParent();disposeObject(z.group);}surface.decorativeZones=[];
  if(surface.zoneHolesSignature!==holesSignature){if(zones.length||surface.extraHoles?.length)surface.setExtraHoles(zones.map(zonePolygon));surface.zoneHolesSignature=holesSignature;}
  for(const [i,z]of zones.entries()){const face=createSurface([[0,0],[z.width/100,0],[z.width/100,z.height/100],[0,z.height/100]],'Zone_'+z.id);face.group.position.set(z.x/100,z.y/100,.001);face.group.userData.editTarget='zone:'+z.id;face.zone=z;face.setLayout(layouts[i]);surface.group.add(face.group);surface.decorativeZones.push(face);}
  surface.zoneGeometrySignature=geometrySignature;
 }
 surface.zoneSignature=JSON.stringify(zones);
 for(const [i,face]of (surface.decorativeZones||[]).entries()){face.zone=zones[i];material(face,face.zone);face.grout.material.color.set(face.zone.groutColor||'#d5d0c3');}
 return surface.decorativeZones||[];
}
