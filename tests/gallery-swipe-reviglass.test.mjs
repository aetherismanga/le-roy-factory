import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function harness(file,exports,marker,{existingParadise=true}={}) {
  const ids=new Map(),bindings=[],handlers=new Map(),appendedScripts=[];
  function node(selector='') {
    const classes=new Set(),children=new Map(),listeners=new Map();
    const item={selector,dataset:{},style:{},isConnected:true,textContent:'',innerHTML:'',
      classList:{contains:value=>classes.has(value),add:value=>classes.add(value),remove:value=>classes.delete(value),toggle(value,on){on??=!classes.has(value);on?classes.add(value):classes.delete(value);return on;}},
      querySelector(value){if(!children.has(value))children.set(value,node(value));return children.get(value);},
      querySelectorAll(value){
        if(!value.startsWith('.'))return [];
        const className=value.slice(1);
        return [...this.innerHTML.matchAll(/<button\b([^>]*)>/g)].filter(match=>(match[1].match(/class="([^"]*)"/)?.[1]||'').split(/\s+/).includes(className)).map(match=>{
          const button=node();
          for(const data of match[1].matchAll(/data-([a-z-]+)="([^"]*)"/g))button.dataset[data[1].replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=data[2];
          return button;
        });
      },
      addEventListener(type,listener){listeners.set(type,listener);},fire(type,event){listeners.get(type)?.(event);},remove(){},after(){},insertBefore(){},
      appendChild(child){if(child.id)ids.set('#'+child.id,child);if(child.tagName==='SCRIPT')appendedScripts.push(child);},get parentNode(){return this;}
    };
    return item;
  }
  const modal=node('#reviglass-pool-modal');modal.classList.add('open');ids.set('#reviglass-pool-modal',modal);
  const document={documentElement:node(),head:node(),body:node(),scripts:existingParadise?[{src:'https://example.test/assets/js/inspirations-reviglass-paradise-gallery-v2.js'}]:[],
    querySelector:selector=>ids.get(selector)||null,querySelectorAll(){return [];},createElement(tag){return Object.assign(node(),{tagName:tag.toUpperCase()});},addEventListener(type,listener){handlers.set(type,listener);}
  };
  const window={LRF_GALLERY_GESTURES:{bind(element,options){element.dataset.lrfPhotoSwipe='1';bindings.push({element,options});}}};
  // Only expose the private controller to the harness; no test hook enters production.
  const source=readFileSync(new URL('../assets/js/'+file,import.meta.url),'utf8').replace(marker,`window.__TEST={${exports}};\n`+marker);
  const Image=class {constructor(){this.naturalWidth=1000;this.naturalHeight=1000;}set src(value){this._src=value;Promise.resolve().then(()=>this.onload?.());}get src(){return this._src;}};
  vm.runInNewContext(source,{window,document,Image,MutationObserver:class{observe(){}},setTimeout:()=>0,clearTimeout(){},console});
  assert.ok(window.__TEST,'controller test fixture installed');
  return {window,ids,modal,bindings,handlers,appendedScripts};
}

test('Reviglass PS swipes exact photos without opening the lightbox and preserves pinch/pan zoom',()=>{
  const h=harness('inspirations-reviglass-ps-gallery.js','renderGallery,showLightbox,resetTransform','  installStyle();\n})();');
  assert.equal(h.window.__TEST.renderGallery('PS21'),true);
  const main=h.bindings.find(binding=>binding.element.selector==='.rev-ps-main');
  assert.equal(main.options.isEnabled(),true);
  main.options.onSwipe(1);assert.equal(main.element.dataset.revPsOpen,'1');
  assert.match(main.element.querySelector('img').src,/PS-21web2\.jpg$/);
  main.options.onSwipe(-1);assert.equal(main.element.dataset.revPsOpen,'0');
  assert.equal(h.ids.get('#rev-ps-lightbox'),undefined,'a photo swipe must not expand the image');
  h.window.__TEST.showLightbox(0);
  const full=h.bindings.find(binding=>binding.element.id==='rev-ps-lightbox');
  assert.equal(full.element.dataset.lrfPhotoSwipe,'1','legacy reference gestures must yield');
  full.options.onSwipe(1);assert.match(full.element.querySelector('.rev-ps-counter').textContent,/2 \/ 3/);
  full.element.fire('wheel',{deltaY:-1,preventDefault(){}});
  assert.equal(full.options.isEnabled(),false,'zoomed photo remains available for panning');
  h.window.__TEST.resetTransform();assert.equal(full.options.isEnabled(),true);
});

