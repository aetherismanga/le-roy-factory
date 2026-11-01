import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const window={};
vm.runInNewContext(readFileSync(new URL('../assets/js/biopietra-request.js',import.meta.url),'utf8'),{
  window,document:{querySelector(){return null}}
});
const {calculateBoxes,variantsFor,connected}=window.LRF_BIOPIETRA_REQUEST_UTILS;

// Manufacturer Toscana: 1.5 cm fondo 1 m²/box; 3 cm fondo 0.5 m²/box;
// 1.5 cm angles 1 ml/box; 3 cm angles 0.5 ml/box.
// https://biopietra.com/prodotto/listello-toscana/
test('Toscana 3 cm uses its own half-square-metre carton',()=>{
  const result=calculateBoxes({unit:'m²',packQuantity:.5,thickness:'3 cm'},'24,3','m²');
  assert.equal(result.status,'known');assert.equal(result.boxes,49);assert.equal(result.quantity,24.5);
  assert.equal(result.requestedQuantity,24.3);assert.equal(result.perBox,.5);
});
test('Toscana angles are rounded in linear metres, independently of the fondo',()=>{
  const result=calculateBoxes({unit:'ml',packQuantity:.5},'5,2','ml');
  assert.equal(result.boxes,11);assert.equal(result.quantity,5.5);assert.equal(result.unit,'ml');
});
test('a quantity entered in boxes never produces a fractional carton',()=>{
  assert.equal(calculateBoxes({unit:'m²',packQuantity:.8},'3','boîtes').quantity,2.4);
  assert.equal(calculateBoxes({unit:'m²',packQuantity:.8},'3,5','boîtes').status,'invalid');
});
test('decimal carton boundaries avoid adding a spurious box',()=>{
  const result=calculateBoxes({unit:'m²',packQuantity:.1},'0,3','m²');
  assert.equal(result.boxes,3);assert.equal(result.quantity,.3);
});
test('unknown packaging is never inferred from dimensions',()=>{
  const result=calculateBoxes({unit:'m²',packQuantity:null,dimensions:'24 × 5,5 cm'},'24','m²');
  assert.equal(result.status,'unknown');assert.equal(result.quantity,24);assert.equal(result.boxes,undefined);
});
test('piece orders reject decimals while liquid orders use their documented packaging',()=>{
  assert.equal(calculateBoxes({unit:'pièce',packQuantity:50},'1,5','pièce').status,'invalid');
  const result=calculateBoxes({unit:'L',packQuantity:5},'6','L');
  assert.equal(result.boxes,2);assert.equal(result.quantity,10);
});
test('invalid quantities and units cannot silently change the requested material',()=>{
  const variant={unit:'ml',packQuantity:1};
  for(const input of ['0','-1','Infinity','1e3','', '10000001'])assert.equal(calculateBoxes(variant,input,'ml').status,'invalid');
  assert.equal(calculateBoxes(variant,'4','m²').status,'invalid');
});
test('colour restrictions preserve exact identities and do not select a first available colour',()=>{
  const p={variants:[{id:'beige-fondo',component:'fondo',colorIds:['beige']},{id:'white-fondo',component:'fondo',colorIds:['bianco']},{id:'common-angle',component:'angle'}]};
  assert.deepEqual(variantsFor(p,'beige','fondo').map(v=>v.id),['beige-fondo']);
  assert.deepEqual(variantsFor(p,'unknown','fondo').map(v=>v.id),[]);
  assert.deepEqual(variantsFor(p,'beige','angle').map(v=>v.id),['common-angle']);
});
test('the profile recognises the connected LRF account without a second role choice',()=>{
  assert.equal(connected({codeClient:'LRF-00317'}),true);
  assert.equal(connected({codeClient:'LRF-00317-668.88.00'}),true);
  assert.equal(connected({admin:true}),true);
  assert.equal(connected({email:'a@example.fr'}),false);
  assert.equal(connected(null),false);
});

