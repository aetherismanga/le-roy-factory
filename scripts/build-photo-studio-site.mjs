import {fetchPhotoStudioModel} from './fetch-photo-studio-model.mjs';
import {buildPublicSite} from './build-public-site.mjs';
import {generate} from './build-photo-studio-catalogue.mjs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

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
  return buildPublicSite();
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildPhotoStudioSite();