test('Reviglass all-series navigation keeps the selected reference while moving between its photos',async()=>{
  const h=harness('inspirations-reviglass-all-series-gallery.js','render,showPhoto','  installStyle();\n})();');
  await h.window.__TEST.render('DK-70');
  const main=h.bindings.find(binding=>binding.element.selector==='.rev-all-main');
  assert.equal(main.options.isEnabled(),true);
  main.options.onSwipe(1);assert.equal(main.element.dataset.revAllOpen,'1');
  main.options.onSwipe(-1);assert.equal(main.element.dataset.revAllOpen,'0');
  assert.equal(h.ids.get('#rev-all-lightbox'),undefined);
  h.window.__TEST.showPhoto(0);
  const full=h.bindings.find(binding=>binding.element.id==='rev-all-lightbox');
  assert.equal(full.element.dataset.lrfPhotoSwipe,'1');
  full.options.onSwipe(1);assert.match(full.element.querySelector('.rev-all-counter').textContent,/DK-70 · 2 \/ 3/);
});

for(const fixture of [
  {name:'AB',file:'inspirations-reviglass-ab-fast-gallery.js',ref:'AB02',stage:'.rev-ab-main',box:'rev-ab-lb',counter:'.rev-ab-count',count:4,first:'https://reviglass.es/wp-content/uploads/2018/07/AB-02web1.jpg'},
  {name:'Mixiris',file:'inspirations-reviglass-mixiris-fast-gallery.js',ref:'UROLA',stage:'.rev-mixfast-main',box:'rev-mixfast-lb',counter:'.rev-mixfast-count',count:2,first:'https://reviglass.es/wp-content/uploads/2018/11/UROLAweb1.jpg'}
])test(`Reviglass ${fixture.name} changes photos inline and fullscreen with closed-state guards`,()=>{
  const marker=fixture.name==='AB'?'  install();\n})();':'  style();\n';
  const h=harness(fixture.file,'render,show',marker);
  h.window.__TEST.render(fixture.ref);
  const main=h.bindings.find(binding=>binding.element.selector===fixture.stage);
  assert.equal(main.options.isEnabled(),true);
  const first=fixture.first;
  main.options.onSwipe(1);const second=main.element.querySelector('img').src;assert.notEqual(first,second);
  main.options.onSwipe(-1);assert.equal(main.element.querySelector('img').src,first);
  assert.equal(h.ids.get('#'+fixture.box),undefined);
  h.window.__TEST.show(0);
  const full=h.bindings.find(binding=>binding.element.id===fixture.box);
  assert.equal(full.options.isEnabled(),true);
  full.options.onSwipe(1);assert.match(full.element.querySelector(fixture.counter).textContent,new RegExp('2 / '+fixture.count));
  full.element.classList.remove('open');assert.equal(full.options.isEnabled(),false);
  if(fixture.name==='Mixiris')assert.equal(h.appendedScripts.length,0,'already-listed Paradise V2 must not load a legacy duplicate');
});

test('Paradise V2 changes only the photo when a reference has multiple views',async()=>{
  const h=harness('inspirations-reviglass-paradise-gallery-v2.js','render,showLb,ITEMS','  style();\n})();');
  await h.window.__TEST.render(h.window.__TEST.ITEMS[0]);
  const main=h.bindings.find(binding=>binding.element.selector==='.rev-paradise-main');
  assert.equal(main.options.isEnabled(),true);
  main.options.onSwipe(1);assert.equal(main.element.dataset.pOpen,'1');
  main.options.onSwipe(-1);assert.equal(main.element.dataset.pOpen,'0');
  assert.equal(h.ids.get('#rev-paradise-lb'),undefined);
  h.window.__TEST.showLb(0);
  const full=h.bindings.find(binding=>binding.element.id==='rev-paradise-lb');
  assert.equal(full.options.isEnabled(),true);
  full.options.onSwipe(1);assert.match(full.element.querySelector('.rev-paradise-count').textContent,/PA-01 AGUAMARINA · 2 \/ [234]/);
});
