import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=readFileSync(new URL('../assets/js/inspirations-biopietra.js',import.meta.url),'utf8');
const data=JSON.parse(readFileSync(new URL('../assets/data/biopietra-catalogue.json',import.meta.url)));
function harness(slug) {
  let dialog;
  const node=()=>({value:'',textContent:'',dataset:{},style:{},setAttribute(){},addEventListener(){},focus(){},classList:{add(){},remove(){},toggle(){return false}}});
  const document={activeElement:null,body:{style:{},appendChild(el){dialog ||= el}},createElement(){
    const nodes=new Map(),el={...node(),open:false,html:'',
      set innerHTML(value){this.html=value;nodes.clear()},get innerHTML(){return this.html},
      querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector)},
      querySelectorAll(){return []},showModal(){this.open=true},close(){this.open=false}
    };return el;
  }};
  const window={BIOPIETRA_CATALOGUE:data.collections};
  vm.runInNewContext(script,{window,document,URLSearchParams});
  assert.equal(window.LRF_BIOPIETRA_SELECTION.openCollection(slug),true);
  return {dialog,window,setVariant(id){dialog.querySelector('#bpc-variant').onchange({target:{value:id}})},setQuantity(value){dialog.querySelector('#bpc-quantity').value=value;dialog.querySelector('#bpc-quantity').oninput()},output:()=>dialog.querySelector('#bpc-pack-result').textContent};
}

test('Toscana distinguishes 3 cm half-square-metre boxes from 1.5 cm angle cartons',()=>{
  const h=harness('listello-toscana');
  assert.match(h.output(),/Choisissez l’élément/);
  h.setVariant('fondo-3-cm');h.setQuantity('10,2');
  assert.match(h.output(),/21 boîtes · 10,5 m²/);
  h.setVariant('angle-1-50-cm');
  assert.match(h.output(),/11 boîtes · 11 ml/);
  assert.match(h.dialog.querySelector('#bpc-order').href,/variant=angle-1-50-cm/);
});

test('a named Mix keeps its exact composition and a single official collection source',()=>{
  const product=data.collections.find(p=>p.slug==='mix-ste-34'),h=harness(product.slug);
  assert.match(h.dialog.innerHTML,/Stelvio M92 50%, Stelvio M96 50%/);
  assert.match(h.dialog.querySelector('#bpc-chosen-color').textContent,/Mélange défini/);
  assert.equal((h.dialog.innerHTML.match(/class="bpc-source"/g)||[]).length,1);
  assert.ok(h.dialog.innerHTML.includes(product.sourceUrl));
  assert.doesNotMatch(h.dialog.innerHTML,/href="assets\/pdf\/biopietra|\d+[,.]\d{2}\s*€/);
});
