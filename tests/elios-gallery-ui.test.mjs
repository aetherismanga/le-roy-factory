import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import model from '../assets/js/elios-selection-media-model.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('assets/js/inspirations-elios-gallery-v2.js');
const actual={window:{}};
vm.runInNewContext(read('assets/js/inspirations-elios-data.js'),actual);
vm.runInNewContext(read('assets/js/inspirations-elios-color-media-20261101.js'),actual);
const product=actual.window.ELIOS_CATALOGUE.find(p=>p.slug==='allure');
const media=actual.window.ELIOS_COLOR_MEDIA;

function harness({extraColor=''}={}) {
  const registry=new Map();
  function node(className='') {
    const listeners=new Map(),classes=new Set(className.split(/\s+/).filter(Boolean)),children=new Map();
    const el={dataset:{},hidden:false,textContent:'',style:{},html:'',buttons:[],className,
      classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c),toggle(c,on){on=on??!classes.has(c);on?classes.add(c):classes.delete(c);return on;}},
      setAttribute(name,value){this[name]=value},getAttribute(name){return this[name]},
      addEventListener(type,listener){listeners.set(type,listener)},
      fire(type,event={}){listeners.get(type)?.({target:el,stopPropagation(){},preventDefault(){},...event})},
      querySelector(selector){if(!children.has(selector))children.set(selector,node());return children.get(selector)},
      querySelectorAll(selector){return selector==='button'?this.buttons:[]},
      remove(){},
      set innerHTML(value){
        this.html=value;
        this.buttons=[...value.matchAll(/<button\b[^>]*data-elios-color="([^"]+)"[^>]*>/g)].map(match=>{
          const button=node(match[0].includes('verified')?'verified':'');button.dataset.eliosColor=match[1];
          button.closest=selector=>selector==='[data-elios-color]'?button:null;
          return button;
        });
      },get innerHTML(){return this.html}
    };
    return el;
  }
  const grid=node(),modal=node('open'),card=node(),main=node(),info=node(),oldImage=node(),oldColors=node('chips'),heading=node();
  let gallery,colorBox;
  oldImage.replaceWith=el=>{gallery=el};oldColors.replaceWith=el=>{colorBox=el};
  heading.textContent='Couleurs / déclinaisons';heading.nextElementSibling=oldColors;
  info.querySelectorAll=selector=>selector==='h4'?[heading]:[];
  main.querySelector=selector=>selector==='.elios-gallery-v3'?gallery:selector===':scope > img, .modal-v2-main > img'?oldImage:null;
  card.querySelector=selector=>selector==='.modal-v2-main'?main:selector==='.modal-v2-info'?info:selector==='.modal-v2-info h2, h2'?{textContent:'Allure'}:null;
  registry.set('partner-products',grid);registry.set('product-modal-v2',modal);registry.set('product-modal-v2-card',card);
  const document={getElementById:id=>registry.get(id),createElement:()=>node(),body:{classList:node().classList,appendChild:el=>registry.set(el.id,el)},addEventListener(){}};
  const juniper=media.variants.allure.Juniper[0],fenix=media.variants.allure['Fenix Juniper'][0];
  const window={ELIOS_CATALOGUE:[{...product,colors:[...product.colors,...(extraColor?[extraColor]:[])]}],
    ELIOS_SELECTION_MEDIA_MODEL:model,ELIOS_COLOR_MEDIA:media,
    ELIOS_VERIFIED_VARIANTS:{allure:{Eden:['https://example.invalid/legacy-eden.jpg']}},
    ELIOS_SELECTION_MEDIA:{galleries:{allure:[juniper,fenix]},variants:{allure:{Eden:['https://example.invalid/partial-refresh.jpg']}}}};
  vm.runInNewContext(source,{window,document,MutationObserver:class{observe(){}},getComputedStyle:()=>({display:'flex'}),setTimeout:fn=>fn()});
  return {gallery,colorBox,mainImage:gallery.querySelector('.elios-gallery-main'),status:gallery.querySelector('.elios-gallery-status'),label:gallery.querySelector('.elios-gallery-image-label'),
    select(color){const button=colorBox.buttons.find(b=>b.dataset.eliosColor===color);assert.ok(button,'Rendered colour '+color);colorBox.fire('click',{target:button})},
    next(){gallery.querySelector('.next').fire('click')},
    openImage(){gallery.querySelector('.elios-gallery-stage').fire('click',{target:{closest:()=>null}});return registry.get('elios-gallery-lightbox')}
  };
}

test('Allure renders the nine real colour cards with their verified previews',()=>{
  const h=harness();
  assert.equal(h.colorBox.buttons.length,9);
  for(const color of product.colors)assert.ok(h.colorBox.buttons.some(button=>button.dataset.eliosColor===color),color);
  assert.equal((h.colorBox.innerHTML.match(/<img /g)||[]).length,9);
  assert.doesNotMatch(h.colorBox.innerHTML,/Visuel à confirmer/);
});

test('each Allure preview opens an original with at least 400 pixels on its shortest side',()=>{
  for(const color of product.colors){
    const url=model.imagesForColor(media.variants.allure,color)[0],asset=media.assets[url];
    assert.ok(asset?.original,color+' has an identified original');
    assert.ok(Math.min(asset.width,asset.height)>=400,color+' must not enlarge a tiny catalogue swatch');
    assert.notEqual(asset.definitionLimited,true,color+' original definition');
    if(asset.original.startsWith('assets/')){
      const bytes=readFileSync(new URL('../'+asset.original,import.meta.url));
      assert.equal(bytes.subarray(0,4).toString(),'RIFF',color+' local WebP header');
      assert.equal(bytes.subarray(8,12).toString(),'WEBP',color+' local WebP format');
    }
  }
});

test('Fenix Juniper selection and enlargement keep the exact HD original',()=>{
  const h=harness();h.select('Fenix Juniper');
  const url=media.variants.allure['Fenix Juniper'][0],original=media.assets?.[url]?.original||url;
  assert.equal(h.mainImage.src,original);
  assert.equal(h.mainImage.alt,'Allure · Fenix Juniper — Elios Ceramica');
  assert.equal(h.label.textContent,'Allure · Fenix Juniper');
  const box=h.openImage();
  assert.equal(box.querySelector('.elios-lightbox-image').src,original);
  assert.match(box.querySelector('.elios-lightbox-caption').textContent,/Allure · Fenix Juniper/);
});

test('an unavailable selected image reports the error without substituting another colour',()=>{
  const h=harness();h.select('Fenix Juniper');const before=h.mainImage.src;
  h.mainImage.onerror();
  assert.equal(h.mainImage.src,before);
  assert.equal(h.mainImage.hidden,true);
  assert.equal(h.status.hidden,false);
  assert.match(h.status.textContent,/Allure · Fenix Juniper.*n’a pas pu être chargé/);
});

test('an unknown colour remains explicit while collection navigation uses truthful captions',()=>{
  const h=harness({extraColor:'Teinte non documentée'});
  assert.match(h.colorBox.innerHTML,/Visuel à confirmer/);
  h.select('Teinte non documentée');
  assert.match(h.status.textContent,/Le visuel exact du coloris Teinte non documentée reste à confirmer/);
  assert.match(h.status.textContent,/images affichées sont celles de la collection/);
  assert.doesNotMatch(h.mainImage.alt,/Teinte non documentée/);
  assert.equal(h.label.textContent,'Allure · Juniper');
  h.next();
  assert.equal(h.label.textContent,'Allure · Fenix Juniper');
  assert.equal(h.mainImage.alt,'Allure · Fenix Juniper — Elios Ceramica');
});
