import * as T from 'three';

// Visite à hauteur humaine : caméra indépendante des objets et des contrôles d'édition.
export function createWalkMode({stage,canvas,camera,controls,getRoom,getItems,onMove,onExit}){
  const keys=new Set();const eye=1.58,radius=.20,speed=1.7,turn=1.8;
  let active=false,forward=new T.Vector3(0,0,-1),panel=null,button=null;
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
    return insideRoom||room.walls?.some(w=>{
      const d=new T.Vector3(x,0,z).sub(w.start);
      const axis=new T.Vector3(w.normal.z,0,-w.normal.x);
      return Math.abs(d.dot(w.normal))<.30&&doorway(w,d.dot(axis));
    });
  }
  function view(){
    const side=new T.Vector3(-forward.z,0,forward.x);
    const goal=camera.position.clone().add(forward);
    controls.target.copy(goal);controls.update();
  }
  function setActive(next){
    if(active===next)return;active=next;keys.clear();
    if(active){
      const room=getRoom();const center=room?.bounds?.getCenter(new T.Vector3())||new T.Vector3();
      const p=camera.position.clone();if(!inside(p.x,p.z,room?.points)){camera.position.set(center.x,eye,center.z);}
      else camera.position.y=eye;
      forward.set(controls.target.x-camera.position.x,0,controls.target.z-camera.position.z);
      if(forward.lengthSq()<.001)forward.set(0,0,-1);forward.normalize();
      controls.enabled=false;view();onMove();
    }else{controls.enabled=true;onExit?.();onMove();}
    button.textContent=active?'Quitter la visite':'Visite 3D';
    panel.hidden=!active;
  }
  button=document.createElement('button');button.type='button';button.textContent='Visite 3D';
  button.setAttribute('aria-label','Activer ou quitter le déplacement dans les pièces');
  Object.assign(button.style,{position:'absolute',top:'12px',right:'12px',zIndex:'41',padding:'9px 13px',borderRadius:'10px',background:'#184a40',color:'white',border:'1px solid #acd0c1',cursor:'pointer'});
  button.addEventListener('click',()=>setActive(!active));stage.append(button);
  panel=document.createElement('div');panel.hidden=true;panel.setAttribute('aria-label','Commandes de visite');
  Object.assign(panel.style,{position:'absolute',left:'12px',bottom:'12px',zIndex:'41',background:'rgba(17,42,37,.88)',color:'white',borderRadius:'10px',padding:'8px',fontSize:'12px',maxWidth:'75%'});
  panel.textContent='↑ ↓ avancer/reculer · ← → tourner · Q/D déplacement latéral · Échap quitter · Cliquez sur un objet pour le modifier';
  stage.append(panel);
  const supported=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE']);
  document.addEventListener('keydown',e=>{
    if(!active||editable(e.target)||e.altKey||e.ctrlKey||e.metaKey||!supported.has(e.code))return;
    e.preventDefault();e.stopImmediatePropagation();keys.add(e.code);onMove();
  },true);
  document.addEventListener('keyup',e=>{keys.delete(e.code);if(active&&supported.has(e.code))e.preventDefault()},true);
  window.addEventListener('blur',()=>keys.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear()});
  document.addEventListener('keydown',e=>{if(active&&e.key==='Escape'&&!editable(e.target)){setActive(false);e.stopImmediatePropagation()}},true);
  let last=0;
  function tick(dt){
    if(!active)return false;
    const left=keys.has('ArrowLeft'),right=keys.has('ArrowRight');
    const rotation=(Number(left)-Number(right))*turn*dt;
    if(rotation)forward.applyAxisAngle(new T.Vector3(0,1,0),rotation).normalize();
    const f=Number(keys.has('ArrowUp')||keys.has('KeyW'))-Number(keys.has('ArrowDown')||keys.has('KeyS'));
    const strafe=Number(keys.has('KeyD')||keys.has('KeyE'))-Number(keys.has('KeyA')||keys.has('KeyQ'));
    const side=new T.Vector3(-forward.z,0,forward.x);
    const move=forward.clone().multiplyScalar(f).addScaledVector(side,strafe);
    if(move.lengthSq()>0){move.normalize().multiplyScalar(speed*dt);const p=camera.position;
      if(passable(p.x+move.x,p.z))p.x+=move.x;
      if(passable(p.x,p.z+move.z))p.z+=move.z;
      p.y=eye;
    }
    if(rotation||move.lengthSq()>0){view();return true}
    return false;
  }
  return {tick,get active(){return active},setActive};
}
