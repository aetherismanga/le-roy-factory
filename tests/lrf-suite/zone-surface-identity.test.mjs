import test from 'node:test';
import assert from 'node:assert/strict';
import commercial from '../../shared/lrf-3d/commercial-surfaces.json' with {type:'json'};
import {normalizeProjectSurfaceIdentities} from '../../shared/lrf-3d/surface-identity.mjs';

const product=(collection,color,format,finish)=>commercial.products.find(p=>p.collection===collection&&p.colorId===color&&p.format===format&&(!finish||p.finish.startsWith(finish)));
const finishOf=p=>({collection:p.collection,color:p.colorId,format:p.format,catalogueKey:p.key,reference:p.reference,finish:p.finish,colorId:p.colorId,sourceColorId:p.colorId});
const parent=product('Creta','caramello','60x120'),avena=product('Creta','avena','60x120'),avenaSquare=product('Creta','avena','60x60'),stoneGrip=product('Stone Icon','campaspero','60x60','Tumbled Grip');
assert(parent&&avena&&avenaSquare&&stoneGrip);
const make=(zone,wall=finishOf(parent))=>({version:2,walls:[{...wall,groutWidth:1.5,groutColor:'Ivoire',zones:[{id:'zone-history',x:150,y:0,width:120,height:260,...zone}]}],layouts:{walls:[{width:1.2,height:.6}]}});

function roundTrip(data){const normalized=normalizeProjectSurfaceIdentities(data);return normalizeProjectSurfaceIdentities(JSON.parse(JSON.stringify(normalized)));}

test('a colour-only band remains Avena across import, export and repeated Undo/Redo normalization',()=>{
 const data=make({collection:'Creta',color:'avena',format:'60x120'}),raw=structuredClone(data);let current=data;
 for(let n=0;n<5;n++){
  current=roundTrip(current);const zone=current.walls[0].zones[0];
  assert.equal(zone.color,'avena');assert.equal(zone.colorId,'avena');assert.equal(zone.sourceColorId,'avena');assert.equal(zone.catalogueKey,avena.key);assert.equal(zone.reference,avena.reference);assert.notEqual(zone.catalogueKey,parent.key);
  assert.equal(zone.groutWidth,1.5,'Surface defaults still flow into the band');assert.equal(zone.groutColor,'Ivoire');assert.equal(current.walls[0].color,'caramello');
 }
 assert.deepEqual(data,raw,'Validation never rewrites the original saved project');
});

test('a different band format or collection cannot inherit the parent SKU or carton',()=>{
 const data=make({collection:'Creta',color:'avena',format:'60x60'});data.walls[0].pack={collection:'Creta',color:'caramello',format:'60x120',pcsBox:2,m2Box:1.44};
 const zone=roundTrip(data).walls[0].zones[0];assert.equal(zone.format,'60x60');assert.equal(zone.catalogueKey,avenaSquare.key);assert.notEqual(zone.reference,parent.reference);assert.equal(zone.pack,undefined);
 const stone=roundTrip(make(finishOf(stoneGrip))).walls[0].zones[0];for(const key of ['collection','color','format','catalogueKey','reference','finish'])assert.equal(stone[key],finishOf(stoneGrip)[key]);
});

test('the same selected tile inherits its exact SKU/finish; an explicit child finish wins',()=>{
 const data=make({collection:'Stone Icon',color:'campaspero',format:'60x60'},finishOf(stoneGrip));data.walls[0].pack={collection:'Stone Icon',color:'campaspero',format:'60x60',pcsBox:4,m2Box:1.44};
 const identical=roundTrip(data).walls[0].zones[0];assert.equal(identical.catalogueKey,stoneGrip.key);assert.equal(identical.reference,stoneGrip.reference);assert.equal(identical.finish,stoneGrip.finish);assert.deepEqual(identical.pack,data.walls[0].pack);
 const parentR10=product('Stone Icon','campaspero','60x60','Tumbled ·');assert(parentR10);
 const explicit=roundTrip(make({collection:stoneGrip.collection,color:stoneGrip.colorId,format:stoneGrip.format,catalogueKey:stoneGrip.key},finishOf(parentR10))).walls[0].zones[0];
 assert.equal(explicit.catalogueKey,stoneGrip.key);assert.equal(explicit.reference,stoneGrip.reference);assert.equal(explicit.finish,stoneGrip.finish,'A new child SKU must not receive its parent’s different finish');
});

test('a raw Allure Fenix Blueberry wall and Eden band survive double normalization',()=>{
 const raw=make({collection:'Allure',color:'eden',format:'60x120'},{collection:'Allure',color:'fenix-blueberry',format:'60x120'});
 const first=normalizeProjectSurfaceIdentities(raw),second=normalizeProjectSurfaceIdentities(first);
 for(const result of [first,second]){assert.equal(result.walls[0].color,'fenix-blueberry');assert.equal(result.walls[0].zones[0].color,'eden');assert.equal(result.walls[0].zones[0].sourceColorId,'eden');}
});

test('independent niche back and reveals remain independent of a wall and its band',()=>{
 const back=finishOf(avena),reveal=finishOf(stoneGrip),data=make({collection:'Creta',color:'avena',format:'60x120'});
 data.room={niches:[{id:'niche-roundtrip',covering:{mode:'split',back,reveal}}]};const normalized=roundTrip(data);
 assert.deepEqual(normalized.room.niches[0].covering,{mode:'split',back,reveal});assert.equal(normalized.walls[0].zones[0].color,'avena');
});
