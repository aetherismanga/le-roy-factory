import * as T from 'three';
import {makeColumn as studioMakeColumn} from '@studio-one-original/column.js';
import {animaFacadeGeometry} from './facades.js';
import {columnProduct} from './column-data.js';
export const COLUMN_SPEC=Object.freeze({width:.40,height:1.40,depth:.22,bottom:.30,panel:.019,reference:'APUR-CO40140'});
export function makeColumn(settings={}){
  const product=columnProduct(settings),half=product.subtype==='wall',asset=studioMakeColumn(),ribelle=product.facade==='RIBELLE',root=asset.root,bottom=half?1.10:.30;
  // Retain the Studio One adjustable hinges, assembly and reversible opening.
  // Refit their coordinate system to the Anima H70 or H140 stock envelope.
  const scale=new T.Vector3(product.width/38,product.height/132,product.depth/27);root.scale.copy(scale);root.position.set(0,bottom-.28*scale.y,-.23+.23*scale.z);
  const old=asset.door.getObjectByName('Facade_colonne_19mm_biseau_45');old?.removeFromParent();old?.geometry.dispose();
  const fronts=[],frontCount=half?1:2;for(let i=0;i<frontCount;i++){
    const height=half?1.316:(1.316-.018)/2,geometry=animaFacadeGeometry(.376,height*scale.y,ribelle);
    // Keep the photographed grip height when fitting the original assembly.
    geometry.scale(1,1/scale.y,1);
    if(half||i===1)geometry.rotateZ(Math.PI);
    const mesh=new T.Mesh(geometry,asset.frontWood);mesh.name=(ribelle?'Ribelle':'Pura')+'_facade_colonne_'+(i+1);mesh.userData.animaGripEdge=half||i===1?'bottom':'top';mesh.userData.editTarget='column';mesh.position.set(.188,height/2+i*(height+.018),0);mesh.castShadow=mesh.receiveShadow=true;asset.door.add(mesh);fronts.push(mesh);
  }
  for(const shelf of asset.shelves){shelf.removeFromParent();shelf.geometry.dispose();}
  const oldSupports=[];root.traverse(mesh=>{if(mesh.name==='Taquet_etablette')oldSupports.push(mesh);});
  const supportMaterial=oldSupports[0]?.material;for(const mesh of oldSupports){mesh.removeFromParent();mesh.geometry.dispose();}
  const glass=new T.MeshPhysicalMaterial({color:'#d8e4df',roughness:.12,transparent:true,opacity:.32,depthWrite:false,side:T.DoubleSide}),shelves=[];
  for(let i=0;i<product.glassShelves;i++){const mesh=new T.Mesh(new T.BoxGeometry(.342,.006/scale.y,.224),glass);mesh.name='Etagere_verre_colonne_Anima_'+(i+1);mesh.position.set(0,.28+(i+1)*1.32/(product.glassShelves+1),-.108);root.add(mesh);shelves.push(mesh);for(const x of[-.166,.166])for(const z of[-.18,-.04]){const support=new T.Mesh(new T.BoxGeometry(.007,.008/scale.y,.009),supportMaterial);support.name='Taquet_etablette';support.position.set(x,mesh.position.y-.007/scale.y,z);root.add(support);}}
  if(half)root.traverse(mesh=>{if(!mesh.isMesh||mesh.material!==asset.wood)return;const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,uv=mesh.geometry.attributes.uv;for(let i=0;i<p.count;i++){const x=(p.getX(i)+mesh.position.x)*scale.x,y=(p.getY(i)+mesh.position.y)*scale.y,z=(p.getZ(i)+mesh.position.z)*scale.z;uv.setXY(i,Math.abs(n.getX(i))>.6?z/.7+.4:x/.8+.5,y/.7);}uv.needsUpdate=true;});
  asset.shelves=shelves;asset.frontMeshes=fronts;asset.spec={...COLUMN_SPEC,width:product.width/100,height:product.height/100,depth:product.depth/100,bottom,reference:product.ref,sourceProductId:product.id,facade:product.facade};root.name='NEOBATH_ANIMA_'+(half?'DEMI_COLONNE_':'COLONNE_')+asset.spec.facade;
  asset.setHingeSide(settings.hingeSide||'left');return asset;
}
