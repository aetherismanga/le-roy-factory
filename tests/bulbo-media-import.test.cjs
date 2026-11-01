const test=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {createHash}=require('node:crypto');
const {spawnSync}=require('node:child_process');
const source=readFileSync(join(__dirname,'../scripts/import-bulbo-selection-assets.cjs'),'utf8');
const extractionCode=/const extractionCode = String.raw`([\s\S]*?)`;/.exec(source)[1];
function runCase(entries,manifestEntries){
 const folder=mkdtempSync(join(tmpdir(),'bulbo-import-test-'));
 try{
  writeFileSync(join(folder,'entries.json'),JSON.stringify(entries));
  const build=spawnSync('python3',['-c',"import json,pathlib,zipfile; entries=json.loads(pathlib.Path('entries.json').read_text()); z=zipfile.ZipFile('assets.zip','w'); [z.writestr(x['path'],x['content']) for x in entries]; z.close()"],{cwd:folder,encoding:'utf8'});
  assert.equal(build.status,0,build.stderr);
  const manifest={files:manifestEntries||entries.map(x=>({path:x.path,size:Buffer.byteLength(x.content),sha256:createHash('sha256').update(x.content).digest('hex')}))};
  writeFileSync(join(folder,'manifest.json'),JSON.stringify(manifest));
  const result=spawnSync('python3',['-c',extractionCode,'assets.zip','manifest.json'],{cwd:folder,encoding:'utf8'});
  const extracted=new Set(entries.map(x=>x.path).filter(path=>existsSync(join(folder,path))));
  return {status:result.status,output:result.stdout,error:result.stderr,has:path=>extracted.has(path)};
 }finally{rmSync(folder,{recursive:true,force:true});}
}
const allowed='assets/img/bulbo-20261101/test.webp';
test('approved image bytes pass count, size and SHA256 validation before extraction',()=>{
 const result=runCase([{path:allowed,content:'approved-image-bytes'}]);
 assert.equal(result.status,0,result.error);assert.equal(result.has(allowed),true);assert.match(result.output,/"verifiedAssets": 1/);
});
test('an unexpected archive file is rejected before writing any approved image',()=>{
 const entries=[{path:allowed,content:'approved'},{path:'assets/js/unapproved.js',content:'invalid'}];
 const manifestEntries=[{path:allowed,size:8,sha256:createHash('sha256').update('approved').digest('hex')}];
 const result=runCase(entries,manifestEntries);
 assert.notEqual(result.status,0);assert.equal(result.has(allowed),false);assert.equal(result.has('assets/js/unapproved.js'),false);
});
test('a hash mismatch rejects the whole archive before writing any image',()=>{
 const entries=[{path:allowed,content:'approved'}];
 const result=runCase(entries,[{path:allowed,size:8,sha256:'0'.repeat(64)}]);
 assert.notEqual(result.status,0);assert.equal(result.has(allowed),false);
});
test('traversal paths cannot enter the approved manifest',()=>{
 const entries=[{path:'assets/img/bulbo-20261101/../../../escape.webp',content:'invalid'}];
 const result=runCase(entries);assert.notEqual(result.status,0);assert.match(result.error,/outside the approved/);
});
