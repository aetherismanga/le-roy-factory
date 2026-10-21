const image=n=>'/assets/exterior/'+n+'.webp';
export const STONE_SERIES=[
{id:'ortisei',name:'Ortisei',source:'https://biopietra.com/prodotto/ortisei-new/',description:'Pierres irrégulières · pose à sec',scale:[1.6,1.06],relief:.035,colors:['B80','B82','M96'].map(n=>({id:n.toLowerCase(),name:n,image:image('ortisei-'+n.toLowerCase())}))},
{id:'carsica',name:'Scaglia Carsica',source:'https://biopietra.com/prodotto/scaglia-carsica/',description:'Modules de 10 cm · pierre éclatée',scale:[1.8,1.05],relief:.025,colors:['Arena','Grigio','Antracite'].map(n=>({id:n.toLowerCase(),name:n,image:image('carsica-'+n.toLowerCase())}))},
{id:'montebello',name:'Scaglia Montebello',source:'https://biopietra.com/prodotto/scaglia-montebello/',description:'Modules 46,5 × 21 cm',scale:[2.1,1.4],relief:.025,colors:['Quarzo','C58','G86'].map(n=>({id:n.toLowerCase(),name:n,image:image('montebello-'+n.toLowerCase())}))}
];
export const ELIOS_POOL_SOURCE='https://eliosceramica.com/wp-content/uploads/2019/01/ELIOS_CATALOGO-PISCINE_2026.pdf';
export const POOL_PRODUCTS=[
...[['deep','Deep','04A1520'],['river','River','04A1530'],['light','Light','04A1510'],['cobalt','Cobalt','04A1540']].map(([id,name,ref])=>({id:'elios-acqua-'+id,brand:'ELIOS',name:'Acqua · '+name,ref,size:.15,joint:.003,image:image('elios-acqua-'+id),source:ELIOS_POOL_SOURCE,finish:'Grès cérame émaillé · brillant · 15 × 15 cm',roughness:.24})),
{id:'reviglass-ps52',brand:'REVIGLASS',name:'PS-52 · Niebla',ref:'PS-52',size:.025,joint:.002,image:image('reviglass-ps52-tile'),preview:image('reviglass-ps52-preview'),source:'https://reviglass.es/producto/ps-52/',finish:'Mosaïque de verre · 2,5 × 2,5 cm',roughness:.2},
{id:'reviglass-urola',brand:'REVIGLASS',name:'PS · Mix Iris Urola',ref:'PS-MIX IRIS UROLA',size:.025,joint:.002,image:image('reviglass-urola-tile'),preview:image('reviglass-urola-preview'),source:'https://reviglass.es/producto/ps-mix-iris-urola/',finish:'Verre irisé · 2,5 × 2,5 cm',roughness:.15,iridescence:.45}
];
export const COPINGS=[{id:'travertin-beige',name:'Travertin naturel · beige',color:'#cabb9d',porous:true},{id:'travertin-noce',name:'Travertin naturel · noce',color:'#9d896a',porous:true},{id:'pierre-claire',name:'Pierre calcaire · claire',color:'#ddd5bf',porous:false}];
export const POOL_SIZE={width:8,length:4,depth:1.4,freeboard:.1,coping:.35,deck:1.2};
export function defaultExterior(){return {wall:{series:'ortisei',color:'b82'},pool:{product:'elios-acqua-river',grout:'#c6c9be',coping:'travertin-beige',level:1},avatar:'male'};}
export function validateExterior(raw){const d=defaultExterior(),x={...d,...raw,wall:{...d.wall,...raw?.wall},pool:{...d.pool,...raw?.pool}},s=STONE_SERIES.find(s=>s.id===x.wall.series);
if(!s?.colors.some(c=>c.id===x.wall.color))throw Error('Finition BIOPIETRA indisponible.');
if(!POOL_PRODUCTS.some(p=>p.id===x.pool.product)||!COPINGS.some(c=>c.id===x.pool.coping)||!/^#[a-f0-9]{6}$/i.test(x.pool.grout)||!Number.isFinite(x.pool.level)||x.pool.level<0||x.pool.level>1)throw Error('Configuration de piscine invalide.');
if(!['male','female'].includes(x.avatar))throw Error('Personnage inconnu.');return {wall:{series:x.wall.series,color:x.wall.color},pool:{product:x.pool.product,grout:x.pool.grout,coping:x.pool.coping,level:x.pool.level},avatar:x.avatar};}
