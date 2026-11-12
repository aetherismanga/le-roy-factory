import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGeometry,buildProductSvg,renderProductVisual,productThumbnail,renderMaterialDetail} from '../assets/js/saxso-product-visual.mjs';

test('format and thickness stay exact for tiles, skirting, coping and kerbs',()=>{
  const tile=parseGeometry('Sakkara Grey 60x90 sp.2 cm');
  assert.equal(tile.widthCm,60);assert.equal(tile.lengthCm,90);assert.equal(tile.thicknessCm,2);assert.equal(tile.type,'tile');
  const skirting=parseGeometry({reference:'Sakkara Grey 8x60 sp.1,3 cm',unit:'ml',productType:'plinthe'});
  assert.equal(skirting.type,'skirting');assert.equal(skirting.widthCm,8);assert.equal(skirting.thicknessCm,1.3);
  const coping=parseGeometry({reference:'Sakkara Grey 30x60 sp.3 cm',productType:'margelle'});
  assert.equal(coping.type,'coping');assert.equal(coping.edge,'straight','a bullnose must be documented, not assumed from a pool label');
  assert.equal(parseGeometry('Pietra Grigio 35x120 sp.3 cm con bordo a toro').edge,'bullnose');
  const kerb=parseGeometry('G603 Cordoli 6x25x100 cm');
  assert.equal(kerb.type,'kerb');assert.equal(kerb.widthCm,6);assert.equal(kerb.lengthCm,100);assert.equal(kerb.thicknessCm,25);
});

test('ranges, grain sizes, unknown indoor sizes and module counts never acquire false precision',()=>{
  const range=parseGeometry('Luserna 20x40 sp.2/4 cm');
  assert.deepEqual(range.thicknessRange,[2,4]);assert.equal(range.thicknessCm,undefined);
  const variable=parseGeometry('LG002 Fujan REGULAR 6/8/14x30-60 sp.1,5 cm');
  assert.equal(variable.dimensionsKnown,false);assert.equal(variable.widthCm,undefined);
  const grain=parseGeometry('Bianco Carrara Ciottoli 15/25 mm');
  assert.equal(grain.type,'pebbles');assert.deepEqual(grain.grainMm,[15,25]);assert.equal(grain.widthCm,undefined);
  assert.equal(parseGeometry('Travertin — Plinthe').dimensionsKnown,false);
  assert.equal(parseGeometry('Sakkara Grey Mod. 4* sp.1 cm').moduleCount,4);
});

test('corner legs and a sphere diameter are read independently of a slab format',()=>{
  const angle=parseGeometry('CG101 Angolo 15x15 + 15x30 sp.1,5/3 cm');
  assert.equal(angle.type,'corner');assert.deepEqual(angle.legsCm,[15,30]);assert.equal(angle.heightCm,15);
  const sphere=parseGeometry('G603 Sfere Bocciardate 30 cm');
  assert.equal(sphere.type,'sphere');assert.equal(sphere.diameterCm,30);
});

test('diagram escapes labels, embeds only raster texture data and identifies its illustration status',()=>{
  const v={reference:'Sakkara 8x60 sp.1,3 cm',label:'<script>bad</script>',productType:'plinthe'};
  const svg=buildProductSvg(v,'https://untrusted.example/texture.svg');
  assert.ok(svg.includes('ILLUSTRATION DU FORMAT'));assert.ok(svg.includes('8 × 60 cm'));assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(!svg.includes('<script>'));assert.ok(!svg.includes('https://untrusted'));
  const textured=buildProductSvg(v,'data:image/jpeg;base64,AA==');
  assert.ok(textured.includes('href="data:image/jpeg;base64,AA=="'));
  assert.ok(productThumbnail(v).startsWith('data:image/svg+xml'));
});

test('renders a complete standalone 1600 × 1200 format image without a supplied texture',async()=>{
  const visual=await renderProductVisual({reference:'Sakkara 40x60 sp.2 cm'});
  assert.equal(visual.kind,'illustration');assert.equal(visual.width,1600);assert.equal(visual.height,1200);assert.equal(visual.textureDocumented,false);
  assert.notEqual(visual.url,visual.preview);assert.ok(decodeURIComponent(visual.url).includes('Épaisseur 2 cm'));
  const full=decodeURIComponent(visual.url),preview=decodeURIComponent(visual.preview),thumb=decodeURIComponent(productThumbnail({reference:'Sakkara 40x60 sp.2 cm'}));
  assert.ok(full.includes('width="1600" height="1200" viewBox="0 0 1600 1200"'));
  assert.ok(preview.includes('width="320" height="240" viewBox="0 0 1600 1200"'));
  assert.ok(thumb.includes('width="320" height="240" viewBox="0 0 1600 1200"'));
  assert.equal(preview.replace('width="320" height="240" viewBox=','width="1600" height="1200" viewBox='),full,'preview only changes intrinsic SVG decoding size');
});

