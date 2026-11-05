import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAddress, addressKey, department, coordsFinite, geocodeCandidate, communeCandidate, validateStoredLocation, isUnvisitedProspect } from '../assets/js/crm-map-location.mjs';

const address={adresse:'4 rue Louis Bréguet',codePostal:'34830',ville:'Jacou'};
const feature=(changes={},coordinates=[3.901625,43.658389])=>({type:'Feature',geometry:{type:'Point',coordinates},properties:{postcode:'34830',city:'Jacou',depcode:'34',type:'housenumber',score:.96,label:'4 Rue Louis Breguet 34830 Jacou',...changes}});
function validated(client=address,point=geocodeCandidate(feature(),address)){
 return {...client,lat:point.lat,lon:point.lon,geoStatus:'validated',geoValidation:{...point,version:2,addressKey:addressKey(client),checkedAt:'2026-11-05'}};
}
test('postcode-city inversion and leading zero normalize without mutating a client',()=>{
 const original={adresse:' 4  rue Louis Breguet ',codePostal:'Jacou',ville:'34830'};
 assert.deepEqual(normalizeAddress(original),{adresse:'4 rue Louis Breguet',cp:'34830',ville:'Jacou'});
 assert.equal(original.codePostal,'Jacou');
 assert.equal(normalizeAddress({codePostal:6000,ville:'Nice'}).cp,'06000');
 assert.equal(addressKey(original),addressKey(address));
 assert.equal(department('06000','Nice'),'06');assert.equal(department('48000','Mende'),'48');
 assert.equal(department('20000','Ajaccio'),'2A');assert.equal(department('20200','Bastia'),'2B');
 assert.equal(department('98000','Monaco'),'98');assert.equal(department('',''),'');
});
test('a valid coordinate pair cannot silently retain an unverified historical point',()=>{
 assert.deepEqual(coordsFinite({latitude:'43.658389',longitude:'3.901625'}),{lat:43.658389,lon:3.901625});
 for(const input of [{},{lat:null,lon:null},{lat:'',lon:''},{lat:91,lon:3},{lat:43,lon:181}])assert.equal(coordsFinite(input),null);
 assert.equal(validateStoredLocation({...address,lat:48.85,lon:2.35}),null);
 assert.deepEqual(validateStoredLocation(validated()),{lat:43.658389,lon:3.901625});
 assert.equal(validateStoredLocation({...validated(),lat:48.85,lon:2.35}),null,'Paris cannot reuse the Jacou validation proof');
 assert.equal(validateStoredLocation({...validated(),lat:43.7,lon:3.9}),null,'even a moved point inside Hérault needs its own coordinate proof');
 assert.equal(validateStoredLocation({...validated(),geoValidation:{...validated().geoValidation,lat:null,lon:null}}),null,'the validation proof must include the actual coordinate pair');
 assert.equal(validateStoredLocation({...validated(),codePostal:'06800',ville:'Cagnes-sur-Mer'}),null,'changed address invalidates provenance');
 assert.equal(validateStoredLocation({...validated(),geoStatus:'needs_review'}),null);
 assert.equal(validateStoredLocation({...validated(),geoValidation:{...validated().geoValidation,department:'06'}}),null);
});
test('geocoding never accepts the first unrelated commune or postcode',()=>{
 assert.ok(geocodeCandidate(feature(),address));
 assert.equal(geocodeCandidate(feature({postcode:'75004',city:'Paris',depcode:'75'}),address),null);
 assert.equal(geocodeCandidate(feature({city:'Le Crès'}),address),null);
 assert.equal(geocodeCandidate(feature({depcode:'06'}),address),null);
 assert.equal(geocodeCandidate(feature({score:.4}),address),null);
 assert.equal(geocodeCandidate(feature({},[2.35,48.85]),address),null);
 assert.equal(geocodeCandidate(feature(),{adresse:'ZI'}),null,'generic unlocated addresses are never sufficient');
 assert.equal(geocodeCandidate(feature({type:'poi'}),address),null);
});
test('commune fallback is explicit and still constrained to both postcode and city',()=>{
 const point=geocodeCandidate(feature({type:'municipality',score:.65}),address);
 assert.equal(point.precision,'municipality');
 assert.equal(geocodeCandidate(feature({type:'municipality',score:.59}),address),null);
 assert.equal(geocodeCandidate(feature({type:'municipality',city:'Paris'}),address),null);
 assert.ok(geocodeCandidate(feature({city:'Saint-Laurent-du-Var',postcode:'06700',depcode:'06'},[7.18,43.67]),{codePostal:'06700',ville:'St Laurent du Var Cedex'}));
});
test('red pins represent unvisited prospects with no assigned code',()=>{
 const prospect={type:'prospect',visiteStatus:'non_visite',nonVisite:true,codeClient:'',codeLRF:''};
 assert.equal(isUnvisitedProspect(prospect),true);
 assert.equal(isUnvisitedProspect({...prospect,type:'client'}),false);
 assert.equal(isUnvisitedProspect({...prospect,nonVisite:false,visiteStatus:'visite'}),false);
 assert.equal(isUnvisitedProspect({...prospect,codeClient:'LRF-00317'}),false);
 assert.equal(isUnvisitedProspect({...prospect,codesLRF:['LRF-00317']}),false);
 assert.equal(isUnvisitedProspect({...prospect,code_lrf:'LRF-00317'}),false);
});

