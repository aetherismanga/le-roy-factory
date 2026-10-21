import {DEFAULT_ROOM,cloneRoom,roomPreset} from './room.js';
const item=(id,type,settings,wall,u,height=0,extra={})=>({id,type,settings,placement:{wall,u,height,...extra}});
const cabinet=(id,u,width=80,top='sella')=>item(id,'cabinet',{format:'two',width,top,finish:'ROBLE',basinColor:'gloss',tampaColor:'gloss',vesselColor:'gloss',drawers:[0,0],decor:true},0,u,28);
const mirror=(id,u,height=145)=>item(id,'mirror',{mirrorModel:'capsule',width:45,height:90,led:true,mirrorFinish:'Noir'},0,u,height);
const opening=(id,type,wall,u,width=83,base=0)=>item(id,type,{width,height:type==='door'?204:100,color:'white'},wall,u,base);
export function defaultBathroomProject(room=DEFAULT_ROOM,items=null,title='Ma salle de bain'){return {version:2,title,room:cloneRoom(room),floor:{collection:'Creta',color:'caramello',groutColor:'Gris clair'},walls:Array(room.points.length+(room.partitions?.length||0)*2).fill(null).map(()=>({collection:'Peinture',color:'white'})),lighting:'warm',brightness:105,temperature:4400,profiles:{enabled:true,internalCorners:false,color:'Argent',walls:[]},tileLoss:10,items:items||[cabinet('new-cabinet',room.points[1][0]/2),mirror('new-mirror',room.points[1][0]/2)]};}
export const BATHROOM_PRESETS=[
 {id:'empty-compact',name:'Plan compact',description:'300 × 250 cm · porte et fenêtre',empty:true},
 {id:'empty-comfort',name:'Plan à pan coupé',description:'360 × 300 cm · 5 angles · porte et fenêtre',empty:true},
 {id:'empty-angle',name:'Plan en L',description:'420 × 360 cm · retour de cloison · porte et fenêtre',empty:true},
 {id:'empty-spa',name:'Plan en biais',description:'450 × 350 cm · trapèze · porte et fenêtre',empty:true},
 {id:'shower',name:'Douche & lumière',description:'Douche, meuble 80, AMARO et sèche-serviettes'},
 {id:'bath',name:'Bain chaleureux',description:'Baignoire, meuble 100, KRAL et accessoires'},
 {id:'spa',name:'Suite minérale',description:'Double meuble, bain îlot, douche et TRIXIE'}
];
export function bathroomPreset(id){if(id==='empty-comfort'){const room=roomPreset('chamfer',360,300);return defaultBathroomProject(room,[opening('preset-door','door',4,220),opening('preset-window','window',0,250,100,125)],'Plan à pan coupé');}if(id==='empty-spa'){const room={height:260,points:[[0,0],[450,0],[400,350],[0,350]],partitions:[]};return defaultBathroomProject(room,[opening('preset-door','door',3,260),opening('preset-window','window',0,300,120,125)],'Plan en biais');}if(id==='empty-angle'){const room=roomPreset('l',420,360);return defaultBathroomProject(room,[opening('preset-door','door',5,270),opening('preset-window','window',0,300,100,125)],'Plan en L');}const kind=id.replace('empty-',''),compact=kind==='compact'||id==='shower',spa=kind==='spa'||id==='spa',w=compact?300:spa?450:360,d=compact?250:spa?350:300,room=roomPreset('rectangle',w,d),items=[opening('preset-door','door',3,compact?55:spa?290:245),opening('preset-window','window',2,compact?235:spa?340:235,compact?80:100,130)];
 if(!id.startsWith('empty-')){
  if(id==='shower')items.push(cabinet('cabinet',90),mirror('mirror',90),item('tray','shower',{width:120,depth:90,trayColor:'white'},1,65),item('screen','screen',{width:100,screen:'fixed',metal:'Noir mat',trayId:'tray',edge:'front'},1,65,3.5),item('tap','tap',{use:'shower'},1,65,55),item('wc','toilet',{reference:'TR2217R'},2,110,12),item('towel','towel',{model:'round',metal:'Noir mat',decor:true},3,140,35));
  else if(id==='bath')items.push(cabinet('cabinet',110,100,'neris'),mirror('mirror',110,160),item('bath','bath',{kind:'rect',width:170,depth:75,apron:'tile',apronCollection:'Creta',apronColor:'avena'},1,100),item('tap','tap',{use:'bath'},1,100,40),item('wc','toilet',{reference:'TR2224'},2,70),item('towel','towel',{model:'flat',metal:'Or brossé',decor:true},3,130,35));
  else if(id==='spa')items.push(cabinet('cabinet-a',130),cabinet('cabinet-b',210),mirror('mirror-a',130),mirror('mirror-b',210),item('bath','bath',{kind:'island',width:170,depth:75},2,225,0,{offset:70}),item('tray','shower',{width:140,depth:100,trayColor:'beige'},1,80),item('screen','screen',{width:120,screen:'fixed',metal:'Or brossé',trayId:'tray',edge:'front'},1,80,3.5),item('tap','tap',{use:'shower'},1,95,55),item('wc','toilet',{reference:'TR2217R-U18'},2,80,12),item('handwash','washstand',{reference:'TR443',metal:'Or brossé',decor:true},3,190,70),item('towel','towel',{model:'flat',metal:'Or brossé',decor:true},3,130,35));
 }
 return defaultBathroomProject(room,items,BATHROOM_PRESETS.find(p=>p.id===id)?.name||'Salle de bain');
}
