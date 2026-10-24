import assert from 'node:assert/strict';
import {RAL_COLORS,OPENING_COLORS} from '../ral-colors.js';
import {makeOpening} from '../openings.js';
import {makeSanitary,FLUSH_PLATE_COLORS} from '../sanitaries.js';

assert.equal(RAL_COLORS.length,216);
assert.equal(new Set(RAL_COLORS.map(c=>c.code)).size,216);
for(const c of RAL_COLORS){assert.match(c.code,/^\d{4}$/);assert.match(c.hex,/^#[0-9a-f]{6}$/i);}
for(const type of ['window','door']){
 const opening=makeOpening(type);
 for(const color of OPENING_COLORS){opening.setColor(color.id);assert.equal(opening.frame.color.getHexString(),color.hex.slice(1));}
}
for(const reference of ['TR2217R','TR2217R-U18'])for(const support of [false,true]){
 const wc=makeSanitary('toilet',{reference,support});
 const plate=wc.root.getObjectByName('Plaque_double_chasse');
 assert(plate,'Every suspended WC includes a flush plate');
 assert.equal(plate.material.color.getHexString(),FLUSH_PLATE_COLORS[0].hex.slice(1),'A new plate is white independently of bowl color');
 assert.equal(wc.root.getObjectsByProperty('name','Bouton_chasse').length,2);
 for(const color of FLUSH_PLATE_COLORS){
  const colored=makeSanitary('toilet',{reference,support,plateColor:color.id});
  assert.equal(colored.root.getObjectByName('Plaque_double_chasse').material.color.getHexString(),color.hex.slice(1));
 }
}
assert.equal(makeSanitary('toilet',{reference:'TR2224'}).root.getObjectByName('Plaque_double_chasse'),undefined,'Floor WC keeps its cistern button');
assert.equal(makeSanitary('toilet',{reference:'TR2217R',support:true,plateColor:'Chrome brillant'}).root.getObjectByName('Plaque_double_chasse').material.metalness,1,'Saved legacy plate finishes remain supported');
console.log('RAL / openings / suspended WC plates passed');
