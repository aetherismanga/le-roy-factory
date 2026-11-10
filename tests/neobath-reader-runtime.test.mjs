import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as model from '../assets/js/neobath-reader-model.mjs';

const source=readFileSync(new URL('../assets/js/neobath-anima-interactif.js',import.meta.url),'utf8');
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
async function tick(){for(let i=0;i<8;i++)await Promise.resolve();}
function readerHarness(){
 const elements=new Map(),canvases=[],renderRequests=[],pageRequests=new Map();let revocations=0,blobIds=0;
 function element(tag='DIV'){
  return {tagName:tag,style:{},hidden:false,disabled:false,children:[],dataset:{},clientWidth:360,clientHeight:510,
   classList:{toggle(){},add(){},remove(){}},setAttribute(){},removeAttribute(){},addEventListener(){},focus(){},blur(){},
   replaceChildren(...items){this.children=items;},append(...items){this.children.push(...items);},querySelectorAll(){return [];},getContext(){return {};},toBlob(callback){callback({synthetic:true});}};
 }
 const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},querySelectorAll(){return [];},addEventListener(){},body:element(),createTextNode:text=>({textContent:text}),createElement(tag){const node=element(tag.toUpperCase());if(tag==='canvas')canvases.push(node);return node;}};
 const pdf={numPages:79,getPage(n){if(!pageRequests.has(n))pageRequests.set(n,deferred());return pageRequests.get(n).promise;}};
 const context={...model,document,location:{pathname:'/neobath-dna-interactif.html',hash:''},history:{replaceState(){}},window:{},innerHeight:700,devicePixelRatio:3,getComputedStyle:()=>({paddingLeft:'8px',paddingRight:'8px',paddingTop:'8px',paddingBottom:'8px'}),console,URL:{revokeObjectURL(){revocations++;},createObjectURL(){return 'blob:synthetic-'+(++blobIds);}},setTimeout,clearTimeout,addEventListener(){},AbortSignal};
 context.globalThis=context;
 const instrumented=source.replace(/^import[^\n]*\n/,'').replace(/updateUI\(\);loadPdf\(\);\s*$/,"updateUI(); globalThis.readerTest={render,navigate,updateUI,setPDF(value){pdf=value;total=value.numPages;},get page(){return page;},get mainBusy(){return mainBusy;},cache:canvasCache,queueThumbnail,visibleThumbnails,thumbnailCache};");
 vm.runInNewContext(instrumented,context,{filename:'neobath-anima-interactif.js'});
 const controls=context.readerTest;assert(controls,'reader initialization test hook');controls.setPDF(pdf);
 function page(n){return {getViewport({scale}){return {width:595*scale,height:842*scale};},render(){const work=deferred();const request={page:n,...work,cancelled:false,cancel(){this.cancelled=true;const error=Error('cancelled');error.name='RenderingCancelledException';work.reject(error);}};renderRequests.push(request);return request;}};}
 function resolvePage(n){if(!pageRequests.has(n))pageRequests.set(n,deferred());pageRequests.get(n).resolve(page(n));}
 return {controls,elements,canvases,renderRequests,resolvePage,pdf,pageRequests,get revocations(){return revocations;}};
}

test('rapid navigation cannot install a stale PDF page after a newer render finishes',async()=>{
 const h=readerHarness();
 const first=h.controls.render();h.resolvePage(1);await tick();assert.equal(h.renderRequests.length,1);
 h.controls.navigate(2);h.resolvePage(2);await tick();assert.equal(h.renderRequests[0].cancelled,true);assert.equal(h.renderRequests.length,2);
 h.renderRequests[1].resolve();await tick();await first;
 const displayed=h.elements.get('mount').children[0];assert.equal(h.controls.page,2);assert.equal(displayed,h.canvases[1]);
 assert.equal(h.canvases[0].width,0,'superseded full resolution canvas is released');assert.equal(h.controls.mainBusy,false);
 // A delayed getPage for page 3 must not start rendering after a switch to page 4.
 h.controls.navigate(3);h.controls.navigate(4);h.resolvePage(4);await tick();h.renderRequests.at(-1).resolve();await tick();
 const current=h.elements.get('mount').children[0],count=h.renderRequests.length;
 h.resolvePage(3);await tick();assert.equal(h.renderRequests.length,count);assert.equal(h.elements.get('mount').children[0],current);assert.equal(h.controls.page,4);
});

test('reopening a rendered page uses its cached canvas and does not render the PDF twice',async()=>{
 const h=readerHarness();const first=h.controls.render();h.resolvePage(1);await tick();h.renderRequests[0].resolve();await first;
 const original=h.elements.get('mount').children[0];
 h.controls.navigate(2);h.resolvePage(2);await tick();h.renderRequests[1].resolve();await tick();
 const before=h.renderRequests.length;h.controls.navigate(1);await tick();
 assert.equal(h.renderRequests.length,before);assert.equal(h.elements.get('mount').children[0],original);assert(h.controls.cache.size<=3);
});

test('thumbnail rendering is lazy: offscreen pages allocate no PDF page or canvas',async()=>{
 const h=readerHarness();
 h.controls.queueThumbnail(10);h.controls.queueThumbnail(11);await tick();
 assert.equal(h.pageRequests.size,0);assert.equal(h.canvases.length,0);
 const preview={children:[],querySelector(){return this.children.find(child=>child.tagName==='IMG');},replaceChildren(...children){this.children=children;}};
 const button={dataset:{goto:'12'},querySelector(){return preview;}};
 h.controls.visibleThumbnails.add(button);h.controls.queueThumbnail(12);h.resolvePage(12);await tick();
 assert.equal(h.renderRequests.length,1);assert.equal(h.renderRequests[0].page,12);
 h.renderRequests[0].resolve();await tick();
 assert.equal(h.canvases.length,1);assert.equal(h.canvases[0].width,0,'temporary thumbnail canvas is released after image encoding');
 assert.equal(h.controls.thumbnailCache.size,1);assert.equal(preview.children[0].src,'blob:synthetic-1');
});
