import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {setLocale} from '../i18n/index.js';
import {publicCompositionURL} from '../public-composition-routes.js';
for(const locale of ['fr','es']){
 setLocale(locale);
 for(const variant of ['studio-one','randal-general']){
  const url=new URL(publicCompositionURL({variant,id:'lrf-public-example'},'copy'));
  assert.equal(url.searchParams.get('lang'),locale);assert.equal(url.searchParams.get('composition'),'lrf-public-example');assert.equal(url.searchParams.get('compositionMode'),'copy');assert.equal(url.searchParams.get('page'),'atelier.html');
 }
}
const root=new URL('../../../',import.meta.url),helper=readFileSync(new URL('assets/js/lrf-configurator-language.js',root),'utf8'),KEY='lrf-ui-language-v1';
const wrappers=['studio-one-configurateur.html','randal-configurateur.html'];
function site(url,values=new Map(),anchors=[]){
 const listeners=new Map(),nodes=new Map(),location=new URL(url),node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,style:{},contentWindow:{postMessage(){}},addEventListener(){}});return nodes.get(id);};
 const context={URL,URLSearchParams,location,document:{readyState:'complete',getElementById:node,querySelectorAll:()=>anchors,addEventListener(){}},localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))},history:{state:null,replaceState(state,title,href){location.href=href;this.state=state;}},innerHeight:900,getComputedStyle:()=>({getPropertyValue:()=> '0'}),requestAnimationFrame(){},visualViewport:null,addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},removeEventListener(type,fn){listeners.set(type,(listeners.get(type)||[]).filter(f=>f!==fn));}};
 context.window=context;runInNewContext(helper,context);
 return {context,values,nodes,node,send:event=>{for(const fn of listeners.get('message')||[])fn(event);},runWrapper(file){const html=readFileSync(new URL(file,root),'utf8'),script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];runInNewContext(script,context);const frame=node(file.startsWith('studio')?'studio-one':'randal-general');assert.equal(frame.src,node('direct-open').href);return frame;}};
}
function anchor(href){return {href,getAttribute(name){return name==='href'?this.href:null;},hasAttribute(){return false;}};}
for(const file of wrappers){
 for(const locale of ['fr','es','en','javascript:alert(1)','es&demo=randal','']){
  const instance=site('https://leroyfactory.fr/'+file+'?page=atelier.html&composition=lrf-example&lang='+encodeURIComponent(locale)+'#projet=test'),frame=instance.runWrapper(file),url=new URL(frame.src);
  assert.equal(url.searchParams.get('lang'),['fr','es'].includes(locale)?locale:'fr');assert.equal(url.searchParams.get('composition'),'lrf-example');assert.equal(url.pathname,'/atelier.html');assert.equal(url.hash,'#projet=test');assert.equal(url.searchParams.get('demo'),null);
 }
 const instance=site('https://leroyfactory.fr/'+file,new Map([[KEY,'fr']])),frame=instance.runWrapper(file),source=frame.contentWindow,origin=new URL(frame.src).origin,before=frame.src;
 for(const event of [{origin:'https://hostile.invalid',source,data:{type:'lrf-ui-language',locale:'es'}},{origin,source:{},data:{type:'lrf-ui-language',locale:'es'}},{origin,source,data:{type:'lrf-ui-language',locale:'en'}},{origin,source,data:{type:'lrf-identity',locale:'es'}}]){instance.send(event);assert.equal(instance.values.get(KEY),'fr');}
 instance.send({origin,source,data:{type:'lrf-ui-language',locale:'es'}});assert.equal(instance.values.get(KEY),'es');assert.equal(instance.context.LRF_CONFIGURATOR_LANGUAGE.get(),'es');assert.equal(frame.src,before,'Language notification must never reload the scene');assert.deepEqual([...instance.values.keys()],[KEY]);
 const studioLink=anchor('studio-one-configurateur.html'),generalLink=anchor('randal-configurateur.html'),planLink=anchor('lrf-plan-pose.html'),crmLink=anchor('crm.html');
 const returned=site('https://leroyfactory.fr/configurateurs-randal.html',instance.values,[studioLink,generalLink,planLink,crmLink]);assert.equal(returned.context.LRF_CONFIGURATOR_LANGUAGE.get(),'es');assert.equal(new URL(studioLink.href).searchParams.get('lang'),'es');assert.equal(new URL(generalLink.href).searchParams.get('lang'),'es');assert.equal(planLink.href,'lrf-plan-pose.html');assert.equal(crmLink.href,'crm.html');
 const other=site('https://leroyfactory.fr/'+wrappers.find(f=>f!==file),instance.values),otherFrame=other.runWrapper(wrappers.find(f=>f!==file));assert.equal(new URL(otherFrame.src).searchParams.get('lang'),'es','Returning to the site and entering the other origin retains Spanish');
}
const priority=site('https://www.leroyfactory.fr/index.html?lang=fr',new Map([[KEY,'es']]));assert.equal(priority.context.LRF_CONFIGURATOR_LANGUAGE.get(),'fr');assert.equal(priority.values.get(KEY),'fr');
for(const file of ['index.html','configurateurs-randal.html',...wrappers])assert.match(readFileSync(new URL(file,root),'utf8'),/assets\/js\/lrf-configurator-language\.js\?v=20261025-fr-es1/);
console.log('Locale navigation: public routes, both wrappers, site return, other workshop, URL priority and hostile source/origin rejection OK.');