test('pixel cropping uses the original bitmap through an SVG viewBox and rejects invalid rectangles',()=>{
  const v={reference:'Sakkara Grey 8x60 sp.1,3 cm',productType:'plinthe',materialPhoto:{width:323,height:190,cropRect:[80,55,120,65]}};
  const svg=buildProductSvg(v,'data:image/jpeg;base64,AA==');
  assert.ok(svg.includes('viewBox="80 55 120 65"'));assert.ok(svg.includes('width="323" height="190"'));
  assert.ok(!buildProductSvg({...v,materialPhoto:{...v.materialPhoto,cropRect:[500,0,100,65]}},'data:image/jpeg;base64,AA==').includes('viewBox="500 0 100 65"'));
  assert.equal(parseGeometry({reference:'Caillou 100/200 mm',productType:'boulder'}).type,'pebbles');
  assert.equal(parseGeometry({reference:'Ardesia 10/30 mm',productType:'chips'}).type,'pebbles');
  assert.equal(parseGeometry({reference:'G603 Sfere',productType:'sphere',geometry:{diameterCm:40}}).diameterCm,40);
});

test('an ineligible source packshot is never fetched or placed on a product format',async t=>{
  const request=t.mock.method(globalThis,'fetch',()=>{throw Error('A packshot must not be loaded as a surface');});
  const visual=await renderProductVisual({reference:'Sakkara 40x60 sp.2 cm'},{url:'https://example.test/packshot.jpg',textureEligible:false});
  assert.equal(request.mock.callCount(),0);assert.equal(visual.textureDocumented,false);assert.ok(!decodeURIComponent(visual.url).includes('href="data:image/jpeg'));
});

test('material detail keeps only the selected native crop, without inventing extra resolution',async()=>{
  const photo={url:'data:image/jpeg;base64,AA==',preview:'original.jpg',width:400,height:200,cropRect:[210,35,160,90],label:'Gravillons noirs'};
  const detail=await renderMaterialDetail(photo),svg=decodeURIComponent(detail.url);
  assert.equal(detail.kind,'photo');assert.equal(detail.width,160);assert.equal(detail.height,90);assert.equal(detail.cropApplied,true);
  assert.ok(svg.includes('viewBox="210 35 160 90"'));assert.ok(svg.includes('width="400" height="200"'));assert.equal(detail.nativeSourceUrl,photo.url);
  assert.equal(await renderMaterialDetail(detail),detail,'a cropped image is not cropped a second time');
  const noCrop={...photo,cropRect:undefined};assert.equal(await renderMaterialDetail(noCrop),noCrop);
});

test('Sakkara Mod. 4 renders four documented formats rather than a single tile',()=>{
  const v={reference:'Sakkara Grey Levigato, Anticato Mod. 4* sp.1 cm',productType:'tile',geometry:{type:'tile'}};
  const g=parseGeometry(v),svg=buildProductSvg(v);
  assert.equal(g.type,'opus');assert.deepEqual(g.moduleFormatsCm,[[20,20],[20,40],[40,40],[40,60]]);
  for(const f of ['20 × 20 cm','20 × 40 cm','40 × 40 cm','40 × 60 cm'])assert.ok(svg.includes(f),f);
  assert.ok(svg.includes('disposition illustrative, sans quantitatif'));
  const other=parseGeometry('Travertino Mod. 8* sp.1,2 cm');
  assert.equal(other.type,'opus');assert.equal(other.moduleFormatsCm,undefined,'module identifiers do not imply a number of pieces');
});

test('a documented underside drip groove appears only when explicitly provided',()=>{
  const v={reference:'Sakkara Grey 35x100 sp.4 cm',productType:'cap',geometry:{edge:'chamfer',dripEdge:true}};
  assert.ok(buildProductSvg(v).includes('Goutte d’eau sous face'));
  assert.ok(!buildProductSvg({...v,geometry:{edge:'chamfer'}}).includes('Goutte d’eau sous face'));
});

test('an exact-source indicative colour uses only a safe six-digit hex fill without inventing texture',()=>{
  const v={reference:'Sakkara Dark 40x60 sp.2 cm',geometry:{materialColor:'#25312A'}};
  const svg=buildProductSvg(v);
  assert.ok(svg.includes('fill="#25312A"'));assert.ok(svg.includes('Teinte indicative issue de la photographie source'));
  assert.ok(!svg.includes('href="data:image/'));
  for(const materialColor of ['#fff','red','url(#matter)','#25312A" onload="bad()','#25312A;opacity:0']){
    const invalid=buildProductSvg({...v,geometry:{materialColor}});
    assert.ok(!invalid.includes('Teinte indicative issue de la photographie source'));
    assert.ok(!invalid.includes('onload='));assert.ok(invalid.includes('fill="#d3d1c7"'));
  }
});
