import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const ALL=['site','studio-one','randal-general'];
export function affectedApplications(paths){
  const affected=new Set();
  for(const value of paths){
    const path=value.replaceAll('\\','/');
    if(!path||/^(?:reports|tests|\.github)\//.test(path)||/\.(?:md|log)$/i.test(path))continue;
    if(path.startsWith('shared/')||/^package(?:-lock)?\.json$/.test(path)){for(const app of ALL)affected.add(app);continue;}
    if(path.startsWith('studio-one/')){affected.add('studio-one');continue;}
    if(path.startsWith('randal-general/')){affected.add('randal-general');continue;}
    if(path.startsWith('scripts/')){if(path.startsWith('scripts/build-public-site')||path.startsWith('scripts/public-agent-tariffs'))affected.add('site');continue;}
    if(/^(?:assets|data|api|server|nuage-nomade|review-studio\/assets)\//.test(path)||!path.includes('/'))affected.add('site');
  }
  return ALL.filter(app=>affected.has(app));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const base=process.argv[2],head=process.argv[3]||'HEAD';
  if(!base||![base,head].every(value=>/^[A-Za-z0-9_./-]+$/.test(value)&&!value.startsWith('-')))throw Error('Usage: node scripts/release-impact.mjs BASE [HEAD]');
  const paths=execFileSync('git',['diff','--name-only','--diff-filter=ACDMRTUXB',base,head],{encoding:'utf8'}).trim().split('\n');
  console.log(JSON.stringify({base,head,applications:affectedApplications(paths),changedFiles:paths.filter(Boolean).length}));
}
