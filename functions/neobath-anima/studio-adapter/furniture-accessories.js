import CATALOGUE from '../catalogue.json' with {type:'json'};
import {cabinetFormat} from './configuration.js';

const PRODUCT_BY_ID=new Map(CATALOGUE.products.map(product=>[product.id,product]));
const sidebar=PRODUCT_BY_ID.get('sidebar-accessory');
export const TOWEL_FINISHES=Object.freeze([
 {id:'black-matte',name:'Noir mat',hex:'#252626',metalness:.15,roughness:.55,pricePublicHT:115},
 {id:'white-matte',name:'Blanc mat',hex:'#f2f0e8',metalness:.05,roughness:.55,pricePublicHT:null},
 {id:'chrome',name:'Chrome',hex:'#c6cbd0',metalness:1,roughness:.17,pricePublicHT:115}
]);
// Bridge dimensions and the black finish: Anima PDF pp.56–57 (110–113).
// Only BRIDGE100 H35 has a published code and price in the supplied Anima
// compositions. Other IDs below identify documented variants, never fake SKUs.
export const BRIDGE_SUPPORTS=Object.freeze([80,100,120,140].flatMap(width=>[15,35].map(height=>{
 const id=width===100&&height===35?'bridge100-accessory':'bridge-'+width+'-'+height;
 const known=PRODUCT_BY_ID.get(id),priced=width===100&&height===35;
 return Object.freeze({...known,id,category:'accessory',subtype:'frame',ref:priced?'BRIDGE100':null,label:'Structure Bridge',width,height,depth:43.5,finish:'black-matte',
  pricePublicHT:priced?262:null,prices:priced?[{key:'standard',label:'Noir mat',price:262}]:[],unit:'unit',source:known?.source||{pdfPage:56,printedPage:111},codeStatus:priced?'verified-composition':'not-published',dimensionStatus:'catalogue-documented'});
})));
const SUPPORT_BY_ID=new Map(BRIDGE_SUPPORTS.map(product=>[product.id,product]));
export function furnitureAccessoryOptions(settings={}){
 let form;try{form=cabinetFormat(settings.format);}catch{return {towel:false,supports:[]};}
 const floor=['base','vanity'].includes(form.subtype),towel=floor&&form.depth>=.40;
 const supports=floor&&Math.abs(form.depth-.46)<.001?BRIDGE_SUPPORTS.filter(product=>product.width===settings.width):[];
 return {towel,supports};
}
export function resolveFurnitureAccessories(settings={}){
 const options=furnitureAccessoryOptions(settings),side=settings.towelSide===undefined?'none':settings.towelSide,finish=settings.towelFinish===undefined?'black-matte':settings.towelFinish,supportId=settings.supportId===undefined?'':settings.supportId,supportFinish=settings.supportFinish===undefined?'black-matte':settings.supportFinish;
 if(!['none','left','right'].includes(side)||!TOWEL_FINISHES.some(option=>option.id===finish)||typeof supportId!=='string'||supportFinish!=='black-matte')throw Error('Accessoire de meuble Anima inconnu.');
 if(settings.supportSuspendedHeight!==undefined&&(!Number.isFinite(settings.supportSuspendedHeight)||settings.supportSuspendedHeight<0||settings.supportSuspendedHeight>400))throw Error('Hauteur de pose suspendue invalide.');
 if(side!=='none'&&!options.towel)throw Error('Le porte-serviette SideBar de 40 cm nécessite un caisson de profondeur compatible.');
 const support=supportId?options.supports.find(product=>product.id===supportId):null;
 if(supportId&&!support)throw Error('Cette structure Bridge ne correspond pas à la largeur ou à la profondeur du meuble.');
 const color=TOWEL_FINISHES.find(option=>option.id===finish);
 const towel=side==='none'?null:{...sidebar,prices:color.pricePublicHT===null?[]:[{key:'standard',label:color.name,price:color.pricePublicHT}],pricePublicHT:color.pricePublicHT,
  color:color.id,colorName:color.name,...(color.pricePublicHT===null?{priceNote:'Finition blanche documentée ; tarif Anima de cette finition à confirmer.'}:{})};
 return {towelSide:side,towelFinish:finish,towel,supportId,supportFinish,support,clearanceBelow:support?support.height/100:0,products:[towel,support].filter(Boolean)};
}
export function furnitureAccessoryProposal(settings,patch,placement){
 const next={...settings,...patch},before=resolveFurnitureAccessories(settings),after=resolveFurnitureAccessories(next),pose={...placement};
 if(after.support){if(!before.support)next.supportSuspendedHeight=placement.height;pose.height=after.support.height;}
 else if(before.support){pose.height=settings.supportSuspendedHeight??Math.round(cabinetFormat(settings.format).base*100);delete next.supportSuspendedHeight;}
 return {settings:next,placement:pose};
}
export function furnitureAccessoryPlacementError(settings,placement){
 const {support}=resolveFurnitureAccessories(settings);
 return support&&(!Number.isFinite(placement?.height)||Math.abs(placement.height-support.height)>.1)?'La structure Bridge doit reposer au sol : hauteur du meuble '+support.height+' cm.':'';
}

// Wall-local centimetres, for physical clearance checks without changing the
// stock cabinet SKU width. Mounted cabinets stay parallel to their wall.
export function furnitureTowelBounds(settings,placement){
 const {towel,towelSide}=resolveFurnitureAccessories(settings);if(!towel)return null;
 const form=cabinetFormat(settings.format),sign=towelSide==='left'?-1:1,edge=placement.u+sign*settings.width/2,top=placement.height+form.height*100,offset=placement.offset||0;
 return {minU:Math.min(edge,edge+sign*5),maxU:Math.max(edge,edge+sign*5),minHeight:top-6.75,maxHeight:top-4.25,minOffset:offset+form.depth*50-20,maxOffset:offset+form.depth*50+20};
}
