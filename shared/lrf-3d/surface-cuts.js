import * as T from 'three';
import clipping from './polygon-clipping.mjs';
import {buildTileGeometry} from './tile-layout.js';

// Boolean cuts may overlap or cross a face's edge. Triangulating their union
// once keeps the visible tile, grout, picking and measured area consistent.
export function surfaceRegions(polygon,cuts=[]){
 return cuts.length?clipping.difference([polygon],...cuts.map(ring=>[ring])):[[polygon]];
}
export function regionsArea(regions){
 const area=ring=>Math.abs(ring.reduce((sum,a,i)=>{const b=ring[(i+1)%ring.length];return sum+a[0]*b[1]-b[0]*a[1];},0)/2);
 return regions.reduce((sum,rings)=>sum+area(rings[0])-rings.slice(1).reduce((n,ring)=>n+area(ring),0),0);
}
export function rebuildFlatSurface(surface){
 const regions=surfaceRegions(surface.polygon,surface.holes||[]),triangles=[],shapes=[];
 for(const rings of regions){
  const points=rings.map(r=>r.slice(0,r.length>1&&r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1]?-1:undefined).map(p=>new T.Vector2(...p)));
  const shape=new T.Shape(points[0]);for(const hole of points.slice(1))shape.holes.push(new T.Path(hole));shapes.push(shape);
  const all=points.flat();for(const tri of T.ShapeUtils.triangulateShape(points[0],points.slice(1)))triangles.push(tri.map(i=>all[i].toArray()));
 }
 const replace=(mesh,geometry)=>{mesh.geometry.dispose();mesh.geometry=geometry;};
 replace(surface.tiles,buildTileGeometry(surface.polygon,surface.layout,[],triangles));
 replace(surface.grout,new T.ShapeGeometry(shapes));replace(surface.paint,surface.grout.geometry.clone());
 surface.refreshTileColors?.();
}