test('map renders validated unvisited shops in red and lists untrusted addresses for review',async()=>{
 const {readFileSync}=await import('node:fs');const vm=await import('node:vm');
 const {activeMapClient,mapText,mapPhone}=await import('../assets/js/crm-map-core.mjs');
 const html=readFileSync(new URL('../carte.html',import.meta.url),'utf8');
 const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^    import .*;$/gm,'');
 const fields=new Map();const element=id=>{
   if(!fields.has(id))fields.set(id,{textContent:'',innerHTML:'',style:{},value:'',classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){}});
   return fields.get(id);
 };
 const layers=[];let onClients;const ready=[];const listeners=new Map();
 const map={setView(){return this},invalidateSize(){},fitBounds(){}};
 const context=vm.createContext({
   document:{addEventListener:(event,callback)=>{if(event==='DOMContentLoaded')ready.push(callback)},getElementById:element,querySelectorAll:()=>[]},
   window:{location:{href:''},addEventListener:(event,callback)=>listeners.set(event,callback)},
   localStorage:{getItem:key=>key==='agentLoggedIn'?'true':'Jérôme'},
   L:{map:()=>map,tileLayer:()=>({addTo(){}}),layerGroup:()=>({addTo(){return this},clearLayers(){layers.length=0},addLayer(marker){layers.push(marker)}}),divIcon:options=>options,marker:(coords,options)=>({coords,options,bindPopup(html){this.popup=html}})},
   normalizeAddress,addressKey,department,geocodeCandidate,communeCandidate,validateStoredLocation,isUnvisitedProspect,
   activeMapClient,mapText,mapPhone,db:{},collection:()=>({}),onSnapshot:(_collection,callback)=>{onClients=callback},
   setInterval(){},setTimeout(){},requestAnimationFrame(){},console,URL,Date,encodeURIComponent
 });
 vm.runInContext(source,context);ready[0]();
 const red={...validated(),societe:'Négoce <test>',type:'prospect',nonVisite:true,visiteStatus:'non_visite',telephone:'04 00 00 00 00',website:'javascript:alert(1)',sources:['https://example.com/contact']};
 const legacy={...address,societe:'Ancienne adresse',type:'client',lat:48.8,lon:2.3,geoStatus:'needs_review'};
 onClients({forEach:callback=>[red,legacy].forEach((data,i)=>callback({id:String(i),data:()=>data}))});
 assert.equal(layers.length,1);assert.equal(layers[0].options.icon.className,'custom-pin-red');
 assert.equal(layers[0].__lrfClientType,'unvisited');
 assert.match(layers[0].popup,/Non visité · sans code LRF/);assert.match(layers[0].popup,/Négoce &lt;test&gt;/);
 assert.doesNotMatch(layers[0].popup,/javascript:/);assert.match(layers[0].popup,/tel:0400000000/);
 assert.equal(element('map-address-review').style.display,'block');
 assert.match(element('map-address-review-list').innerHTML,/Ancienne adresse/);
 assert.match(element('map-address-review-title').textContent,/\(1\)/);
 context.window.__lrfCarteLayerVisibility={clients:true,prospects:true,unvisited:false};listeners.get('lrf-map-layer-filter')();
 assert.equal(layers.length,0,'hiding red shops removes them from the actual map and proximity results');
});

test('IGN Corsican municipality results retain 2A and 2B with their actual coordinates',()=>{
 const ajaccio={codePostal:'20000',ville:'Ajaccio'},bastia={codePostal:'20200',ville:'Bastia'};
 const south=geocodeCandidate(feature({postcode:'20000',city:'Ajaccio',citycode:'2A004',depcode:'2A',type:'municipality',score:.95},[8.715325,41.93368]),ajaccio);
 const north=geocodeCandidate(feature({postcode:'20200',city:'Bastia',citycode:'2B033',depcode:'2B',type:'municipality',score:.95},[9.435179,42.687608]),bastia);
 assert.equal(south.department,'2A');assert.equal(north.department,'2B');
 assert.ok(validateStoredLocation(validated(ajaccio,south)));assert.ok(validateStoredLocation(validated(bastia,north)));
});

