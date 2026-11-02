import * as T from 'three';
import {makeCatalogueMirror as studioMakeMirror,roundedShape} from '@studio-one-original/mirrors.js';
import {PRODUCTS} from './anima-data.js';
export {roundedShape};
const products=PRODUCTS.filter(p=>p.category==='mirror');
const shapeFor=p=>p.shape==='round'||/Rond|rotond/i.test(p.label)||p.width===p.height?'round':p.shape==='oval'||/ovale|Arona/i.test(p.label)?'oval':'rect';
export const MIRRORS=Object.freeze(products.map(p=>({id:p.id,name:p.label,led:!!p.backlit,metal:/cadre satin|SFT/i.test(p.label+' '+p.ref),shape:shapeFor(p),sizes:[[p.width,p.height,p.ref]],sourceProduct:p})));
export const MIRROR_METALS=Object.freeze([{id:'Argent',hex:'#bdc4c4'}]);
export function mirrorSpec(settings={}){
  const m=MIRRORS.find(m=>m.id===settings.mirrorModel)||MIRRORS[0],p=m.sourceProduct;
  return {...m,width:p.width/100,height:p.height/100,reference:p.ref,size:[p.width,p.height,p.ref],source:p.source,sourceProductId:p.id};
}
export function mirrorGeometry(settings={},inset=0){const s=mirrorSpec(settings),w=s.width-inset*2,h=s.height-inset*2;if(s.shape==='round')return new T.CircleGeometry(w/2,96);if(s.shape==='oval'){const shape=new T.Shape();shape.absellipse(0,0,w/2,h/2,0,Math.PI*2,false);return new T.ShapeGeometry(shape,96);}return new T.ShapeGeometry(roundedShape(w,h,.006),48);}
export function makeCatalogueMirror(settings={}){
  const spec=mirrorSpec(settings),original=studioMakeMirror({mirrorModel:spec.shape==='round'?'round':spec.shape==='oval'?'capsule':spec.led?'zen':spec.metal?'metal-rect':'basic',mirrorFinish:'Argent',led:settings.led??spec.led});
  const sx=spec.width/original.spec.width,sy=spec.height/original.spec.height;
  original.root.traverse(o=>{if(!o.isMesh)return;const prior=o.geometry;o.geometry=prior.clone();o.geometry.scale(sx,sy,1);prior.dispose();o.position.x*=sx;o.position.y*=sy;});
  // Reflective surface geometry is supplied by the existing Studio One renderer.
  // Adapt the source silhouette while keeping its frame/lighting machinery.
  const backing=original.root.getObjectByName('Cadre_metal_noir');if(backing){backing.geometry.dispose();backing.geometry=mirrorGeometry(settings);}
  original.root.name='NEOBATH_ANIMA_MIROIR_'+spec.reference;original.spec=spec;return original;
}