const formSource=readFileSync(new URL('../assets/js/biopietra-request.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../biopietra-commande.html',import.meta.url),'utf8');
const realData=JSON.parse(readFileSync(new URL('../assets/data/biopietra-catalogue.json',import.meta.url),'utf8'));
const catalogue={collections:realData.collections.filter(p=>['listello-toscana','bergamo','acropoli','aosta'].includes(p.slug))};
const decode=value=>String(value||'').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&');
function formHarness({session=null,query='?collection=listello-toscana&color=beige&variant=fondo-3-cm&quantity=24,3',send=async payload=>({ok:true,json:async()=>({success:true,delivered:true,requestId:payload.requestId})})}={}){
  const ids=new Map(),events=new Map(),posts=[],articles=new Map();let currentSession=session,active=null,counter=0;
  function node(id='',tagName='DIV'){
    const listeners=new Map(),attributes=new Map();
    return {id,tagName,value:'',checked:false,required:false,disabled:false,hidden:false,textContent:'',dataset:{},listeners,attributes,classList:{toggle(){}},
      addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn)},
      setAttribute(k,v){attributes.set(k,String(v))},removeAttribute(k){attributes.delete(k)},focus(){active=this},scrollIntoView(){},select(){},
      closest(selector){return selector==='[data-line]'?this.article:selector==='#biopietra-request-lines'&&this.article?container:null},
      async emit(type){return Promise.all((listeners.get(type)||[]).map(fn=>fn({target:this,preventDefault(){}})))}
    };
  }
  for(const m of html.matchAll(/\bid="([^"]+)"/g))ids.set(m[1],node(m[1]));
  const form=ids.get('biopietra-request-form'),container=ids.get('biopietra-request-lines');
  const radios=[Object.assign(node('private','INPUT'),{value:'private',checked:true}),Object.assign(node('professional','INPUT'),{value:'professional'})];
  function querySelector(selector){
    if(selector.startsWith('#'))return ids.get(selector.slice(1))||null;
    if(selector.includes('input[name="profile"]'))return selector.includes(':checked')?radios.find(r=>r.checked):selector.includes('[value="professional"]')?radios[1]:selector.includes('[value="private"]')?radios[0]:null;
    const match=selector.match(/^\[data-line="(\d+)"\]$/);return match?articles.get(match[1]):null;
  }
  function parseControls(text,article){
    for(const m of text.matchAll(/<(input|select)\b([^>]*?)(?:>([\s\S]*?)<\/select>|>)/g)){
      const attrs=m[2],id=attrs.match(/\bid="([^"]+)"/)?.[1];if(!id)continue;
      const control=node(id,m[1].toUpperCase());control.article=article;control.required=/\brequired\b/.test(attrs);control.disabled=/\bdisabled\b/.test(attrs);control.dataset.field=attrs.match(/data-field="([^"]+)"/)?.[1];control.value=decode(attrs.match(/\bvalue="([^"]*)"/)?.[1]);control.pattern=attrs.match(/\bpattern="([^"]+)"/)?.[1];
      if(control.tagName==='SELECT'){
        const opts=[...String(m[3]||'').matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(o=>({value:decode(o[1].match(/\bvalue="([^"]*)"/)?.[1]),selected:/\bselected\b/.test(o[1])}));
        control.value=(opts.find(o=>o.selected)||opts[0]||{}).value||'';
      }
      ids.set(id,control);
    }
  }
  parseControls(html,null);form.querySelector=querySelector;form.querySelectorAll=()=>radios;container.querySelector=querySelector;
  Object.defineProperty(container,'innerHTML',{set(value){
    container.html=value;articles.clear();for(const key of [...ids.keys()])if(/^(collection|component|variant|color|quantity|reference)-\d+$/.test(key))ids.delete(key);
    for(const m of value.matchAll(/<article\b[^>]*data-line="(\d+)"[^>]*>([\s\S]*?)<\/article>/g)){
      const article=node(),output=node();article.dataset.line=m[1];article.querySelector=selector=>selector==='[data-pack-result]'?output:querySelector(selector);articles.set(m[1],article);parseControls(m[2],article);
    }
  },get(){return container.html||''}});
  form.reportValidity=()=>[...ids.values()].every(n=>!n.required||n.disabled||String(n.value).trim())&&[...ids.values()].every(n=>!n.value||!n.pattern||new RegExp('^(?:'+n.pattern+')$').test(n.value));
  const window={LRF_PRO_SESSION:{read:()=>currentSession},addEventListener(name,fn){if(!events.has(name))events.set(name,[]);events.get(name).push(fn)}};
  const fetch=async(url,options)=>{
    if(options?.method==='POST'){const payload=JSON.parse(options.body);posts.push({url,payload,options});return send(payload)}
    return {ok:true,json:async()=>catalogue};
  };
  vm.runInNewContext(formSource,{window,document:{querySelector:querySelector,createElement:()=>node()},location:{search:query},URLSearchParams,fetch,sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null},crypto:{randomUUID:()=>`00000000-0000-4000-8000-${String(++counter).padStart(12,'0')}`},navigator:{clipboard:{writeText:async()=>{}}},AbortController,setTimeout,clearTimeout,console});
  const h={ids,posts,container,form,active:()=>active,
    async input(id,value){const n=ids.get(id);n.value=value;const event={target:n,preventDefault(){}};if(n.article)for(const fn of container.listeners.get('input')||[])await fn(event);for(const fn of form.listeners.get('input')||[])await fn(event)},
    async change(id,value){const n=ids.get(id);n.value=value;for(const fn of container.listeners.get('change')||[])await fn({target:n,preventDefault(){}})},
    async setSession(value){currentSession=value;for(const fn of events.get('lrf-pro-session-changed')||[])await fn({})},
    async prepare(){return form.emit('submit')},async send(){return ids.get('send-request').emit('click')},
    output:()=>articles.get('1')?.querySelector('[data-pack-result]').textContent,
    async fill(){for(const [id,value]of Object.entries({lastname:'Test',firstname:'Camille',contact:'Camille Test',company:'Magasin de test',email:'camille@example.test',phone:'0600000000',postcode:'34740',city:'Vendargues'}))await h.input(id,value)}
  };return h;
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function ready(options){const h=formHarness(options);await settle();await settle();return h;}

test('a preselected Toscana thickness and requested quantity survive the catalogue-to-order handoff',async()=>{
  const h=await ready();
  assert.equal(h.ids.get('collection-1').value,'listello-toscana');assert.equal(h.ids.get('variant-1').value,'fondo-3-cm');assert.equal(h.ids.get('quantity-1').value,'24,3');
  assert.match(h.output(),/49 boîtes · 24,5 m²/);
  const input=h.ids.get('quantity-1');input.focus();await h.input('quantity-1','25,1');
  assert.equal(h.ids.get('quantity-1'),input);assert.equal(h.active(),input);assert.match(h.output(),/51 boîtes · 25,5 m²/);
});
test('a connected LRF account hides the profile choice and logout restores required private details',async()=>{
  const h=await ready({session:{codeClient:'LRF-00317',societe:'Mon magasin',sessionToken:'a'.repeat(43)}});
  assert.equal(h.ids.get('profile-choice').hidden,true);assert.equal(h.ids.get('company').value,'Mon magasin');assert.equal(h.ids.get('firstname').required,false);
  await h.setSession(null);assert.equal(h.ids.get('profile-choice').hidden,false);
  for(const id of ['lastname','firstname','phone','email','postcode','city'])assert.equal(h.ids.get(id).required,true,id);
});
test('Bergamo angles move to Acropoli without borrowing a colour identity',async()=>{
  const h=await ready({query:'?collection=bergamo&color=beige-credaro&variant=angle&quantity=5'});
  assert.equal(h.ids.get('collection-1').value,'acropoli');assert.equal(h.ids.get('color-1').value,'');assert.equal(h.ids.get('variant-1').value,'');
  assert.match(h.container.innerHTML,/Angles prévus pour Bergamo/);assert.doesNotMatch(h.output(),/\d+ boîtes/);
});
test('the preview sends nothing and delivery requires a confirmed response with stable retry identity',async()=>{
  let calls=0;
  const h=await ready({send:async payload=>++calls===1?{ok:false,json:async()=>({success:false,error:'Service indisponible'})}:{ok:true,json:async()=>({success:true,delivered:true,requestId:payload.requestId})}});
  await h.fill();await h.prepare();assert.equal(h.posts.length,0);assert.equal(h.ids.get('request-preview').hidden,false);
  assert.match(h.ids.get('request-text').value,/49 boîtes = 24,5 m²/);assert.match(h.ids.get('request-text').value,/34740 Vendargues/);
  await h.send();assert.equal(h.posts.length,1);assert.match(h.ids.get('request-feedback').textContent,/indisponible/);assert.equal(h.ids.get('send-request').disabled,false);
  const first=h.posts[0].payload;
  assert.equal(first.items[0].variantId,'fondo-3-cm');assert.equal(first.items[0].requestedQuantity,24.3);assert.equal(first.items[0].requestedUnit,'m²');assert.equal('packaging' in first.items[0],false);assert.equal('to' in first,false);
  await h.prepare();await h.send();assert.equal(h.posts[1].payload.requestId,first.requestId);assert.match(h.ids.get('request-feedback').textContent,/bien été transmise à Jérôme/);assert.equal(h.ids.get('send-request').disabled,true);
  await h.prepare();await h.send();assert.equal(h.posts.length,2,'Reopening a delivered preview must not resend it');
});
test('LRF account proof is opaque and a session change invalidates a prepared request',async()=>{
  const h=await ready({session:{codeClient:'LRF-00317',sessionToken:'a'.repeat(43)}});await h.fill();await h.prepare();await h.send();
  assert.equal(h.posts[0].payload.sessionToken,'a'.repeat(43));assert.equal('codeClient' in h.posts[0].payload,false);assert.equal('isAdmin' in h.posts[0].payload,false);
  await h.input('message','Projet mis à jour');await h.prepare();await h.setSession(null);assert.equal(h.ids.get('request-preview').hidden,true);await h.send();assert.equal(h.posts.length,1);
});