test('queued geocoding writes only fresh coordinates and never overwrites an edited or archived client',async()=>{
 const {readFileSync}=await import('node:fs');const vm=await import('node:vm');
 const {activeMapClient}=await import('../assets/js/crm-map-core.mjs');
 const html=readFileSync(new URL('../carte.html',import.meta.url),'utf8');
 const source=html.slice(html.indexOf('      // A single queue'),html.indexOf('    });\n  </script>'));
 for(const current of [{...address,societe:'Current name',telephone:'new phone'},{...address,ville:'Montpellier'},{...address,archived:true}]){
  const writes=[];
  const context=vm.createContext({geocodingPending:new Set(),geocodingFailed:new Set(),geocodeQueue:Promise.resolve(),lastGeocodeRequest:0,
    addressKey,geocodeCandidate,communeCandidate,validateStoredLocation,activeMapClient,db:{},doc:()=>({}),
    fetch:async()=>({ok:true,json:async()=>({features:[feature()]})}),URL,AbortSignal,Date,encodeURIComponent,
    runTransaction:async(_db,callback)=>callback({get:async()=>({exists:()=>true,data:()=>current}),update:(_ref,patch)=>writes.push(patch)}),
    console,setTimeout:callback=>callback(),item:{...address,id:'test'}
  });
  vm.runInContext(source,context);vm.runInContext('geocodeInBackground([item])',context);await vm.runInContext('geocodeQueue',context);
  if(current.ville!=='Jacou'||current.archived){assert.equal(writes.length,0);continue;}
  assert.equal(writes.length,1);assert.equal(writes[0].lat,43.658389);assert.equal(writes[0].geoValidation.lat,writes[0].lat);
  assert.equal(writes[0].geoValidation.addressKey,addressKey(current));
  assert.equal('societe' in writes[0],false);assert.equal('telephone' in writes[0],false);assert.equal('codeClient' in writes[0],false);
 }
});

test('official commune fallback supports every listed postal code without accepting a different town',()=>{
 const client={adresse:'Zone artisanale',codePostal:'66100',ville:'Perpignan'};
 const commune={nom:'Perpignan',code:'66136',codesPostaux:['66000','66100'],centre:{coordinates:[2.9045,42.699]},codeDepartement:'66'};
 const position=communeCandidate(commune,client);
 assert.equal(position.precision,'municipality');assert.equal(position.source,'geo.api.gouv.fr');
 assert.deepEqual(validateStoredLocation(validated(client,position)),{lat:42.699,lon:2.9045});
 assert.ok(communeCandidate(commune,{...client,codePostal:'66000'}));
 assert.equal(communeCandidate(commune,{...client,codePostal:'66200'}),null,'postcode must be officially listed');
 assert.equal(communeCandidate({...commune,nom:'Autre commune'},client),null,'same postcode does not identify the right town');
 assert.equal(communeCandidate({...commune,codeDepartement:'34'},client),null);
 assert.equal(communeCandidate({...commune,centre:{coordinates:[2.35,48.85]}},client),null);
 assert.equal(communeCandidate({...commune,nom:'Prinsuéjols-Malbouzon'}, {...client,ville:'Malbouzon'}),null,'merged communes require explicit alias evidence');
});

test('marking a shop as visited changes only visit flags after reading the current active prospect',async()=>{
 const {readFileSync}=await import('node:fs');const vm=await import('node:vm');
 const {activeMapClient}=await import('../assets/js/crm-map-core.mjs');
 const html=readFileSync(new URL('../carte.html',import.meta.url),'utf8');
 const start=html.indexOf('      async function markClientVisited(clientId)');
 const source=html.slice(start,html.indexOf("      document.addEventListener('click',async event=>{",start));
 const original={societe:'Négoce',type:'prospect',nonVisite:true,visiteStatus:'non_visite',autoAssignLrfCode:false,codeClient:'',codeLRF:'',comptes_rendus:[]};
 for(const current of [original,{...original,archived:true},{...original,codeClient:'LRF-00123'},{...original,nonVisite:false,visiteStatus:'visite'},null]){
  const writes=[];
  const context=vm.createContext({isUnvisitedProspect,activeMapClient,Date,db:{},doc:(_db,name,id)=>({name,id}),
    runTransaction:async(_db,callback)=>callback({get:async()=>({exists:()=>current!==null,data:()=>current}),update:(ref,patch)=>writes.push({ref,patch})})});
  vm.runInContext(source,context);
  const result=await vm.runInContext("markClientVisited('shop-1')",context);
  if(current!==original){assert.equal(result,false);assert.equal(writes.length,0);continue;}
  assert.equal(result,true);assert.equal(writes.length,1);
  assert.deepEqual(Object.keys(writes[0].patch).sort(),['autoAssignLrfCode','nonVisite','visiteStatus','visitedAt']);
  assert.equal(writes[0].patch.nonVisite,false);assert.equal(writes[0].patch.visiteStatus,'visite');assert.equal(writes[0].patch.autoAssignLrfCode,true);
  assert.ok(Number.isFinite(Date.parse(writes[0].patch.visitedAt)));
  assert.equal(isUnvisitedProspect({...original,...writes[0].patch}),false);
  assert.equal(original.comptes_rendus.length,0);assert.equal(original.codeClient,'');
 }
});
