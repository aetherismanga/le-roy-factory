import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as packagingAPI from '../assets/js/fenice-packaging.mjs';

const source=readFileSync(new URL('../assets/js/fenice-demande.js',import.meta.url),'utf8').replace("import('./fenice-packaging.mjs?v=20261101-fenice-request3')",'Promise.resolve(PACK_API)');
const html=readFileSync(new URL('../fenice-demande.html',import.meta.url),'utf8');
const packData={entries:[{id:'variant-4',collectionSlug:'variant',kind:'tile',format:'30x90',label:'Standard · 4 pièces',piecesPerBox:4,areaPerBox:1.08,source:{url:'https://lafenicegc.com/catalogue.pdf',page:52}},{id:'variant-5',collectionSlug:'variant',kind:'tile',format:'30x90',label:'Décor · 5 pièces',piecesPerBox:5,areaPerBox:1.35,source:{url:'https://lafenicegc.com/catalogue.pdf',page:52}},{id:'heritage-tile-60',collectionSlug:'heritage',kind:'tile',format:'60x60',piecesPerBox:4,areaPerBox:1.44,source:{url:'https://lafenicegc.com/catalogue.pdf',page:52}},{id:'heritage-plinth-60',collectionSlug:'heritage',kind:'plinth',format:'7,5x60',piecesPerBox:10,linearMetresPerBox:6,source:{url:'https://lafenicegc.com/catalogue.pdf',page:52}}]};
const catalogue={collections:[{slug:'variant',name:'Variant',formats:['30x90'],colors:[],unit:'m²'},{slug:'heritage',name:'Heritage',formats:['60x60','7,5x60'],colors:['Calacatta Cardinale'],unit:'m²'},{slug:'unknown',name:'Unknown',formats:['30x60'],colors:[],unit:'m²'},{slug:'home',name:'Home',formats:['50x80'],colors:[],unit:'pièce'}]};
const unescape=value=>String(value||'').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&');
function harness({session=null,send=async payload=>({ok:true,json:async()=>({success:true,delivered:true,requestId:payload.requestId})})}={}) {
  const ids=new Map(),windowEvents=new Map(),posts=[];
  let currentSession=session,counter=0,activeElement=null;
  function node(id='',tag='DIV') {
    const listeners=new Map(),attributes=new Map();
    return {id,tagName:tag,value:'',checked:false,required:false,disabled:false,hidden:false,textContent:'',dataset:{},listeners,attributes,options:[],classList:{toggle(){}},
      addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn)},
      setAttribute(k,v){attributes.set(k,String(v))},removeAttribute(k){attributes.delete(k)},getAttribute(k){return attributes.get(k)??null},
      focus(){activeElement=this},scrollIntoView(){},select(){},closest(selector){return selector==='[data-line]'?this.article:selector==='#fenice-request-lines'?this.article?container:null:null},
      async emit(type){const event={target:this,preventDefault(){}};return Promise.all((listeners.get(type)||[]).map(fn=>fn(event)))}
    };
  }
  for(const match of html.matchAll(/\bid="([^"]+)"/g))ids.set(match[1],node(match[1]));
  const form=ids.get('fenice-request-form'),container=ids.get('fenice-request-lines'),articles=new Map();
  const radios=[Object.assign(node('private','INPUT'),{value:'private',checked:true}),Object.assign(node('professional','INPUT'),{value:'professional'})];
  function query(selector){
    if(selector.startsWith('#'))return ids.get(selector.slice(1))||null;
    if(selector.includes('input[name="profile"]'))return selector.includes(':checked')?radios.find(n=>n.checked):selector.includes('[value="professional"]')?radios[1]:selector.includes('[value="private"]')?radios[0]:null;
    const article=selector.match(/^\[data-line="(\d+)"\]$/);return article?articles.get(article[1]):null;
  }
  form.querySelector=query;form.querySelectorAll=()=>radios;
  function parseControls(text,article) {
    for(const m of text.matchAll(/<(input|select)\b([^>]*?)(?:>([\s\S]*?)<\/select>|>)/g)){
      const attrs=m[2],id=attrs.match(/\bid="([^"]+)"/)?.[1];if(!id)continue;
      const input=node(id,m[1].toUpperCase());input.article=article;input.required=/\brequired\b/.test(attrs);input.disabled=/\bdisabled\b/.test(attrs);input.dataset.field=attrs.match(/data-field="([^"]+)"/)?.[1];input.value=unescape(attrs.match(/\bvalue="([^"]*)"/)?.[1]);input.pattern=attrs.match(/\bpattern="([^"]+)"/)?.[1];
      if(input.tagName==='SELECT'){
        const opts=[...String(m[3]||'').matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(o=>({value:unescape(o[1].match(/\bvalue="([^"]*)"/)?.[1]),selected:/\bselected\b/.test(o[1])}));input.options=opts;input.value=(opts.find(o=>o.selected)||opts[0]||{}).value||'';
      }
      ids.set(id,input);
    }
  }
  parseControls(html,null);
  Object.defineProperty(container,'innerHTML',{set(value){
    container.html=value;articles.clear();for(const key of [...ids.keys()])if(/^(collection|kind|format|color|quantity|finish|pack)-\d+$/.test(key))ids.delete(key);
    for(const m of value.matchAll(/<article\b[^>]*data-line="(\d+)"[^>]*>([\s\S]*?)<\/article>/g)){
      const article=node(),choice=node(),output=node();article.dataset.line=m[1];article.querySelector=selector=>selector==='[data-pack-choice]'?choice:selector==='[data-pack-result]'?output:query(selector);articles.set(m[1],article);
      Object.defineProperty(choice,'innerHTML',{set(v){choice.html=v;parseControls(v,article)},get(){return choice.html||''}});parseControls(m[2],article);
    }
  },get(){return container.html||''}});
  container.querySelector=query;
  form.reportValidity=()=>[...ids.values()].every(n=>!n.required||n.disabled||String(n.value).trim())&&[...ids.values()].every(n=>!n.value||!n.pattern||new RegExp('^(?:'+n.pattern+')$').test(n.value));
  const document={querySelector:query,activeElement:null,createElement:()=>node()};
  Object.defineProperty(document,'activeElement',{get:()=>activeElement});
  const window={LRF_PRO_SESSION:{read:()=>currentSession},addEventListener(name,fn){if(!windowEvents.has(name))windowEvents.set(name,[]);windowEvents.get(name).push(fn)}};
  const fetch=async(url,options)=>{
    if(options?.method==='POST'){const payload=JSON.parse(options.body);posts.push({url,payload,options});return send(payload)}
    return {ok:true,json:async()=>url.includes('fenice-packaging.json')?packData:catalogue};
  };
  vm.runInNewContext(source,{document,window,fetch,URLSearchParams,location:{search:'?collection=heritage&format=60x60'},PACK_API:packagingAPI,crypto:{randomUUID:()=>`00000000-0000-4000-8000-${String(++counter).padStart(12,'0')}`},sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null},navigator:{clipboard:{writeText:async()=>{}}},AbortController,setTimeout,clearTimeout,Blob,URL,console});
  const h={ids,posts,radios,form,container,active:()=>activeElement,
    async input(id,value){const n=ids.get(id);n.value=value;const event={target:n,preventDefault(){}};if(n.article)for(const fn of container.listeners.get('input')||[])await fn(event);for(const fn of form.listeners.get('input')||[])await fn(event)},
    async change(id,value){const n=ids.get(id);n.value=value;for(const fn of container.listeners.get('change')||[])await fn({target:n,preventDefault(){}})},
    async profile(value){radios.forEach(r=>r.checked=r.value===value);await radios.find(r=>r.value===value).emit('change')},
    async setSession(value){currentSession=value;for(const fn of windowEvents.get('lrf-pro-session-changed')||[])await fn({})},
    async prepare(){return form.emit('submit')},
    async send(){return ids.get('send-request').emit('click')},
    output:()=>articles.get('1')?.querySelector('[data-pack-result]').textContent,
    async fill(){for(const[id,value]of Object.entries({lastname:'Test',firstname:'Camille',contact:'Camille Test',company:'Société de test',email:'camille@example.test',phone:'0600000000',postcode:'34740',city:'Vendargues'}))await h.input(id,value)}
  };return h;
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function ready(options){const h=harness(options);await settle();await settle();return h;}

test('an LRF customer is automatically professional without a profile choice; logout restores the private flow',async()=>{
  const h=await ready({session:{codeClient:'LRF-00317',societe:'Magasin exemple',email:'pro@example.test',sessionToken:'a'.repeat(43)}});
  assert.equal(h.ids.get('profile-choice').hidden,true);assert.equal(h.ids.get('connected-professional').hidden,false);assert.match(h.ids.get('connected-professional').textContent,/LRF-00317/);
  assert.equal(h.ids.get('company').required,true);assert.equal(h.ids.get('company').value,'Magasin exemple');assert.equal(h.ids.get('lastname').required,false);
  await h.input('company','Société personnalisée');await h.setSession({codeClient:'LRF-00317',societe:'Magasin mis à jour',sessionToken:'a'.repeat(43)});
  assert.equal(h.ids.get('company').value,'Société personnalisée','A session refresh must not overwrite a typed value');
  await h.setSession(null);assert.equal(h.ids.get('profile-choice').hidden,false);assert.equal(h.ids.get('firstname').required,true);assert.equal(h.ids.get('city').required,true);
});

test('private users must provide separate names, phone, email and postcode/sector before preparing',async()=>{
  const h=await ready();
  for(const id of ['lastname','firstname','phone','email','postcode','city'])assert.equal(h.ids.get(id).required,true,id);
  await h.prepare();assert.equal(h.ids.get('request-preview').hidden,true);
  await h.fill();await h.prepare();assert.equal(h.ids.get('request-preview').hidden,false);assert.equal(h.posts.length,0,'Preview does not send a message');
  assert.match(h.ids.get('request-text').value,/34740 Vendargues/);assert.match(h.ids.get('request-text').value,/Camille Test/);
});

test('typing converts Heritage tiles immediately without replacing the focused input',async()=>{
  const h=await ready();const input=h.ids.get('quantity-1');input.focus();await h.input('quantity-1','58');
  assert.match(h.output(),/41 boîtes/);assert.match(h.output(),/59,04 m²/);assert.match(h.output(),/164 pièces/);assert.equal(h.active(),input);assert.equal(h.ids.get('quantity-1'),input);
  await h.input('quantity-1','1,44');assert.match(h.output(),/1 boîte · 1,44 m²/);
});

test('plinth quantities convert in linear metres to whole manufacturer boxes',async()=>{
  const h=await ready();await h.change('kind-1','plinth');await h.change('format-1','7,5x60');await h.input('quantity-1','58');
  assert.match(h.output(),/10 boîtes/);assert.match(h.output(),/60 ml/);assert.match(h.output(),/100 pièces/);
});

test('unknown packaging is kept explicit and never replaced by a generic conversion',async()=>{
  const h=await ready();await h.change('collection-1','unknown');await h.change('format-1','30x60');await h.input('quantity-1','58');
  assert.match(h.output(),/Boîtage à confirmer/);assert.doesNotMatch(h.output(),/\d+ boîtes/);
});

test('direct delivery requires a confirmed server response and preserves the request id for retry',async()=>{
  let resolveFirst,calls=0;
  const h=await ready({send:async payload=>{calls++;if(calls===1)return new Promise(resolve=>resolveFirst=resolve);return {ok:true,json:async()=>({success:true,delivered:true,requestId:payload.requestId})}}});
  await h.fill();await h.input('quantity-1','58');await h.prepare();
  const first=h.send();const duplicate=h.send();await settle();assert.equal(h.posts.length,1);assert.equal(h.ids.get('send-request').disabled,true);
  const sent=h.posts[0].payload;assert.equal(sent.profile,'private');assert.equal(sent.nom,'Test');assert.equal(sent.prenom,'Camille');assert.equal(sent.secteur,'Vendargues');assert.equal(sent.items[0].requestedQuantity,58);assert.equal(sent.items[0].packaging.boxes,41);assert.equal('cc' in sent,false);assert.equal('to' in sent,false);
  resolveFirst({ok:false,json:async()=>({success:false,error:'Service temporairement indisponible'})});await first;await duplicate;
  assert.equal(h.ids.get('request-preview').hidden,false);assert.equal(h.ids.get('send-request').disabled,false);assert.match(h.ids.get('request-feedback').textContent,/indisponible/);
  await h.prepare();assert.equal(h.ids.get('send-request').textContent,'Envoyer à Jérôme');
  await h.send();assert.equal(h.posts.length,2);assert.equal(h.posts[1].payload.requestId,sent.requestId);assert.match(h.ids.get('request-feedback').textContent,/bien été transmise à Jérôme/);assert.equal(h.ids.get('send-request').disabled,true);
});

test('a connected LRF account sends only its opaque session token as account proof',async()=>{
  const h=await ready({session:{codeClient:'LRF-00317',societe:'Magasin',sessionToken:'a'.repeat(43)}});await h.fill();await h.input('quantity-1','58');await h.prepare();await h.send();
  assert.equal(h.posts.length,1);assert.equal(h.posts[0].payload.profile,'professional');assert.equal(h.posts[0].payload.sessionToken,'a'.repeat(43));assert.equal('codeClient' in h.posts[0].payload,false);assert.equal('isAdmin' in h.posts[0].payload,false);
});

test('changing session invalidates an already prepared request',async()=>{
  const h=await ready();await h.fill();await h.prepare();await h.setSession({codeClient:'LRF-00317',sessionToken:'a'.repeat(43)});
  assert.equal(h.ids.get('request-preview').hidden,true);await h.send();assert.equal(h.posts.length,0);
});


test('different manufacturer packaging requires a deliberate choice before conversion',async()=>{
  const h=await ready();await h.change('collection-1','variant');await h.change('format-1','30x90');await h.input('quantity-1','10');
  assert.match(h.output(),/Choisissez le conditionnement/);assert.doesNotMatch(h.output(),/\d+ boîtes/);
  await h.change('pack-1','variant-5');assert.match(h.output(),/8 boîtes/);assert.match(h.output(),/10,8 m²/);assert.match(h.output(),/40 pièces/);
});

test('Home remains a quantity in pieces and never receives tile box arithmetic',async()=>{
  const h=await ready();await h.change('collection-1','home');await h.input('quantity-1','2');await h.fill();await h.prepare();await h.send();
  assert.match(h.output(),/^2 pièces$/);assert.equal(h.posts[0].payload.items[0].kind,'piece');assert.equal(h.posts[0].payload.items[0].requestedUnit,'pièces');assert.equal(h.posts[0].payload.items[0].packaging.status,'piece');
});

test('a delivered request cannot be resent by reopening the same preview',async()=>{
  const h=await ready();await h.fill();await h.prepare();await h.send();assert.equal(h.posts.length,1);
  await h.prepare();assert.equal(h.ids.get('send-request').disabled,true);await h.send();assert.equal(h.posts.length,1);
  await h.input('message','Besoin modifié');await h.prepare();assert.equal(h.ids.get('send-request').disabled,false);assert.equal(h.ids.get('send-request').textContent,'Envoyer à Jérôme');await h.send();assert.equal(h.posts.length,2);assert.notEqual(h.posts[0].payload.requestId,h.posts[1].payload.requestId);
});
