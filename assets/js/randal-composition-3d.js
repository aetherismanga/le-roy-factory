/* Moteur Catalogue général. État commercial détenu par RandalWorkspace, géométrie dans RandalGeometry. */
(()=>{'use strict';
let T,renderer,surfaceRenderer,metricRoom,mirrorRenderer,scene,camera,area,overlay,observer,geometry,envTarget,selection=null,items=[],nodes=new Map(),motions=[],raf=0,animation=0,closed=false;
let yaw=.38,pitch=.17,distance=3,target,dimensions=false,invert=false,onSelect=()=>{},onMove=()=>{},room={floor:'elios-creta-ginepro',wall:'ivory',orientation:'horizontal'},ready=Promise.resolve(),captureViewport=null;
const cache=new Map(),textures=new Set(),pending=new Set(),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const WALLS={cream:['Crème doux','#eee4d5'],ivory:['Ivoire','#f4f0e8'],chalk:['Blanc craie','#f5f5f0'],greige:['Greige','#c9c5ba'],linen:['Lin naturel','#d8c9b4'],sand:['Sable','#ddc4a7'],sage:['Vert sauge','#aebdac'],stone:['Pierre claire','#c2b9ad'],blue:['Bleu poudré','#b6c7cb'],terracotta:['Terre cuite','#c9907a'],graphite:['Graphite','#6a6a66']};
const SURFACES=[{id:'view-coco-beige',label:'VIEW · Coco Beige',width:.60,height:.40,path:null,source:'Photo fournie · extrait d’un carreau, définition limitée'},...['zucchero','avena','biscotto','caramello','matcha','ginepro','malto','pepe'].map(n=>({id:'elios-creta-'+n,label:'ELIOS · Creta '+n,width:.60,height:.60,path:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/catalogue-tiles/creta-'+n+'.jpg',fallback:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/textures/'+n+'.webp',source:'Échantillon matière du site officiel ELIOS · une seule face, sans variante inventée'}))];
const track=p=>{pending.add(p);p.finally(()=>pending.delete(p));return p};
function image(url){if(cache.has(url))return cache.get(url);const p=new Promise(resolve=>{const im=new Image();im.crossOrigin='anonymous';im.decoding='async';im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=url});cache.set(url,p);return p;}
function texture(canvas){const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(innerWidth<700?4:12,renderer.capabilities.getMaxAnisotropy());t.minFilter=T.LinearMipmapLinearFilter;textures.add(t);return t;}
function finish(url){const k='finish:'+url;if(cache.has(k))return cache.get(k);const p=track(image(url).then(im=>{if(!im||closed)return null;const size=Math.floor(Math.min(im.naturalWidth,im.naturalHeight)*.58),c=document.createElement('canvas');c.width=c.height=size;c.getContext('2d').drawImage(im,(im.width-size)/2,(im.height-size)/2,size,size,0,0,size,size);return texture(c)}));cache.set(k,p);return p;}
function mat(color,roughness=.8){return new T.MeshStandardMaterial({color,roughness,metalness:0})}
function box(w,h,d,x,y,z,material){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.castShadow=true;scene.add(mesh);return mesh}
function render(){raf=0;if(closed||!renderer)return;camera.updateMatrixWorld();metricRoom?.tick(camera);if(mirrorRenderer){const wall=scene.getObjectByName('catalogue-wall');mirrorRenderer.setRoom(metricRoom.size,wall,metricRoom.back);}renderer.render(scene,camera);cotes();if(mirrorRenderer?.tick(.05))invalidate()}
function invalidate(){if(!raf&&!closed)raf=requestAnimationFrame(render)}
function cameraMove(){camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);invalidate()}
function bounds(){const b=new T.Box3();for(const n of nodes.values())b.expandByObject(n.root);return b.isEmpty()?new T.Box3(new T.Vector3(-.4,.3,-.5),new T.Vector3(.4,1.7,0)):b;}
function maxDistance(){return Math.max(18,(metricRoom?.size.width||3)*4.5,(metricRoom?.size.depth||3)*4.2)}
function fit(){if(metricRoom?.labels.visible){setRoomDimensions(true);return;}const b=bounds();target=b.getCenter(new T.Vector3());const size=b.getSize(new T.Vector3());distance=Math.min(maxDistance(),Math.max(1.6,Math.max(size.x/Math.max(.35,camera.aspect),size.y)*1.8+size.z*1.4));cameraMove()}
function view(name){yaw=name==='front'?0:name==='side'?Math.PI/2:.38;pitch=name==='front'||name==='side'?.035:.17;fit()}
async function surface(material,id,isWall=false){const mesh=scene.getObjectByName(isWall?'catalogue-wall':'catalogue-floor');const value=room[isWall?'wallSelection':'floorSelection']||{key:id,orientation:room.orientation};if(window.RandalSurfaceCatalogue.resolve(value)){material.userData.ticket=(material.userData.ticket||0)+1;return surfaceRenderer.apply(mesh,value);}mesh.userData.surfaceTicket=(mesh.userData.surfaceTicket||0)+1;material.bumpMap?.dispose();material.bumpMap=null;surfaceRenderer.active.delete(mesh);return legacySurface(material,id,isWall);}
async function legacySurface(material,id,isWall=false){
 const token=(material.userData.ticket||0)+1;material.userData.ticket=token;
 if(isWall&&WALLS[id]||isWall&&/^#[a-f0-9]{6}$/i.test(id)){material.map=null;material.color.set(WALLS[id]?.[1]||id);material.needsUpdate=true;invalidate();return;}
 const option=SURFACES.find(s=>s.id===id)||SURFACES[0],vertical=room.orientation==='vertical';
 const size=window.RandalRoomSize(room.dimensions),sw=isWall?size.width:size.width,sh=isWall?size.height:size.depth;const k='tile:'+id+':'+vertical+':'+isWall+':'+sw+':'+sh;
 let promise=cache.get(k);
 if(!promise){promise=track(image(option.path||window.RANDAL_VIEW_COCO_BEIGE).then(async im=>{
  if(!im&&option.fallback)im=await image(option.fallback);
  if(!im||closed)return null;
  // One verified face. Never invent graphic variants or rotate a wood/stone motif randomly.
  const c=document.createElement('canvas'),ctx=c.getContext('2d',{alpha:false}),coco=!option.path;
  const edge=Math.min(im.naturalWidth,im.naturalHeight,innerWidth<700?512:1024);
  const iw=coco?101:edge,ih=coco?67:edge;
  const groutX=Math.max(1,Math.round(iw*.002/option.width)),groutY=Math.max(1,Math.round(ih*.002/option.height));
  c.width=iw+groutX;c.height=ih+groutY;ctx.fillStyle='#c5beb2';ctx.fillRect(0,0,c.width,c.height);
  if(coco)ctx.drawImage(im,106,72,101,67,groutX/2,groutY/2,iw,ih);else{const side=Math.min(im.naturalWidth,im.naturalHeight);ctx.drawImage(im,(im.naturalWidth-side)/2,(im.naturalHeight-side)/2,side,side,groutX/2,groutY/2,iw,ih);}
  const t=texture(c);t.wrapS=t.wrapT=T.RepeatWrapping;
  const tw=vertical?option.height:option.width,th=vertical?option.width:option.height;
  // UV scale follows the metric room and the real product format.
  t.repeat.set(sw/tw,sh/th);
  if(vertical){t.rotation=Math.PI/2;t.center.set(.5,.5);t.repeat.set(sh/option.width,sw/option.height)}
  return t;
 }));cache.set(k,promise)}
 const t=await promise;if(closed||material.userData.ticket!==token)return;
 material.map=t;material.color.set(t?'#ffffff':'#c6b9a3');material.roughness=.84;material.needsUpdate=true;invalidate();
}
function free(objects,keepTextures=true){const gs=new Set(),ms=new Set();for(const o of objects)o.traverse(n=>{if(n.isReflector){n.dispose();return;}if(n.geometry)gs.add(n.geometry);for(const m of [].concat(n.material||[]))ms.add(m)});gs.forEach(g=>g.dispose());ms.forEach(m=>{if(!keepTextures)for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose()})}
function buildRoom(){
 scene=new T.Scene();scene.background=new T.Color('#e3dfd7');scene.add(new T.AmbientLight(0xffffff,.7));
 const light=new T.DirectionalLight(0xffffff,.35);light.position.set(-3,5,5);light.castShadow=true;const res=innerWidth<700?1024:2048;light.shadow.mapSize.set(res,res);Object.assign(light.shadow.camera,{left:-4,right:4,top:4,bottom:-3});light.shadow.normalBias=.003;light.shadow.bias=-.00012;scene.add(light);
 const fill=new T.DirectionalLight(0xffffff,.12);fill.position.set(4,2,-1);scene.add(fill);
 const wall=new T.Mesh(new T.PlaneGeometry(3,2.5),mat('#f4f0e8'));wall.position.set(0,1.9,-.62);wall.receiveShadow=true;wall.name='catalogue-wall';scene.add(wall);
 const floor=new T.Mesh(new T.PlaneGeometry(3,3),mat('#c6b9a3'));floor.rotation.x=-Math.PI/2;floor.position.y=-.005;floor.receiveShadow=true;floor.name='catalogue-floor';scene.add(floor);
 metricRoom=new window.RandalMetricRoom(T,scene,floor,wall,-.62);metricRoom.viewport=area;metricRoom.update(room.dimensions);
 // Actual room surfaces/window are captured once for the mirror environment.
 // Reflection environment uses the actual room surfaces.
 envTarget=new T.WebGLCubeRenderTarget(innerWidth<700?128:256,{type:T.HalfFloatType});const cube=new T.CubeCamera(.1,15,envTarget);cube.position.set(0,1.4,-.4);cube.update(renderer,scene);
 surfaceRenderer=new window.RandalSurfaceRenderer(T,renderer,invalidate);
 mirrorRenderer=new window.RandalMirrorRenderer(T,renderer,scene,invalidate);
 mirrorRenderer.setRoom(metricRoom.size,wall,metricRoom.back);
 geometry=window.RandalGeometry(T,{environment:envTarget.texture,finish,invalidate,disposed:()=>closed,mirrorRenderer});
 ready=Promise.all([surface(floor.material,room.floor),surface(wall.material,room.wall,true)]);
}
function update(next,selected,options={}){
 if(closed||!scene)return;selection=selected;items=next;
 // Update transforms without reloading/rebuilding geometry during drag and selection.
 const signatures=new Map(next.map(item=>[item.id,JSON.stringify([item.config,(item.mirrors||[]).map(m=>m.id)])]));
 for(const[id,node]of nodes)if(!signatures.has(id)||signatures.get(id)!==node.signature){scene.remove(node.root);free([node.root]);nodes.delete(id)}
 motions=[];const changed=[];
 for(const item of next){
  let node=nodes.get(item.id);
  if(!node){
   const built=geometry.furniture(item.config),root=new T.Group();root.add(built.root);root.userData.itemId=item.id;scene.add(root);
   const mirrorNodes=new Map();
   for(const mirrorItem of item.mirrors||[]){const mg=geometry.mirrors({...item.config,mirrorY:0},0);mg.userData.itemId=item.id+':mirror:'+mirrorItem.id;root.add(mg);mirrorNodes.set(mirrorItem.id,mg)}
   node={...built,root,signature:signatures.get(item.id),mirrorNodes,open:item.open};
   for(const m of built.motions){if(m.kind==='door')m.object.rotation.y=item.open?-m.sign*m.travel:0;else m.object.position.z=item.open?m.travel:0;}nodes.set(item.id,node);
  }
  node.root.position.set(item.position.x,item.position.y,-.606+node.d/2);
  for(const mirrorItem of item.mirrors||[]){const mg=node.mirrorNodes.get(mirrorItem.id);if(mg)mg.position.set(mirrorItem.position.x-item.position.x,mirrorItem.position.y-item.position.y,-node.root.position.z)}
  for(const m of node.motions)motions.push({...m,id:item.id});
  if(node.open!==item.open){node.open=item.open;changed.push({id:item.id,open:item.open})}
 }
 for(const value of [false,true]){const ids=changed.filter(c=>c.open===value).map(c=>c.id);if(ids.length)toggleOpen(ids,value)}
 if(options.fit)fit();else invalidate();
}
function toggleOpen(ids,open){
 cancelAnimationFrame(animation);const values=motions.filter(m=>ids.includes(m.id)).map(m=>({...m,start:m.kind==='door'?m.object.rotation.y:m.object.position.z,end:open?(m.kind==='door'?-m.sign*m.travel:m.travel):0})),began=performance.now();
 const tick=now=>{if(closed)return;const p=clamp((now-began)/600,0,1),e=p*p*(3-2*p);for(const m of values){if(m.kind==='door')m.object.rotation.y=m.start+(m.end-m.start)*e;else m.object.position.z=m.start+(m.end-m.start)*e}invalidate();if(p<1)animation=requestAnimationFrame(tick)};animation=requestAnimationFrame(tick);
}
function hit(e){const r=area.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);const h=ray.intersectObjects([...nodes.values()].map(n=>n.root),true)[0];if(!h)return null;for(let o=h.object;o;o=o.parent)if(o.userData.itemId)return o.userData.itemId;return null}
function planePoint(e){const r=area.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);return ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,0,1),.4),new T.Vector3())}
function bind(canvas){
 const points=new Map();let mode=null,start=null,last=null,pinch=null;
 canvas.style.touchAction='none';canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&![0,1,2].includes(e.button))return;
  canvas.setPointerCapture(e.pointerId);points.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(points.size===2){mode='pinch';const p=[...points.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);return;}
  const id=e.button===0?hit(e):null;onSelect(id);selection=id;
  mode=id?'object':e.button===1||e.button===2?'pan':'orbit';start=planePoint(e);last={x:e.clientX,y:e.clientY};
 });
 canvas.addEventListener('pointermove',e=>{
  if(!points.has(e.pointerId)){canvas.style.cursor=hit(e)?'move':'grab';return;}
  points.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(points.size===2){const p=[...points.values()],span=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch)distance=clamp(distance*pinch/span,.6,maxDistance());pinch=span;cameraMove();return;}
  if(mode==='pinch'||!last)return;const dx=e.clientX-last.x,dy=e.clientY-last.y;
  if(mode==='object'&&selection){const p=planePoint(e);if(p&&start){onMove(selection,p.x-start.x,p.y-start.y);start=p;}}
  else if(mode==='orbit'){yaw+=dx*.007*(invert?-1:1);pitch=clamp(pitch+dy*.005,-.08,.65);cameraMove()}
  else if(mode==='pan'){target.x-=dx*distance/area.clientHeight;target.y+=dy*distance/area.clientHeight;cameraMove()}
  last={x:e.clientX,y:e.clientY};invalidate();
 });
 const end=e=>{points.delete(e.pointerId);if(points.size<2)pinch=null;mode=null;last=null;};
 canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance*Math.exp(e.deltaY*.001),.6,maxDistance());cameraMove()},{passive:false});
}
function cotes(){
 if(!overlay)return;overlay.hidden=!dimensions;if(!dimensions)return;
 const w=captureViewport?.width||area.clientWidth,h=captureViewport?.height||area.clientHeight,r=captureViewport?1:Math.min(devicePixelRatio||1,2),fontPx=captureViewport?28:12,labelHeight=captureViewport?42:22;overlay.width=w*r;overlay.height=h*r;const c=overlay.getContext('2d');c.scale(r,r);const labels=[];
 const project=p=>{const v=new T.Vector3(...p).project(camera);return [(v.x+1)*w/2,(1-v.y)*h/2]};
 function line(text,color,a,b){const A=project(a),B=project(b);c.strokeStyle='#fff';c.lineWidth=5;c.beginPath();c.moveTo(...A);c.lineTo(...B);c.stroke();c.strokeStyle=color;c.lineWidth=2;c.stroke();const dx=B[0]-A[0],dy=B[1]-A[1],len=Math.hypot(dx,dy)||1;for(const p of[A,B]){c.beginPath();c.moveTo(p[0]-dy/len*5,p[1]+dx/len*5);c.lineTo(p[0]+dy/len*5,p[1]-dx/len*5);c.stroke()}
 c.font='600 '+fontPx+'px system-ui';const tw=c.measureText(text).width+14;let x=clamp((A[0]+B[0])/2,tw/2+4,w-tw/2-4),y=clamp((A[1]+B[1])/2,18,h-18);for(let i=0;i<10&&labels.some(l=>Math.abs(l.x-x)<(l.w+tw)/2&&Math.abs(l.y-y)<labelHeight+3);i++)y=clamp(y+labelHeight+4,labelHeight/2+4,h-labelHeight/2-4);labels.push({x,y,w:tw});c.fillStyle='#ffffffed';c.fillRect(x-tw/2,y-labelHeight/2,tw,labelHeight);c.fillStyle=color;c.textAlign='center';c.fillText(text,x,y+fontPx/3);
 }
 for(const item of items){if(selection&&selection.split(':')[0]!==item.id)continue;const n=nodes.get(item.id);if(!n)continue;const x=item.position.x,y=item.position.y,z=n.root.position.z,d=n.d,h=n.h,w=n.w;
 if(selection?.includes(':mirror:')){const mg=n.mirrorNodes.get(selection.split(':mirror:')[1]);if(mg){const mb=new T.Box3().setFromObject(mg),vals=item.config.mirrorSize.match(/\d+/g)?.map(Number)||[];line('L miroir '+vals[0]+' cm','#b63832',[mb.min.x,mb.max.y+.08,-.5],[mb.max.x,mb.max.y+.08,-.5]);line('H miroir '+(vals[1]||vals[0])+' cm','#2868b0',[mb.max.x+.06,mb.min.y,-.5],[mb.max.x+.06,mb.max.y,-.5]);}continue;}

 line('L '+Number(item.config.width)+' cm','#b63832',[x-w/2,y+h+.11,z+d/2],[x+w/2,y+h+.11,z+d/2]);line('H '+Number(item.config.height)+' cm','#2868b0',[x+w/2+.08,y,z+d/2],[x+w/2+.08,y+h,z+d/2]);line('P '+Number(item.config.depth)+' cm','#23805b',[x-w/2-.08,y+h+.05,z-d/2],[x-w/2-.08,y+h+.05,z+d/2]);
 if(y>.01)line('Sol '+Math.round(y*100)+' cm','#886c38',[x-w/2-.12,0,z+d/2],[x-w/2-.12,y,z+d/2]);
 }
 if(!selection&&items.length>1){const sorted=[...items].sort((a,b)=>a.position.x-b.position.x);for(let i=1;i<sorted.length;i++){const a=sorted[i-1],b=sorted[i],left=a.position.x+Number(a.config.width)/200,right=b.position.x-Number(b.config.width)/200;if(right>left)line(Math.round((right-left)*100)+' cm','#886c38',[left,.15,0],[right,.15,0]);}}
}
async function mount(el,callbacks={}){
 dispose();closed=false;T=window.THREE;if(!T)throw Error('Le moteur 3D n’a pas pu être chargé.');area=el;room={...room,...callbacks.room};onSelect=callbacks.onSelect||(()=>{});onMove=callbacks.onMove||(()=>{});
 renderer=new T.WebGLRenderer({antialias:innerWidth>=700,alpha:false,preserveDrawingBuffer:true,powerPreference:innerWidth<700?'low-power':'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1.5:2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 el.replaceChildren(renderer.domElement);overlay=document.createElement('canvas');overlay.className='rc-dimensions';overlay.hidden=true;overlay.style.pointerEvents='none';el.append(overlay);camera=new T.PerspectiveCamera(38,1,.05,60);target=new T.Vector3(0,1,-.3);
 buildRoom();bind(renderer.domElement);observer=new ResizeObserver(()=>{const w=Math.max(150,el.clientWidth),h=Math.max(180,el.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();fit()});observer.observe(el);renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();callbacks.onError?.('Le contexte graphique a été interrompu. Fermez puis rouvrez la 3D.');});view('angle');return api;
}
async function settled(){await ready;await surfaceRenderer?.settled();for(let i=0;i<3&&pending.size;i++)await Promise.all([...pending]);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}
async function captureViews(){
 await settled();const saved={yaw,pitch,distance,target:target.clone(),dimensions,selection,size:renderer.getSize(new T.Vector2()),ratio:renderer.getPixelRatio()};const result=[];
 try{captureViewport={width:1200,height:850};renderer.setPixelRatio(1);renderer.setSize(1200,850,false);camera.aspect=1200/850;camera.updateProjectionMatrix();selection=null;
 for(const [name,dim]of[['front',false],['side',false],['front',true],['side',true]]){dimensions=dim;view(name);renderer.render(scene,camera);cotes();const c=document.createElement('canvas');c.width=1200;c.height=850;const ctx=c.getContext('2d');ctx.drawImage(renderer.domElement,0,0,1200,850);if(dim)ctx.drawImage(overlay,0,0,1200,850);result.push({name,dimensions:dim,image:c.toDataURL('image/jpeg',.92)});}
 }finally{captureViewport=null;yaw=saved.yaw;pitch=saved.pitch;distance=saved.distance;target=saved.target;dimensions=saved.dimensions;selection=saved.selection;renderer.setPixelRatio(saved.ratio);renderer.setSize(saved.size.x,saved.size.y,false);camera.aspect=saved.size.x/saved.size.y;camera.updateProjectionMatrix();cameraMove()}
 return result;
}
async function capture(){await settled();renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png')}
function setRoom(value){const previous=JSON.stringify(window.RandalRoomSize(room.dimensions));room={...value};if(metricRoom&&previous!==JSON.stringify(window.RandalRoomSize(room.dimensions))){metricRoom.update(room.dimensions);mirrorRenderer?.setRoom(metricRoom.size,scene.getObjectByName('catalogue-wall'),metricRoom.back);fit();}const floor=scene?.getObjectByName('catalogue-floor'),wall=scene?.getObjectByName('catalogue-wall');if(floor&&wall)ready=Promise.all([surface(floor.material,room.floor),surface(wall.material,room.wall,true)]);return {...room}}
function dispose(){closed=true;surfaceRenderer?.dispose();cancelAnimationFrame(raf);cancelAnimationFrame(animation);raf=0;observer?.disconnect();if(scene)free([scene]);mirrorRenderer?.dispose();mirrorRenderer=null;textures.forEach(t=>t.dispose());textures.clear();cache.clear();pending.clear();envTarget?.dispose();renderer?.dispose();renderer?.forceContextLoss();renderer=null;scene=null;nodes.clear();motions=[];items=[];}
function setRoomDimensions(v){metricRoom?.toggle(v);if(v){camera.fov=65;camera.updateProjectionMatrix();target.set(0,metricRoom.size.height/2,metricRoom.back+metricRoom.size.depth*.4);distance=Math.max(3.2,metricRoom.size.width/(2*Math.tan(65*Math.PI/360)*camera.aspect)*1.12);yaw=.25;pitch=.25;cameraMove();}else{camera.fov=38;camera.updateProjectionMatrix();fit();}}
const api={setRoomDimensions,mount,update,view,fit,toggleOpen,setRoom,capture,captureViews,dispose,SURFACES,WALLS,setDimensions(v){dimensions=!!v;invalidate()},setReverse(v){invert=!!v},screenPoint(id){const node=nodes.get(id.split(':')[0]);if(!node||!camera)return null;node.root.updateMatrixWorld(true);let p;if(id.includes(':mirror:')){const mg=node.mirrorNodes.get(id.split(':mirror:')[1]);if(!mg)return null;p=new T.Box3().setFromObject(mg).getCenter(new T.Vector3())}else{p=new T.Vector3(0,node.h*.55,node.d*.55);node.root.localToWorld(p)}p.project(camera);const r=area.getBoundingClientRect();return{x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2}},getDiagnostics(){return{metricRoom:metricRoom?.diagnostics(),colorPipeline:{toneMapping:renderer?.toneMapping,output:renderer?.outputColorSpace},surfaces:surfaceRenderer?.diagnostics(),items:items.map(i=>({id:i.id,position:i.position,dimensions:[Number(i.config.width),Number(i.config.height),Number(i.config.depth)]})),selected:selection,dimensions,yaw,pitch,distance,motions:motions.map(m=>({id:m.id,kind:m.kind,value:m.kind==='door'?m.object.rotation.y:m.object.position.z})),textures:textures.size,pixelRatio:renderer?.getPixelRatio(),surfaceMetrics:['catalogue-floor','catalogue-wall'].map(name=>{const mesh=scene?.getObjectByName(name),map=mesh?.material.map;return {name,worldSize:[mesh?.geometry.parameters.width,mesh?.geometry.parameters.height],repeat:map?[map.repeat.x,map.repeat.y]:null,rotation:map?.rotation||0}}),tileSources:SURFACES.map(s=>({id:s.id,path:s.path,fallback:s.fallback||null,width:s.width,height:s.height})),drawCalls:renderer?.info.render.calls,room:{...room}}},open(config){window.RandalWorkspace?.addDraft(config)},close(){window.RandalWorkspace?.close()}};
window.RandalComposition3D=api;
})();
