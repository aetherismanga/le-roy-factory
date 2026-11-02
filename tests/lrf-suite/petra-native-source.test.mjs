import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {COLLECTIONS} from '../../shared/lrf-3d/surface-catalog.js';
import {resolveSurfaceTexture} from '../../shared/lrf-3d/surface-texture-selection.js';
import {surfaceColorIssue} from '../../shared/lrf-3d/surface-quality.js';

test('Petra uses the verified larger native product image in niches without generating or enlarging the catalogue sample',()=>{
 const choice=COLLECTIONS.Terraforma.colors.find(color=>color.id==='petra');
 const asset=readFileSync(new URL('../../assets/img/lrf-plan-pose/faces/elios-20261102/terraforma/04t33d3-petra-original.jpg',import.meta.url));
 assert.equal(createHash('sha256').update(asset).digest('hex'),'a34e535b5cefb357a81fd700fc422cf2c146c040934fcbdfd502d885e1778de9');
 assert.deepEqual(choice.resolution,[1000,1000]);assert.equal(surfaceColorIssue('Terraforma',choice),null);
 assert.equal(choice.reliefFromColor,false);assert.equal(choice.textureProvenance.reference,'04T33D3');
 assert.equal(choice.textureProvenance.generated,false);assert.equal(choice.textureProvenance.resizedByAgent,false);
 assert.equal(choice.textureProvenance.hd,false,'A product-platform image is not advertised as a portal or 4K original');
 assert.equal(choice.textureProvenance.previousSources[0].faces[0].width,222);
 assert.deepEqual(choice.formats,['30x30']);assert.deepEqual(choice.decorRepeat,{columns:1,rows:1});
 const plan=JSON.parse(readFileSync(new URL('../../assets/js/lrf-plan-pose/catalogue.json',import.meta.url))).products.find(product=>product.collection==='Terraforma'&&product.colorId==='petra');
 assert.equal(plan.textureSourceKind,'product-platform-image');assert.equal(plan.textureProvenance.sourceSha256,choice.textureProvenance.sourceSha256);assert.deepEqual(plan.faces,[choice.file]);
 for(const profile of ['fluid','balanced','max'])assert.deepEqual(resolveSurfaceTexture('Terraforma','petra',profile,{format:'30x30'}).files,[choice.file]);
});
