import {DEFAULT_ROOM,cloneRoom,makeRoom} from './room.js';
import {floorWallAlignment} from './floor-wall-alignment.js';

// Only fresh entries use this scene. Saved/imported projects keep their own
// materials, openings, lighting and layout through restoreProject.
export const OPENING_TILE_FORMAT=Object.freeze({id:'60x90',width:.9,height:.6});
export function openingBathroomProject(){
 const finish={collection:'Stone Icon',format:'60x90',finish:'Tumbled · R10 B · Rectifié · 8,5 mm',groutColor:'Beige'};
 const walls=Array.from({length:4},()=>({...finish,color:'francese',catalogueKey:'ELIOS|04S6902',reference:'04S6902'}));
 walls[3]={collection:'Peinture',color:'white',paintHex:'#eeeae0'};
 const floor={...finish,color:'leccese',catalogueKey:'ELIOS|04S6903',reference:'04S6903',zones:[],jointProfiles:[]};
 const layout={width:.9,height:.6,direction:'horizontal',pattern:'straight',x:0,y:0,groutWidth:2,shape:'rectangle'};
 const scene=makeRoom(DEFAULT_ROOM,0);let floorLayout;
 try{const alignment=floorWallAlignment({floorLayout:layout,wallLayout:layout,floorFormat:OPENING_TILE_FORMAT,wallFormat:OPENING_TILE_FORMAT,floorGroup:scene.floor.group,wallGroup:scene.walls[0].group});if(!alignment.allowed)throw Error(alignment.reason);floorLayout=alignment.layout;}finally{scene.dispose();}
 return {version:2,title:'Ma salle de bain',room:cloneRoom(DEFAULT_ROOM),floor,walls,lighting:'day',brightness:144,temperature:4700,renovation:{locked:false},profiles:{enabled:false,internalCorners:false,color:'Argent',walls:[]},tileLoss:10,layouts:{floor:floorLayout,walls:walls.map(()=>({...layout}))},items:[
  {id:'opening-window',type:'window',settings:{width:120,height:100,color:'white'},placement:{wall:0,u:350,height:110}},
  {id:'opening-door',type:'door',settings:{width:83,height:204,color:'white'},placement:{wall:3,u:225,height:0}}
 ]};
}
