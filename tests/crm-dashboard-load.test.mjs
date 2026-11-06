import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { clientActivity } from '../assets/js/client-activity-core.mjs';
import { readFile } from 'node:fs/promises';

async function dashboardSandbox(){
  const source=(await readFile(new URL('../assets/js/dashboard-commercial.js',import.meta.url),'utf8'))
    .replace(/^import .*;\s*$/gm,'')
    .replace(/^if\(document\.readyState[\s\S]*$/m,'');
  const context=vm.createContext({clientActivity,setTimeout,clearTimeout,console:{error(){},warn(){}}});
  vm.runInContext(`
    const auth={currentUser:null};
    const db={};const PARTNER_CONTACTS={};
    const listeners={};
    const window={
      addEventListener(name,callback){(listeners[name]??=new Set()).add(callback)},
      removeEventListener(name,callback){listeners[name]?.delete(callback)}
    };
    const getAgentProfile=user=>user?.email==='jerome@leroyfactory.fr'?{email:user.email}:null;
    const localStorage={getItem(){return null}};
    let reads=0,failReads=false;
    function collection(database,name){return name}
    async function getDocs(name){
      reads++;if(failReads)throw new Error('unavailable');
      return name==='clients'?[{id:'real-id',data(){return {id:'untrusted-field',societe:'Magasin',type:'client'}}}]:[];
    }
    const hosts=Object.fromEntries(['dash-alert','dash-kpis','dash-my-tours','dash-today-list','dash-activities','dash-state'].map(id=>[id,{textContent:'',innerHTML:'unchanged'}]));
    const document={getElementById(id){return hosts[id]||null}};
    ${source}
  `,context);
  return code=>vm.runInContext(code,context);
}

test('dashboard waits for delayed Firebase agent restoration before any collection read',async()=>{
  const run=await dashboardSandbox();
  const pending=run('loadDashboardData()');
  assert.equal(run('reads'),0);
  run(`auth.currentUser={email:'jerome@leroyfactory.fr'};for(const callback of listeners['lrf-agent-auth-ready'])callback();`);
  const result=await pending;
  assert.equal(run('reads'),3);
  assert.equal(result[0][0].id,'real-id');
  assert.equal(run(`listeners['lrf-agent-auth-ready'].size`),0);
});

test('a failed dashboard read shows retry and never substitutes zero counts; retry loads real data',async()=>{
  const run=await dashboardSandbox();
  await run(`auth.currentUser={email:'jerome@leroyfactory.fr'};failReads=true;reloadDashboard()`);
  assert.match(run(`hosts['dash-alert'].innerHTML`),/Impossible de charger/);
  assert.match(run(`hosts['dash-alert'].innerHTML`),/Réessayer/);
  assert.equal(run(`hosts['dash-kpis'].innerHTML`),'unchanged');
  assert.equal(run('dashboardLoaded'),false);
  await run('failReads=false;reloadDashboard()');
  assert.equal(run('dashboardLoaded'),true);
  assert.equal(run('dashboardLoadFailed'),false);
  assert.match(run(`hosts['dash-kpis'].innerHTML`),/dash-kpi-value[^>]*>1</);
});
