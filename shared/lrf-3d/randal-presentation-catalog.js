import {COLLECTIONS} from './surface-catalog.js';

// These are presentation modules only; they do not create commercial SKUs,
// prices or packaging for a nominal format requested for the showroom.
export const RANDAL_FLOORS=Object.freeze([
 {id:'yosemite-honey',name:'Yosemite Honey · 20 × 120 · pose 2/3',collection:'Yosemite',color:'honey',format:'20x120',width:1.2,height:.2,pattern:'two-thirds'},
 {id:'creta-caramello',name:'Creta Caramello · 60 × 120',collection:'Creta',color:'caramello',format:'60x120',width:1.2,height:.6,pattern:'straight'},
 {id:'slate-beige',name:'Slate Gold Elios · 60 × 60',collection:'Slate',color:'gold',format:'60x60',width:.6,height:.6,pattern:'straight',texture:{file:'randal-presentation/slate-gold-elios.jpg',physicalSize:[1.2,.6],source:'https://eliosceramica.com/wp-content/uploads/2023/05/slate_gold_zoom.jpg'}}
]);
const PAINT_COLORS=['white','ivory','sand','sage','clay','grey','dark'];
export const RANDAL_WALLS=Object.freeze([
 ...PAINT_COLORS.map(id=>COLLECTIONS.Peinture.colors.find(c=>c.id===id)).map(c=>({id:'paint-'+c.id,name:c.name,collection:'Peinture',color:c.id})),
 {id:'stone-icon-leccese',name:'Stone Icon Leccese · 60 × 90',collection:'Stone Icon',color:'leccese',format:'60x90',width:.9,height:.6,pattern:'straight'},
 ...COLLECTIONS.Allure.colors.filter(c=>c.available3d!==false&&c.file).map(c=>({id:'allure-'+c.id,name:c.name+' · 60 × 120',collection:'Allure',color:c.id,format:'60x120',width:1.2,height:.6,pattern:'straight',decor:!!c.continuousDecor}))
]);
export const presentationChoice=(kind,id)=>(kind==='floor'?RANDAL_FLOORS:RANDAL_WALLS).find(c=>c.id===id)||null;
export function presentationChoices(project){
 const floor=project?.floor,wall=project?.walls?.[0];
 return {floor:RANDAL_FLOORS.find(c=>c.collection===floor?.collection&&c.color===floor?.color)?.id||RANDAL_FLOORS[0].id,wall:RANDAL_WALLS.find(c=>c.collection===wall?.collection&&c.color===wall?.color)?.id||'paint-grey'};
}
export function withPresentationSurface(project,kind,id){
 const choice=presentationChoice(kind,id);if(!choice)throw Error('Revêtement non autorisé.');
 const result=structuredClone(project),finish={collection:choice.collection,color:choice.color,...(choice.format?{format:choice.format}:{}),groutColor:'Beige'},layout={width:choice.width||1.2,height:choice.height||.6,direction:'horizontal',pattern:choice.pattern||'straight',x:0,y:0,groutWidth:2,shape:'rectangle'};
 result.layouts??={};
 if(kind==='floor'){result.floor=finish;result.layouts.floor=layout;}
 else{const count=result.walls?.length||result.room.points.length;result.walls=Array.from({length:count},()=>({...finish}));result.layouts.walls=Array.from({length:count},()=>({...layout}));}
 return result;
}

// Apply the revised showroom defaults once, including projects saved before
// this version. Later explicit user choices remain part of the composition.
export const RANDAL_PRESENTATION_DEFAULTS_VERSION=2;
export function presentationDefaults(project){
 if(project?.presentation?.defaultsVersion===RANDAL_PRESENTATION_DEFAULTS_VERSION)return structuredClone(project);
 const result=withPresentationSurface(withPresentationSurface(project,'floor','yosemite-honey'),'wall','paint-grey');
 result.presentation={...result.presentation,defaultsVersion:RANDAL_PRESENTATION_DEFAULTS_VERSION,dimensions:false};
 return result;
}
