import manufacturerSurfaces from './manufacturer-surfaces.json' with {type:'json'};
import * as T from 'three';
import {SURFACE_COLORS} from './surfaces.js';
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
export function normalizeLayout(layout={},collection,formatId){const c=COLLECTIONS[collection];if(!c?.formats.length)return {...layout};const format=c.formats.find(f=>Math.abs(f.width-Number(layout.width||1.2))<.001&&Math.abs(f.height-Number(layout.height||.6))<.001)||tileFormat(collection,formatId);return {...layout,width:format.width,height:format.height,shape:format.shape||'rectangle',pattern:layout.pattern==='opus'&&!c.opus?'straight':layout.pattern,opus:c.opus};}

// Reuse the reviewed catalogue; load real tile faces only when selected.
for(const source of manufacturerSurfaces){const previous=COLLECTIONS[source.name];const formats=source.formats.map(f=>{const reviewed=previous?.formats.find(p=>p.id===f.id);return reviewed?.pcsBox?{...f,pcsBox:reviewed.pcsBox,m2Box:reviewed.m2Box,source:reviewed.source}:f;});const known=new Map((previous?.colors||[]).map(c=>[c.id,c]));const colors=source.colors.map(c=>{const local=known.get(c.id);return local?.file?{...c,file:local.file,faces:c.faces?.length>1?c.faces:[local.file]}:c;});COLLECTIONS[source.name]={...previous,...source,formats,colors,roughness:previous?.roughness??source.roughness,bump:previous?.bump??source.bump};}
