'use strict';
// Import only a manifest-approved public supplier image/catalogue archive.
// Tariffs stay in the existing private tariff service and never enter this path.
const {readFileSync,createWriteStream,createReadStream,mkdtempSync,rmSync,statSync} = require('node:fs');
const {join} = require('node:path');
const {tmpdir} = require('node:os');
const {createHash} = require('node:crypto');
const {Transform} = require('node:stream');
const {pipeline} = require('node:stream/promises');
const {spawnSync} = require('node:child_process');
const MAX_PART_BYTES = 104857600;
const SERVICE_ACCOUNT = 'firebase-adminsdk-fbsvc@le-roy-factory.iam.gserviceaccount.com';
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));

function validateManifest(manifest) {
 if (manifest.schema !== 'lrf-pecchioli-media-import-v1' || manifest.status !== 'approved-public-assets' || manifest.tariffsIncluded !== false || !/^[a-f0-9]{64}$/.test(manifest.archiveSha256 || '') || !Array.isArray(manifest.files) || !manifest.files.length || manifest.fileCount !== manifest.files.length || !Array.isArray(manifest.parts) || !manifest.parts.length || manifest.parts.length > 20 || !Number.isSafeInteger(manifest.archiveBytes) || manifest.archiveBytes < 1 || manifest.archiveBytes > 1_000_000_000) throw Error('The approved Pecchioli public import manifest is incomplete.');
 const ids = new Set();
 for (const part of manifest.parts) {
  if (!/^[\w-]{20,100}$/.test(part.driveFileId || '') || ids.has(part.driveFileId) || !/^[a-f0-9]{64}$/.test(part.sha256 || '') || !Number.isSafeInteger(part.size) || part.size < 1 || part.size > MAX_PART_BYTES) throw Error('The approved Pecchioli archive part is invalid.');
  ids.add(part.driveFileId);
 }
 if (manifest.parts.reduce((total,part) => total + part.size,0) !== manifest.archiveBytes) throw Error('The approved Pecchioli archive part sizes do not match the archive size.');
 return manifest;
}

const extractionCode = String.raw`
import hashlib,json,pathlib,re,stat,sys,zipfile
archive,manifest_path=sys.argv[1:]
manifest=json.loads(pathlib.Path(manifest_path).read_text())
expected={}
for item in manifest['files']:
 p=pathlib.PurePosixPath(item['path'])
 image=str(p).startswith('assets/img/pecchioli-20261101/')
 catalogue=str(p).startswith('assets/pdf/pecchioli/')
 if not (image or catalogue) or p.is_absolute() or '..' in p.parts or '\\' in item['path'] or str(p)!=item['path']:
  raise ValueError('Archive path outside the approved Pecchioli asset folders')
 if image and p.suffix.lower() not in ['.webp','.jpg','.jpeg','.png']:
  raise ValueError('Only approved public images are allowed in the image folder')
 if catalogue and (p.suffix.lower()!='.pdf' or not re.search('catalog',p.name,re.I) or re.search('tarif|price|listino|remise|condizion|conditions',p.name,re.I)):
  raise ValueError('Only approved public catalogue PDFs are allowed; tariff documents are excluded')
 if item['path'] in expected or type(item['size']) is not int or item['size']<=0 or item['size']>100_000_000 or not re.fullmatch('[a-f0-9]{64}',item['sha256']):
  raise ValueError('Invalid or duplicate manifest entry')
 expected[item['path']]=item
if not expected or sum(item['size'] for item in expected.values())>1_000_000_000:raise ValueError('Approved import is empty or exceeds one gigabyte')
with zipfile.ZipFile(archive) as source:
 entries={}
 for entry in source.infolist():
  if entry.is_dir():continue
  if entry.filename in entries or entry.filename not in expected or stat.S_ISLNK(entry.external_attr>>16):raise ValueError('Unapproved, duplicate or symlink ZIP entry')
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
  if any(parent.is_symlink() for parent in [target,*target.parents]):raise ValueError('Asset destination contains a symlink')
 for name,entry in entries.items():
  target=pathlib.Path(name)
  target.parent.mkdir(parents=True,exist_ok=True)
  with source.open(entry) as inp,target.open('wb') as out:
   while chunk:=inp.read(1024*1024):out.write(chunk)
print(json.dumps({'verifiedAssets':len(entries),'bytes':sum(item['size'] for item in expected.values()),'tariffsIncluded':False}))
`;

async function main(manifestPath = process.argv[2] || 'reports/pecchioli-media-import.json') {
 const manifest = validateManifest(JSON.parse(readFileSync(manifestPath,'utf8')));
 const {GoogleAuth} = require('../functions/node_modules/google-auth-library');
 const auth = new GoogleAuth({scopes:['https://www.googleapis.com/auth/drive.readonly']});
 const credentials = await auth.getCredentials();
 if (credentials.client_email !== SERVICE_ACCOUNT) throw Error('The configured Drive importer is not the approved service account.');
 console.log('Drive importer service account: ' + credentials.client_email);
 const client = await auth.getClient();
 const temp = mkdtempSync(join(tmpdir(),'pecchioli-public-media-'));
 const archive = join(temp,'media.zip');
 try {
  const deadline = Date.now() + 10*60*1000;
  const hashFile = async path => {const digest=createHash('sha256');for await(const chunk of createReadStream(path))digest.update(chunk);return digest.digest('hex');};
  for (const [index,part] of manifest.parts.entries()) {
   const segment = join(temp,'part-'+index);
   for (let attempt=1;;attempt++) {
    try {
     const response = await client.request({url:`https://www.googleapis.com/drive/v3/files/${part.driveFileId}?alt=media`,responseType:'stream',timeout:180000});
     let received = 0;
     const limit = new Transform({transform(chunk,encoding,callback){received+=chunk.length;callback(received>part.size?Error('Archive part exceeds the approved size.'):null,chunk);}});
     await pipeline(response.data,limit,createWriteStream(segment));
     break;
    } catch (error) {
     const status = Number(error.response?.status || error.code) || 0;
     if (/exceeds the approved size/.test(error.message)) throw error;
     if (Date.now()>=deadline) throw Error('Drive archive could not be read by the approved importer service account (status '+status+').');
     console.log('Waiting for private Drive reader access; part '+(index+1)+', attempt '+attempt+', status '+status+'.');
     await sleep(30000);
    }
   }
   if (statSync(segment).size!==part.size || await hashFile(segment)!==part.sha256) throw Error('Archive part differs from its approved size or SHA256.');
   await pipeline(createReadStream(segment),createWriteStream(archive,{flags:index===0?'w':'a'}));
   rmSync(segment);
  }
  if (statSync(archive).size!==manifest.archiveBytes || await hashFile(archive)!==manifest.archiveSha256) throw Error('Archive size or SHA256 differs from the approved manifest.');
  const result = spawnSync('python3',['-c',extractionCode,archive,manifestPath],{stdio:'inherit'});
  if (result.status!==0) throw Error('Pecchioli archive validation or extraction failed.');
 } finally {rmSync(temp,{recursive:true,force:true});}
}

module.exports = {validateManifest,extractionCode,MAX_PART_BYTES,SERVICE_ACCOUNT};
if (require.main === module) main().catch(error => {console.error(error.message);process.exitCode=1;});
