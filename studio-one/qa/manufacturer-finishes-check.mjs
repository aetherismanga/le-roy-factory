import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FINISHES} from '../src/finishes.js';
import {CATALOG} from '../src/commerce/catalog.js';
const manifest=JSON.parse(readFileSync('dist/assets/finishes/20261022/sources.json'));
// Independently decoded official uploaded samples, including Roble's eciRGBv2 conversion.
const expected={ALBA:{pixels:[1292,2800],hex:'#bfa386'},ROBLE:{pixels:[567,963],hex:'#af9374'},NOGAL:{pixels:[567,1229],hex:'#77513d'},WHITE:{pixels:[945,2048],hex:'#f1f0ec'},AZUL:{pixels:[945,2048],hex:'#67757e'},GRIS:{pixels:[567,1181],hex:'#807768'},BISC:{pixels:[945,2048],hex:'#ebe2d9'},GREEN:{pixels:[945,2048],hex:'#918c76'}};
const approvedAlba={'alba-fluid.webp':'4da718407e8414d70cbc1310cccdac2cf8d880200d9674f511d9cb7a315bef9e','alba-balanced.webp':'b4440bd4a958008cf2aa9a70b48aa7bfb7aec671cba8b9a70bd0f87f1018e48d','alba-max.webp':'771491decd956c424fe4302a82cda712f5f84f30d9e0bc5485b1fbbbcb84fcc4','alba-swatch.webp':'6048b7f0981b0de26e0061a0d1cc8e652b4222405335938da20d332b02ccfafa'};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
let variants=0;
assert.equal(FINISHES.length,8);assert.deepEqual(Object.keys(manifest.finishes).sort(),Object.keys(expected).sort());
for(const f of FINISHES){
 const record=manifest.finishes[f.id],e=expected[f.id];
 assert.equal(f.manufacturerSample,true);assert.equal(f.hex,e.hex);assert.equal(record.averageSRGB,e.hex);assert.deepEqual(record.sourcePixels,e.pixels);assert.equal(CATALOG.finishes.find(c=>c.id===f.id).hex,e.hex);
 assert.equal(f.frontRotation,Math.PI/2,'horizontal grain on facades');
 if(f.id!=='ALBA')for(const [actual,factor]of [[f.textureRepeat[1],.7/.8],[f.frontRepeat[1],.8/.7]])assert(Math.abs(actual-e.pixels[0]/e.pixels[1]*factor)<1e-7,'sample proportions retained');
 for(const [mode,budget]of [['fluid',256],['balanced',1024],['max',2048]]){
  const v=record.variants[mode],bytes=readFileSync('dist/assets/'+v.file);
  assert.equal(f.textureVariants[mode],v.file);assert.equal(bytes.length,v.bytes);if(v.sha256)assert.equal(sha(bytes),v.sha256);
  assert(v.size.every((x,i)=>x<=e.pixels[i]));assert(Math.max(...v.size)<=budget);
  assert(Math.abs(v.size[0]/v.size[1]-e.pixels[0]/e.pixels[1])<=1/Math.min(...v.size),'proportions kept within pixel rounding');variants++;
 }
 assert.equal(f.texture,f.textureVariants.balanced);assert.equal(f.swatch,record.swatch);assert(readFileSync('dist/assets/'+f.swatch).length>0);
}
for(const [file,hash]of Object.entries(approvedAlba))assert.equal(sha(readFileSync('dist/assets/finishes/20261022/'+file)),hash,'approved Alba bytes unchanged');
assert.equal(manifest.finishes.ALBA.sha256,'f8768e957fb0e5f3d456a0824db63c3c5e46792fb4a562fce9e8485106cf5e2a');
const result={passed:true,finishes:8,textureVariants:variants,approvedAlbaByteIdentical:true,colourSpace:'sRGB',noUpscaling:true,checks:['All eight official samples shared by swatches, preview and atelier','Embedded ICC conversion, including eciRGBv2 Roble','Sample proportions and facade/side grain preserved','Three resolution budgets capped at genuine source pixels','All four approved Alba assets retain their SHA256']};
writeFileSync('reports/manufacturer-finishes-20261024.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
