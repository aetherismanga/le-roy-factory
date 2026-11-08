import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parse} from 'acorn';
import * as T from 'three';
import {preparePresentationFinish} from '../shared/lrf-3d/randal-presentation-finish-texture.js';
import {FINISHES as studioFinishes} from '../studio-one/src/finishes.js';
import {FINISHES as generalFinishes} from '../randal-general/src/finishes.js';
import {prepareFinishTexture,finishTextureURL} from '../randal-general/src/finish-texture.js';
import {fitTexture} from '../randal-general/src/texture-quality.js';

const renderer={capabilities:{maxTextureSize:8192,getMaxAnisotropy:()=>16}};
test('native manufacturer pixels and approved UVs remain unchanged with mipmapped anisotropic sampling',()=>{
 const image={width:567,height:1229},texture=new T.Texture(image);texture.repeat.set(1,.40368186);texture.rotation=Math.PI/2;
 assert.equal(preparePresentationFinish(texture,renderer),texture);assert.equal(texture.image,image);assert.deepEqual(texture.userData.presentationSourceSize,[567,1229]);
 assert.equal(texture.minFilter,T.LinearMipmapLinearFilter);assert.equal(texture.magFilter,T.LinearFilter);assert.equal(texture.generateMipmaps,true);assert.equal(texture.anisotropy,16);
 assert.deepEqual(texture.repeat.toArray(),[1,.40368186]);assert.equal(texture.rotation,Math.PI/2);assert.equal(texture.colorSpace,T.SRGBColorSpace);texture.dispose();
});

test('oversize originals are bounded only by the actual texture capability with high quality downsampling',()=>{
 const prior=globalThis.document,calls=[],sample={width:0,height:0},context={drawImage(...args){calls.push(args);}};globalThis.document={createElement:()=>{sample.getContext=()=>context;return sample;}};
 try{const original={width:8192,height:4096},texture=new T.Texture(original);preparePresentationFinish(texture,{capabilities:{maxTextureSize:2048,getMaxAnisotropy:()=>4}});assert.equal(texture.image,sample);assert.deepEqual([sample.width,sample.height],[2048,1024]);assert.equal(context.imageSmoothingQuality,'high');assert.equal(texture.anisotropy,4);assert.deepEqual(texture.userData.presentationSourceSize,[8192,4096]);assert.equal(calls.length,1);texture.dispose();}finally{globalThis.document=prior;}
});

for(const [variant,FINISHES,id]of [['studio-one',studioFinishes,'NOGAL'],['randal-general',generalFinishes,'aruba--nogal-valentina']])test(variant+': actual fullscreen loader uses the maximum official source without synthesizing colour relief',async()=>{
 const source=await readFile(new URL('../'+variant+'/src/commerce/live-preview.js',import.meta.url),'utf8'),entry=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='ExportNamedDeclaration'&&n.declaration?.id?.name==='createPreview').declaration;
 const declaration=entry.body.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='texture'),body=source.slice(declaration.start,declaration.end),profileDeclaration=entry.body.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>['workingProfile','workProfile'].includes(d.id.name))),profileBody=source.slice(profileDeclaration.start,profileDeclaration.end);
 const requested=[],definition=FINISHES.find(f=>f.id===id);assert(definition?.textureVariants?.max);
 class Loader{async loadAsync(url){requested.push(url);return new T.Texture(url.includes('-max.')?{width:567,height:1229}:{width:472,height:1024});}}
 const make=Function('deps',`const {T,FINISHES,renderer,premium,preparePresentationFinish,prepareFinishTexture,finishTextureURL,fitTexture}=deps;let disposed=false;const textures=new Map(),FINISH_VARIANTS={};${profileBody}${body};return texture;`);
 const create=premium=>make({T:{...T,TextureLoader:Loader},FINISHES,renderer,premium,preparePresentationFinish,prepareFinishTexture,finishTextureURL,fitTexture});
 const photoFree=create({profile:{texture:'balanced',anisotropy:8}}),bundle=await photoFree(id);assert.match(requested[0],/nogal-max\.webp$/);assert.equal(bundle.map.image.width,567);assert.equal(bundle.map.image.height,1229);assert.equal(bundle.front.image,bundle.map.image);assert.equal(bundle.bump,null);assert.equal(bundle.frontBump,null);assert.equal(bundle.front.rotation,definition.frontRotation);assert.deepEqual(bundle.front.repeat.toArray(),definition.frontRepeat);assert.equal(await photoFree(id),bundle,'the maximum bundle remains cached under its actual source profile');
 const ordinary=await create(null)(id);assert.match(requested.at(-1),/nogal-balanced\.webp$/);assert(ordinary.bump?.isTexture);assert(ordinary.frontBump?.isTexture,'ordinary workshop material recipes remain intact');
 for(const value of [...Object.values(bundle),...Object.values(ordinary)])value?.dispose?.();
});
