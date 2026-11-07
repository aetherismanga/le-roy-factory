/**
 * Photo composition in a single WebGL 2 draw. This module contains no model,
 * network access or UI. The existing CPU renderer remains the fallback.
 *
 * The integer face hash and projective coordinates intentionally mirror
 * geometry.mjs. A source face is never rotated or recoloured at random.
 */
const VERTEX = `#version 300 es
void main() {
  vec2 p = gl_VertexID == 0 ? vec2(-1.,-1.) :
           gl_VertexID == 1 ? vec2(3.,-1.) : vec2(-1.,3.);
  gl_Position = vec4(p,0.,1.);
}`;
const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp sampler2DArray;
uniform sampler2D uPhoto;
uniform sampler2D uMask;
uniform sampler2DArray uFaces;
uniform sampler2D uLight;
uniform vec2 uResolution;
uniform vec3 uHomography[3];
uniform vec2 uTileSize;
uniform float uScale;
uniform float uGrout;
uniform vec3 uGroutColor;
uniform int uRotation;
uniform int uTextureRotation;
uniform int uThird;
uniform int uFaceCount;
uniform uint uSeed;
uniform float uLighting;
uniform float uLightMedian;
uniform ivec2 uLightSize;
out vec4 outputColor;

float jointIntegral(float x,float size,float joint) {
  float pitch=size+joint;
  float n=floor(x/pitch);
  return n*joint+max(0.,x-n*pitch-size);
}
float jointCoverage(float coordinate,float size,float joint,float footprint) {
  if(joint<=0.) return 0.;
  float halfWidth=max(.001,min((size+joint)*4.,footprint))*.5;
  return clamp((jointIntegral(coordinate+halfWidth,size,joint)-
                jointIntegral(coordinate-halfWidth,size,joint))/(2.*halfWidth),0.,1.);
}
uint faceHash(int column,int row) {
  uint n=uint(column)*73856093u ^ uint(row)*19349663u ^ uSeed;
  n^=n>>16u;
  n*=0x45d9f3bu;
  n^=n>>16u;
  return n%uint(uFaceCount);
}
vec2 rotateTexture(vec2 uv) {
  if(uTextureRotation==1) return vec2(uv.y,1.-uv.x);
  if(uTextureRotation==2) return vec2(1.-uv.x,1.-uv.y);
  if(uTextureRotation==3) return vec2(1.-uv.y,uv.x);
  return uv;
}
float lightAt(vec2 uv) {
  vec2 p=clamp(uv*vec2(uLightSize)-.5,vec2(0.),vec2(uLightSize-1));
  ivec2 a=ivec2(floor(p));
  ivec2 b=min(a+1,uLightSize-1);
  vec2 f=fract(p);
  float value=mix(mix(texelFetch(uLight,a,0).r,texelFetch(uLight,ivec2(b.x,a.y),0).r,f.x),
                  mix(texelFetch(uLight,ivec2(a.x,b.y),0).r,texelFetch(uLight,b,0).r,f.x),f.y);
  return clamp(value/max(30.,uLightMedian),.12,1.6);
}
void main() {
  vec2 uv=vec2(gl_FragCoord.x/uResolution.x,1.-gl_FragCoord.y/uResolution.y);
  ivec2 pixel=clamp(ivec2(uv*uResolution),ivec2(0),ivec2(uResolution)-1);
  vec4 original=texelFetch(uPhoto,pixel,0);
  float alpha=texelFetch(uMask,pixel,0).r;
  vec3 ray=vec3(uv,1.);
  float d=dot(uHomography[2],ray);
  if(alpha==0. || d<=.0000001) { outputColor=original; return; }
  vec2 plane=vec2(dot(uHomography[0],ray),dot(uHomography[1],ray))/d;
  if(any(greaterThan(abs(plane),vec2(10000000.)))) { outputColor=original; return; }
  vec2 address=plane/uScale;
  if(uRotation==1) address=vec2(address.y,-address.x);
  vec2 pitch=uTileSize+uGrout;
  float row=floor(address.y/pitch.y);
  float phase=mod(mod(row,3.)+3.,3.);
  float offset=uThird==1 ? phase*pitch.x/3. : 0.;
  float column=floor((address.x+offset)/pitch.x);
  vec2 local=vec2(address.x+offset-column*pitch.x,address.y-row*pitch.y);
  vec2 faceUV=rotateTexture(clamp(local/uTileSize,0.,1.));
  uint face=faceHash(int(column),int(row));
  vec3 colour=texture(uFaces,vec3(faceUV,float(face))).rgb;
  vec2 footprint=(abs(vec2(uHomography[0].x,uHomography[1].x)-plane*uHomography[2].x)/uResolution.x+
                  abs(vec2(uHomography[0].y,uHomography[1].y)-plane*uHomography[2].y)/uResolution.y)/d/uScale;
  if(uRotation==1) footprint=footprint.yx;
  float jx=jointCoverage(local.x,uTileSize.x,uGrout,footprint.x);
  float jy=jointCoverage(local.y,uTileSize.y,uGrout,footprint.y);
  float joint=1.-(1.-jx)*(1.-jy);
  colour=mix(colour,uGroutColor,joint);
  if(uLighting>0.) colour*=1.+uLighting*(lightAt(vec2(pixel)/uResolution)-1.);
  outputColor=vec4(mix(original.rgb,colour,alpha),original.a);
}`;

let backend;
let unavailable=false;
let lastFailure=null;
let lastValidation={state:'not-run',passed:false,sampleCount:0};
const MAX_ARRAY_BYTES=48*1024*1024;

/** At most 128 unique pixels: spatial grid plus protected/opaque/soft regions. */
export function floorValidationPoints(mask) {
  const {width:w,height:h,data}=mask;
  if(!(Number.isInteger(w)&&Number.isInteger(h)&&w>0&&h>0&&data?.length===w*h))throw new Error('Invalid validation mask.');
  if(data.length<=128)return Uint32Array.from({length:data.length},(_,i)=>i);
  const points=new Set();
  for(let y=0;y<8;y++)for(let x=0;x<8;x++)points.add(Math.min(h-1,Math.floor((y+.5)*h/8))*w+Math.min(w-1,Math.floor((x+.5)*w/8)));
  const counts=[0,0,0],quotas=[24,24,16];
  for(let i=0;i<data.length;i++)counts[data[i]===0?0:data[i]===255?1:2]++;
  const targets=counts.map((count,category)=>Array.from({length:Math.min(count,quotas[category])},(_,j)=>Math.floor((j+.5)*count/Math.min(count,quotas[category])))),seen=[0,0,0],cursor=[0,0,0];
  for(let i=0;i<data.length&&points.size<128;i++){
    const category=data[i]===0?0:data[i]===255?1:2,rank=seen[category]++;
    if(rank===targets[category][cursor[category]]){points.add(i);cursor[category]++;}
  }
  return Uint32Array.from(points);
}

/** Pure comparison. Only aggregate errors are returned; no pixel data is retained. */
export function validateFloorSamplePixels({pixels,original,mask,points,sampleReference,tolerance=4}) {
  if(typeof sampleReference!=='function'||pixels?.data?.length!==original.data.length||pixels.width!==original.width||pixels.height!==original.height||mask.width!==original.width||mask.height!==original.height||mask.data.length!==original.width*original.height)throw new Error('CPU sample validation unavailable.');
  const limit=Math.max(0,Math.min(4,Number(tolerance)||0)),report={state:'passed',passed:true,method:'cpu-sampled',sampleCount:points.length,tolerance:limit,maxError:0,mismatches:0,outsideSamples:0,outsideMismatches:0,floorSamples:0,alphaMismatches:0};
  for(const i of points){
    if(!Number.isInteger(i)||i<0||i>=mask.data.length)throw new Error('Invalid validation point.');
    const p=i*4,outside=mask.data[i]===0,expected=outside?original.data.subarray(p,p+4):sampleReference(i%original.width,Math.floor(i/original.width));
    if(outside)report.outsideSamples++;else report.floorSamples++;
    const expectedAlpha=expected[3],actualAlpha=pixels.data[p+3];let mismatch=expectedAlpha!==actualAlpha;
    report.maxError=Math.max(report.maxError,Math.abs(expectedAlpha-actualAlpha));
    if(mismatch)report.alphaMismatches++;
    for(let k=0;k<3;k++){
      // Opaque photo pixels are compared byte-for-byte outside the mask. With
      // transparency, compare visible premultiplied colour; alpha is still exact.
      const e=expectedAlpha===255?expected[k]:Math.round(expected[k]*expectedAlpha/255),a=expectedAlpha===255?pixels.data[p+k]:Math.round(pixels.data[p+k]*actualAlpha/255),error=Math.abs(e-a);
      report.maxError=Math.max(report.maxError,error);if(error>(outside?0:limit))mismatch=true;
    }
    if(mismatch){report.mismatches++;if(outside)report.outsideMismatches++;}
  }
  if(!points.length||report.mismatches){report.state='failed';report.passed=false;}
  return report;
}

function abort(signal) {
  if(signal?.aborted) throw new DOMException('Rendu annulé.','AbortError');
}
function shader(gl,type,source) {
  const value=gl.createShader(type);
  gl.shaderSource(value,source);gl.compileShader(value);
  if(!gl.getShaderParameter(value,gl.COMPILE_STATUS)) {
    const detail=gl.getShaderInfoLog(value);gl.deleteShader(value);
    throw new Error(`Photo Studio shader: ${detail}`);
  }
  return value;
}
function createBackend() {
  const canvas=document.createElement('canvas');
  const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
  if(!gl) return null;
  const program=gl.createProgram(),textures=[];
  let vertex,fragment;
  try {
    vertex=shader(gl,gl.VERTEX_SHADER,VERTEX);fragment=shader(gl,gl.FRAGMENT_SHADER,FRAGMENT);
    gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.deleteShader(vertex);gl.deleteShader(fragment);vertex=fragment=null;
    gl.useProgram(program);gl.disable(gl.DITHER);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
    for(let i=0;i<4;i++) textures.push(gl.createTexture());
    const uniforms={};
    for(const name of ['uPhoto','uMask','uFaces','uLight','uResolution','uHomography[0]','uTileSize','uScale','uGrout','uGroutColor','uRotation','uTextureRotation','uThird','uFaceCount','uSeed','uLighting','uLightMedian','uLightSize']) uniforms[name]=gl.getUniformLocation(program,name);
    ['uPhoto','uMask','uFaces','uLight'].forEach((name,unit)=>gl.uniform1i(uniforms[name],unit));
    const value={canvas,gl,program,textures,uniforms,faceSet:null,lost:false};
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();value.lost=true;value.faceSet=null;});
    canvas.addEventListener('webglcontextrestored',()=>{if(backend===value){backend=null;unavailable=false;}});
    return value;
  } catch(error) {
    if(vertex)gl.deleteShader(vertex);if(fragment)gl.deleteShader(fragment);
    textures.forEach(t=>gl.deleteTexture(t));gl.deleteProgram(program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    throw error;
  }
}
function bindTexture(value,index,target,filter) {
  const {gl,textures}=value;
  gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(target,textures[index]);
  gl.texParameteri(target,gl.TEXTURE_MIN_FILTER,filter);gl.texParameteri(target,gl.TEXTURE_MAG_FILTER,filter);
  gl.texParameteri(target,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(target,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
}
function uploadFaces(value,faces) {
  const {gl}=value;
  if(value.faceSet?.length===faces.length&&faces.every((face,i)=>face===value.faceSet[i])) return true;
  const width=Math.max(...faces.map(face=>face.width)),height=Math.max(...faces.map(face=>face.height));
  if(width>gl.getParameter(gl.MAX_TEXTURE_SIZE)||height>gl.getParameter(gl.MAX_TEXTURE_SIZE)||faces.length>gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS)||width*height*faces.length*4>MAX_ARRAY_BYTES) return false;
  bindTexture(value,2,gl.TEXTURE_2D_ARRAY,gl.LINEAR);
  gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.RGBA8,width,height,faces.length,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  let resized,source;
  for(let layer=0;layer<faces.length;layer++) {
    const face=faces[layer];let data=face.data;
    if(face.width!==width||face.height!==height) {
      source??=document.createElement('canvas');resized??=document.createElement('canvas');
      source.width=face.width;source.height=face.height;
      source.getContext('2d').putImageData(new ImageData(face.data,face.width,face.height),0,0);
      resized.width=width;resized.height=height;
      const ctx=resized.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0,width,height);data=ctx.getImageData(0,0,width,height).data;
    }
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,layer,width,height,1,gl.RGBA,gl.UNSIGNED_BYTE,data);
  }
  value.faceSet=faces.slice();
  return true;
}

/** Free the one reusable GPU context, including photo pixels and product faces. */
export function disposeFloorWebGL() {
  const value=backend;backend=null;
  if(!value) return;
  value.textures.forEach(texture=>value.gl.deleteTexture(texture));value.gl.deleteProgram(value.program);
  value.gl.getExtension('WEBGL_lose_context')?.loseContext();
}
if(typeof window!=='undefined') window.addEventListener('pagehide',disposeFloorWebGL);
/** Last GPU composition's sampled check; also inspect the returned canvas backend.
 * Diagnostic metadata only: never stores photo pixels, URLs or user content. */
export function getFloorWebGLStatus() {
  return {initialised:!!backend,unavailable,lost:!!backend?.lost,lastFailure,validation:{...lastValidation}};
}

/** Return null when unavailable. No texture resolution is reduced to fit the GPU. */
export function tryRenderFloorWebGL({original,mask,product,faces,homo,cfg,grout,light,lighting,signal,sampleReference}) {
  abort(signal);
  if(unavailable||typeof document==='undefined') return null;
  const started=performance.now();
  try {
    backend??=createBackend();
    if(!backend){unavailable=true;lastFailure='WebGL 2 unavailable';return null;}
    const value=backend,{gl,canvas,uniforms:u}=value,w=original.width,h=original.height;
    if(value.lost||gl.isContextLost()) return null;
    if(w>gl.getParameter(gl.MAX_TEXTURE_SIZE)||h>gl.getParameter(gl.MAX_TEXTURE_SIZE)) return null;
    if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
    gl.useProgram(value.program);gl.viewport(0,0,w,h);
    bindTexture(value,0,gl.TEXTURE_2D,gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,original.data);
    bindTexture(value,1,gl.TEXTURE_2D,gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,w,h,0,gl.RED,gl.UNSIGNED_BYTE,mask.data);
    if(!uploadFaces(value,faces)) return null;
    bindTexture(value,3,gl.TEXTURE_2D,gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.R32F,light?.columns||1,light?.rows||1,0,gl.RED,gl.FLOAT,light?.grid||new Float32Array([128]));
    gl.uniform2f(u.uResolution,w,h);gl.uniform3fv(u['uHomography[0]'],homo);
    gl.uniform2f(u.uTileSize,Number(product.widthMm),Number(product.heightMm));
    gl.uniform1f(u.uScale,Math.max(.1,Math.min(6,Number(cfg.scale)||1)));
    gl.uniform1f(u.uGrout,Math.max(0,Math.min(20,Number(cfg.groutMm)||0)));
    gl.uniform3fv(u.uGroutColor,grout.map(v=>v/255));
    gl.uniform1i(u.uRotation,Number(cfg.rotation)===90?1:0);
    const rotation=((Number(product.textureRotation)||0)%360+360)%360;
    gl.uniform1i(u.uTextureRotation,[0,90,180,270].includes(rotation)?rotation/90:0);
    gl.uniform1i(u.uThird,cfg.layout==='third'?1:0);gl.uniform1i(u.uFaceCount,faces.length);
    gl.uniform1ui(u.uSeed,(cfg.seed??17)>>>0);gl.uniform1f(u.uLighting,lighting);
    gl.uniform1f(u.uLightMedian,light?.median||128);gl.uniform2i(u.uLightSize,light?.columns||1,light?.rows||1);
    abort(signal);lastValidation={state:'pending',passed:false,sampleCount:0};gl.drawArrays(gl.TRIANGLES,0,3);
    if(gl.getError()!==gl.NO_ERROR) throw new Error('GPU composition failed.');
    if(gl.isContextLost()) return null;
    const result=document.createElement('canvas');result.width=w;result.height=h;
    const resultContext=result.getContext('2d');resultContext.drawImage(canvas,0,0);abort(signal);
    if(gl.isContextLost()) return null;
    // One readback of the final canvas, then <=128 CPU-reference pixels. Reject
    // sampled divergence before returning an image to the workspace or export.
    const validationStarted=performance.now(),points=floorValidationPoints(mask),pixels=resultContext.getImageData(0,0,w,h);
    lastValidation=validateFloorSamplePixels({pixels,original,mask,points,sampleReference});
    lastValidation.durationMs=Math.round((performance.now()-validationStarted)*10)/10;
    if(!lastValidation.passed)throw new Error(`GPU sampled validation failed (${lastValidation.mismatches}/${lastValidation.sampleCount}).`);
    abort(signal);if(gl.isContextLost())return null;
    result.dataset.renderer='webgl2';result.dataset.renderMs=String(Math.round((performance.now()-started)*10)/10);
    result.dataset.sampleValidation='passed';
    return result;
  } catch(error) {
    if(signal?.aborted||error.name==='AbortError') throw error;
    // A device/driver failure must not prevent export or silently lower the HD
    // source resolution. Free GPU data and use the already available CPU path.
    lastFailure=String(error?.message||error).slice(0,500);
    if(lastValidation.state==='pending')lastValidation={state:'failed',passed:false,sampleCount:0,reason:'composition-or-readback-error'};
    disposeFloorWebGL();unavailable=true;return null;
  }
}
