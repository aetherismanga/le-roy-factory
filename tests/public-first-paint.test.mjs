import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const themed=['index.html','partenaires.html','univers.html','univers-ios.html','realisations.html','catalogues.html','tarifs-pro.html','contact.html','agent.html','configurateurs.html','configurateur-elios-pose.html','configurateur-croisillons.html','configurateur-plots.html'];
const mobile=[...themed,'configurateur-elios-pose-v2.html','mentions-legales.html','configurateur-joints.html','univers-elios-preview.html','politique-confidentialite.html'];
const css=['lrf-premium-v2.css','lrf-soft-pages-v3.css','lrf-final-v4.css','lrf-hotfix-v5.css','lrf-logo-scale-v9.css'];
test('the final public theme exists in the parsed HTML before deferred scripts execute',()=>{
  for(const page of themed){const source=read(page),head=source.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]||'',body=source.match(/<body\b[^>]*>/i)?.[0]||'';assert.match(body,/\blrf-premium-v2\b/,page);assert.match(body,new RegExp('\\blrf-page-'+(page.startsWith('univers')?'univers':page.replace('.html',''))+'\\b'),page);if(page!=='index.html')assert.match(body,/\blrf-light-page\b/,page);const positions=css.map(name=>head.indexOf('assets/css/'+name));assert.ok(positions.every(n=>n>=0),page+' critical CSS');assert.deepEqual(positions.slice().sort((a,b)=>a-b),positions,page+' theme cascade');assert.match(head,/lrf-logo-scale-v9\.css\?v=20261106-firstpaint1/,page);}
});
test('mobile CSS is available in the initial head, once and in the final cascade',()=>{
 for(const page of mobile){const source=read(page),head=source.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]||'';for(const name of ['mobile-enhancements.css','mobile-public-v8.css']){const links=[...head.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).filter(tag=>tag.includes(name));assert.equal(links.length,1,page+' '+name);assert.match(links[0],/media=["']\(max-width:\s*900px\)["']/,page);}assert.ok(head.indexOf('mobile-enhancements.css')<head.lastIndexOf('mobile-public-v8.css'),page);for(const name of css)if(head.includes(name))assert.ok(head.indexOf(name)<head.lastIndexOf('mobile-public-v8.css'),page+' mobile final override');}
});
test('the source header, navigation and footer already match their final enhanced state',()=>{
 for(const page of themed){const source=read(page),header=source.match(/<header\b[^>]*>([\s\S]*?)<\/header>/i)?.[1]||'',footer=source.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i)?.[1]||'';assert.match(header,/lrf-wordmark-header/,page);assert.match(header,/brand-wordmark-gold\.svg/,page);assert.doesNotMatch(header,/logo03lrf\.png|bandeau0[12]\.png/,page);assert.match(header,/href=["']configurateurs\.html["']/,page);assert.match(header,/CERSAIE 2026 · ACTUALITÉS &amp; PROMOS/,page);assert.match(footer,/lrf-footer-brand/,page);}
});
function dom(existing=[]){const links=existing.map(href=>({id:'',getAttribute:name=>name==='href'?href:null}));const appended=[];return {links,appended,document:{querySelectorAll:()=>links,getElementById:()=>null,createElement:()=>({getAttribute(name){return this[name]||null;}}),head:{appendChild(link){links.push(link);appended.push(link);}}}};}
test('mobile hydration reuses cached stylesheet URLs across query-version and ID differences',()=>{
 const source=read('assets/js/app.js');const definition=source.slice(source.indexOf('function ensureMobileCss() {'),source.indexOf('\nensureMobileCss();'));
 const existing=dom(['assets/css/mobile-enhancements.css?v=previous','assets/css/mobile-public-v8.css?v=previous']);vm.runInNewContext(definition+'\nensureMobileCss();',{...existing,URL,location:{href:'https://leroyfactory.fr/catalogues.html'},window:{matchMedia:()=>({matches:true})}});assert.equal(existing.appended.length,0);assert.equal(existing.links.length,2);
 const fallback=dom();vm.runInNewContext(definition+'\nensureMobileCss();',{...fallback,URL,location:{href:'https://leroyfactory.fr/catalogues.html'},window:{matchMedia:()=>({matches:true})}});assert.equal(fallback.appended.length,2);assert.ok(fallback.appended.every(link=>link.media==='(max-width: 900px)'));
});
test('theme hydration reuses a matching head stylesheet even without its legacy ID',()=>{
 const source=read('assets/js/premium-public-theme.js');const definition=source.slice(source.indexOf('  const addStylesheet ='),source.indexOf("  addStylesheet('lrf-premium-v2-css'"));const fixture=dom(['assets/css/lrf-premium-v2.css?v=previous']);vm.runInNewContext(definition+"addStylesheet('lrf-premium-v2-css','assets/css/lrf-premium-v2.css?v=current');",{...fixture,URL,location:{href:'https://leroyfactory.fr/contact.html'}});assert.equal(fixture.appended.length,0);assert.equal(fixture.links[0].id,'lrf-premium-v2-css');
});

test('the saved home screen mode is chosen synchronously before any home content is parsed',()=>{
 const source=read('index.html');const script=source.match(/<script id="lrf-home-first-paint">([\s\S]*?)<\/script>/)?.[1];assert.ok(script);assert.ok(source.indexOf('lrf-home-first-paint')<source.indexOf('<body'));
 for(const [saved,expected] of [['dark','dark'],['light','light'],['invalid','light'],[null,'light']]){const document={documentElement:{dataset:{}}};vm.runInNewContext(script,{document,localStorage:{getItem:()=>saved}});assert.equal(document.documentElement.dataset.lrfHomeMode,expected);}
 const blocked={documentElement:{dataset:{}}};vm.runInNewContext(script,{document:blocked,localStorage:{getItem(){throw Error('blocked')}}});assert.equal(blocked.documentElement.dataset.lrfHomeMode,'light');
 assert.match(source,/<style id="lrf-home-bg-controller-style">/);assert.match(source,/data-lrf-home-mode="dark"[\s\S]*home-desktop-dark\.webp/);assert.match(source,/data-lrf-home-mode="dark"[\s\S]*home-mobile-dark\.webp/);assert.match(source,/data-lrf-home-mode="light"[\s\S]*brand-wordmark-wine\.svg/);assert.match(source,/data-lrf-home-mode="dark"[\s\S]*brand-wordmark-gold\.svg/);
});
test('home preference changes synchronize the initial CSS state before applying image styles',()=>{
 const source=read('assets/js/home-background-switcher.js');const definition=source.slice(source.indexOf('  const applyBackground = () => {'),source.indexOf('  let cameoRunning'));
 const changes=[];const document={documentElement:{dataset:{}}};const hero={classList:{toggle(){}},style:{setProperty(name){changes.push([name,document.documentElement.dataset.lrfHomeMode]);}}};
 vm.runInNewContext(definition+'applyBackground();',{document,hero,mode:'dark',media:{matches:false},IMAGES:{desktopDark:'dark.webp'},overlay:null,modeToggle:null,syncLogo(){}});assert.equal(document.documentElement.dataset.lrfHomeMode,'dark');assert.ok(changes.length>0);assert.ok(changes.every(([,mode])=>mode==='dark'));
 assert.match(read('assets/js/premium-public-theme.js'),/if \(heroLogo && page !== 'index\.html'\)/);
});

test('the home hero, news rail and mobile promotion row are parsed with their final controls',()=>{
 const source=read('index.html'),head=source.split('</head>')[0],body=source.split('<body')[1];
 assert.match(head,/<link id="lrf-home-promotions-css"[^>]+home-promotions\.css/);
 const tags=[...body.matchAll(/<(?:a|button|div)\b[^>]*>/g)].map(match=>match[0]);
 for(const name of ['lrf-desktop-promo-stack','viewlots26-desktop','aq-lisboa-desktop','bilt-talox-desktop','elios-rentree-desktop','viewlots26-header','revi-header-promo','aq-lisboa-mobile','elios-rentree-mobile','lrf-home-mode-toggle','lrf-screen-test-button']){
  assert.equal(tags.filter(tag=>(tag.match(/class="([^"]*)"/)?.[1]||'').split(/\s+/).includes(name)).length,1,name+' appears once before scripts');
 }
 assert.equal(tags.filter(tag=>tag.includes('id="lrf-open-search"')).length,1);
 assert.equal(tags.filter(tag=>tag.includes('id="bulbo-mobile-trigger"')).length,1);
 assert.match(body,/nav-container revi-promos-ready/);
 assert.match(body,/hero-logo-wrapper bulbo-ready/);
 assert.doesNotMatch(body,/<a[^>]+class="hero-btn btn-gold">Nos partenaires<\/a>/);
 const positions=['viewlots26-desktop','aq-lisboa-desktop','bilt-talox-desktop','elios-rentree-desktop'].map(name=>body.indexOf('class="'+name+'"'));
 assert.deepEqual(positions.slice().sort((a,b)=>a-b),positions,'news order is final');
});
test('initial home promotion CSS preserves every existing runtime presentation rule in order',()=>{
 const bundled=read('assets/css/home-promotions.css');let previous=-1;
 for(const file of ['view-lots-sept-2026-home.js','aquahome-lisboa-home.js','bilt-talox-home.js','elios-rentree-2026-home.js','desktop-promo-stack.js']){
  const source=read('assets/js/'+file),style=source.match(/style\.textContent\s*=\s*`([\s\S]*?)`;/)?.[1].replace(/\\n/g,'\n').trim();
  assert.ok(style,file+' CSS found');const position=bundled.indexOf(style);assert.ok(position>previous,file+' same rules and cascade before paint');previous=position;
  assert.match(source,/if\(!document\.getElementById\('lrf-home-promotions-css'\)\)\s*document\.head\.appendChild\(style\)/,file+' reuses initial CSS');
 }
 assert.match(bundled,/--lrf-promo-w:clamp/);
 assert.match(bundled,/padding-right:calc\(var\(--lrf-promo-w\)/);
});
test('the parsed home search button receives lazy search behavior without replacing its content',async()=>{
 const source=read('assets/js/global-search-router.js');const start=source.slice(source.indexOf('    const start = async () => {'),source.indexOf("    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start"));
 const listeners=[];const button={addEventListener(type,handler){listeners.push({type,handler});}};
 const document={querySelectorAll:()=>[],getElementById:id=>id==='lrf-open-search'?button:null,addEventListener(){},createElement(){throw Error('the parsed button must be reused')}};
 await vm.runInNewContext(start+'start();',{document});assert.equal(listeners.length,1);assert.equal(listeners[0].type,'click');assert.equal(typeof listeners[0].handler,'function');
});
