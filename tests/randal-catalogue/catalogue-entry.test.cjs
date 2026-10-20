// node tests/randal-catalogue/catalogue-entry.test.cjs
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const data=fs.readFileSync('assets/js/randal-catalogue/data.js','utf8');
const source=fs.readFileSync('assets/js/randal-catalogue/configurator.js','utf8').replace(/\nrender\(\);\n\}\)\(\);\s*$/,'\n})();');
function boot(search='',draft=null){
 const notices=[],storage=new Map(draft?[['lrfRandalV04Draft',JSON.stringify(draft)]]:[]);
 const context={window:{addEventListener(){}},document:{getElementById:()=>({before:el=>notices.push(el.textContent)}),createElement:()=>({setAttribute(){}})},sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},URLSearchParams,location:{search},console};
 vm.createContext(context);vm.runInContext(data,context);vm.runInContext(source,context);return {api:context.window.RandalCatalogue,data:context.window.RandalCatalogueData,notices,storage};
}
const names=boot().data.models.map(([name])=>name);
for(const name of names){
 const {api}=boot('?collection='+encodeURIComponent(name),{model:'Harmony',step:6,maxStep:6,typeId:'three',width:'80',color:'Blanco mate'});
 const state=api.getState();assert.equal(state.model,name);assert.equal(state.step,1);assert.ok(state.maxStep>=1);
 if(name!=='Harmony'){assert.equal(state.typeId,'');assert.equal(state.width,'');}
}
const draft={model:'Luce',typeId:'single',width:'80',height:'40',depth:'45',color:'Verde Utopía',step:3,maxStep:3};
const normal=boot('',draft).api.getState();assert.equal(normal.model,draft.model);assert.equal(normal.step,3);assert.equal(normal.color,draft.color);
const unknown=boot('?collection=Harmony-inventee',draft);assert.equal(unknown.api.getState().model,'');assert.equal(unknown.api.getState().step,0);assert.match(unknown.notices[0],/Collection non disponible à la configuration/);
assert.notEqual(boot('?collection=Aruba').api.getState().model,boot('?collection=Aruba%20rainur%C3%A9').api.getState().model);
assert.equal(boot('?collection=harmony').api.getState().model,'','Pas de correspondance approximative');
console.log(JSON.stringify({status:'PASS',directCollections:names.length,normalDraft:'preserved',unknownCollection:'explicit notice',arubaVariants:'distinct'}));
