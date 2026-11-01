const test = require('node:test');
const assert = require('node:assert/strict');
const {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync} = require('node:fs');
const {tmpdir} = require('node:os');
const {join} = require('node:path');
const {createHash} = require('node:crypto');
const {spawnSync} = require('node:child_process');
const {validateManifest,extractionCode,MAX_PART_BYTES,SERVICE_ACCOUNT} = require('../scripts/import-pecchioli-selection-assets.cjs');
const hash = content => createHash('sha256').update(content).digest('hex');
const allowed = 'assets/img/pecchioli-20261101/test.webp';
const catalogue = 'assets/pdf/pecchioli/PECCHIOLI-CATALOGUE-GENERAL.pdf';
const fileEntry = item => ({path:item.path,size:Buffer.byteLength(item.content),sha256:hash(item.content)});

function runCase(entries,manifestEntries) {
 const folder = mkdtempSync(join(tmpdir(),'pecchioli-import-test-'));
 try {
  writeFileSync(join(folder,'entries.json'),JSON.stringify(entries));
  const build = spawnSync('python3',['-c',String.raw`
import json,pathlib,zipfile
entries=json.loads(pathlib.Path('entries.json').read_text())
with zipfile.ZipFile('assets.zip','w') as archive:
 for item in entries:
  info=zipfile.ZipInfo(item['path'])
  if item.get('symlink'):
   info.create_system=3
   info.external_attr=0o120777<<16
  archive.writestr(info,item['content'])
`],{cwd:folder,encoding:'utf8'});
  assert.equal(build.status,0,build.stderr);
  writeFileSync(join(folder,'manifest.json'),JSON.stringify({files:manifestEntries || entries.map(fileEntry)}));
  const result = spawnSync('python3',['-c',extractionCode,'assets.zip','manifest.json'],{cwd:folder,encoding:'utf8'});
  const extracted = new Set(entries.map(item => item.path).filter(path => existsSync(join(folder,path))));
  return {status:result.status,output:result.stdout,error:result.stderr,has:path => extracted.has(path)};
 } finally {rmSync(folder,{recursive:true,force:true});}
}

function approvedManifest() {
 return {
  schema:'lrf-pecchioli-media-import-v1',status:'approved-public-assets',tariffsIncluded:false,
  archiveSha256:hash('archive'),archiveBytes:7,fileCount:1,
  parts:[{driveFileId:'PecchioliArchiveId1234567890',size:7,sha256:hash('archive')}],
  files:[{path:allowed,size:8,sha256:hash('approved')}]
 };
}

test('approved public image and catalogue bytes pass size and SHA256 checks before extraction',() => {
 const result = runCase([{path:allowed,content:'approved-image-bytes'},{path:catalogue,content:'approved-public-catalogue'}]);
 assert.equal(result.status,0,result.error);assert.equal(result.has(allowed),true);assert.equal(result.has(catalogue),true);
 assert.match(result.output,/"verifiedAssets": 2/);assert.match(result.output,/"tariffsIncluded": false/);
});

test('unexpected archive entries reject the whole import before any approved asset is written',() => {
 const result = runCase([{path:allowed,content:'approved'},{path:'assets/js/unapproved.js',content:'invalid'}],[fileEntry({path:allowed,content:'approved'})]);
 assert.notEqual(result.status,0);assert.equal(result.has(allowed),false);assert.equal(result.has('assets/js/unapproved.js'),false);
});

test('hash and size mismatches reject the whole archive before any image is written',() => {
 for (const changed of [{sha256:'0'.repeat(64)},{size:9}]) {
  const result = runCase([{path:allowed,content:'approved'}],[{...fileEntry({path:allowed,content:'approved'}),...changed}]);
  assert.notEqual(result.status,0);assert.equal(result.has(allowed),false);
 }
});

test('missing and duplicate ZIP entries reject the import before writing',() => {
 const entry = {path:allowed,content:'approved'};
 const missing = runCase([entry],[fileEntry(entry),fileEntry({path:catalogue,content:'catalogue'})]);
 assert.notEqual(missing.status,0);assert.equal(missing.has(allowed),false);
 const duplicate = runCase([entry,entry],[fileEntry(entry)]);
 assert.notEqual(duplicate.status,0);assert.equal(duplicate.has(allowed),false);
});

