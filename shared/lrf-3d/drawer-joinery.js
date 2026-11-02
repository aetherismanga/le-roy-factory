import * as T from 'three';

// The closed front plane is set by the furniture collection. Build the metal
// drawer up to its rear face; moving the facade would alter overall depth and
// the 19 mm inset option. Rear clearances and siphon cuts remain unchanged.
export function drawerFrontAttachment(facadeCentreZ,facadeThickness){
 if(!Number.isFinite(facadeCentreZ)||!(facadeThickness>0))throw Error('Façade de tiroir invalide.');
 const rearFace=facadeCentreZ-facadeThickness/2,sideRear=-.176,sideDepth=rearFace-sideRear;
 return Object.freeze({rearFace,sideDepth,sideCentre:(rearFace+sideRear)/2,
  counterCentre:rearFace-.005,counterThickness:.010,
  // Floor mesh placement is kept at -1 mm. Its front embeds 2 mm into the
  // counter-front instead of stopping several centimetres behind the wood.
  floorRearLocal:-.176,floorFrontLocal:rearFace-.007,
  adjustmentCentre:rearFace-.0175,adjustmentScrew:rearFace-.026});
}

export function drawerFloorOutline(width,rear,front,radius=.006){
 const half=width/2,r=Math.min(radius,width/4,(front-rear)/4),shape=new T.Shape();
 shape.moveTo(-half+r,rear);shape.lineTo(half-r,rear);shape.quadraticCurveTo(half,rear,half,rear+r);
 shape.lineTo(half,front-r);shape.quadraticCurveTo(half,front,half-r,front);
 shape.lineTo(-half+r,front);shape.quadraticCurveTo(-half,front,-half,front-r);
 shape.lineTo(-half,rear+r);shape.quadraticCurveTo(-half,rear,-half+r,rear);shape.closePath();return shape;
}
