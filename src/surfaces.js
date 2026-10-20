import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const SURFACE_COLORS = Object.freeze({
 "floor": [
  {
   "id": "beige",
   "name": "Beige",
   "file": "shell-beige.webp"
  },
  {
   "id": "beige-light",
   "name": "Beige Light",
   "file": "shell-beige-light.webp"
  },
  {
   "id": "grey",
   "name": "Grey",
   "file": "shell-grey.webp"
  },
  {
   "id": "grey-light",
   "name": "Grey Light",
   "file": "shell-grey-light.webp"
  },
  {
   "id": "ivory",
   "name": "Ivory",
   "file": "shell-ivory.webp"
  },
  {
   "id": "ivory-light",
   "name": "Ivory Light",
   "file": "shell-ivory-light.webp"
  }
 ],
 "wall": [
  {
   "id": "avena",
   "name": "Avena",
   "file": "creta-avena.webp"
  },
  {
   "id": "biscotto",
   "name": "Biscotto",
   "file": "creta-biscotto.webp"
  },
  {
   "id": "caramello",
   "name": "Caramello",
   "file": "creta-caramello.webp"
  },
  {
   "id": "ginepro",
   "name": "Ginepro",
   "file": "creta-ginepro.webp"
  },
  {
   "id": "malto",
   "name": "Malto",
   "file": "creta-malto.webp"
  },
  {
   "id": "matcha",
   "name": "Matcha",
   "file": "creta-matcha.webp"
  },
  {
   "id": "pepe",
   "name": "Pepe",
   "file": "creta-pepe.webp"
  },
  {
   "id": "zucchero",
   "name": "Zucchero",
   "file": "creta-zucchero.webp"
  }
 ]
});

export const SURFACES = Object.freeze({
 floor: Object.freeze({collection:'Shell',color:'Beige',file:'shell-beige.webp',width:1.20,height:.60,grout:.002,roughness:.70,bumpScale:.00022}),
 wall: Object.freeze({collection:'Creta',color:'Avena',file:'creta-avena.webp',width:1.20,height:.60,grout:.002,roughness:.82,bumpScale:.00012})
});

// The surface is built from real 60 x 120 cm tile modules. Shared geometry and
// instancing keep the bevelled individual slabs economical on mobile devices.
export function makeTiledSurface(kind,columns,rows){
 const spec=SURFACES[kind];
 if(!spec)throw new Error('Unknown tiled surface');
 const group=new T.Group();group.name=`${spec.collection}_${spec.color}_60x120`;
 const material=new T.MeshPhysicalMaterial({color:0xffffff,roughness:spec.roughness,metalness:0,ior:1.5,clearcoat:0});
 const thickness=.009;
 const geometry=new RoundedBoxGeometry(spec.width-spec.grout,spec.height-spec.grout,thickness,2,.00045);
 const tiles=new T.InstancedMesh(geometry,material,columns*rows);tiles.name='Dalles_60x120_joints_2mm';tiles.receiveShadow=true;tiles.castShadow=false;
 const transform=new T.Object3D();let index=0;
 for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
  transform.position.set((column-(columns-1)/2)*spec.width,(row-(rows-1)/2)*spec.height,-thickness/2);
  // Rotate the single authentic manufacturer face by 180 degrees, without
  // changing its colour or synthesising any additional stone pattern.
  transform.rotation.z=(row+column)%2?Math.PI:0;
  transform.updateMatrix();tiles.setMatrixAt(index++,transform.matrix);
 }
 tiles.instanceMatrix.needsUpdate=true;tiles.computeBoundingBox();tiles.computeBoundingSphere();group.add(tiles);
 const grout=new T.Mesh(new T.PlaneGeometry(columns*spec.width,rows*spec.height),new T.MeshStandardMaterial({color:'#ded8c8',roughness:.96}));
 grout.name='Joint_ivoire_en_retrait';grout.position.z=-.0012;grout.receiveShadow=true;group.add(grout);
 group.userData={...spec,columns,rows,moduleWidth:spec.width,moduleHeight:spec.height};
 return {group,material,tiles,grout,spec};
}
