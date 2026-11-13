import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const renderer=read('assets/js/catalogues-renderer.js');
const html=read('catalogues.html');
function render(grid){
 vm.runInNewContext(renderer,{window:{},document:{readyState:'complete',documentElement:{dataset:{}},getElementById:id=>id==='grid-catalogues'?grid:null}});
}
test('the complete public catalogue is parsed before scripts and agrees with its fallback',()=>{
 const parsed=html.match(/<!-- catalogue-first-paint:start -->\n([\s\S]*?)\n        <!-- catalogue-first-paint:end -->/)?.[1];
 assert.ok(parsed,'initial cards must exist');
 assert.equal((parsed.match(/<article\b/g)||[]).length,19);
 const grid={querySelectorAll:()=>[],innerHTML:''};render(grid);assert.equal(parsed,grid.innerHTML,'fallback data must stay aligned with parsed cards');
 assert.ok(html.indexOf('catalogue-first-paint:start')<html.indexOf('assets/js/catalogues-renderer.js?v=20261113-r11'));
 assert.match(html,/<script id="lrf-catalogues-renderer-loader"/,'the shared loader reuses the current script');
 assert.doesNotMatch(html,/function renderCatalogues/,'an older renderer must not replace the parsed cards');
 assert.equal((parsed.match(/data-elios-pool-catalogue=/g)||[]).length,1,'Pool patch must see its existing row');
 assert.equal((parsed.match(/data-uptrend-catalogue-card=/g)||[]).length,1,'UPTREND patch must see its existing card');
 assert.match(parsed,/Catalogue Aquahome 2026/);assert.match(parsed,/opal-catalogue-interactif\.html/);
 assert.equal((parsed.match(/data-r11-catalogue-card=/g)||[]).length,1,'the exterior selection is present before scripts');
 assert.match(parsed,/<h3>Sélection Le Roy Factory extérieur<\/h3>/);
 assert.match(parsed,/href="catalogue-exterieur-r11-pdf\.html" class="catalogue-link"/,'the public PDF viewer keeps catalogue navigation in the same tab');
 assert.match(parsed,/background-image:url\('assets\/img\/logo03lrf\.png'\)/,'the LRF selection retains the official logo');
 assert.match(parsed,/catalogue-index-hint/,'the ONDABLOCK collection index is preserved');
});
test('hydrating the public catalogue keeps the parsed cards and open menus intact',()=>{
 let writes=0;const grid={querySelectorAll:selector=>{assert.equal(selector,'h3');return [{textContent:'Elios Ceramica'},{textContent:'View Ceramica'}];},set innerHTML(value){writes++;}};
 render(grid);assert.equal(writes,0);
});
