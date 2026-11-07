import {fetchPhotoStudioModel} from './fetch-photo-studio-model.mjs';
import {buildPublicSite} from './build-public-site.mjs';
import {generate} from './build-photo-studio-catalogue.mjs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {cpSync,existsSync,mkdirSync,rmSync} from 'node:fs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');

// A separate control surface for preview QA only. The public production build
// continues to exclude tests/ and never receives a fixture import shortcut.
export function copyPhotoStudioPreviewQa({root=ROOT,out=join(root,'public-site'),environment=process.env.VERCEL_ENV}={}){
  if(resolve(out)===resolve(root)||!resolve(out).startsWith(resolve(root)+'/'))throw new Error('QA output must be an isolated child directory');
  const target=join(out,'__photo-studio-qa');rmSync(target,{recursive:true,force:true});
  if(environment!=='preview')return false;
  const sources=[['tests/photo-studio/browser-qa.html','index.html'],['tests/fixtures/photo-studio/room.jpg','room.jpg'],['tests/fixtures/photo-studio/no-floor.jpg','no-floor.jpg'],['tests/fixtures/photo-studio/NOTICE.md','NOTICE.md']];
  if(sources.some(([source])=>!existsSync(join(root,source))))return false;
  mkdirSync(target,{recursive:true});for(const [source,destination] of sources)cpSync(join(root,source),join(target,destination));
  return true;
}

// Dedicated preview build: do not alter the existing production/workspace builds.
export function preparePhotoStudioCatalogue({root}={}){
  const catalogue=generate({root});
  const missing=catalogue.products.filter(product=>!product.sameOriginTextures);
  if(missing.length)throw new Error(`Photo Studio: ${missing.length} variante(s) sans textures locales vérifiées (${missing.slice(0,5).map(product=>product.id).join(', ')}). Préparez le miroir avec scripts/cache-photo-studio-textures.py puis relancez le build.`);
  return catalogue;
}

export async function buildPhotoStudioSite(){
  preparePhotoStudioCatalogue();
  await fetchPhotoStudioModel();
  const manifest=await buildPublicSite();
  copyPhotoStudioPreviewQa();
  return manifest;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildPhotoStudioSite();
