import * as T from 'three';
import {hiddenSceneMeshes} from './unreal-scene.js';
import {captureUnrealState,changedTransforms,sceneChanges} from './unreal-sync.js';

export function createUnrealBridge({app,scene,camera,canvas,stage,getRevision,prepareTextures,startSession,onFailure}){
 let enabled=false,session=null,socket=null,stream=null,exporting=false,loadedRevision=-1,seenRevision=-1,changedAt=0,timer=null,token=0,sceneReady=false,lastVisibility='',visibilityAt=0;
 let acknowledged=null,importRevision=null,awaitingScene=false,motionFrame=0,lastCamera='',cameraAt=0,lastExamined=-1;
 const metrics={exports:0,skippedImports:0,transformPatches:0,materialPatches:0,cachedCommits:0,importedMeshes:0,lastChangeMs:0,lastMaterialMs:0,cameraMessages:0};
 let apiBase='',accessToken='';
 const remoteFetch=(url,options={})=>fetch(apiBase?new URL(url,apiBase).href:url,{...options,credentials:apiBase?'omit':'same-origin',headers:{...(options.headers||{}),...(accessToken?{Authorization:'Bearer '+accessToken}:{})}});
 const knownResources=new Set();let pendingResources=[],pendingStarted=0,protocol=1;
 const layer=document.createElement('div');layer.className='lrf-unreal-layer';layer.hidden=true;
 const note=document.createElement('div');note.className='lrf-unreal-note';note.role='status';note.hidden=true;
 const style=document.createElement('style');style.textContent='.lrf-unreal-layer{position:absolute;inset:0;z-index:2;pointer-events:none;background:#e5e3dc}.lrf-unreal-layer[hidden],.lrf-unreal-note[hidden]{display:none!important}.lrf-unreal-layer video{width:100%!important;height:100%!important;object-fit:fill!important;pointer-events:none!important}.lrf-unreal-note{position:absolute;left:16px;bottom:16px;z-index:7;background:rgba(30,34,30,.88);color:white;border-radius:8px;padding:10px 14px;font:12px system-ui;pointer-events:none;max-width:85%}';
 style.textContent+='@media(max-width:640px),(max-height:500px){.lrf-unreal-note{bottom:74px;left:8px;padding:7px 10px;font-size:10px;max-width:90%}}';
 document.head.append(style);stage.append(layer,note);
 function status(text){note.textContent=text;document.querySelector('#quality-description').textContent=text;}
 async function request(url,options){const response=await remoteFetch(url,options),d=await response.json();if(!response.ok)throw Error(d.error||'Rendu local indisponible');return d;}
 function cameraMessage(){camera.updateMatrixWorld(true);return{type:'camera',position:camera.getWorldPosition(new T.Vector3()).toArray(),forward:camera.getWorldDirection(new T.Vector3()).toArray(),up:new T.Vector3(0,1,0).applyQuaternion(camera.getWorldQuaternion(new T.Quaternion())).toArray(),fov:camera.fov,aspect:camera.aspect};}
 async function upload(force=false){
  if(!enabled||!session||exporting)return;const revision=getRevision();if(!force&&revision===loadedRevision)return;
  const current=token,targetSession=session;exporting=true;status('Unreal Engine · préparation des matériaux et de la scène…');
  try{
   await prepareTextures();const {prepareUnrealDelta,exportUnrealScene}=await import('./unreal-scene.js');
   if(!enabled||current!==token)return;const snapshot=captureUnrealState(scene),snapshotRevision=getRevision();
   if(!force&&acknowledged&&snapshot.signature===acknowledged.signature){applyPatch(snapshot);loadedRevision=snapshotRevision;metrics.skippedImports++;return;}
   if(protocol!==2){
    const result=await exportUnrealScene(scene);if(!enabled||current!==token)return;
    const metadata=await request(`/unreal/${targetSession}/metadata`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lights:result.lights,noShadow:result.noShadow,cutaway:result.cutaway,stats:result.stats})});
    if(!enabled||current!==token)return;awaitingScene=true;pendingStarted=performance.now();
    const uploaded=await request(`/unreal/${targetSession}/scene`,{method:'POST',headers:{'Content-Type':'model/gltf-binary','X-LRF-Metadata':metadata.id},body:result.glb});
    if(!enabled||current!==token)return;acknowledged=snapshot;importRevision=uploaded.revision;loadedRevision=snapshotRevision;lastExamined=-1;metrics.exports++;return;
   }
   const changes=sceneChanges(acknowledged,snapshot);pendingStarted=performance.now();
   const result=await prepareUnrealDelta(scene,changes.replace,knownResources);if(!enabled||current!==token)return;
   const metadata=await request(`/unreal/${targetSession}/metadata`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocol:2,reset:!acknowledged,lights:snapshot.lights,instances:result.instances,resources:result.resources,remove:changes.remove,materials:changes.materials,transforms:changedTransforms(acknowledged,snapshot),stats:{...result.stats,totalMeshes:snapshot.entries.size}})});
   if(!enabled||current!==token)return;
   awaitingScene=true;pendingResources=Object.values(result.resources);const uploaded=await request(`/unreal/${targetSession}/${result.glb?'scene':'commit'}`,{method:'POST',headers:{'Content-Type':'model/gltf-binary','X-LRF-Metadata':metadata.id},body:result.glb});
   if(!enabled||current!==token)return;
   acknowledged=snapshot;importRevision=uploaded.revision;loadedRevision=snapshotRevision;lastExamined=-1;if(result.glb)metrics.exports++;else metrics.cachedCommits++;metrics.importedMeshes+=result.stats.importedMeshes;status('Unreal Engine · mise à jour de votre sélection…');
  }catch(error){if(current===token)fail(error);}finally{exporting=false;}
 }
 function applyPatch(snapshot){
  if(!importRevision||awaitingScene||socket?.readyState!==1)return;
  const transforms=changedTransforms(acknowledged,snapshot),lights=JSON.stringify(snapshot.lights)!==JSON.stringify(acknowledged?.lights)?snapshot.lights:null,materials=sceneChanges(acknowledged,snapshot).materials;
  for(let i=0;i<transforms.length;i+=100){socket.send(JSON.stringify({type:'update',revision:importRevision,transforms:transforms.slice(i,i+100)}));metrics.transformPatches++;}
  if(lights)socket.send(JSON.stringify({type:'update',revision:importRevision,lights}));
  for(let i=0;i<materials.length;i+=100){socket.send(JSON.stringify({type:'update',revision:importRevision,materials:materials.slice(i,i+100),updateId:performance.now()}));metrics.materialPatches++;}
  acknowledged=snapshot;
 }
 function cameraTick(){
  if(!enabled)return;
  if(socket?.readyState===1){const message=JSON.stringify(cameraMessage()),now=performance.now();if(message!==lastCamera||now-cameraAt>1000){socket.send(message);lastCamera=message;cameraAt=now;metrics.cameraMessages++;}}
  motionFrame=requestAnimationFrame(cameraTick);
 }
 function tick(){
  if(!enabled)return;if(socket?.readyState===1){const hidden=hiddenSceneMeshes(scene),signature=hidden.join();if(signature!==lastVisibility||performance.now()-visibilityAt>1000){socket.send(JSON.stringify({type:'visibility',hidden}));lastVisibility=signature;visibilityAt=performance.now();}}
  const revision=getRevision();if(revision!==seenRevision){seenRevision=revision;changedAt=performance.now();}
  if(!exporting&&!awaitingScene&&acknowledged&&revision!==lastExamined){const snapshot=captureUnrealState(scene),changes=sceneChanges(acknowledged,snapshot);lastExamined=revision;if(protocol===2?!changes.replace.size&&!changes.remove.length:snapshot.signature===acknowledged.signature){applyPatch(snapshot);if(loadedRevision!==revision)metrics.skippedImports++;loadedRevision=revision;}}
  if(!awaitingScene&&revision!==loadedRevision&&performance.now()-changedAt>120)upload();
 }
 function fail(error){if(!enabled)return;disable();onFailure(error.message);}
 async function enable(){
  if(enabled)return;enabled=true;for(const key of Object.keys(metrics))metrics[key]=0;const current=++token;note.hidden=false;status('Démarrage du rendu Unreal Engine…');
  try{
   const info=startSession?await startSession({app,aspect:camera.aspect}):await request('/unreal/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({app,aspect:camera.aspect})});
   if(!enabled||current!==token){fetch(new URL(`/unreal/${info.session}/close`,info.apiBase||location.origin),{method:'POST',headers:info.accessToken?{Authorization:'Bearer '+info.accessToken}:{}}).catch(()=>{});return;}apiBase=info.apiBase||'';accessToken=info.accessToken||'';if(startSession&&(!/^https:\/\//.test(apiBase)||!info.bridgeUrl?.startsWith('wss://')||!info.signallingUrl?.startsWith('wss://')||!accessToken))throw Error('Connexion sécurisée au rendu indisponible.');session=info.session;protocol=info.protocol===2?2:1;
   socket=new WebSocket(info.bridgeUrl||`ws://${location.hostname}:${info.bridgePort}/client?session=${session}`);
   socket.onmessage=event=>{const d=JSON.parse(event.data);if(d.type==='materialReady')metrics.lastMaterialMs=Math.round(performance.now()-d.updateId);if(d.type==='sceneReady'){if(d.cacheReset)knownResources.clear();else for(const key of pendingResources)knownResources.add(key);pendingResources=[];metrics.lastChangeMs=Math.round(performance.now()-pendingStarted);sceneReady=true;awaitingScene=false;lastExamined=-1;layer.hidden=false;status(`Unreal Engine · scène complète · ${d.meshes} objets`);}if(d.type==='sceneError'||d.type==='error')fail(Error(d.message||'La scène n’a pas pu être importée.'));if(d.type==='stats'&&sceneReady&&!d.importing&&!exporting&&!awaitingScene)status(`Unreal Engine · scène complète · ${Math.round(d.fps)} images/s`);};
   const {Config,PixelStreaming}=await import('@epicgames-ps/lib-pixelstreamingfrontend-ue5.8');if(!enabled||current!==token)return;
   const config=new Config({useUrlParams:false,initialSettings:{ss:info.signallingUrl||`ws://${location.hostname}:${info.signallingPort}`,StreamerId:session,AutoConnect:false,AutoPlayVideo:true,StartVideoMuted:true,UseMic:false,UseCamera:false,KeyboardInput:false,MouseInput:false,TouchInput:false,GamepadInput:false,MatchViewportRes:false,PreferredCodec:'H264',WebRTCFPS:60,WebRTCMinBitrate:5000,WebRTCMaxBitrate:35000,WaitForStreamer:true,MaxReconnectAttempts:20}});
   stream=new PixelStreaming(config,{videoElementParent:layer});stream.addEventListener('playStreamRejected',()=>{status('Touchez la vue pour démarrer le rendu Unreal.');canvas.addEventListener('pointerdown',()=>stream?.play(),{once:true});});stream.connect();
   stream.addEventListener('statsReceived',event=>{if(!enabled||current!==token)return;const s=event.data?.aggregatedStats,v=s?.inboundVideoStats;if(!v)return;const record={...metrics,decodedFps:v.framesPerSecond,decodedFrames:v.framesDecoded,droppedFrames:v.framesDropped,freezes:v.freezeCount,width:v.frameWidth,height:v.frameHeight,rttMs:(s.getActiveCandidatePair()?.currentRoundTripTime||0)*1000};remoteFetch(`/unreal/${targetSessionForMetrics()}/telemetry`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(record)}).catch(()=>{});});
   loadedRevision=-1;seenRevision=getRevision();changedAt=performance.now();timer=setInterval(tick,16);motionFrame=requestAnimationFrame(cameraTick);await upload(true);
  }catch(error){fail(error);}
 }
 function targetSessionForMetrics(){return session;}
 function disable(){enabled=false;++token;clearInterval(timer);cancelAnimationFrame(motionFrame);timer=null;socket?.close();socket=null;stream?.disconnect();stream=null;layer.replaceChildren();layer.hidden=true;note.hidden=true;sceneReady=false;awaitingScene=false;acknowledged=null;importRevision=null;lastExamined=-1;lastCamera='';knownResources.clear();pendingResources=[];if(session)remoteFetch(`/unreal/${session}/close`,{method:'POST',keepalive:true}).catch(()=>{});session=null;apiBase='';accessToken='';}
 function capture(){const video=layer.querySelector('video');if(!sceneReady||!video?.videoWidth)throw Error('Attendez que le rendu Unreal soit prêt.');const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;c.getContext('2d').drawImage(video,0,0);return c.toDataURL('image/png');}
 function previewCapture(filename){
  const data=capture(),video=layer.querySelector('video'),dialog=document.createElement('dialog');
  dialog.setAttribute('aria-label','Image du rendu Unreal');dialog.style.cssText='max-width:90vw;padding:20px;border:0;border-radius:12px;background:#faf9f3;color:#203a31';
  const heading=document.createElement('h2');heading.textContent='Image du rendu Unreal';
  const info=document.createElement('p');info.textContent=`Capture du cadrage affiché · ${video.videoWidth} × ${video.videoHeight} pixels`;
  const picture=document.createElement('img');picture.src=data;picture.alt='Capture du rendu Unreal de votre composition';picture.style.cssText='display:block;max-width:82vw;max-height:66vh;object-fit:contain;margin-bottom:18px';
  const bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
  const link=document.createElement('a');link.href=url;link.download=filename;link.textContent='Télécharger le PNG';link.style.cssText='display:inline-block;padding:12px 18px;background:#26473c;color:white;border-radius:6px;margin-right:14px';
  const close=document.createElement('button');close.textContent='Fermer l’image';close.onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{URL.revokeObjectURL(url);dialog.remove();},{once:true});dialog.append(heading,info,picture,link,close);document.body.append(dialog);dialog.showModal();
 }
 window.addEventListener('pagehide',disable);
 return{enable,disable,capture,previewCapture,get active(){return enabled;},get ready(){return sceneReady;}};
}
