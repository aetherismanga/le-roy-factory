import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function harness(brand) {
  const dialogs=[],bindings=new Map();
  function node(selector='') {
    const listeners=new Map(),classes=new Set();
    return {
      selector,style:{},dataset:{},value:'',textContent:'',src:'',alt:'',
      setAttribute(){},focus(){},
      addEventListener(type,listener){listeners.set(type,listener)},
      click(){const event={currentTarget:this,target:this};this.onclick?.(event);listeners.get('click')?.(event)},
      classList:{
        add(value){classes.add(value)},remove(value){classes.delete(value)},contains(value){return classes.has(value)},
        toggle(value){if(classes.has(value)){classes.delete(value);return false}classes.add(value);return true}
      }
    };
  }
  const document={activeElement:null,querySelector(){return null},addEventListener(){},
    body:{style:{},appendChild(){}},
    createElement(){
      const elements=new Map(),dialog={...node(),open:false,
        querySelector(selector){if(!elements.has(selector))elements.set(selector,node(selector));return elements.get(selector)},
        querySelectorAll(){return []},
        showModal(){this.open=true},close(){this.open=false}
      };
      dialogs.push(dialog);return dialog;
    }
  };
  const product={id:'sample',slug:'sample',name:'Sample',description:'Verified product',productType:'surface',
    colors:[],formats:[],finishes:[],variants:[],swatches:[],sourceUrl:'https://manufacturer.example/sample/',
    images:[{url:'/assets/first.webp',fullUrl:'/assets/first-hd.webp',label:'First'},{url:'/assets/second.webp',fullUrl:'/assets/second-hd.webp',label:'Second'}]
  };
  const window={addEventListener(){},LRF_GALLERY_GESTURES:{bind(element,options){bindings.set(element,options)}},
    [brand==='bulbo'?'BULBO_CATALOGUE':'BIOPIETRA_CATALOGUE']:[product],LRF_BULBO_ACCESS:{canAccess:()=>false}
  };
  vm.runInNewContext(readFileSync(new URL(`../assets/js/inspirations-${brand}.js`,import.meta.url),'utf8'),{window,document,URLSearchParams});
  assert.equal(window[brand==='bulbo'?'LRF_BULBO_SELECTION':'LRF_BIOPIETRA_SELECTION'].openCollection('sample'),true);
  const bindingFor=selector=>[...bindings].find(([element])=>element.selector===selector)?.[1];
  return {dialogs,bindingFor};
}

for(const config of [
  {brand:'bulbo',stage:'.bulbo-main-photo',image:'#bulbo-main-image',count:'#bulbo-image-count',expand:'.bulbo-main-photo',lightbox:'.bulbo-lightbox-stage',zoom:'[data-bulbo-zoom]',label:'.bulbo-lightbox-label',firstHd:'/assets/first.webp'},
  {brand:'biopietra',stage:'.bpc-stage',image:'#bpc-main-image',count:'#bpc-count',expand:'.bpc-expand',lightbox:'.bpc-lightbox-stage',zoom:'[data-bpc-zoom]',label:'strong',firstHd:'/assets/first-hd.webp'}
]) {
  test(`${config.brand}: swiping navigates once and synchronizes the collection and unzoomed fullscreen photo`,()=>{
    const h=harness(config.brand),dialog=h.dialogs[0],gallery=h.bindingFor(config.stage);
    assert.ok(gallery,'collection stage binds the shared gesture controller');
    assert.equal(gallery.isEnabled(),true);
    assert.equal(dialog.querySelector(config.image).src,'/assets/first.webp');
    gallery.onSwipe(1);
    assert.equal(dialog.querySelector(config.image).src,'/assets/second.webp');
    assert.equal(dialog.querySelector(config.count).textContent,'2 / 2');

    dialog.querySelector(config.expand).click();
    const lightbox=h.dialogs[1],fullscreen=h.bindingFor(config.lightbox);
    assert.ok(fullscreen,'fullscreen stage binds the same gesture controller');
    assert.equal(fullscreen.isEnabled(),true);
    fullscreen.onSwipe(-1);
    assert.equal(dialog.querySelector(config.image).src,'/assets/first.webp');
    assert.equal(dialog.querySelector(config.count).textContent,'1 / 2');
    assert.equal(lightbox.querySelector('img').src,config.firstHd);
    assert.match(lightbox.querySelector(config.label).textContent,/1\/2$/);

    lightbox.querySelector(config.zoom).click();
    assert.equal(fullscreen.isEnabled(),false,'zoomed drag pans the image instead of changing photos');
    lightbox.querySelector(config.zoom).click();
    assert.equal(fullscreen.isEnabled(),true);
    lightbox.close();
    assert.equal(fullscreen.isEnabled(),false,'closed viewers do not consume swipes');
  });
}
