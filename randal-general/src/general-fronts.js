import * as T from 'three';
// A continuous, closed 19 mm panel. The 16 mm pitch and recessed dark cuts
// are modelled in the cross-section, not painted stripes or pasted photos.
export function flutedFront(width,height,thickness,origin){
 const pitch=.016,cut=.0022,depth=.0038,bevel=.00055;
 const profile=[[-width/2,-thickness/2],[width/2,-thickness/2],[width/2,thickness/2]];
 const cuts=[];for(let x=Math.ceil(-width/2/pitch)*pitch;x<width/2-pitch*.3;x+=pitch)if(x>-width/2+pitch*.3)cuts.push(x);
 for(const x of cuts.reverse()){
  profile.push([x+cut/2+bevel,thickness/2],[x+cut/2,thickness/2-bevel],[x+cut/2,thickness/2-depth+bevel],[x+cut/2-bevel,thickness/2-depth],[x-cut/2+bevel,thickness/2-depth],[x-cut/2,thickness/2-depth+bevel],[x-cut/2,thickness/2-bevel],[x-cut/2-bevel,thickness/2]);
 }
 profile.push([-width/2,thickness/2]);
 const positions=[],uv=[],groups=[];
 function triangle(a,b,c,mat=0){const start=positions.length/3;for(const p of [a,b,c]){positions.push(...p);uv.push((p[0]+origin.x)/.8+.5,(p[1]+origin.y)/.7);}groups.push({start,count:3,materialIndex:mat});}
 for(let i=0;i<profile.length;i++){
  const a=profile[i],b=profile[(i+1)%profile.length],mat=a[1]<thickness/2-depth+.0001&&b[1]<thickness/2-depth+.0001&&a[1]>0?1:0;
  triangle([a[0],-height/2,a[1]],[a[0],height/2,a[1]],[b[0],height/2,b[1]],mat);
  triangle([a[0],-height/2,a[1]],[b[0],height/2,b[1]],[b[0],-height/2,b[1]],mat);
 }
 const cap=T.ShapeUtils.triangulateShape(profile.map(p=>new T.Vector2(...p)),[]);
 for(const [a,b,c]of cap){triangle([profile[c][0],height/2,profile[c][1]],[profile[b][0],height/2,profile[b][1]],[profile[a][0],height/2,profile[a][1]]);triangle([profile[a][0],-height/2,profile[a][1]],[profile[b][0],-height/2,profile[b][1]],[profile[c][0],-height/2,profile[c][1]]);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 // Keep only two draw ranges by ordering the material groups once.
 const ordered=[],orderedUV=[];for(const material of [0,1]){const start=ordered.length/3;for(const g of groups)if(g.materialIndex===material){ordered.push(...positions.slice(g.start*3,(g.start+3)*3));orderedUV.push(...uv.slice(g.start*2,(g.start+3)*2));}geometry.addGroup(start,ordered.length/3-start,material);}
 geometry.setAttribute('position',new T.Float32BufferAttribute(ordered,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(orderedUV,2));geometry.computeVertexNormals();geometry.userData={pitch,cutDepth:depth,thickness};return geometry;
}
// ARUBA's slim, gently bowed edge pull, visible on both plain and fluted fronts.
export function arubaPull(width){
 const w=Math.min(.38,width*.58),s=new T.Shape();s.moveTo(-w/2,.001);s.quadraticCurveTo(0,-.014,w/2,.001);s.lineTo(w/2,-.004);s.quadraticCurveTo(0,-.021,-w/2,-.004);s.closePath();
 return new T.ExtrudeGeometry(s,{depth:.020,bevelEnabled:true,bevelSize:.00055,bevelThickness:.00055,bevelSegments:2,curveSegments:32});
}
// Cross-section shown on BOREAL p.24: aluminium inverted U, long front leg.
export function borealPull(width){
 const section=new T.Shape();section.moveTo(-.019,-.009);section.lineTo(-.016,-.009);section.lineTo(-.016,.006);section.lineTo(.011,.006);section.lineTo(.011,-.030);section.lineTo(.014,-.030);section.lineTo(.014,.009);section.lineTo(-.019,.009);section.closePath();
 const g=new T.ExtrudeGeometry(section,{depth:width,bevelEnabled:true,bevelSize:.00045,bevelThickness:.00045,bevelSegments:2,curveSegments:4});g.rotateY(-Math.PI/2);g.translate(width/2,0,0);return g;
}
