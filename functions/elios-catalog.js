'use strict';
const lot1=require('./elios-lot1');
const lot2=require('./elios-lot2');
const lot3=require('./elios-lot3');
const lot4=require('./elios-lot4');
const lot5=require('./elios-lot5');
const catalogue={...lot1,...lot2,...lot3,...lot4,...lot5};
const ACTIVE=new Set(['roma',...Object.keys(catalogue)]);
const ALIASES={'design-evo':'d-esign-evo','d_esign-evo':'d-esign-evo','d-esign-evo':'d-esign-evo','love-decors':'love-decors','loveanddecors':'love-decors'};
function keyOf(v){const k=String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');return ALIASES[k]||k}
const ROMA_REFS={};
function addRoma(refs,unit,perBox,pcsBox){refs.forEach(ref=>ROMA_REFS[ref]=[unit,perBox,pcsBox])}
addRoma(['0852040','0852005','0852042','0852007'],'MQ',1.15,28);
addRoma(['0852640','0852605','0852642','0852607'],'MQ',1.07,13);
addRoma(['0854240','0854205','0854242','0854207'],'MQ',0.99,6);
addRoma(['0856140','0856105','0856100','0856170'],'MQ',1.12,3);
addRoma(['0854640','0854605','0854600','0854670','0854642','0854607','0854602','0854672'],'MQ',1.46,6);
addRoma(['085M140','085M105','085M100','085M170','085M141','085M106'],'MQ',0.75,6);
addRoma(['0856C40','0856C05'],'MQ',0.72,1);
addRoma(['085H140','085H105','085H100','085H170'],'MQ',0.55,6);
addRoma(['085B140','085B105','085B100','085B170'],'ML',9.15,15);
addRoma(['085BC40','085BC05','085BC00','085BC70'],'ML',9.72,24);
const ROMA_SPECIALS=[];
for(const color of ['Aventino','Celio','Viminale','Palatino']){ROMA_SPECIALS.push([color,'Pièce spéciale','Gradino costa retta 33 × 60 cm','PZ',1,1]);ROMA_SPECIALS.push([color,'Pièce spéciale','Gradino costa retta angolo DX/SX 33 × 60 cm','PZ',1,1])}
function unpackRow(a){return {ref:a[0]||'',color:a[1]||'',kind:a[2]||'Carreau',format:a[3]||'',finish:a[4]||'',pcsBox:a[5],sqmBox:a[6],kgBox:a[7],boxesPal:a[8],sqmPal:a[9],kgPal:a[10],orderUnit:a[11]||null,orderPerBox:a[12],orderOnly:Boolean(a[13]),sqmPiece:a[14],kgPiece:a[15],pcsPal:a[16],stock:null,production:null,updatedAt:null}}
function publicCollection(value){const k=keyOf(value);if(k==='roma')return null;const c=catalogue[k];if(!c)return null;return {key:k,collection:c.n,source:`Catalogue Général ELIOS 2026 · ${c.n} · pages ${c.p}`,colors:c.c||[],rows:(c.r||[]).map(unpackRow)}}
function rowPack(a){return {unit:a[11]||((a[6]!=null)?'MQ':'PZ'),perBox:Number(a[12]??a[6]??a[5]??1),pcsBox:a[5]==null?null:Number(a[5])}}
function collectionExists(value){return ACTIVE.has(keyOf(value))}
function allowedRef(value,ref){const k=keyOf(value),wanted=String(ref||'').trim().toUpperCase();if(!wanted||!ACTIVE.has(k))return false;if(k==='roma')return Boolean(ROMA_REFS[wanted]);const c=catalogue[k];return Boolean(c&&(c.r||[]).some(a=>String(a[0]||'').toUpperCase()===wanted))}
function inferCollectionByRef(ref){const wanted=String(ref||'').trim().toUpperCase();if(ROMA_REFS[wanted])return 'roma';for(const [k,c] of Object.entries(catalogue))if((c.r||[]).some(a=>String(a[0]||'').toUpperCase()===wanted))return k;return ''}
function packFor(collectionValue,raw){let k=keyOf(collectionValue);const ref=String(raw?.ref||'').trim().toUpperCase();if(!collectionExists(k)&&ref)k=inferCollectionByRef(ref);if(k==='roma'){if(ref&&ROMA_REFS[ref]){const p=ROMA_REFS[ref];return {collection:'roma',collectionName:'Roma',unit:p[0],perBox:p[1],pcsBox:p[2],ref}}if(raw?.orderOnly){const hit=ROMA_SPECIALS.find(s=>s[0]===String(raw.color||'').trim()&&s[1]===String(raw.kind||'').trim()&&s[2]===String(raw.format||'').trim());if(hit)return {collection:'roma',collectionName:'Roma',unit:hit[3],perBox:hit[4],pcsBox:hit[5],ref:''}}return null}const c=catalogue[k];if(!c)return null;if(ref){const a=(c.r||[]).find(x=>String(x[0]||'').toUpperCase()===ref);if(a){const p=rowPack(a);return {collection:k,collectionName:c.n,...p,ref}}}if(raw?.orderOnly){const color=String(raw.color||'').trim(),kind=String(raw.kind||'').trim(),format=String(raw.format||'').trim();const a=(c.r||[]).find(x=>!x[0]&&Boolean(x[13])&&x[1]===color&&x[2]===kind&&x[3]===format);if(a){const p=rowPack(a);return {collection:k,collectionName:c.n,...p,ref:''}}}return null}
function allCollectionKeys(){return [...ACTIVE]}
module.exports={keyOf,publicCollection,collectionExists,allowedRef,inferCollectionByRef,packFor,allCollectionKeys};
