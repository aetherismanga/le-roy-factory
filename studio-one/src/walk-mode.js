import {createVisitTapGesture} from '../../shared/lrf-3d/visit-interactions.js';
import {boundsOnWall} from './composition.js';
import * as T from 'three';

// Visite à hauteur humaine : caméra indépendante des objets et des contrôles d'édition.
export function createWalkMode({stage,canvas,camera,controls,getRoom,getItems,onMove,onEnter,onExit,onTap}){
  const taps=createVisitTapGesture();
  const keys=new Set();const eye=1.58,radius=.20,speed=1.7,turn=1.8;
  let viewMode='first',walker=new T.Vector3(),moving=false;
  let active=false,forward=new T.Vector3(0,0,-1),panel=null,button=null,pitch=0,touchMove={x:0,y:0},mouseLook=false;
  const touches=new Map();let moveOrigin=null,hintTimer=null;
  const touchDevice=()=>navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches;
  function resetInput(){taps.reset();keys.clear();touches.clear();moveOrigin=null;touchMove={x:0,y:0};mouseLook=false;}
  const editable=el=>!!el?.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"]');
  const inside=(x,z,pts)=>{
    if(!pts?.length)return true;
    let hit=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      const a=pts[i],b=pts[j];const ax=Array.isArray(a)?a[0]:a.x,az=(Array.isArray(a)?a[1]:a.z)-.23;
      const bx=Array.isArray(b)?b[0]:b.x,bz=(Array.isArray(b)?b[1]:b.z)-.23;
      if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)hit=!hit;
    }return hit;
  };
  function passable(x,z){
    const room=getRoom();if(!room)return true;
    const pts=room.points;
    const insideRoom=[[-radius,0],[radius,0],[0,-radius],[0,radius],[0,0]].every(([dx,dz])=>inside(x+dx,z+dz,pts));
    const doorway=(wall,u)=>{
      const candidates=(getItems()||[]).filter(item=>item.type==='door'&&item.settings?.doorOpen&&item.placement?.wall!==undefined);
      return candidates.some(item=>{
        const other=room.walls[item.placement.wall];
        if(!other)return false;
        const same=wall===other||wall.partition!==undefined&&other.partition===wall.partition;
        if(!same)return false;
        const center=wall===other?item.placement.u/100:wall.length-item.placement.u/100;
        return Math.abs(u-center)<(item.dimensions?.width||.83)/2-radius*.55;
      });
    };
    for(const wall of room.walls||[]){
      if(wall.height<eye+.1)continue;
      const d=new T.Vector3(x,0,z).sub(wall.start);
      const axis=new T.Vector3(wall.normal.z,0,-wall.normal.x);
      const u=d.dot(axis),distance=Math.abs(d.dot(wall.normal));
      if(u<-.001||u>wall.length+.001||distance>=radius)continue;
      if(!doorway(wall,u))return false;
    }
    for(const item of getItems()||[]){if(['window','door','mirror','tap','towel','screen'].includes(item.type))continue;const bounds=boundsOnWall(room,item);if(!bounds||bounds.bottom>1.65||bounds.top<.15)continue;const poly=bounds.corners;let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;const dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));if(Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz)<radius)hit=true;}if(hit)return false;}
    return insideRoom||room.walls?.some(w=>{
      const d=new T.Vector3(x,0,z).sub(w.start);
      const axis=new T.Vector3(w.normal.z,0,-w.normal.x);
      return Math.abs(d.dot(w.normal))<.30&&doorway(w,d.dot(axis));
    });
  }
  function view(){
    const goal=walker.clone().add(forward.clone().multiplyScalar(Math.cos(pitch))).add(new T.Vector3(0,Math.sin(pitch),0));
    if(viewMode==='third'){
      const target=walker.clone();target.y=1.0;const side=new T.Vector3(-forward.z,0,forward.x);
      // The Sims-style camera uses the room's existing cutaway, so a nearby
      // wall never pushes the camera into the character's head or shoulders.
      camera.position.copy(walker).addScaledVector(forward,-3.1).addScaledVector(side,1.2);camera.position.y=3.3;controls.target.copy(target);
    }else{camera.position.copy(walker);controls.target.copy(goal);}
    controls.update();
  }

  function setActive(next){
    if(active===next)return;active=next;resetInput();
    stage.classList.toggle('walk-active',active);
    if(active){
      onEnter?.();
      pitch=0;
      const room=getRoom();const center=room?.bounds?.getCenter(new T.Vector3())||new T.Vector3();
      const p=camera.position.clone();if(!inside(p.x,p.z,room?.points)){camera.position.set(center.x,eye,center.z);}
      else camera.position.y=eye;
      walker.copy(camera.position);forward.set(controls.target.x-camera.position.x,0,controls.target.z-camera.position.z);
      if(forward.lengthSq()<.001)forward.set(0,0,-1);forward.normalize();
      controls.enabled=false;view();onMove();
    }else{controls.enabled=true;onExit?.();onMove();}
    button.textContent=active?'Quitter la visite':'Visite 3D';
    button.setAttribute('aria-pressed',String(active));
    panel.textContent=touchDevice()?'Touchez pour ouvrir · 1 doigt : regarder · 2 doigts : se déplacer':'Cliquez pour ouvrir · ZQSD / flèches : marcher · Maj : courir · Échap : quitter';
    panel.hidden=!active;clearTimeout(hintTimer);
    if(active)hintTimer=setTimeout(()=>{panel.hidden=true;},6000);
  }
  button=document.createElement('button');button.type='button';button.textContent='Visite 3D';button.className='walk-toggle';button.setAttribute('aria-pressed','false');
  button.setAttribute('aria-label','Activer ou quitter le déplacement dans les pièces');
  Object.assign(button.style,{position:'absolute',top:'72px',right:'12px',zIndex:'41',padding:'9px 13px',borderRadius:'10px',background:'#184a40',color:'white',border:'1px solid #acd0c1',cursor:'pointer'});
  button.addEventListener('click',()=>setActive(!active));stage.append(button);
  panel=document.createElement('div');panel.className='walk-hint';panel.hidden=true;panel.setAttribute('aria-label','Commandes de visite');panel.setAttribute('role','status');
  Object.assign(panel.style,{position:'absolute',left:'12px',bottom:'calc(110px + env(safe-area-inset-bottom,0px))',zIndex:'41',background:'rgba(17,42,37,.88)',color:'white',borderRadius:'10px',padding:'8px',fontSize:'12px',maxWidth:'55%'});
  stage.append(panel);
  const supported=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE','KeyZ','ShiftLeft','ShiftRight']);
  document.addEventListener('keydown',e=>{
    if(!active||editable(e.target)||e.altKey||e.ctrlKey||e.metaKey||!supported.has(e.code))return;
    e.preventDefault();e.stopImmediatePropagation();taps.cancel();keys.add(e.code);onMove();
  },true);
  document.addEventListener('keyup',e=>{keys.delete(e.code);if(active&&supported.has(e.code))e.preventDefault()},true);
  window.addEventListener('blur',resetInput);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInput()});
  document.addEventListener('keydown',e=>{if(active&&e.key==='Escape'&&!editable(e.target)){setActive(false);e.stopImmediatePropagation()}},true);

  const center=()=>{const points=[...touches.values()].slice(0,2);return {x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2};};
  stage.addEventListener('pointerdown',e=>{
    if(!active||e.target!==canvas)return;if(e.pointerType==='mouse'&&e.button!==0)return;
    taps.down(e);e.preventDefault();e.stopPropagation();canvas.setPointerCapture(e.pointerId);
    if(e.pointerType==='mouse'){mouseLook=true;return;}
    touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(touches.size===2)moveOrigin=center();
  },true);
  function look(dx,dy){forward.applyAxisAngle(new T.Vector3(0,1,0),-dx*.004).normalize();pitch=T.MathUtils.clamp(pitch-dy*.004,-1.35,1.35);view();onMove();}
  stage.addEventListener('pointermove',e=>{
    if(!active)return;taps.move(e);
    if(e.pointerType==='mouse'&&mouseLook){look(e.movementX,e.movementY);return;}
    const prior=touches.get(e.pointerId);if(!prior)return;
    touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(touches.size===1)look(e.clientX-prior.x,e.clientY-prior.y);
    else if(moveOrigin){const p=center(),limit=90;touchMove={x:T.MathUtils.clamp((p.x-moveOrigin.x)/limit,-1,1),y:T.MathUtils.clamp((p.y-moveOrigin.y)/limit,-1,1)};onMove();}
  });
  function release(e){if(!active||(!mouseLook&&!touches.has(e.pointerId))){taps.cancel(e);return;}const tapped=e.type==='pointerup'&&taps.up(e);if(e.type!=='pointerup')taps.cancel(e);mouseLook=false;touches.delete(e.pointerId);if(touches.size<2){moveOrigin=null;touchMove={x:0,y:0};}if(tapped&&onTap?.(e)){e.preventDefault();e.stopImmediatePropagation();}onMove();}
  for(const event of ['pointerup','pointercancel'])window.addEventListener(event,release,true);
  canvas.addEventListener('lostpointercapture',event=>{taps.cancel(event);mouseLook=false;touches.delete(event.pointerId);if(touches.size<2){moveOrigin=null;touchMove={x:0,y:0};}});
  function tick(dt){
    moving=false;if(!active)return false;
    const left=keys.has('ArrowLeft'),right=keys.has('ArrowRight');
    const rotation=(Number(left)-Number(right))*turn*dt;
    if(rotation)forward.applyAxisAngle(new T.Vector3(0,1,0),rotation).normalize();
    const f=Number(keys.has('ArrowUp')||keys.has('KeyW')||keys.has('KeyZ'))-Number(keys.has('ArrowDown')||keys.has('KeyS'))-touchMove.y;
    const strafe=Number(keys.has('KeyD')||keys.has('KeyE'))-Number(keys.has('KeyA')||keys.has('KeyQ'))+touchMove.x;
    const side=new T.Vector3(-forward.z,0,forward.x);
    const move=forward.clone().multiplyScalar(f).addScaledVector(side,strafe);
    if(move.lengthSq()>0){move.normalize().multiplyScalar(speed*(keys.has('ShiftLeft')||keys.has('ShiftRight')?1.6:1)*dt);const p=walker,before=p.clone();
      if(passable(p.x+move.x,p.z))p.x+=move.x;
      if(passable(p.x,p.z+move.z))p.z+=move.z;
      p.y=eye;moving=p.distanceToSquared(before)>1e-8;
    }
    if(rotation||move.lengthSq()>0){taps.cancel();view();return true}if(viewMode==='third'){view();return true}
    return false;
  }
  return {tick,get active(){return active},setActive,get position(){return walker;},get heading(){return Math.atan2(forward.x,forward.z);},get moving(){return moving;},get running(){return keys.has('ShiftLeft')||keys.has('ShiftRight');},get view(){return viewMode;},setView(mode){viewMode=mode==='third'?'third':'first';if(active)view();onMove();}};
}