test('traversal, absolute and noncanonical paths cannot enter the approved manifest',() => {
 for (const path of [
  'assets/img/pecchioli-20261101/../../../escape.webp',
  '/assets/img/pecchioli-20261101/escape.webp',
  'assets/img/pecchioli-20261101//escape.webp',
  'assets/img/pecchioli-20261101/./escape.webp',
  'assets/img/pecchioli-20261101/..\\escape.webp',
  'assets/img/bulbo-20261101/escape.webp'
 ]) {
  const result = runCase([{path,content:'invalid'}]);
  assert.notEqual(result.status,0);assert.match(result.error,/outside the approved/);
 }
});

test('tariffs, executable files and mixed media folders are excluded',() => {
 for (const path of [
  'assets/pdf/pecchioli/PECCHIOLI-TARIFS-2022.pdf',
  'assets/pdf/pecchioli/catalogue-price-list.pdf',
  'assets/pdf/pecchioli/catalogue-listino.pdf',
  'assets/pdf/pecchioli/catalogue-conditions.pdf',
  'assets/img/pecchioli-20261101/catalogue.pdf',
  'assets/pdf/pecchioli/test.webp',
  'assets/img/pecchioli-20261101/script.js'
 ]) {
  const result = runCase([{path,content:'invalid'}]);assert.notEqual(result.status,0);assert.equal(result.has(path),false);
 }
});

test('symlink entries and invalid or duplicate manifest records are rejected',() => {
 const entry = {path:allowed,content:'approved'};
 const symlink = runCase([{...entry,symlink:true}]);assert.notEqual(symlink.status,0);assert.equal(symlink.has(allowed),false);
 for (const records of [[fileEntry(entry),fileEntry(entry)],[{...fileEntry(entry),sha256:'z'.repeat(64)}],[{...fileEntry(entry),size:true}]]) {
  const result = runCase([entry],records);assert.notEqual(result.status,0);assert.equal(result.has(allowed),false);
 }
});

test('the manifest requires explicit public approval and matching archive metadata',() => {
 assert.equal(validateManifest(approvedManifest()).files.length,1);
 for (const changes of [
  {status:'awaiting-final-public-assets'},
  {tariffsIncluded:true},
  {tariffsIncluded:undefined},
  {archiveSha256:''},
  {fileCount:2},
  {archiveBytes:8},
  {parts:[]}
 ]) assert.throws(() => validateManifest({...approvedManifest(),...changes}));
 const staged = JSON.parse(readFileSync(join(__dirname,'../reports/pecchioli-media-import.json'),'utf8'));
 if (staged.status === 'approved-public-assets') assert.doesNotThrow(() => validateManifest(staged));
 else assert.throws(() => validateManifest(staged),/incomplete/);
});

test('archive parts are unique, SHA256 pinned and never exceed the 100 MiB upload limit',() => {
 assert.equal(MAX_PART_BYTES,100*1024*1024);
 for (const changes of [{size:MAX_PART_BYTES+1},{size:0},{sha256:'invalid'},{driveFileId:'invalid/id'}]) {
  const manifest = approvedManifest();manifest.parts[0]={...manifest.parts[0],...changes};assert.throws(() => validateManifest(manifest));
 }
 const manifest = approvedManifest();manifest.parts.push({...manifest.parts[0]});manifest.archiveBytes=14;assert.throws(() => validateManifest(manifest));
 assert.equal(SERVICE_ACCOUNT,'firebase-adminsdk-fbsvc@le-roy-factory.iam.gserviceaccount.com');
});

test('the workflow imports only on the Pecchioli release branch and stages the two approved folders',() => {
 const workflow = readFileSync(join(__dirname,'../.github/workflows/import-pecchioli-selection-assets.yml'),'utf8');
 assert.match(workflow,/branches: \['release\/pecchioli-selection-20261101'\]/);
 assert.match(workflow,/test "\$IMPORT_BRANCH" = 'release\/pecchioli-selection-20261101'/);
 assert.match(workflow,/for asset_dir in assets\/img\/pecchioli-20261101 assets\/pdf\/pecchioli/);
 assert.doesNotMatch(workflow,/^  identify:/m);
});
