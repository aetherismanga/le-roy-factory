import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {AdaptiveQuality,QUALITY_PROFILES,ReflectionSchedule} from '../performance.js';
import {textureLimit} from '../texture-budget.js';
import {transform} from 'esbuild';

const suiteRoot=new URL('../../../',import.meta.url);
const generalRoot=new URL('randal-general/src/',suiteRoot);
const studioRoot=process.env.LRF_STUDIO_SOURCE?pathToFileURL(resolve(process.env.LRF_STUDIO_SOURCE)+'/'):new URL('studio-one/src/',suiteRoot);
const provenance=JSON.parse(await readFile(new URL('../extraction-provenance.json',import.meta.url),'utf8'));
for(const record of provenance.modules){
 const canonicalURL=new URL('../'+record.module,import.meta.url);
 const source=await readFile(canonicalURL);
 if(['functional-update-20261024','functional-update-20261025','functional-update-20261029','functional-update-20261101'].includes(record.current?.changeType)){
  assert(record.current.reason?.length>40,'Functional changes are documented');
  assert.equal(createHash('sha256').update(source).digest('hex'),record.current.sha256,'Documented current shared source: '+record.module);
  assert.equal(source.length,record.current.bytes);
  assert(record.current.validation?.length>=3,'Functional changes have regression coverage');
  for(const check of record.current.validation)await readFile(new URL(check,suiteRoot));
 }else if(record.current){
  assert.equal(record.module,'integrated-basins.js','Only the documented confidentiality cleanup changes an extracted source');
  assert.equal(record.current.changeType,'comments-only-confidentiality');
  assert(record.current.reason?.includes('private purchasing terms'));
  assert.equal(createHash('sha256').update(source).digest('hex'),record.current.sha256,'Documented current source: '+record.module);
  assert.equal(source.length,record.current.bytes);
  const executable=(await transform(source.toString('utf8'),{minify:true,format:'esm',target:'es2020',legalComments:'none'})).code;
  assert.equal(createHash('sha256').update(executable).digest('hex'),record.current.executableSha256,'Public prices and executable data unchanged');
  assert.equal(record.current.executableSha256,record.current.originalExecutableSha256,'Confidentiality cleanup changes comments only');
 }else assert.equal(createHash('sha256').update(source).digest('hex'),record.sha256,'Extracted implementation unchanged: '+record.module);
 const [canonical,general,studio]=await Promise.all([import(canonicalURL),import(new URL(record.module,generalRoot)),import(new URL(record.module,studioRoot))]);
 assert.deepEqual(Object.keys(general),Object.keys(canonical),'General compatibility exports: '+record.module);
 assert.deepEqual(Object.keys(studio),Object.keys(canonical),'Studio compatibility exports: '+record.module);
 for(const name of Object.keys(canonical)){
  assert.equal(general[name],canonical[name],'One General implementation: '+record.module+' / '+name);
  assert.equal(studio[name],canonical[name],'One Studio implementation: '+record.module+' / '+name);
 }
}

for(const mobile of [false,true]){
 const policy=new AdaptiveQuality({mobile});
 for(let frame=0;frame<3500;frame++)policy.sample(frame*16);
 assert.equal(policy.profile.id,mobile?'balanced':'max','Automatic quality respects mobile headroom');
 if(mobile)assert(policy.profile.pixels<QUALITY_PROFILES[1].pixels);
 policy.setMode('max');
 for(let frame=0;frame<1000;frame++)policy.sample(60000+frame*70);
 assert.equal(policy.profile,QUALITY_PROFILES[0],'Manual HD is retained even on slower mobile frames');
 policy.setMode('auto');policy.setMobile(true);
 for(let frame=0;frame<150;frame++)policy.sample(150000+frame*65);
 assert.equal(policy.profile.id,'fluid','Sustained slow rendering can reduce working quality');
}
const resizing=new AdaptiveQuality();
resizing.setMode('auto');for(let frame=0;frame<3500;frame++)resizing.sample(frame*16);
assert.equal(resizing.profile.id,'max');resizing.setMobile(true);assert.equal(resizing.profile.id,'balanced');
resizing.setMode('max');resizing.setMobile(false);resizing.setMobile(true);assert.equal(resizing.profile.id,'max','Resize does not cancel a manual HD choice');

assert.equal(textureLimit('fluid'),512);assert.equal(textureLimit('balanced'),1024);assert.equal(textureLimit('max'),4096);
assert.equal(textureLimit('max',{capabilities:{maxTextureSize:2048}}),2048);
const reflection=new ReflectionSchedule();assert(reflection.shouldCapture(0,'scene',30));assert.equal(reflection.shouldCapture(100,'scene',30),false);reflection.reset();assert(reflection.shouldCapture(101,'scene',30));
console.log(JSON.stringify({passed:true,unchangedExtractedModules:provenance.modules.filter(record=>!record.current).length,documentedSourceChanges:provenance.modules.filter(record=>record.current).map(record=>({module:record.module,changeType:record.current.changeType})),wrapperIdentity:'both applications',checks:['original and current source provenance','comment-only confidentiality cleanup preserves executable data','documented functional evolution retains original extraction provenance','single module identities through compatibility paths','desktop/mobile automatic quality','manual HD preserved','responsive quality transition','texture/GPU budgets','reflection reuse']},null,2));
