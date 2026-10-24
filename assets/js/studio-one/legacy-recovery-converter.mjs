import {publicLegacyRecord} from './legacy-recovery-core.mjs';
import {canonicalSurfaceIdentity,surfaceDefinition} from '../../../shared/lrf-3d/surface-identity.mjs';
import {INTEGRATED_BASINS} from '../../../shared/lrf-3d/integrated-basins.js';

// Only metadata for this historical adapter; no prices or replacement assets.
// The contract test compares these dimensions/IDs with the active Studio engine.
export const LEGACY_FORMATS=[
 {id:'two',height:54,drawers:2},{id:'three',height:91,drawers:3},
 {id:'one-xl',height:37.5,drawers:1},{id:'two-xl',height:75,drawers:2}
];
export const LEGACY_FINISHES=['ROBLE','ALBA','NOGAL','WHITE','AZUL','GRIS','BISC','GREEN'];
export const LEGACY_MIRRORS={
 'Basic':{id:'basic',sizes:[[60,80],[70,60],[100,60],[120,60]]},
 'Zen LED':{id:'zen',sizes:[[60,80],[80,80],[100,80],[120,80]]},
 'Ilse LED':{id:'ilse',sizes:[[60,80],[80,80],[100,80],[120,80]]},
 'Cápsula LED':{id:'capsule',sizes:[[45,90]]},
 'Miroir métallique rectangulaire':{id:'metal-rect',sizes:[[80,60],[120,75]]},
 'Miroir métallique rond':{id:'round',sizes:[[60,60]]}
};
const vesselColors=['gloss','pure','anthracite','black','taupe','namibie','ivory','pink','blue'];
const groutNames={'#f2f0e9':'Blanc','#c8c9c5':'Gris clair','#8f928e':'Gris','#baa88e':'Beige','#ded5c1':'Ivoire'};
const fail=message=>{throw Error(message);};
const cm=value=>Math.round(value*1000000)/10000;
function convertSurface(value,orientation,usage){
 const parsed=typeof value==='string'?{key:value}:value;
 if(!parsed||typeof parsed!=='object')fail('Le revêtement '+(usage==='floor'?'du sol':'des murs')+' est absent. Aucune texture de remplacement ne sera appliquée.');
 const parts=String(parsed.key||'').split(':');
 const collection=String(parsed.collection||parts[0]||'').replace(/^(?:elios|view|la-fenice)-/,'');
 const definition=surfaceDefinition(collection);
 if(!definition)fail('Collection historique non reconnue : '+collection+'. Son choix reste dans l’archive.');
 const format=parsed.format||parts[2],color=parsed.color||parts[1];
 if(!format||!color)fail('Coloris ou format absent pour '+definition.name+'. Aucune référence ne sera inventée.');
 const identity=canonicalSurfaceIdentity({collection:definition.name,color,format,reference:parsed.reference||'',catalogueKey:parsed.catalogueKey||'',finish:parsed.finish||''},{usage});
 const dimensions=definition.formats.find(f=>f.id===format);
 const direction=orientation||parsed.orientation||'horizontal';
 if(!['horizontal','vertical'].includes(direction))fail('Orientation historique non reconnue.');
 if(parsed.layout!==undefined&&!['straight','staggered'].includes(parsed.layout))fail('Calepinage historique non reconnu.');
 const grout=String(parsed.groutColor||'#c8c9c5').toLowerCase(),groutColor=groutNames[grout];
 if(!groutColor)fail('Couleur de joint non reconnue : '+grout+'. Elle reste dans l’archive.');
 const groutWidth=parsed.groutWidth??2;
 if(!Number.isFinite(groutWidth)||groutWidth<1||groutWidth>5)fail('Largeur de joint historique invalide.');
 return {finish:{...identity,groutColor},layout:{width:dimensions.width,height:dimensions.height,direction,pattern:parsed.layout==='staggered'?'offset':'straight',groutWidth,x:0,y:0,shape:dimensions.shape||'rectangle'}};
}
function convertItem(old,width,index){
 if(!old||!['cabinet','column','mirror'].includes(old.kind))fail('Élément '+(index+1)+' : type historique non reconnu.');
 const position=old.position;
 if(!position||!['x','y','z'].every(k=>Number.isFinite(position[k])))fail('Élément '+(index+1)+' : position manquante ou invalide.');
 if(old.accessories?.length)fail('Élément '+(index+1)+' : accessoires historiques sans correspondance certaine. L’archive les conserve.');
 const finish=old.finish==='BISC.'?'BISC':old.finish;
 if(!LEGACY_FINISHES.includes(finish))fail('Élément '+(index+1)+' : finition inconnue.');
 const placement={wall:0,u:width/2+position.x,height:position.y,offset:position.z+(old.kind==='cabinet'?1.5:old.kind==='column'?11:23)};
 let settings;
 if(old.kind==='cabinet'){
  const form=LEGACY_FORMATS[old.model];
  if(!Number.isInteger(old.model)||!form||!Number.isInteger(old.width)||old.width<40||old.width>120)fail('Meuble '+(index+1)+' : modèle ou largeur incompatible.');
  if(!['top','bare','basin'].includes(old.option)||typeof old.open!=='boolean')fail('Meuble '+(index+1)+' : plateau ou état d’ouverture inconnu.');
  let top=old.option==='bare'?'bare':'plain',basinLayout='center',basinColor='gloss',vesselColor='gloss';
  if(old.sink){
   const sink=old.sink;top=String(sink.model||'').toLowerCase();
   if(old.option==='basin'){
    if(!['sella','tampa'].includes(top)||!['single','double'].includes(sink.layout))fail('Implantation de vasque historique non reconnue.');
    basinLayout=sink.layout==='double'?'double':top==='sella'&&old.width===120?'offset':'center';
    basinColor=sink.color;
    const entry=INTEGRATED_BASINS[top]?.[basinColor]?.[basinLayout]?.[old.width];
    if(!entry||sink.layout==='double'&&old.width!==120)fail('Référence de vasque incompatible : aucun remplacement ne sera fait.');
    if((sink.reference||sink.ref)&&String(sink.reference||sink.ref)!==entry.ref)fail('La référence de vasque ne correspond pas à son implantation.');
   }else if(old.option==='top'){
    if(!['neris','torne'].includes(top)||!vesselColors.includes(sink.color)||sink.layout!=='single'||top==='neris'&&old.width<50)fail('Vasque à poser incompatible.');
    vesselColor=sink.color;basinColor=sink.color;
   }else fail('Une vasque est associée à un meuble sans plateau.');
  }else if(old.option==='basin')fail('La référence de la vasque encastrée est absente.');
  settings={format:form.id,width:old.width,finish,top,basinLayout,basinColor,tampaColor:basinColor,vesselColor,drawers:Array(form.drawers).fill(old.open?1:0),decor:true,tap:null};
 }else if(old.kind==='column'){
  if(!['left','right'].includes(old.doorSide)||typeof old.open!=='boolean')fail('Sens ou état d’ouverture de colonne inconnu.');
  settings={finish,hingeSide:old.doorSide,doorOpen:old.open};
 }else{
  const mirror=LEGACY_MIRRORS[old.mirror],size=String(old.mirrorSize||'').match(/\d+(?:[.,]\d+)?/g)?.map(n=>Number(n.replace(',','.')));
  if(!mirror||!size?.length||!mirror.sizes.some(s=>s[0]===size[0]&&s[1]===(size[1]||size[0]))||!['Noir','Doré','Bronze','Argent'].includes(old.mirrorFinish))fail('Modèle, taille ou finition de miroir non reconnus.');
  if(old.ledOn!==undefined&&typeof old.ledOn!=='boolean'||old.mirrorRotated!==undefined&&typeof old.mirrorRotated!=='boolean')fail('État du miroir historique invalide.');
  const rotated=old.mirror==='Basic'&&size[0]===60&&size[1]===80&&!!old.mirrorRotated;
  settings={mirrorModel:mirror.id,width:size[0],height:size[1]||size[0],mirrorFinish:old.mirrorFinish,led:!!old.ledOn,rotated};
  placement.height+=(rotated?settings.width:settings.height)/2;
 }
 return {id:old.id,type:old.kind,settings,placement};
}
export function recoveryItemDimensions(item){
 const s=item.settings;
 if(item.type==='cabinet'){const form=LEGACY_FORMATS.find(f=>f.id===s.format);return {width:s.width,height:form.height+2+(s.top==='neris'?14:s.top==='torne'?12:0),depth:46};}
 if(item.type==='column')return {width:38,height:132,depth:27};
 return {width:s.rotated?s.height:s.width,height:s.rotated?s.width:s.height,depth:3.8};
}
// Exact rectangle/rear-wall subset of Composition.validate. Contract tests run
// every accepted case through the real engine too; never auto-reposition items.
export function validateRecoveredGeometry(project){
 const width=project.room.points[1][0],depth=project.room.points[2][1],height=project.room.height;
 const boxes=project.items.map(item=>{
  const d=recoveryItemDimensions(item),p=item.placement,bottom=p.height-(item.type==='mirror'?d.height/2:0);
  const box={left:p.u-d.width/2,right:p.u+d.width/2,back:p.offset+.2,front:p.offset+d.depth,bottom,top:bottom+d.height};
  if(Object.values(box).some(n=>!Number.isFinite(n))||box.left<=0||box.right>=width||box.back<=0||box.front>=depth||box.bottom<-.1||box.top>height+.1)fail('Un élément dépasse les limites acceptées par l’atelier actuel. Il ne sera pas déplacé automatiquement.');
  return box;
 });
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  const a=boxes[i],b=boxes[j];
  if(a.top>b.bottom+.5&&b.top>a.bottom+.5&&a.right>b.left+.5&&b.right>a.left+.5&&a.front>b.back+.5&&b.front>a.back+.5)fail('Des éléments se chevauchent avec les géométries actuelles. L’archive conserve leurs positions.');
 }
 return true;
}
export function convertLegacyRecord(input){
 const notes=[];
 try{
  const record=publicLegacyRecord(input),data=record.data,a=record.ambience,room=a?.room;
  if(data?.version!==2||!Array.isArray(data.items)||data.items.some(i=>!i.kind||!i.position))fail('Ce schéma ne correspond pas aux anciens objets Studio One reconnus.');
  if(data.items.length>32||data.items.filter(i=>i.kind==='mirror').length>3)fail('La composition dépasse les limites de l’atelier actuel (32 éléments, dont 3 miroirs). Aucun élément ne sera retiré.');
  if(!room||!['width','depth','height'].every(k=>Number.isFinite(room[k])))fail('Dimensions de pièce absentes. L’ancien export de meubles seul ne permet pas de les retrouver : aucune pièce ne sera inventée.');
  const width=cm(room.width),depth=cm(room.depth),height=cm(room.height);
  if(width<100||depth<100||width>1000||depth>1000||height<180||height>400)fail('Dimensions de pièce hors des limites actuelles. Elles restent conservées dans l’archive.');
  const ids=new Set();for(const item of data.items){if(typeof item.id!=='string'||!/^[a-zA-Z0-9-]{1,90}$/.test(item.id)||ids.has(item.id))fail('Identifiants historiques manquants ou dupliqués.');ids.add(item.id);}
  const floor=convertSurface(a.floorSelection||a.floor,a.floorOrientation,'floor'),wall=convertSurface(a.wallSelection||a.wall,a.wallOrientation,'wall');
  const project={version:2,title:String(record.name||'Projet Studio One récupéré').slice(0,80),...(typeof record.client==='string'&&record.client.trim()?{client:{name:record.client.trim()}}:{}),room:{points:[[0,0],[width,0],[width,depth],[0,depth]],height,partitions:[]},items:data.items.map((item,index)=>convertItem(item,width,index)),floor:floor.finish,walls:Array.from({length:4},()=>({...wall.finish})),layouts:{floor:floor.layout,walls:Array.from({length:4},()=>({...wall.layout}))},lighting:'day',brightness:100};
  validateRecoveredGeometry(project);
  notes.push('Pièce convertie de mètres en centimètres ; meubles, finitions, implantations reconnues et distance des enveloppes au mur conservés. Tous les éléments restent sur le mur historique.');
  notes.push('L’atelier actuel utilise ses géométries et textures HD officielles. Le rendu, les reflets et la répartition des faces de carrelage peuvent différer ; l’ancien aperçu et le point de vue ne sont pas transférés.');
  if(data.items.some(i=>i.kind==='mirror'))notes.push('Les miroirs conservent leur taille et leur centre ; leur épaisseur et leur position graphique interne ont évolué. Vérifiez leur alignement dans le nouvel atelier.');
  if(data.items.some(i=>i.kind==='cabinet'&&i.model===1))notes.push('Le meuble trois tiroirs utilise la géométrie actuelle : caisson de 81 cm et pieds de 10 cm.');
  notes.push('Archive historique séparée conservée. Les tarifs et codes privés sont exclus ; le nouvel atelier recalculera son devis courant. Éclairage initial de la copie : lumière du jour.');
  project.legacyRecovery={version:1,sourceFormat:'studio-one-legacy-v2',...(typeof record.date==='string'?{sourceDate:record.date}:{}),notes:[...notes]};
  if(JSON.stringify(project).length>100000)fail('La copie dépasse la taille de projet acceptée par l’atelier actuel.');
  return {ok:true,project,notes};
 }catch(error){return {ok:false,project:null,notes:[error.message||'Format non compatible.']};}
}
export function encodeRecoveredProject(project){
 const bytes=new TextEncoder().encode(JSON.stringify(project));let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
