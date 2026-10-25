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
for(const file of ['studio-one-configurateur.html','randal-configurateur.html']){
 const html=readFileSync(new URL('../../../'+file,import.meta.url),'utf8');
 const start=html.indexOf('const origin=',html.indexOf('<script>')),end=html.indexOf("document.getElementById('direct-open').href",start);
 assert(start>0&&end>start,'Wrapper route initialization found');
 const script=html.slice(start,end)+'globalThis.result=url.href;';
 for(const locale of ['fr','es','en','javascript:alert(1)','es&demo=randal','']){
  const context={URL,URLSearchParams,location:{search:'?page=atelier.html&composition=lrf-example&lang='+encodeURIComponent(locale),hash:'#projet=test'},document:{getElementById:()=>({})}};
  runInNewContext(script,context);
  const url=new URL(context.result);assert.equal(url.searchParams.get('lang'),['fr','es'].includes(locale)?locale:null);assert.equal(url.searchParams.get('composition'),'lrf-example');assert.equal(url.pathname,'/atelier.html');assert.equal(url.hash,'#projet=test');assert.equal(url.searchParams.get('demo'),null);
 }
}
console.log('Locale navigation: both public composition variants and both site wrappers preserve fr/es only.');
