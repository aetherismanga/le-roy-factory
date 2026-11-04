import {AQUAHOME,makeTap} from '@studio-one-original/taps.js';
import {aquahomeProfile} from '../../../shared/lrf-3d/aquahome-profiles.js';
import {checkAnimaTapCompatibility} from './tap-compatibility.js';
import {resolveAnimaTapSettings} from './tap-installation.js';
export function planTapCompatibility(asset,product){
 let profile;try{profile=aquahomeProfile(product);}catch{return {compatible:false,reason:'Référence de mitigeur sans géométrie validée.',placements:[]};}
 return checkAnimaTapCompatibility(product,{top:asset?.tops?.root?.userData?.animaTop,holes:asset?.getTapPositions?.()||[],topOffset:asset?.tops?.root?.position?.x||0},profile);
}
export function compatibleAnimaTaps(asset,products=AQUAHOME){return products.filter(product=>['basin','basin-xl'].includes(product.use)&&planTapCompatibility(asset,product).compatible);}
export function exactAnimaTap(reference){return AQUAHOME.find(product=>product.reference===reference)||null;}

function discardPreviewTap(asset,key){const root=asset[key];if(!root)return;root.removeFromParent();const geometries=new Set(),materials=new Set();root.traverse(node=>{if(node.isMesh){geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material);}});for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();asset[key]=null;}
// Resolve the automatic mode for old and new saved compositions without
// mutating project data. Explicit 'none' and wall associations remain binding.
export function syncAnimaPreviewTap(asset,settings={}){
 for(const tap of asset?.faucets||[asset?.faucet])if(tap)tap.visible=false;
 const context={top:asset?.tops?.root?.userData?.animaTop,holes:asset?.getTapPositions?.()||[],topOffset:asset?.tops?.root?.position?.x||0};
 const normalized=resolveAnimaTapSettings(settings,context,{products:AQUAHOME,profileForProduct:aquahomeProfile}),product=exactAnimaTap(normalized.tap),check=product?planTapCompatibility(asset,product):{compatible:false,placements:[],reason:''};
 if(!check.compatible){discardPreviewTap(asset,'aquaTap');discardPreviewTap(asset,'aquaTapExtra');return check;}
 const keys=['aquaTap','aquaTapExtra'];for(const [index,placement]of check.placements.entries()){const key=keys[index];if(!key)continue;if(asset[key]?.userData.reference!==product.reference){discardPreviewTap(asset,key);asset[key]=makeTap(product);asset.root.add(asset[key]);}asset[key].position.set(placement.x,placement.y,placement.z);asset[key].rotation.y=placement.rotationY;asset[key].visible=true;}
 for(let index=check.placements.length;index<keys.length;index++)discardPreviewTap(asset,keys[index]);return check;
}
