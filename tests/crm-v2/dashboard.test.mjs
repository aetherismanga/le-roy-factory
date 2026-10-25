import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const moduleSource = (await readFile(new URL('../../assets/js/crm-v2-dashboard.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
const NOW = Date.parse('2026-10-25T12:00:00Z');
class Clock extends Date {
  constructor(...args) { super(...(args.length ? args : [NOW])); }
  static now() { return NOW; }
}
const ago = days => new Date(NOW-days*86400000).toISOString();
const today = `${new Clock().getFullYear()}-${String(new Clock().getMonth()+1).padStart(2,'0')}-${String(new Clock().getDate()).padStart(2,'0')}`;
const emptyModel = () => ({clients:[],tours:[],events:[],requests:[]});
function setup({snapshots={},reject=[]}={}) {
  const nodes=new Map(),reads=[];
  const element=id=>{
    if(!nodes.has(id))nodes.set(id,{textContent:'',innerHTML:'',hidden:false,value:'',setAttribute(name,value){this[name]=value;}});
    return nodes.get(id);
  };
  const context={
    document:{getElementById:element,readyState:'loading',addEventListener(){}},
    Date:Clock,db:{},collection:(_db,name)=>({name}),
    getDocs:async({name})=>{
      reads.push(name);if(reject.includes(name))throw new Error('Fixture inaccessible');
      return {forEach:callback=>(snapshots[name]||[]).forEach(row=>callback({id:row.id,data:()=>row.data}))};
    },
    console:{warn(){}},window:{addEventListener(){}},setInterval,clearInterval,
  };
  vm.runInNewContext(moduleSource+`\nthis.harness={
    render(data){model=data;render()},search,showAgent,read,
    setPartners(data){partners=data},getModel(){return model}
  };`,context);
  return {...context.harness,element,reads};
}

test('dashboard derives all six KPIs from active records and dated activities',()=>{
  const ui=setup(),data=emptyModel();
  data.clients=[
    {id:'client-1',societe:'Client fictif',type:'client',dernierEchange:ago(61)},
    {id:'client-2',societe:'Autre client fictif',type:'client',comptesRendus:[{date:ago(2),type:'Visite'}],historiqueMails:[{date:ago(3),subject:'Suivi'}]},
    {id:'prospect',societe:'Prospect fictif',type:'prospect'},
    {id:'archived',type:'client',archived:true,comptes_rendus:[{date:ago(1)}]},
    {id:'legacy-archive',type:'prospect',archive:true},
  ];
  data.tours=[{id:'tour-1',days:[{date:today,stops:[]}]}];
  data.events=[{id:'today',title:'Rendez-vous fictif',start:today+'T10:00:00'},{id:'old',start:ago(5)}];
  ui.render(data);
  const counts=['clients','prospects','events','tours','followups','activities'].map(key=>ui.element('v2-count-'+key).textContent);
  assert.deepEqual(counts,['2','1','1','1','1','2']);
  assert.match(ui.element('v2-followups').innerHTML,/client-1/);
  assert.doesNotMatch(ui.element('v2-activity').innerHTML,/archived/);
});

test('a recent report supersedes an old contact; missing dates do not invent relances',()=>{
  const ui=setup(),data=emptyModel();
  data.clients=[
    {id:'recent-report',type:'client',dernierEchange:ago(100),comptes_rendus:[{date:ago(1)}]},
    {id:'unknown',type:'client'},
    {id:'boundary',type:'client',lastContact:ago(60)},
    {id:'overdue',type:'client',lastContact:ago(91)},
  ];
  ui.render(data);
  assert.equal(ui.element('v2-count-followups').textContent,'1');
  assert.match(ui.element('v2-followups').innerHTML,/overdue/);
  assert.doesNotMatch(ui.element('v2-followups').innerHTML,/recent-report|unknown|boundary/);
});

test('only explicitly pending reports appear, supporting both historic array names',()=>{
  const ui=setup(),data=emptyModel();
  data.clients=[
    {id:'exact/id',type:'client',societe:'A <client>',comptes_rendus:[{status:'draft',type:'Visite'},{statut:'Validé',type:'Rapport terminé'}]},
    {id:'legacy',type:'client',societe:'Client historique',comptesRendus:[{statut:'À finaliser',type:'Suivi'}]},
    {id:'no-status',type:'client',comptes_rendus:[{type:'Compte-rendu sans statut'}]},
  ];
  ui.render(data);const html=ui.element('v2-pending-reports').innerHTML;
  assert.match(html,/client=exact%2Fid/);assert.match(html,/A &lt;client&gt;/);
  assert.match(html,/client=legacy/);assert.doesNotMatch(html,/Rapport terminé|no-status/);
});

test('next tour handles multi-day and legacy schemas and ignores past visits',()=>{
  const ui=setup(),data=emptyModel();
  data.tours=[
    {id:'past',date:'2026-10-01',stops:[]},
    {id:'later',days:[{date:'2026-11-01',stops:[]}]},
    {id:'current/id',name:'Tournée fictive',days:[{date:today,stops:[{societe:'Visite fictive',arrival:'10:30'}]}]},
  ];
  ui.render(data);
  assert.match(ui.element('v2-next-tour').innerHTML,/view=current%2Fid/);
  assert.match(ui.element('v2-next-tour').innerHTML,/Visite fictive 10:30/);
  data.tours=[{id:'legacy-tour',date:today,stops:[{societe:'Visite ancienne structure'}]}];ui.render(data);
  assert.match(ui.element('v2-next-tour').innerHTML,/view=legacy-tour/);
});

test('global search finds normalized codes, contacts, manufacturers and report text with exact IDs',()=>{
  const ui=setup(),data=emptyModel();
  data.clients=[{id:'firestore/id',type:'client',societe:'Société fictive',codeClient:'LRF-042',contacts:[{name:'Élodie Démo'}],comptes_rendus:[{resume:'Prévoir échantillon ivoire'}]}];
  ui.setPartners({'Partenaire Démonstration':{contacts:[{name:'Contact Usine Test',email:'fixture@example.invalid'}]}});
  ui.render(data);
  for(const query of ['lrf-042','elodie demo']){ui.element('crm-global-search').value=query;ui.search();assert.match(ui.element('crm-global-results').innerHTML,/clients.html\?edit=firestore%2Fid/);}
  ui.element('crm-global-search').value='echantillon ivoire';ui.search();assert.match(ui.element('crm-global-results').innerHTML,/comptes-rendus.html\?client=firestore%2Fid/);
  ui.element('crm-global-search').value='usine test';ui.search();assert.match(ui.element('crm-global-results').innerHTML,/contacts-partenaires.html/);
  ui.element('crm-global-search').value='partenaire demonstration';ui.search();assert.match(ui.element('crm-global-results').innerHTML,/Partenaire Démonstration/);
  ui.element('crm-global-search').value='x';ui.search();assert.equal(ui.element('crm-global-results').hidden,true);
});

test('collection reads preserve Firestore identity over stale imported id fields',async()=>{
  const ui=setup({snapshots:{clients:[{id:'correct-firestore-id',data:{id:'obsolete-import-id',societe:'Fixture'}}]}});
  const rows=await ui.read('clients');assert.equal(rows[0].id,'correct-firestore-id');
  assert.deepEqual(ui.reads,['clients']);
});

test('failed collections show unavailable indicators and recoverable messages, never fabricated zeroes',async()=>{
  const ui=setup({reject:['clients','agenda_events']});
  await ui.read('clients');await ui.read('agenda_events');ui.render(emptyModel());
  assert.equal(ui.element('v2-count-clients').textContent,'—');
  assert.equal(ui.element('v2-count-events').textContent,'—');
  assert.equal(ui.element('v2-data-status').hidden,false);
  assert.match(ui.element('v2-data-status').textContent,/Actualiser/);
  assert.match(ui.element('v2-today').innerHTML,/indisponible/);
});

test('header uses supplied authenticated profile only and clears names on account changes',()=>{
  const ui=setup();ui.showAgent({uid:'jerome-fixture',name:'Jérôme Démo'});
  assert.equal(ui.element('welcome-title').textContent,'Bonjour Jérôme');
  ui.showAgent({uid:'coryne-fixture',name:'Coryne Démo'});assert.equal(ui.element('welcome-title').textContent,'Bonjour Coryne');
  ui.showAgent({uid:'unnamed'});assert.equal(ui.element('welcome-title').textContent,'Bonjour');
  assert.equal(ui.element('v2-profile-name').textContent,'Mon profil');
});
