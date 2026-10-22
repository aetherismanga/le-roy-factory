import assert from 'node:assert/strict';
import {BoxGeometry} from 'three';
import {surfaceSeries,availableColors,selectedFormat} from '../src/surface-picker.js';
import {COLLECTIONS,formatsForColor} from '../src/surface-catalog.js';
import {makeFixture,setBathData} from '../src/fixtures.js';
import {quantityForSurface} from '../src/quantities.js';
assert.equal(surfaceSeries('ELIOS','wall').length,50);
assert.equal(surfaceSeries('VIEW','floor').length,24);
assert(surfaceSeries('VIEW','wall').every(([name,c])=>c.brand==='VIEW'&&c.surfaces.includes('wall')));
assert(!surfaceSeries('ELIOS','floor').some(([name])=>name==='Love&Decors — Magnus'));
assert(surfaceSeries('ELIOS','wall').some(([name])=>name==='Slate'));
assert(surfaceSeries('VIEW','wall').some(([name])=>name==='PHURA'));
assert.equal(availableColors('Lithos').length,0);
assert.equal(availableColors('LUX').length,4);
assert.equal(selectedFormat('LUX','topazio',{width:1.2,height:.3}),'30x120');
assert.equal(selectedFormat('COCO','light',{width:1.2,height:1.2}),'40x60');
for(const [name,c]of Object.entries(COLLECTIONS))for(const color of c.colors){const formats=formatsForColor(name,color.id);assert(formats.every(f=>!color.formats?.length||color.formats.includes(f.id)));}
// Isolate the real apron geometry from the unrelated, externally hosted bath shell.
setBathData({rect:[{name:'Test body only',positions:Array.from(new BoxGeometry(1,1,1).attributes.position.array)}]});
const bath=format=>makeFixture('bath',{kind:'rect',width:170,depth:75,apron:'tile',apronCollection:'LUX',apronColor:'topazio',apronFormat:format});
const narrow=bath('20x120'),wide=bath('30x120');
assert.equal(narrow.tileAprons.length,3);assert.equal(wide.tileAprons.length,3);
assert(narrow.tileAprons[0].tiles.geometry.userData.cells.length>wide.tileAprons[0].tiles.geometry.userData.cells.length);
assert(wide.tileAprons[0].tiles.geometry.userData.cells.every(c=>Math.abs(c.width-1.2)<1e-9&&Math.abs(c.height-.3)<1e-9));
const row=quantityForSurface({length:1.7,height:.558,tiles:wide.tileAprons[0].tiles},{collection:'LUX',color:'topazio',format:'30x120'},{width:1.2,height:.3},10,'Tablier');
assert.equal(row.brand,'VIEW');assert.equal(row.format,'30x120');assert.equal(row.tileCount,wide.tileAprons[0].tiles.geometry.userData.cells.length);
console.log(JSON.stringify({passed:true,story:'Manufacturer-filtered series, compatible colour sizes, real tiled-apron geometry and matching quantities',activeSeries:Object.keys(COLLECTIONS).filter(n=>n!=='Peinture'&&availableColors(n).length).length}));
