import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {parse} from 'acorn';
import {SEGMENTO,segmentoColors,segmentoLayout} from '../shared/lrf-3d/segmento.js';
import {validateProject,encodeProject,decodeProject} from '../functions/neobath-anima/studio-adapter/projects.js';
import {ANIMA_STUDIO_RELEASE_ID} from '../functions/neobath-anima/studio-adapter/release.mjs';

const require=createRequire(import.meta.url);
const {createNeobathAnimaHandler}=require('../functions/neobath-anima-access-core.cjs');
const read=path=>readFileSync(new URL('../'+path,import.meta.url));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

function webpDimensions(bytes,label){
 assert(bytes.length>20,label+' has image pixels');
 assert.equal(bytes.toString('ascii',0,4),'RIFF',label);assert.equal(bytes.toString('ascii',8,12),'WEBP',label);
 for(let offset=12;offset+8<=bytes.length;){
  const type=bytes.toString('ascii',offset,offset+4),length=bytes.readUInt32LE(offset+4),at=offset+8;
  if(type==='VP8X')return [bytes.readUIntLE(at+4,3)+1,bytes.readUIntLE(at+7,3)+1];
  if(type==='VP8L'){assert.equal(bytes[at],0x2f,label);const bits=bytes.readUInt32LE(at+1);return [(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1];}
  if(type==='VP8 '){assert.equal(bytes.toString('hex',at+3,at+6),'9d012a',label);return [bytes.readUInt16LE(at+6)&0x3fff,bytes.readUInt16LE(at+8)&0x3fff];}
  offset=at+length+(length%2);
 }
 assert.fail(label+' has a decodable WebP image');
}

// Inspect constant JSON declarations without executing the private application.
function bundledSegmento(source){
 const tree=parse(source,{ecmaVersion:'latest',sourceType:'module'}),bindings=new Map();
 for(const statement of tree.body)if(statement.type==='VariableDeclaration')for(const declaration of statement.declarations)if(declaration.id.type==='Identifier')bindings.set(declaration.id.name,declaration.init);
 const key=node=>node.type==='Identifier'?node.name:node.value;
 const matches=[...bindings.values()].filter(node=>node?.type==='ObjectExpression'&&['sourceDocument','colors','patterns','compositions'].every(name=>node.properties.some(property=>property.type==='Property'&&key(property.key)===name)));
 assert.equal(matches.length,1,'One canonical Segmento document is included in the private bundle');
 function value(node,seen=new Set()){
  if(node.type==='Literal')return node.value;
  if(node.type==='ArrayExpression')return node.elements.map(item=>value(item,seen));
  if(node.type==='ObjectExpression')return Object.fromEntries(node.properties.map(property=>{assert.equal(property.type,'Property');assert.equal(property.computed,false);return [key(property.key),value(property.value,seen)];}));
  if(node.type==='UnaryExpression'){
   const argument=value(node.argument,seen);
   if(node.operator==='!')return !argument;
   if(node.operator==='-')return -argument;
   if(node.operator==='+')return +argument;
  }
  if(node.type==='Identifier'){
   assert(!seen.has(node.name),'Constant JSON bindings cannot be circular');
   assert(bindings.has(node.name),'The bundled JSON binding exists');
   return value(bindings.get(node.name),new Set([...seen,node.name]));
  }
  assert.fail('Expected a static JSON value, received '+node.type);
 }
 return value(matches[0]);
}

test('the protected Anima bundle contains the exact 16 references, 12 patterns and 48 manufacturer compositions',()=>{
 const directory='functions/neobath-anima/studio-dist/';
 const release=JSON.parse(read(directory+'release.json'));
 const module=gunzipSync(read(directory+'app.js.gz'));
 assert.equal(release.id,ANIMA_STUDIO_RELEASE_ID);
 assert.equal(digest(module),release.assets['app.js'],'The inspected bundle is the integrity-checked private release');
 const bundled=bundledSegmento(module.toString('utf8'));
 assert.equal(bundled.colors.length,16);assert.equal(bundled.patterns.length,12);assert.equal(bundled.compositions.length,48);
 assert.deepEqual(bundled,SEGMENTO,'All tile colours, quarter-turns, photographs and packaging match the canonical manufacturer document');
 for(const color of bundled.colors){
  assert.equal(digest(read(color.original)),color.sourceSHA256,color.ref+' retains its manufacturer original');
  assert.equal(digest(read(color.preview)),color.sha256,color.ref+' uses the reviewed image');
  assert.equal(color.upscaled,false,color.ref+' is not enlarged');
 }
 for(const composition of bundled.compositions)assert(webpDimensions(read(composition.preview),composition.id).every(value=>value>0),composition.id+' has nonzero dimensions');
 assert.equal(release.provenance.sourceHashes['shared/lrf-3d/segmento.js'],digest(read('shared/lrf-3d/segmento.js')));
 assert.equal(release.provenance.sourceHashes['studio-one/src/app.js'],digest(read('studio-one/src/app.js')));
});

test('all 48 Segmento compositions survive the private Anima floor and wall project round trip',()=>{
 for(const composition of SEGMENTO.compositions){
  const layout=segmentoLayout({},composition.id),colors=segmentoColors(layout),color=SEGMENTO.colors.find(item=>item.id===colors[0]);
  const finish={collection:'Segmento',color:color.id,reference:color.ref,format:'15x15',segmento:{composition:composition.id},segmentoColors:colors};
  const input={version:2,manufacturer:'neobath-anima',room:{points:[[0,0],[450,0],[450,450],[0,450]]},items:[],floor:{...finish},walls:Array.from({length:4},()=>({...finish})),layouts:{floor:layout,walls:Array.from({length:4},()=>({...layout}))}};
  const project=decodeProject(encodeProject(validateProject(input)));
  assert.deepEqual(project,JSON.parse(JSON.stringify(input)),composition.id);
 }
});

test('anonymous Anima checks disclose the release identifier while withholding every private asset',async()=>{
 let loads=0;
 const handler=createNeobathAnimaHandler({releaseId:ANIMA_STUDIO_RELEASE_ID,getAgent:async()=>null,loadApplication:()=>{loads++;throw Error('Private assets must not be read');}});
 const response={code:200,headers:{},set(name,value){this.headers[name]=value;return this;},status(value){this.code=value;return this;},json(value){this.body=value;return this;}};
 await handler({method:'POST',headers:{origin:'https://leroyfactory.fr'},body:{action:'application',view:'atelier',email:'jerome@leroyfactory.fr',isAdmin:true}},response);
 assert.equal(response.code,401);assert.equal(response.body.success,false);assert.equal(loads,0);
 assert.equal(response.headers['X-LRF-Anima-Version'],ANIMA_STUDIO_RELEASE_ID);
 assert.match(response.headers['Cache-Control'],/private, no-store/);
 for(const name of ['html','css','module','catalogue','visuals','identity'])assert.equal(response.body[name],undefined,name);
});
