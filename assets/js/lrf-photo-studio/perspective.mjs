/** Local image-line analysis. The segmentation silhouette never defines a floor plane. */
import {validateQuad,planeProjection} from './geometry.mjs';
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const n=Math.hypot(...a);return n>1e-10?a.map(v=>v/n):null;};
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const line=(a,b)=>{const l=cross([a.x,a.y,1],[b.x,b.y,1]),n=Math.hypot(l[0],l[1]);return n>1e-9?l.map(v=>v/n):null;};
const point=v=>Math.abs(v[2])>1e-8?{x:v[0]/v[2],y:v[1]/v[2]}:null;
const intersection=(a,b)=>a&&b?point(cross(a,b)):null;
/** A reference rectangle may not put the visible floor behind its horizon. */
export function projectionCoverage(quad,mask){
 const h=planeProjection(quad),step=3;let floor=0,covered=0;
 for(let y=0;y<mask.height;y+=step)for(let x=0;x<mask.width;x+=step)if(mask.data[y*mask.width+x]>127){floor++;const nx=(x+.5)/mask.width,ny=(y+.5)/mask.height,d=h[6]*nx+h[7]*ny+h[8];if(d>1e-5)covered++;}
 return floor?covered/floor:0;
}

/** Metric aspect from the two floor directions, in photo pixels (never viewport units).
 * With a finite orthogonal vanishing pair, solve focal length under square pixels
 * and a centered principal point. Otherwise it remains an indicative camera prior.
 */
export function planeDimensions(quad,width,height,widthMm=3600){
 if(!validateQuad(quad)||!(width>0&&height>0))throw Error('Perspective invalide.');
 const q=quad.map(p=>({x:p.x*width,y:p.y*height}));
 const vx=cross(line(q[0],q[1]),line(q[3],q[2])),vy=cross(line(q[0],q[3]),line(q[1],q[2]));
 const cx=width/2,cy=height/2,max=Math.max(width,height),px=point(vx),py=point(vy);
 let focal=.85*max,source='indicative-camera';
 if(px&&py){const squared=-((px.x-cx)*(py.x-cx)+(px.y-cy)*(py.y-cy));if(squared>(.25*max)**2&&squared<(4*max)**2){focal=Math.sqrt(squared);source='orthogonal-vanishing-points';}}
 const ray=v=>unit([(v[0]-cx*v[2])/focal,(v[1]-cy*v[2])/focal,v[2]]);
 const ux=ray(vx),uy=ray(vy),normal=ux&&uy?unit(cross(ux,uy)):null;
 if(!normal)throw Error('Les directions du sol sont confondues.');
 const positions=q.map(p=>{const r=[(p.x-cx)/focal,(p.y-cy)/focal,1],d=dot(normal,r);if(Math.abs(d)<1e-7)return null;return {d,p:r.map(v=>v/d)};});
 if(positions.some(p=>!p)||positions.some(p=>Math.sign(p.d)!==Math.sign(positions[0].d)))throw Error('Le rectangle traverse l’horizon du sol.');
 const distance=(a,b)=>Math.hypot(...a.p.map((v,i)=>v-b.p[i]));
 const across=(distance(positions[0],positions[1])+distance(positions[3],positions[2]))/2;
 const depth=(distance(positions[0],positions[3])+distance(positions[1],positions[2]))/2;
 const ratio=depth/across;if(!(ratio>.03&&ratio<30))throw Error('Rectangle de perspective trop étroit.');
 // An unmeasured reference patch has no fixed 3.6 m width. Use a camera-height
 // prior only for initial apparent scale, so shrinking the patch does not shrink
 // every tile. Two user-entered measurements replace this indicative prior.
 if(widthMm===null)widthMm=Math.round(across*1500);
 if(!(widthMm>=50&&widthMm<=100000))throw Error('Choisissez un rectangle du sol plus proche et bien visible.');
 return {planeWidthMm:widthMm,planeHeightMm:Math.round(widthMm*ratio),source,focalPixels:focal};
}

