import * as T from 'three';
import {makeColumn as studioMakeColumn} from '@studio-one-original/column.js';
import {animaFacadeGeometry} from './facades.js';
export const COLUMN_SPEC=Object.freeze({width:.40,height:1.40,depth:.22,bottom:.30,panel:.019,reference:'APUR-CO40140'});
export function makeColumn(settings={}){
  const asset=studioMakeColumn(),ribelle=settings.columnModel==='ribelle-column'||settings.facade==='RIBELLE',root=asset.root;
  // Retain the Studio One adjustable hinges, assembly and reversible opening.
  // Refit their coordinate system to the exact Anima 40 × 140 × 22 envelope.
  const scale=new T.Vector3(.40/.38,1.40/1.32,.22/.27);root.scale.copy(scale);root.position.set(0,.30-.28*scale.y,-.23+.23*scale.z);
  const old=asset.door.getObjectByName('Facade_colonne_19mm_biseau_45');old?.removeFromParent();old?.geometry.dispose();
  const fronts=[];for(let i=0;i<2;i++){
    const height=(1.316-.018)/2,geometry=animaFacadeGeometry(.376,height,ribelle);
    if(i===1)geometry.rotateZ(Math.PI);
    const mesh=new T.Mesh(geometry,asset.frontWood);mesh.name=(ribelle?'Ribelle':'Pura')+'_facade_colonne_'+(i+1);mesh.userData.animaGripEdge=i===0?'top':'bottom';mesh.userData.editTarget='column';mesh.position.set(.188,height/2+i*(height+.018),0);mesh.castShadow=mesh.receiveShadow=true;asset.door.add(mesh);fronts.push(mesh);
  }
  for(const shelf of asset.shelves){shelf.removeFromParent();shelf.geometry.dispose();}
  const glass=new T.MeshPhysicalMaterial({color:'#d8e4df',roughness:.12,transparent:true,opacity:.32,depthWrite:false,side:T.DoubleSide}),shelves=[];
  for(let i=0;i<4;i++){const mesh=new T.Mesh(new T.BoxGeometry(.342,.006,.224),glass);mesh.name='Etagere_verre_colonne_Anima_'+(i+1);mesh.position.set(0,.28+(i+1)*1.32/5,-.108);root.add(mesh);shelves.push(mesh);}
  asset.shelves=shelves;asset.frontMeshes=fronts;asset.spec={...COLUMN_SPEC,reference:ribelle?'ARIB-CO40140':'APUR-CO40140',facade:ribelle?'RIBELLE':'PURA'};root.name='NEOBATH_ANIMA_COLONNE_'+asset.spec.facade;
  asset.setHingeSide(settings.hingeSide||'left');return asset;
}
