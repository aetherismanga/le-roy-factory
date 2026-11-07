/** Photo coordinates are normalized [0,1]; plane coordinates are millimetres. */
const EPS = 1e-9;
export function validateQuad(quad) {
  if (!Array.isArray(quad) || quad.length !== 4 || quad.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < -1 || p.x > 2 || p.y < -1 || p.y > 2)) return false;
  let sign = 0, area = 0;
  for (let i = 0; i < 4; i++) {
    const a = quad[i], b = quad[(i + 1) % 4], c = quad[(i + 2) % 4];
    const z = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(z) < 1e-5 || (sign && Math.sign(z) !== sign)) return false;
    sign = Math.sign(z); area += a.x * b.y - b.x * a.y;
  }
  return sign > 0 && area > 0.001;
}
export function solveHomography(src, dst) {
  if (src.length !== 4 || dst.length !== 4) throw new Error('Quatre points sont nécessaires.');
  const rows = [];
  for (let i = 0; i < 4; i++) {
    const {x,y} = src[i], {x:u,y:v} = dst[i];
    rows.push([x,y,1,0,0,0,-u*x,-u*y,-u]);
    rows.push([0,0,0,x,y,1,-v*x,-v*y,-v]);
  }
  // Homogeneous DLT: do not force h[8]=1. Valid floor planes can have their
  // horizon through the image origin, in which case h[8] is exactly zero.
  const pivots=[];let rank=0;
  for (let c = 0; c < 9 && rank < 8; c++) {
    let pivot = rank;
    for (let r = rank+1; r < 8; r++) if (Math.abs(rows[r][c]) > Math.abs(rows[pivot][c])) pivot = r;
    if (Math.abs(rows[pivot][c]) < EPS) continue;
    [rows[rank], rows[pivot]] = [rows[pivot], rows[rank]];
    const divisor = rows[rank][c];
    for (let k = c; k < 9; k++) rows[rank][k] /= divisor;
    for (let r = 0; r < 8; r++) if (r !== rank) {
      const f = rows[r][c]; for (let k = c; k < 9; k++) rows[r][k] -= f * rows[rank][k];
    }
    pivots.push(c);rank++;
  }
  if(rank!==8)throw new Error('Perspective dégénérée : écartez les quatre points.');
  const free=Array.from({length:9},(_,i)=>i).find(i=>!pivots.includes(i)),h=Array(9).fill(0);h[free]=1;
  for(let r=0;r<8;r++)h[pivots[r]]=-rows[r][free];
  const cx=src.reduce((sum,p)=>sum+p.x,0)/4,cy=src.reduce((sum,p)=>sum+p.y,0)/4,d=h[6]*cx+h[7]*cy+h[8];
  if(Math.abs(d)<EPS)throw new Error('Perspective dégénérée : horizon au centre du plan.');
  return h.map(value=>value/d);
}
export function projectPoint(h, point) {
  const d = h[6]*point.x + h[7]*point.y + h[8];
  if (!Number.isFinite(d) || Math.abs(d) < EPS) return null;
  const x = (h[0]*point.x+h[1]*point.y+h[2])/d, y = (h[3]*point.x+h[4]*point.y+h[5])/d;
  return Number.isFinite(x) && Number.isFinite(y) ? {x,y} : null;
}
export function planeProjection(quad, widthMm = 3600, heightMm = 3000) {
  if (!validateQuad(quad)) throw new Error('Les quatre points doivent former un rectangle en perspective, sans croisement.');
  if (!(widthMm > 0 && heightMm > 0 && widthMm <= 100000 && heightMm <= 100000)) throw new Error('Dimensions de calibration invalides (mm).');
  return solveHomography(quad, [{x:0,y:0},{x:widthMm,y:0},{x:widthMm,y:heightMm},{x:0,y:heightMm}]);
}
/** Starting handles for guided alignment only. Furniture/mask widths cannot infer perspective. */
export function defaultQuad(){
 return [{x:.32,y:.62},{x:.68,y:.62},{x:.92,y:.94},{x:.08,y:.94}];
}
export function deterministicFace(column, row, faceCount, seed=17) {
  let n = Math.imul(column|0,73856093)^Math.imul(row|0,19349663)^seed;
  n ^= n>>>16; n = Math.imul(n,0x45d9f3b); n ^= n>>>16;
  return (n>>>0)%Math.max(1,faceCount);
}
export function tileAt(xMm,yMm,product,settings={},faceCount=1) {
  const scale = Math.max(.1, Math.min(6, Number(settings.scale)||1));
  let x=xMm/scale,y=yMm/scale;
  if (Number(settings.rotation)===90) [x,y]=[y,-x];
  const width=Number(product.widthMm), height=Number(product.heightMm), grout=Math.max(0,Math.min(20,Number(settings.groutMm) || 0));
  if (!(width>0 && height>0)) throw new Error('Format commercial manquant.');
  const pitchX=width+grout,pitchY=height+grout;
  const row=Math.floor(y/pitchY), offset=settings.layout==='third' ? ((row%3+3)%3)*pitchX/3 : 0;
  const column=Math.floor((x+offset)/pitchX),localX=x+offset-column*pitchX,localY=y-row*pitchY;
  return {column,row,u:localX/width,v:localY/height,grout:localX>=width||localY>=height,face:deterministicFace(column,row,faceCount,settings.seed??17)};
}
