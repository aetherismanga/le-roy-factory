import test from 'node:test';
import assert from 'node:assert/strict';
import model from '../assets/js/elios-selection-media-model.js';

test('a partial catalogue refresh preserves the other verified colours',()=>{
  const all=model.mergeVariants({allure:{Eden:['eden.jpg'],Blueberry:['old.jpg']}},{allure:{Eden:['eden-hd.jpg']}},{allure:{Blueberry:['blueberry.jpg']}});
  assert.deepEqual(all.allure,{Eden:['eden-hd.jpg'],Blueberry:['blueberry.jpg']});
});
test('Fenix Juniper and Juniper remain distinct designs, including missing imagery',()=>{
  const colors={'Fenix Juniper':['fenix.jpg'],Juniper:['juniper.jpg']};
  assert.deepEqual(model.imagesForColor(colors,'Fenix Juniper'),['fenix.jpg']);
  assert.deepEqual(model.imagesForColor(colors,'Juniper'),['juniper.jpg']);
  assert.deepEqual(model.imagesForColor(colors,'Oyster'),[]);
});
test('case and accent aliases deduplicate without dropping a declared colour',()=>{
  const entries=model.colorEntries(['Éden','Oyster'],{Eden:['eden.jpg'],Blueberry:['blueberry.jpg']});
  assert.deepEqual(entries,[{color:'Éden',images:['eden.jpg']},{color:'Oyster',images:[]},{color:'Blueberry',images:['blueberry.jpg']}]);
});
