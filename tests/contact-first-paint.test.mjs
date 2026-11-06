import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('contact.html');
const decode=value=>value.replace(/&amp;/g,'&');

test('contact hydration preserves the parsed phone, introduction and agent order',()=>{
  const app=read('assets/js/app.js');
  const functions=app.slice(app.indexOf('function installCurrentContactNumbers()'),app.indexOf('\ninstallNeobathConfigDataNormalizer();'));
  const intro={textContent:decode(html.match(/<p class="contact-intro">([^<]*)<\/p>/)[1])};
  const options=[...html.match(/<select id="agent-select"[^>]*>([\s\S]*?)<\/select>/)[1].matchAll(/<option value="([^"]+)"[^>]*>([^<]*)<\/option>/g)].map(([,value,textContent])=>({value,textContent:decode(textContent)}));
  const select={options,insertBefore(item,before){options.splice(options.indexOf(item),1);options.splice(options.indexOf(before),0,item);}};
  const cards=[...html.matchAll(/<div class="agent-info-card(?: gold)?">([\s\S]*?)<\/div>/g)].map(([,content])=>({textContent:content.match(/<h3>([^<]*)<\/h3>/)[1]}));
  const team={textContent:'team'},order=[team,...cards];
  for(const item of order)item.insertAdjacentElement=(position,node)=>{assert.equal(position,'afterend');order.splice(order.indexOf(node),1);order.splice(order.indexOf(item)+1,0,node);};
  const stack={querySelectorAll:()=>cards,querySelector:()=>team};
  const phones=[...html.matchAll(/<a\b([^>]*href="tel:[^"]*"[^>]*)>([^<]*)<\/a>/g)].map(([,attributes,textContent])=>({attrs:Object.fromEntries([...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(([,key,value])=>[key,value])),textContent,getAttribute(key){return this.attrs[key];},setAttribute(key,value){this.attrs[key]=value;}}));
  const snapshot=()=>({intro:intro.textContent,options:options.map(({value,textContent})=>[value,textContent]),order:order.map(card=>card.textContent),phones:phones.map(({attrs,textContent})=>({...attrs,textContent}))});
  const before=snapshot();
  vm.runInNewContext(functions+'\ninstallCurrentContactNumbers();installContactPriority();',{window:{location:{pathname:'/contact.html'}},document:{querySelector:selector=>selector==='.contact-intro'?intro:selector==='.agent-stack'?stack:null,getElementById:()=>select,querySelectorAll:selector=>selector==='a[href^="tel:"]'?phones:[]}});
  assert.deepEqual(snapshot(),before);
  assert.deepEqual(before.order,['team','Coryne Le Roy','Jérôme Hugol']);
  assert.equal(before.phones[1].href,'tel:+33766040361');
});

test('parsed professional guidance and its inline initializer already match the final theme copy',()=>{
  const theme=read('assets/js/premium-public-theme.js');
  const copy=theme.slice(theme.indexOf('  const installContactProfessionalCopy ='),theme.indexOf('  const enforceHeaderLogo ='));
  const guidance={innerHTML:html.match(/<div id="contact-guidance"[^>]*>([\s\S]*?)<\/div>/)[1]};
  const expected=guidance.innerHTML;
  vm.runInNewContext(copy+'\ninstallContactProfessionalCopy();',{page:'contact.html',window:{},document:{getElementById:()=>guidance,querySelector:()=>({value:'professionnel'}),querySelectorAll:()=>[]}});
  assert.equal(guidance.innerHTML,expected);
  const script=html.slice(html.indexOf('    const guidance=document.getElementById'),html.indexOf("    document.querySelectorAll('input[name=\"contact-type\"]')"));
  const fields=new Map([['contact-guidance',guidance]]);
  vm.runInNewContext(script+'\nupdateContactType();',{document:{getElementById(id){if(!fields.has(id))fields.set(id,{style:{}});return fields.get(id);},querySelector:()=>({value:'professionnel'})}});
  assert.equal(guidance.innerHTML,expected);
});
