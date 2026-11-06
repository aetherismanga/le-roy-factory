import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const data=JSON.parse(read('data/fabricants.json'));
const source=read('partenaires.html');
const revision=source.match(/data-lrf-partners-revision="([^"]+)"/)[1];
const script=source.match(/<script>\s*(fetch\('data\/fabricants\.json[\s\S]*?)<\/script>/)[1];
test('all public manufacturer cards and their logos exist in parsed HTML',()=>{
 assert.equal((source.split('<script>')[0].match(/class="card-premium partner-card"/g)||[]).length,data.length);
 for(const fab of data)assert.ok(source.split('<script>')[0].includes(fab.nom),fab.nom);
 assert.equal((source.split('<script>')[0].match(/data-logo-loaded="1"/g)||[]).length,data.length);
});
async function hydrate(incoming){let writes=0;const grid={dataset:{lrfPartnersRevision:revision},children:Array(data.length).fill({}),querySelectorAll:()=>[],set innerHTML(value){writes++;this.markup=value;}};await vm.runInNewContext(script,{fetch:async()=>({json:async()=>incoming}),document:{getElementById:()=>grid},window:{},console,Math});return {grid,writes};}
test('identical manufacturer data preserves parsed cards, while refreshed data can update them',async()=>{
 const same=await hydrate(data);assert.equal(same.writes,0);
 const changed=await hydrate(data.map((fab,index)=>index?fab:{...fab,presentation:'Nouvelle présentation publique'}));assert.equal(changed.writes,1);assert.match(changed.grid.markup,/Nouvelle présentation publique/);
});
test('every public scrollbar consumer reserves its final desktop width in its initial stylesheet',()=>{
 let count=0;
 for(const page of readdirSync(new URL('../',import.meta.url)).filter(name=>name.endsWith('.html'))){const html=read(page);if(!/<script\b[^>]*src=["']assets\/js\/(?:app|public-scrollbar)\.js/.test(html))continue;count++;assert.match(html,/<html\b[^>]*data-lrf-public-scrollbar="true"/,page);assert.match(html,/base\.css\?v=20261106-firstpaint1/,page);}
 assert.equal(count,18);
 const css=read('assets/css/base.css');assert.match(css,/@media \(min-width:901px\)\{\s*html\[data-lrf-public-scrollbar\]:not\(:has\(body\.crm-body\)\)/);assert.match(css,/html\[data-lrf-public-scrollbar\] body:not\(\.crm-body\)\{padding-right:18px!important;box-sizing:border-box!important/);
});