/** Oriented Hough segments inside the predicted floor, excluding object boundaries. */
export function floorLines(image,mask){
 if(image?.data?.length!==image.width*image.height*4||mask?.width!==image.width||mask?.height!==image.height)throw Error('Image et zone de sol incohérentes.');
 const scale=Math.min(1,300/Math.max(image.width,image.height)),w=Math.round(image.width*scale),h=Math.round(image.height*scale),gray=new Float32Array(w*h),valid=new Uint8Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=Math.min(image.width-1,Math.floor((x+.5)/scale)),sy=Math.min(image.height-1,Math.floor((y+.5)/scale)),p=(sy*image.width+sx)*4;gray[y*w+x]=.2126*image.data[p]+.7152*image.data[p+1]+.0722*image.data[p+2];valid[y*w+x]=mask.data[sy*image.width+sx]>220?1:0;}
 const blurred=new Float32Array(gray.length);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)n+=gray[(y+dy)*w+x+dx];blurred[y*w+x]=n/9;}
 const edges=[],strength=[];
 for(let y=3;y<h-3;y++)for(let x=3;x<w-3;x++){
  const i=y*w+x;if(!valid[i]||!valid[i-2]||!valid[i+2]||!valid[i-2*w]||!valid[i+2*w])continue;
  const gx=blurred[i+1]-blurred[i-1],gy=blurred[i+w]-blurred[i-w],m=Math.hypot(gx,gy);if(m<4)continue;
  let angle=Math.atan2(gy,gx);if(angle<0)angle+=Math.PI;if(angle>=Math.PI)angle-=Math.PI;
  edges.push({x,y,m,angle});strength.push(m);
 }
 if(edges.length<60)return [];
 strength.sort((a,b)=>a-b);const threshold=Math.max(5,strength[Math.floor(strength.length*.60)]),points=edges.filter(p=>p.m>=threshold);
 const bins=90,diag=Math.ceil(Math.hypot(w,h)),stride=diag*2+1,acc=new Float32Array(bins*stride),trig=Array.from({length:bins},(_,i)=>[Math.cos(i*Math.PI/bins),Math.sin(i*Math.PI/bins)]);
 for(const p of points){const center=Math.round(p.angle/Math.PI*bins);for(let delta=-2;delta<=2;delta++){const t=(center+delta+bins)%bins,r=Math.round(p.x*trig[t][0]+p.y*trig[t][1])+diag;if(r>=0&&r<stride)acc[t*stride+r]+=Math.min(32,p.m);}}
 const peaks=[];
 for(let t=0;t<bins;t++)for(let r=0;r<stride;r++){const score=acc[t*stride+r];if(score>220)peaks.push({t,r,score});}
 peaks.sort((a,b)=>b.score-a.score);const selected=[],segments=[];
 for(const peak of peaks){if(selected.some(p=>Math.min(Math.abs(p.t-peak.t),bins-Math.abs(p.t-peak.t))<3&&Math.abs(p.r-peak.r)<6))continue;
  const [a,b]=trig[peak.t],c=diag-peak.r,samples=points.filter(p=>Math.abs(a*p.x+b*p.y+c)<1.25&&Math.abs(Math.cos(p.angle-peak.t*Math.PI/bins))>.99);
  if(samples.length<15)continue;
  const coordinates=samples.map(p=>-b*p.x+a*p.y).sort((x,y)=>x-y),lo=coordinates[Math.floor(coordinates.length*.04)],hi=coordinates[Math.floor(coordinates.length*.96)],length=hi-lo;
  if(length<diag*.18||samples.length/length<.28)continue;
  const mx=samples.reduce((s,p)=>s+p.x,0)/samples.length,my=samples.reduce((s,p)=>s+p.y,0)/samples.length;
  let xx=0,xy=0,yy=0;for(const p of samples){const dx=p.x-mx,dy=p.y-my;xx+=dx*dx;xy+=dx*dy;yy+=dy*dy;}
  const theta=.5*Math.atan2(2*xy,xx-yy);let na=-Math.sin(theta),nb=Math.cos(theta),nc=-na*mx-nb*my;if(Math.abs(na*a+nb*b)<.999){na=a;nb=b;nc=c;}
  selected.push(peak);segments.push({a:na,b:nb,c:nc/scale,x:mx/scale,y:my/scale,length:length/scale,support:Math.min(1,samples.length/length)});
  if(segments.length>=56)break;
 }
 return segments;
}
function angularError(l,vp){const d=Math.hypot(vp.x-l.x,vp.y-l.y);return d>1?Math.abs(l.a*vp.x+l.b*vp.y+l.c)/d:1;}
export function depthVanishingPoint(lines,width,height,farY=height*.65){
 const candidates=lines.filter(l=>Math.abs(l.a)>.28);let best=null;
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
  const a=candidates[i],b=candidates[j],vp=intersection([a.a,a.b,a.c],[b.a,b.b,b.c]);
  if(!vp||vp.x< -2*width||vp.x>3*width||vp.y< -height||vp.y>farY-height*.04)continue;
  const inliers=candidates.filter(l=>angularError(l,vp)<.04),spread=inliers.length?Math.max(...inliers.map(l=>l.x))-Math.min(...inliers.map(l=>l.x)):0;
  if(inliers.length<3||spread<width*.08)continue;
  const score=inliers.reduce((s,l)=>s+l.length*l.support*(1-angularError(l,vp)/.04),0);
  if(!best||score>best.score)best={...vp,inliers,score};
 }
 if(!best||best.score<Math.hypot(width,height)*.55)return null;
 // Angular least squares avoids favoring intersections close to one segment.
 for(let pass=0;pass<3;pass++){let aa=0,ab=0,bb=0,ac=0,bc=0;for(const l of best.inliers){const weight=l.length*l.support/Math.max(100,(best.x-l.x)**2+(best.y-l.y)**2);aa+=weight*l.a*l.a;ab+=weight*l.a*l.b;bb+=weight*l.b*l.b;ac-=weight*l.a*l.c;bc-=weight*l.b*l.c;}const d=aa*bb-ab*ab;if(Math.abs(d)<1e-12)break;best.x=(ac*bb-bc*ab)/d;best.y=(bc*aa-ac*ab)/d;}
 if(best.y>farY-height*.04||best.x< -2*width||best.x>3*width)return null;
 return {x:best.x,y:best.y,lineCount:best.inliers.length,confidence:Math.min(.9,best.score/(Math.hypot(width,height)*2)),inliers:best.inliers};
}
function transverseVanishingPoint(lines,depth,width,height,far){
 const candidates=lines.filter(l=>!depth.inliers.includes(l)&&angularError(l,depth)>.07&&Math.abs(l.b)>.35);let best=null;
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
  const a=candidates[i],b=candidates[j],vp=intersection([a.a,a.b,a.c],[b.a,b.b,b.c]);
  if(!vp||Math.abs(vp.x)>width*60||vp.y>far+height*.05||vp.y< -height*6||Math.hypot(vp.x-depth.x,vp.y-depth.y)<width*.6)continue;
  const f2=-((vp.x-width/2)*(depth.x-width/2)+(vp.y-height/2)*(depth.y-height/2));if(f2<(.25*Math.max(width,height))**2||f2>(4*Math.max(width,height))**2)continue;
  const inliers=candidates.filter(l=>angularError(l,vp)<.035),score=inliers.reduce((s,l)=>s+l.length*l.support*(1-angularError(l,vp)/.035),0);
  if(inliers.length>=3&&score>Math.hypot(width,height)*.45&&(!best||score>best.score))best={...vp,score,lineCount:inliers.length};
 }
 return best;
}
export function estimateFloorPerspective(image,mask){
 const width=image.width,height=image.height,lines=floorLines(image,mask);
 const rows=[];for(let y=0;y<height;y++){let n=0;for(let x=0;x<width;x++)if(mask.data[y*width+x]>220)n++;if(n>width*.10)rows.push(y);}
 if(rows.length<height*.1)return {detected:false,reason:'floor-not-visible',lines:lines.length};
 const far=rows[Math.floor(rows.length*.08)],bottom=Math.min(height*.95,rows[Math.floor(rows.length*.97)]),vp=depthVanishingPoint(lines,width,height,far);
 if(!vp)return {detected:false,reason:'no-reliable-lines',lines:lines.length};
 if(vp.confidence<.65)return {detected:false,reason:'low-perspective-confidence',lines:lines.length};
 const across=transverseVanishingPoint(lines,vp,width,height,far),transverse=lines.filter(l=>!vp.inliers.includes(l)&&Math.abs(l.b)>.85),fallbackSlope=transverse.length?transverse.reduce((s,l)=>s-l.a/l.b*l.length,0)/transverse.reduce((s,l)=>s+l.length,0):0;
 // A single oblique line family cannot establish the other floor direction.
 // Admit an infinite second vanishing point only when it is camera-orthogonal
 // and supported by several genuinely parallel cross-lines.
 if(!across){
  const parallel=transverse.filter(l=>Math.abs((-l.a/l.b)-fallbackSlope)<.025),dx=vp.x-width/2,dy=vp.y-height/2;
  const orthogonality=Math.abs(dx+fallbackSlope*dy)/(Math.hypot(1,fallbackSlope)*Math.hypot(dx,dy,.85*Math.max(width,height)));
  if(parallel.length<3||orthogonality>.08)return {detected:false,reason:'insufficient-cross-direction',lines:lines.length};
 }
 // Select a visible patch for the handles. Its silhouette selects only an extent;
 // orientation, convergence and metric aspect still come exclusively from lines.
 const row=Math.max(0,Math.min(height-1,Math.round(bottom)));let start=-1,interval={left:0,right:width-1,length:0};
 for(let x=0;x<=width;x++){const floor=x<width&&mask.data[row*width+x]>200;if(floor&&start<0)start=x;if(!floor&&start>=0){if(x-start>interval.length)interval={left:start,right:x-1,length:x-start};start=-1;}}
 if(interval.length<width*.1)return {detected:false,reason:'no-visible-reference-patch',lines:lines.length};
 let quad=null;
 for(const spanRatio of [.8,.55,.35]){for(const centerRatio of [.5,.68,.32]){
  const span=interval.length*spanRatio,cx=interval.left+interval.length*centerRatio,slope=across?(bottom-across.y)/(cx-across.x):fallbackSlope,y=bottom-Math.abs(slope)*span*.52,center={x:cx,y},nearLine=across?line(across,center):[-slope,1,slope*cx-y];
  if(!nearLine||Math.abs(nearLine[1])<.25)continue;
  const atX=x=>({x,y:-(nearLine[0]*x+nearLine[2])/nearLine[1]}),nearLeft=atX(cx-span/2),nearRight=atX(cx+span/2),farY=Math.max(far+(y-far)*.12,vp.y+height*.10),initial=Math.max(.16,Math.min(.65,(farY-vp.y)/(y-vp.y)));
  for(const fraction of [initial,.7,.82]){
   const farCenter={x:vp.x+fraction*(center.x-vp.x),y:vp.y+fraction*(center.y-vp.y)},farLine=across?line(across,farCenter):[-slope,1,slope*farCenter.x-farCenter.y],q=[intersection(line(vp,nearLeft),farLine),intersection(line(vp,nearRight),farLine),nearRight,nearLeft];
   if(q.some(p=>!p||p.x<0||p.x>=width||p.y<0||p.y>=height||mask.data[Math.floor(p.y)*width+Math.floor(p.x)]<180))continue;
   const normalized=q.map(p=>({x:p.x/width,y:p.y/height}));if(validateQuad(normalized)){quad=normalized;break;}
  }
  if(quad)break;
 }if(quad)break;}
 if(!quad)return {detected:false,reason:'no-visible-reference-patch',lines:lines.length};
 try{return {detected:true,quad,...planeDimensions(quad,width,height,null),vanishingPoint:{x:vp.x/width,y:vp.y/height},transverseVanishingPoint:across?{x:across.x/width,y:across.y/height}:null,confidence:vp.confidence,lineCount:vp.lineCount,lines:lines.length};}catch{return {detected:false,reason:'invalid-metric-plane',lines:lines.length};}
}
