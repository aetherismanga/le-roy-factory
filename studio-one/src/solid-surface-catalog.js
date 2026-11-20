// RANDAL France, tarif vasques Solid Surface du 09/12/2025, page 1.
// Physical dimensions are in cm; prices are the printed public TTC in cents.
export const SOLID_SURFACE = Object.freeze({
 milo: {name:'Milo', ref:'15012', ttc:40800, width:141, depth:46, thickness:2,
  bowlWidth:54, bowlDepth:30, image:'assets/solid-milo.webp'},
 fiona: {name:'Fiona', ref:'15026', ttc:43700, width:141, depth:46, thickness:1.5,
  bowlWidth:50, bowlDepth:26, image:'assets/solid-fiona.webp'}
});
export const solidSurface = id => Object.hasOwn(SOLID_SURFACE,id) ? SOLID_SURFACE[id] : null;
export const integratedTop = id => id==='sella'||id==='tampa'||!!solidSurface(id);
export const defaultBasinColor = id => solidSurface(id)?'matte':'gloss';
export function solidDescription(plan){
 return `Solid Surface blanc mat · ${plan.width} × ${plan.depth} × ${plan.thickness.toLocaleString('fr-FR')} cm · 2 cuves de ${plan.bowlWidth} × ${plan.bowlDepth} cm`;
}
