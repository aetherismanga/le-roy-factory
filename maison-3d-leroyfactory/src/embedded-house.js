const origins=new Set(['https://studio-one-beta-test-v2.vercel.app','https://randal-catalogue-general-3d.vercel.app']);
export const embedded=typeof window!=='undefined'&&typeof location!=='undefined'&&new URLSearchParams(location.search).get('workspace')==='1'&&parent!==window;
let parentOrigin='',readOnly=false;try{const o=new URL(document.referrer).origin;if(origins.has(o))parentOrigin=o;}catch{}
export async function initialHouseProject(){if(!embedded||!parentOrigin)return null;return new Promise(resolve=>{const receive=e=>{if(e.source!==parent||e.origin!==parentOrigin||e.data?.type!=='lrf-house-init')return;removeEventListener('message',receive);readOnly=!!e.data.readOnly;document.body.classList.toggle('house-readonly',readOnly);resolve(e.data.project||{templateRequest:e.data.template||'villa-pool'});};addEventListener('message',receive);parent.postMessage({type:'lrf-house-bootstrap-ready'},parentOrigin);});}
export function notifyParentProject(project){if(embedded&&parentOrigin&&!readOnly)parent.postMessage({type:'lrf-house-checkpoint',project:structuredClone(project)},parentOrigin);}
export function bindEmbeddedHouse({getProject,replaceProject,setReadOnly}){if(!embedded||!parentOrigin)return;
 document.body.classList.add('house-embedded');setReadOnly(readOnly);
 addEventListener('message',async e=>{if(e.source!==parent||e.origin!==parentOrigin)return;const d=e.data;if(d?.type==='lrf-house-open'){readOnly=!!d.readOnly;setReadOnly(readOnly);await replaceProject(d.project);notifyParentProject(getProject());}else if(d?.type==='lrf-house-meta'&&!readOnly){const p=getProject();p.name=String(d.name||p.name).slice(0,120);p.client=String(d.client||'').slice(0,160);notifyParentProject(p);}else if(d?.type==='lrf-house-lock'){readOnly=!!d.readOnly;setReadOnly(readOnly);}else if(d?.type==='lrf-house-flush')notifyParentProject(getProject());});
 parent.postMessage({type:'lrf-house-ready'},parentOrigin);notifyParentProject(getProject());
 document.addEventListener('keydown',e=>{if(readOnly&&['Delete','Backspace'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();}},true);
}
