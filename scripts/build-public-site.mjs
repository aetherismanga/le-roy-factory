import {cpSync,existsSync,mkdirSync,readdirSync,readFileSync,rmSync,statSync,writeFileSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

// Publish public application inputs, never the repository or nested servers.
export const PUBLIC_TREES=['assets','data','nuage-nomade','review-studio/assets','shared/lrf-3d'];
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const OUT=join(ROOT,'public-site');
const ROOT_FILE=/\.(?:html|png|jpe?g|webp|svg|ico|webmanifest)$/i;
const ROOT_NAMES=new Set(['robots.txt','sitemap.xml','sw.js','suite-version.json','CNAME']);
const FORBIDDEN=/(?:^|\/)(?:node_modules|server|functions|reports|scripts|tests|tools|qa|\.git)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|(?:purchase|private)[^/]*\.json$/i;
export function allowedPublicPath(path){return !FORBIDDEN.test(path);}

export async function buildPublicSite({root=ROOT,out=OUT}={}){
  if(resolve(out)===resolve(root)||!resolve(out).startsWith(resolve(root)+'/'))throw Error('Output must be an isolated child directory');
  rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
  const files=[];
  function copyFile(path){
    if(!allowedPublicPath(path))return;
    const source=join(root,path),target=join(out,path);mkdirSync(dirname(target),{recursive:true});cpSync(source,target);files.push(path);
  }
  function copyTree(path){
    if(!existsSync(join(root,path))||!allowedPublicPath(path))return;
    for(const item of readdirSync(join(root,path),{withFileTypes:true})){
      const next=path+'/'+item.name;
      if(item.isSymbolicLink())continue;
      if(item.isDirectory())copyTree(next);else if(item.isFile())copyFile(next);
    }
  }
  for(const item of readdirSync(root,{withFileTypes:true}))if(item.isFile()&&(ROOT_FILE.test(item.name)||ROOT_NAMES.has(item.name)))copyFile(item.name);
  for(const path of PUBLIC_TREES)copyTree(path);

  // The security helper replaces public purchase values with null and retains
  // their agent-only representation in an encrypted server asset.
  const helper=join(root,'scripts/public-agent-tariffs.mjs');
  if(existsSync(helper)){
    const mod=await import(helper);
    if(typeof mod.preparePublicAgentTariffs!=='function')throw Error('Agent tariffs publication contract missing');
    await mod.preparePublicAgentTariffs({root,out,files});
  }
  if(files.some(path=>!allowedPublicPath(path)))throw Error('Private file included in public output');
  const release=existsSync(join(root,'suite-version.json'))?JSON.parse(readFileSync(join(root,'suite-version.json'),'utf8')):{};
  const manifest={...release,schema:'lrf-public-release',version:1,sourceRevision:process.env.LRF_RELEASE_SHA||process.env.VERCEL_GIT_COMMIT_SHA||'local',files:files.length,catalogueHash:createHash('sha256').update(readFileSync(join(root,'shared/lrf-3d/manufacturer-surfaces.json'))).digest('hex')};
  writeFileSync(join(out,'suite-version.json'),JSON.stringify(manifest));
  console.log(JSON.stringify({publicFiles:files.length,output:relative(root,out),privateTreesExcluded:true}));
  return manifest;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildPublicSite();
