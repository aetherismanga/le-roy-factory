'use strict';
// Import only the approved public supplier image/PDF archive. Tariffs never enter this path.
const {readFileSync,createWriteStream,createReadStream,mkdtempSync,rmSync,statSync} = require('node:fs');
const {join} = require('node:path');
const {tmpdir} = require('node:os');
const {createHash} = require('node:crypto');
const {pipeline} = require('node:stream/promises');
const {spawnSync} = require('node:child_process');
const {GoogleAuth} = require('../functions/node_modules/google-auth-library');
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
const manifestPath = process.argv[2] || 'reports/bulbo-media-import.json';
const manifest = JSON.parse(readFileSync(manifestPath,'utf8'));
if (manifest.schema !== 'lrf-bulbo-media-import-v1' || !/^[a-f0-9]{64}$/.test(manifest.archiveSha256 || '') || !Array.isArray(manifest.files) || !manifest.files.length || !Array.isArray(manifest.parts) || !manifest.parts.length || manifest.parts.length > 20) throw Error('The approved BULBO import manifest is incomplete.');
for (const part of manifest.parts) if (!/^[\w-]{20,100}$/.test(part.driveFileId || '') || !/^[a-f0-9]{64}$/.test(part.sha256 || '') || !Number.isSafeInteger(part.size) || part.size < 1 || part.size > 104857600) throw Error('The approved BULBO archive part is invalid.');
const extractionCode = String.raw`
import hashlib,json,os,pathlib,stat,sys,zipfile
archive,manifest_path=sys.argv[1:]
manifest=json.loads(pathlib.Path(manifest_path).read_text())
expected={}
for item in manifest['files']:
 p=pathlib.PurePosixPath(item['path'])
 if not (str(p).startswith('assets/img/bulbo-20261101/') or str(p).startswith('assets/pdf/bulbo/')) or p.is_absolute() or '..' in p.parts or '\\' in item['path'] or str(p)!=item['path']:
  raise ValueError('Archive path outside the approved BULBO asset folders')
 if p.suffix.lower() not in ['.webp','.jpg','.jpeg','.png','.pdf']:
  raise ValueError('Only approved public images and catalogue PDFs are allowed')
 if item['path'] in expected or not isinstance(item['size'],int) or item['size']<=0 or item['size']>100_000_000 or len(item['sha256'])!=64:
  raise ValueError('Invalid or duplicate manifest entry')
 expected[item['path']]=item
if sum(item['size'] for item in expected.values())>1_000_000_000:raise ValueError('Approved import exceeds one gigabyte')
with zipfile.ZipFile(archive) as source:
 entries={}
 for entry in source.infolist():
  if entry.is_dir():continue
  if entry.filename in entries or entry.filename not in expected or stat.S_ISLNK(entry.external_attr>>16):raise ValueError('Unapproved or duplicate ZIP entry')
  item=expected[entry.filename]
  if entry.file_size!=item['size']:raise ValueError('ZIP entry size differs from approved manifest')
  with source.open(entry) as file:
   digest=hashlib.file_digest(file,'sha256').hexdigest()
  if digest!=item['sha256']:raise ValueError('ZIP entry hash differs from approved manifest')
  entries[entry.filename]=entry
 if set(entries)!=set(expected):raise ValueError('The archive does not contain all approved assets')
 # No file is written until every entry has passed path, size and hash checks.
 for name,entry in entries.items():
  target=pathlib.Path(name)
  target.parent.mkdir(parents=True,exist_ok=True)
  with source.open(entry) as inp,target.open('wb') as out:
   while chunk:=inp.read(1024*1024):out.write(chunk)
print(json.dumps({'verifiedAssets':len(entries),'bytes':sum(item['size'] for item in expected.values()),'tariffsIncluded':False}))
`;
async function main() {
 const auth = new GoogleAuth({scopes:['https://www.googleapis.com/auth/drive.readonly']});
 const credentials = await auth.getCredentials();
 if (!credentials.client_email) throw Error('Importer service account identity is unavailable.');
 console.log('Drive importer service account: ' + credentials.client_email);
 const client = await auth.getClient();
 const temp = mkdtempSync(join(tmpdir(),'bulbo-public-media-'));
 const archive = join(temp,'media.zip');
 try {
  const deadline = Date.now() + 10*60*1000;
  const hashFile = async path => {const digest=createHash('sha256');for await(const chunk of createReadStream(path))digest.update(chunk);return digest.digest('hex');};
  for (const [index,part] of manifest.parts.entries()) {
   const segment = join(temp,'part-'+index);
   for (let attempt=1;;attempt++) {
    try {
     const response = await client.request({url:`https://www.googleapis.com/drive/v3/files/${part.driveFileId}?alt=media`,responseType:'stream',timeout:180000});
     await pipeline(response.data,createWriteStream(segment));
     break;
    } catch (error) {
     const status = Number(error.response?.status || error.code) || 0;
     if (Date.now()>=deadline) throw Error('Drive archive could not be read by the importer service account (status '+status+').');
     console.log('Waiting for private Drive reader access; part '+(index+1)+', attempt '+attempt+', status '+status+'.');
     await sleep(30000);
    }
   }
   if (statSync(segment).size!==part.size || await hashFile(segment)!==part.sha256) throw Error('Archive part differs from its approved size or SHA256.');
   await pipeline(createReadStream(segment),createWriteStream(archive,{flags:index===0?'w':'a'}));
   rmSync(segment);
  }
  if(await hashFile(archive)!==manifest.archiveSha256)throw Error('Archive SHA256 differs from the approved manifest.');
  const result=spawnSync('python3',['-c',extractionCode,archive,manifestPath],{stdio:'inherit'});
  if(result.status!==0)throw Error('BULBO archive validation or extraction failed.');
 } finally {rmSync(temp,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
