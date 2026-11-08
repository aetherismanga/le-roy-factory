import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createShowroomVisit} from '../shared/lrf-3d/showroom-visit.js';

class Node{
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.attrs={};this.events=new Map();this.style={};this.textContent='';const names=new Set();this.classList={toggle:(key,next)=>{if(next===undefined)next=!names.has(key);if(next)names.add(key);else names.delete(key);return next;},contains:key=>names.has(key)};}
 setAttribute(name,value){this.attrs[name]=String(value);}
 append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node);}}
 remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(node=>node!==this);this.parentNode=null;}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 addEventListener(type,fn){const list=this.events.get(type)||[];list.push(fn);this.events.set(type,list);}
 emit(type,extra={}){for(const fn of this.events.get(type)||[])fn({type,target:this,preventDefault(){},...extra});}
 showModal(){this.open=true;}
 close(){this.open=false;}
 focus(){this.ownerDocument.activeElement=this;this.focused=true;}
 get childElementCount(){return this.children.length;}
 getBoundingClientRect(){return {left:0,top:0,right:1200,bottom:800};}
}
function all(root,predicate){const found=[];function walk(node){if(predicate(node))found.push(node);for(const child of node.children||[])walk(child);}walk(root);return found;}
function setup(){const doc={createElement:tag=>new Node(tag,doc),activeElement:null},stage=new Node('main',doc),previous=new Node('button',doc),overlays=[];previous.focus();globalThis.document=doc;return {doc,stage,previous,overlays,visit:createShowroomVisit({stage,canvas:new Node('canvas',doc),camera:new T.PerspectiveCamera(),getItems:()=>[],onOverlay:value=>overlays.push(value)})};}
const manufacturer={id:'test-manufacturer',name:'Fabricant test',category:'Carrelage',href:'https://example.com/catalogue',collections:[]};
const collection={id:'test-collection',name:'Collection test',image:'https://example.com/small-preview.webp',hdImage:'https://example.com/native-warm-2400.webp',hdImages:[{url:'https://example.com/native-warm-2400.webp',label:'Chaud · matière',kind:'tile'},{url:'https://example.com/native-dark-2400.webp',label:'Foncé · matière',kind:'tile'}],formats:['60 × 120'],colors:['Chaud','Foncé'],selectedColor:'Chaud',selectedFormat:'60 × 120',href:'https://example.com/collection'};

test('a tapped collection detail loads the selected native original and switches images without eager HD requests',()=>{
 const prior=globalThis.document;try{
  const {stage,visit,overlays}=setup();visit.openCollection(manufacturer,collection);const dialog=stage.children[0];
  assert.equal(dialog.attrs.role,'dialog');assert.equal(dialog.attrs['aria-modal'],'true');assert.equal(visit.blocked,true);assert.deepEqual(overlays,[true]);
  const images=all(dialog,node=>node.tagName==='IMG');assert.equal(images.length,1,'inactive originals have labelled chips, not eagerly decoded full images');assert.equal(images[0].src,collection.hdImage);assert.notEqual(images[0].src,collection.image,'the preview is never presented as the native original');
  const group=all(dialog,node=>node.attrs['aria-label']==='Visuels et coloris de la collection')[0],dark=group.children.find(node=>node.attrs['aria-label']==='Foncé · matière');assert(dark);dark.emit('click');
  assert.equal(images[0].src,collection.hdImages[1].url);assert.equal(dark.attrs['aria-pressed'],'true');assert.equal(visit.blocked,true);assert.deepEqual(overlays,[true],'image selection does not close and restart the visit overlay');
  const raw=all(dialog,node=>node.tagName==='A'&&node.textContent==='Ouvrir l’image originale')[0];assert.equal(raw.href,collection.hdImages[1].url);assert.equal(raw.rel,'noopener noreferrer');visit.close();
 }finally{globalThis.document=prior;}
});

test('native-size zoom, cancel and focus restoration keep the surrounding visit usable',()=>{
 const prior=globalThis.document;try{
  const {stage,visit,previous,overlays}=setup();visit.openCollection(manufacturer,collection);const dialog=stage.children[0],hero=all(dialog,node=>node.className==='lrf-showroom-hero')[0],zoom=all(dialog,node=>node.tagName==='BUTTON'&&node.textContent==='Zoom 100 %')[0];
  zoom.emit('click');assert.equal(hero.classList.contains('is-zoomed'),true);assert.equal(zoom.attrs['aria-pressed'],'true');hero.scrollLeft=180;hero.scrollTop=100;hero.emit('click');assert.equal(hero.classList.contains('is-zoomed'),false);assert.equal(hero.scrollLeft,0);assert.equal(hero.scrollTop,0);
  dialog.emit('cancel');assert.equal(visit.blocked,false);assert.equal(stage.children.length,0);assert.equal(previous.ownerDocument.activeElement,previous);assert.deepEqual(overlays,[true,false]);
 }finally{globalThis.document=prior;}
});
