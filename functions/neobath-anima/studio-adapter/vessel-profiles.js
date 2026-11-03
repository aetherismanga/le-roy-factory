import * as T from 'three';

// Only the external W/D/H are manufacturer dimensions. Curves, wall gauge,
// ledge and mounting proportions below reconstruct the catalogue photographs;
// they must never be used as machining or installation templates.
export function animaVesselProfile(product={}){
  const ref=String(product.ref||'').toUpperCase(),shape=product.basinGeometry||product.shape||'';
  const family=/FO01|B578|ECLISSE116/.test(ref)?'round':/FO03/.test(ref)?'square':/FO04|PF149380|ECLISSE114|B571|B860|B861|B862/.test(ref)?'rectangle':/FO02|CVR45|ECLISSE115/.test(ref)?'oval':/round|circle|rond/.test(shape)?'round':/oval|ovale/.test(shape)?'oval':'rectangle';
  const width=(product.width||40)/100,depth=(product.depth||40)/100,height=(product.height||14)/100,power=['round','oval'].includes(family)?2:/B571|B860|B861|B862/.test(ref)?12:family==='square'?8:4.5;
  // DNA PDF 42 / composition 012 identifies this photo as ECLISSE114/S.
  // No equivalent ledge is documented for 114 à poser, 115 or 116.
  const ledge=/^ECLISSE114\s*\/\s*S$/.test(ref);
  return {family,width,depth,height,power,openingWidth:ledge?width-.016:width*(family==='round'||family==='oval'?.354/.370:.446/.460),openingDepth:ledge?depth-.098:depth*(family==='round'||family==='oval'?.354/.370:.316/.330),openingOffsetZ:ledge?.036:0,
    tap:ledge?{x:0,z:-depth/2+.044,radius:.017,mount:'basin',approximate:true}:null,
    reconstruction:{approximate:true,externalDimensions:'catalogue',sourcePdf:'ANIMA',sourcePdfPage:75,...(ledge?{designSourcePdf:'DNA',designSourcePdfPage:42,sourceComposition:'012',note:'Plage arrière et proportions de cuve reconstruites depuis la photographie ECLISSE114/S ; perçages et découpe à confirmer sur le gabarit fabricant.'}:{note:'Courbure et épaisseur de paroi reconstruites depuis la photographie de famille ; dimensions extérieures conservées.'})}};
}

export function vesselContour(width,depth,power=4.5,n=128,x=0,z=0){
  return Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a);return [x+width/2*(Math.abs(c)<1e-12?0:Math.sign(c)*Math.abs(c)**(2/power)),z+depth/2*(Math.abs(s)<1e-12?0:Math.sign(s)*Math.abs(s)**(2/power))];});
}

// One closed shell, with a continuous real inner cavity, waste passage and a
// drilled rear ledge. The tap passage continues through the hidden underside;
// the manufacturer's internal section is not supplied in the catalogue.
export function animaLedgeVesselGeometry(profile){
  const {width:W,depth:D,height:H,power:P,openingWidth:OW,openingDepth:OD,openingOffsetZ:OZ,tap}=profile,N=128;
  const positions=[],uv=[],indices=[];
  const circle=(radius,x=0,z=0)=>vesselContour(radius*2,radius*2,2,N,x,z);
  const ring=(points,y)=>{const start=positions.length/3;for(const [x,z]of points){positions.push(x,y,z);uv.push(x/.8+.5,z/.7+.5);}return {points,y,start};};
  const triangle=(a,b,c,direction)=>{const p=i=>new T.Vector3(...positions.slice(i*3,i*3+3));const A=p(a),B=p(b),C=p(c),cross=B.sub(A).cross(C.sub(A));if(cross.dot(direction)<0)indices.push(a,c,b);else indices.push(a,b,c);};
  const join=(a,b,inside=false)=>{const centreZ=[...a.points,...b.points].reduce((sum,p)=>sum+p[1],0)/(N*2);for(let i=0;i<N;i++){const j=(i+1)%N,cx=(a.points[i][0]+a.points[j][0]+b.points[i][0]+b.points[j][0])/4,cz=(a.points[i][1]+a.points[j][1]+b.points[i][1]+b.points[j][1])/4;const normal=Math.abs(a.y-b.y)<1e-10?new T.Vector3(0,inside?1:-1,0):new T.Vector3(cx,0,cz-centreZ).multiplyScalar(inside?-1:1);triangle(a.start+i,b.start+i,a.start+j,normal);triangle(b.start+i,b.start+j,a.start+j,normal);}};
  const cap=(outer,holes,up)=>{const contours=[outer,...holes],vectors=contours.map(r=>r.points.map(([x,z])=>new T.Vector2(x,z))),map=contours.flatMap(r=>r.points.map((_,i)=>r.start+i));for(const tri of T.ShapeUtils.triangulateShape(vectors[0],vectors.slice(1)))triangle(...tri.map(i=>map[i]),new T.Vector3(0,up?1:-1,0));};
  const outer=[ring(vesselContour(W*.95,D*.95,P),0),ring(vesselContour(W*.975,D*.975,P),.003),ring(vesselContour(W,D,P),H-.002),ring(vesselContour(W-.0006,D-.0006,P),H)];
  for(let i=0;i<outer.length-1;i++)join(outer[i],outer[i+1]);
  const inner=[ring(vesselContour(OW,OD,P,N,0,OZ),H),ring(vesselContour(OW-.001,OD-.001,P,N,0,OZ),H-.002),ring(vesselContour(OW-.008,OD-.008,P,N,0,OZ),H-.010),ring(vesselContour(W*.82,D*.58,P,N,0,.025),.035),ring(vesselContour(W*.72,D*.49,P,N,0,.020),.024),ring(vesselContour(.16,.12,3,N),.018),ring(circle(.021),.018),ring(circle(.021),0)];
  for(let i=0;i<inner.length-1;i++)join(inner[i],inner[i+1],true);
  const tapUpper=ring(circle(tap.radius,tap.x,tap.z),H),tapLower=ring(circle(tap.radius,tap.x,tap.z),0);
  // Tap wall faces into the cylindrical hole, independently of the bowl's
  // shifted opening centre.
  for(let i=0;i<N;i++){const j=(i+1)%N,normal=new T.Vector3(tap.x-(tapUpper.points[i][0]+tapUpper.points[j][0])/2,0,tap.z-(tapUpper.points[i][1]+tapUpper.points[j][1])/2);triangle(tapUpper.start+i,tapLower.start+i,tapUpper.start+j,normal);triangle(tapLower.start+i,tapLower.start+j,tapUpper.start+j,normal);}
  cap(outer.at(-1),[inner[0],tapUpper],true);cap(outer[0],[inner.at(-1),tapLower],false);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.userData.animaVessel={...profile,sourceProfile:'eclisse114-s-rear-ledge',outerSections:[{y:0,width:W*.95,depth:D*.95},{y:.003,width:W*.975,depth:D*.975},{y:H-.002,width:W,depth:D},{y:H,width:W-.0006,depth:D-.0006}]};return g;
}
