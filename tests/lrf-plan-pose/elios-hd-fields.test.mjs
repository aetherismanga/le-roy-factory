import test from 'node:test';
import assert from 'node:assert/strict';
import fields from '../../scripts/elios-hd-fields.cjs';
const {eliosHDFields}=fields;
const refs={white:['00Y2C00','00Y2900'],honey:['00Y2C40','00Y2940'],amber:['00Y2C70','00Y2970'],natural:['00Y2C60','00Y2960']},formats=['24x120','20.3x90.6'];
function colorFixture(id){return {id,textureVariantsByReference:Object.fromEntries(refs[id].map((reference,i)=>[reference,{verified:true,reference,colorId:id,format:formats[i],textureRotation:0,textureVariants:Object.fromEntries(['fluid','balanced','max'].map(t=>[t,[`https://example.test/quercia/${reference}/${t}/1.webp`,`https://example.test/quercia/${reference}/${t}/2.webp`]]))}]))};}
test('les huit références Quercia conservent leur couleur et leurs deux formats exacts',()=>{
 for(const [colorId,references]of Object.entries(refs))for(const [i,reference]of references.entries()){
  const color=colorFixture(colorId),result=eliosHDFields(color,reference,formats[i]);assert.equal(result.textureReference,reference);assert.equal(result.nativeFaces,true);assert.equal(result.textureRotation,0);assert.equal(result.textureVariants.max.length,2);
  assert.deepEqual(eliosHDFields(color,reference,formats[1-i]),{});
  assert.deepEqual(eliosHDFields({...color,id:'different-color'},reference,formats[i]),{});
 }
});
test('R11 C, rectifiés et dalles 40x120 ne reçoivent pas les faces R10 B par similarité',()=>{
 const color=colorFixture('honey');for(const reference of ['00Y2C41','00Y2941','00Y2D40','00Y4140'])for(const format of [...formats,'23.4x119.5','40x120'])assert.deepEqual(eliosHDFields(color,reference,format),{});
});
test('les profils incomplets, références altérées et faces dupliquées restent sans HD',()=>{
 const color=colorFixture('amber'),entry=color.textureVariantsByReference['00Y2C70'];entry.textureVariants.max.pop();assert.deepEqual(eliosHDFields(color,'00Y2C70','24x120'),{});
 entry.textureVariants.max=[...entry.textureVariants.balanced];entry.reference='00Y2C71';assert.deepEqual(eliosHDFields(color,'00Y2C70','24x120'),{});
 entry.reference='00Y2C70';entry.textureVariants.max=[entry.textureVariants.max[0],entry.textureVariants.max[0]];assert.deepEqual(eliosHDFields(color,'00Y2C70','24x120'),{});
});
test('les champs fabricant et les autres références restent inchangés',()=>{
 const color={...colorFixture('natural'),preview:'legacy.webp',resolution:[1200,700],available3d:true},before=structuredClone(color);eliosHDFields(color,'00Y2960','20.3x90.6');assert.deepEqual(color,before);assert.deepEqual(eliosHDFields({id:'view',file:'view.webp'},'REFERENCE','60x60'),{});
});
