export const RANDAL_RETURN_URL='https://leroyfactory.fr/configurateurs-randal.html';
export function returnToRandal(){if(parent!==window){try{const origin=new URL(document.referrer).origin;if(['https://leroyfactory.fr','https://www.leroyfactory.fr'].includes(origin)){parent.postMessage({type:'lrf-configurator-exit'},origin);return;}}catch{}}try{window.top.location.href=RANDAL_RETURN_URL;}catch{window.location.assign(RANDAL_RETURN_URL);}}
export function createProjectNavigation({getProject,save}){
 async function request(action){dispatchEvent(new Event('lrf-project-checkpoint'));await window.LRF_PROJECT_WORKSPACE?.flush();action();return true;}
 const quit=document.querySelector('#quit-configurator');if(quit)quit.onclick=e=>{e.preventDefault();request(returnToRandal);};return {request};
}
