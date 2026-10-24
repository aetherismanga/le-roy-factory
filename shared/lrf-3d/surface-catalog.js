import manufacturerSurfaces from './manufacturer-surfaces.json' with {type:'json'};
import * as T from 'three';
import {SURFACE_COLORS} from './surfaces.js';
import {RAL_COLORS} from './ral-colors.js';
const eSource='ELIOS Catalogue Général 2026 · Creta pp.224–225 / Shell pp.334–335';
export const COLLECTIONS={
 Shell:{brand:'ELIOS',colors:SURFACE_COLORS.floor,formats:[{id:'60x120',width:1.2,height:.6,pcsBox:2,m2Box:1.44,source:eSource}],roughness:.70,bump:.00055},
 Creta:{brand:'ELIOS',colors:SURFACE_COLORS.wall,formats:[{id:'60x120',width:1.2,height:.6,pcsBox:2,m2Box:1.44,source:eSource}],roughness:.82,bump:.0006},
 Corso:{brand:'VIEW',colors:[{id:'beige',name:'Beige',file:'view/corso-beige-1.webp'}],formats:[{id:'60x90',width:.9,height:.6,pcsBox:2,m2Box:1.08},{id:'60x120',width:1.2,height:.6,pcsBox:2,m2Box:1.44}],roughness:.82,bump:.0006},
 'Golden Stone':{brand:'VIEW',colors:['ivory','sand','pearl','oxid','carbon'].map(id=>({id,name:id[0].toUpperCase()+id.slice(1),file:'view/golden-stone-'+id+'-1.webp'})),formats:[{id:'30x60',width:.6,height:.3,pcsBox:8,m2Box:1.44},{id:'60x60',width:.6,height:.6,pcsBox:4,m2Box:1.44},{id:'60x120',width:1.2,height:.6,pcsBox:2,m2Box:1.44},{id:'120x120',width:1.2,height:1.2,pcsBox:1,m2Box:1.44}],roughness:.82,bump:.0006},
 Peinture:{brand:'Peinture',colors:[{id:'white',name:'Blanc cassé',hex:'#eeeae0'},{id:'ivory',name:'Ivoire',hex:'#e0d6c3'},{id:'sand',name:'Sable',hex:'#c9b99d'},{id:'sage',name:'Sauge',hex:'#a0aa94'},{id:'clay',name:'Argile',hex:'#b7927b'},{id:'grey',name:'Gris perle',hex:'#bec0bb'},{id:'dark',name:'Anthracite',hex:'#454b4a'}],formats:[],roughness:.93,bump:.00018}
};
export function formatsForColor(collection,id){const c=COLLECTIONS[collection],color=c?.colors.find(co=>co.id===id);return (c?.formats||[]).filter(f=>!color?.formats?.length||color.formats.includes(f.id));}
export function tileFormat(collection,id){const c=COLLECTIONS[collection];return c?.formats.find(f=>f.id===id)||c?.formats.find(f=>f.id==='60x120')||c?.formats[0]||null;}
export function paintBump(){let seed=19;const n=128,a=new Uint8Array(n*n*4);for(let i=0;i<n*n;i++){seed=(seed*1664525+1013904223)>>>0;const v=110+(seed>>>25);a[i*4]=a[i*4+1]=a[i*4+2]=v;a[i*4+3]=255;}const t=new T.DataTexture(a,n,n,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(35,35);t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}

for(const f of COLLECTIONS.Corso.formats)f.source='VIEW Corso 2024 · pp.36–37 · https://viewceramiche.com/wp-content/uploads/2023/12/View_catalogo_serie_Corso_2024_LR.pdf';
for(const f of COLLECTIONS['Golden Stone'].formats)f.source='VIEW Golden Stone 2026 · pp.52–53 · https://viewceramiche.com/wp-content/uploads/2025/10/View_catalogo_serie_Golden_Stone_2026_LR.pdf';
// Manufacturer layouts are tied to the selected product format. Collection-wide
// inferred format ratios never prove that an Opus kit or a chevron tile exists.
export function opusForFormat(collection,formatId,colorId){
 const c=COLLECTIONS[collection],format=formatsForColor(collection,colorId).find(f=>f.id===formatId);
 const module=format?.opus||c?.opus;
 if(!format||!module?.verified||!module.source)return null;
 if(!format.opus&&!module.formats?.includes(format.id))return null;
 return {...module};
}
export function layoutPatterns(collection,colorId,formatId,layout={}){
 const c=COLLECTIONS[collection],color=c?.colors.find(co=>co.id===colorId),formats=formatsForColor(collection,colorId),format=formats.find(f=>f.id===formatId)||formats.find(f=>Math.abs(f.width-layout.width)<.001&&Math.abs(f.height-layout.height)<.001)||formats[0];
 if(!format)return [];
 if(format.shape==='chevron'||format.layouts?.includes('chevron'))return [{id:'chevron',name:'Chevron · coupe fabricant'}];
 const opus=opusForFormat(collection,format.id,colorId);
 if(opus)return [{id:'opus',name:'Opus · module fabricant'}];
 const basic=[{id:'straight',name:'Pose droite'}];
 if(color?.continuousDecor||format.shape==='hexagon')return basic;
 const choices=[...basic,{id:'offset',name:'Décalée 1/2'},{id:'third',name:'Décalée 1/3'},{id:'two-thirds',name:'Décalée 2/3'},...(woodCollection(collection)?[{id:'random',name:'Aléatoire · effet bois'}]:[])];
 return format.layouts?.length?choices.filter(p=>format.layouts.includes(p.id)):choices;
}
export function normalizeLayout(layout={},collection,formatId,colorId){
 const formats=formatsForColor(collection,colorId);if(!formats.length)return {...layout};
 const format=formats.find(f=>f.id===formatId)||formats.find(f=>Math.abs(f.width-Number(layout.width||1.2))<.001&&Math.abs(f.height-Number(layout.height||.6))<.001)||formats.find(f=>f.id==='60x120')||formats[0];
 const patterns=layoutPatterns(collection,colorId,format.id,layout),pattern=patterns.some(p=>p.id===layout.pattern)?layout.pattern:patterns[0]?.id||'straight',opus=pattern==='opus'?opusForFormat(collection,format.id,colorId):undefined;
 return {...layout,width:format.width,height:format.height,shape:format.shape||'rectangle',pattern,opus,chevronAngle:format.chevronAngle||45};
}

// Reuse the reviewed catalogue; load real tile faces only when selected.
for(const source of manufacturerSurfaces){const previous=COLLECTIONS[source.name];const formats=source.formats.map(f=>{const reviewed=previous?.formats.find(p=>p.id===f.id);return reviewed?.pcsBox?{...f,pcsBox:reviewed.pcsBox,m2Box:reviewed.m2Box,source:reviewed.source}:f;});const known=new Map((previous?.colors||[]).map(c=>[c.id,c]));const colors=source.colors.map(c=>{const local=known.get(c.id);return local?.file?{...c,file:local.file,faces:c.faces?.length>1?c.faces:[local.file]}:c;});COLLECTIONS[source.name]={...previous,...source,formats,colors,roughness:previous?.roughness??source.roughness,bump:previous?.bump??source.bump};}

export const woodCollection=name=>/bois|wood|legn|parquet|quercia|yosemite|sequoia|lux|lodge|tavol|timber|oak|rovere/i.test(name||'');
// Preserve only explicitly documented manufacturer modules. Legacy `opus`
// flags were inferred from dimension ratios and are not valid product evidence.
for(const c of Object.values(COLLECTIONS))if(c.opus&&!c.opus.verified)delete c.opus;
for(const name of ['Roma','Sedimenti']){
 const c=COLLECTIONS[name];if(!c)continue;
 const id='Opus · module 4 formats',source=name==='Roma'?'https://eliosceramica.com/wp-content/uploads/2025/06/Elios_catalogo_ROMA.pdf':'https://eliosceramica.com/wp-content/uploads/2026/02/ELIOS_CATALOGO-SEDIMENTI-1.pdf';
 const opus={mode:'manufacturer6',unit:.203,verified:true,formats:[id],source};
 c.opus=opus;
 if(!c.formats.some(f=>f.id===id))c.formats.push({id,label:'Opus · module fabricant 4 formats',width:1.218,height:.609,shape:'rectangle',opus,pcsBox:6,m2Box:.75,source});
 for(const color of c.colors)if(color.formats&&!color.formats.includes(id))color.formats.push(id);
}
COLLECTIONS.Peinture.colors.push(...RAL_COLORS);
