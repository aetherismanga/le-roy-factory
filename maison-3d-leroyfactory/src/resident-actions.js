import * as T from 'three';
export function createResidentActions({walk,getHouse,getWorld,getFloor,getGarden,onStatus,onMoveSeat}){
 let seat=null,pending=null,transition=null,lastSeat=null,failure='',attempts=[];
 // Routes may finish 3 cm from the requested point, with a 6 cm stop radius.
 const arrival=.12;
 function seats(){
  const result=[],registry=getHouse().arrangement,world=getWorld();
  for(const it of [...registry.items.values(),...(getGarden?.().seats||[])]){
   if(it.hidden||it.floor!==getFloor()||!['sofa','chair','stool'].includes(it.kind))continue;
   const height=it.kind==='sofa'?.56:it.kind==='stool'?.76:.52;
   it.object.updateWorldMatrix(true,false);
   for(const offset of it.kind==='sofa'?[0,-.5,.5]:[0]){
    const position=it.object.localToWorld(new T.Vector3(offset,height,it.kind==='sofa'?.02:0));
    const origin=it.object.localToWorld(new T.Vector3(0,0,0));
    const forward=it.object.localToWorld(new T.Vector3(0,0,1)).sub(origin).normalize();
    const front=it.object.localToWorld(new T.Vector3(offset,0,it.kind==='sofa'?1.15:.85));
    front.y=world.groundAt(front.x,front.z,it.root.position.y);
    if(!Number.isFinite(front.y))continue;
    const tucked=it.kind==='chair'&&!it.external&&!world.passable(front.x,front.z,front.y);
    const before=tucked?registry.read(it):null;
    const pulls=tucked?[.45,.65,.85,1.05]:[0];
    for(const distance of pulls){
     const shift=forward.clone().multiplyScalar(-distance),point=position.clone().add(shift);
     if(!world.passable(point.x,point.z,front.y,{ignoreObstacle:it.id}))continue;
     const pull=distance?{x:before.x+shift.x*100,z:before.z+shift.z*100}:null;
     if(pull){
      const c=Math.cos(it.root.rotation.y),s=Math.sin(it.root.rotation.y);
      const dx=walk.position.x-it.root.position.x-shift.x,dz=walk.position.z-it.root.position.z-shift.z;
      if(Math.abs(dx*c-dz*s)<before.width/200+world.radius+.03&&Math.abs(dx*s+dz*c)<before.depth/200+world.radius+.03)continue;
      if(registry.check(it,{...before,...pull}).length)continue;
     }
     // A dining chair can be reached from the side after pulling it away from
     // the table. Forcing an approach between its back and the next chair can
     // create an enclosed pocket that a person cannot reach.
     const approaches=[front.clone()];
     if(it.kind==='chair')for(const side of [-1,1])approaches.push(it.object.localToWorld(new T.Vector3(side*.75,0,0)));
     for(const approach of approaches){
      approach.add(shift);approach.y=world.groundAt(approach.x,approach.z,front.y);
      if(!Number.isFinite(approach.y)||!world.passable(approach.x,approach.z,approach.y,{ignoreObstacle:pull?it.id:null}))continue;
      result.push({id:it.id,name:it.name,kind:it.kind,point:new T.Vector3(point.x,approach.y,point.z),height:point.y-approach.y,approach,heading:Math.atan2(forward.x,forward.z),pull,beforePull:pull?{x:before.x,z:before.z}:null,distance:Math.hypot(walk.position.x-approach.x,walk.position.z-approach.z)});
     }
    }
   }
  }
  return result.sort((a,b)=>a.distance-b.distance);
 }
 function sit(id){if(seat||transition||walk.airborne)return false;walk.stop();failure='';attempts=[];
 for(const candidate of seats().filter(s=>(!id||s.id===id)&&s.distance<(id?6:3.5))){
 if(candidate.pull){const moved=onMoveSeat(candidate.id,candidate.pull);if(!moved?.ok){attempts.push({id:candidate.id,reason:'move',errors:moved?.errors});continue;}}
 const from=new T.Vector3(walk.position.x,walk.ground,walk.position.z),route=getWorld().route(from,candidate.approach);
 if(!route.length&&candidate.distance>arrival){attempts.push({id:candidate.id,reason:'route',from:from.toArray(),to:candidate.approach.toArray(),startFree:getWorld().passable(from.x,from.z,from.y),endFree:getWorld().passable(candidate.approach.x,candidate.approach.z,candidate.approach.y)});if(candidate.pull)onMoveSeat(candidate.id,candidate.beforePull);continue;}
 pending=candidate;if(candidate.distance>arrival&&!walk.walkTo(candidate.approach)){pending=null;if(candidate.pull)onMoveSeat(candidate.id,candidate.beforePull);continue;}
 onStatus('Votre personnage rejoint l’assise.');return true;
 }failure='Approchez-vous de l’avant d’un canapé ou d’une chaise, par un passage dégagé.';onStatus(failure);return false;}
 function beginSit(){seat=pending;pending=null;lastSeat=seat;walk.stop();walk.setActive(false);transition={type:'sit',progress:0,from:new T.Vector3(walk.position.x,walk.ground,walk.position.z),to:seat.point.clone()};onStatus('Assis · touchez « Se lever » pour reprendre la visite.');}
 function stand(){if(!seat||transition)return false;if(!getWorld().passable(seat.approach.x,seat.approach.z,seat.approach.y)){onStatus('Libérez le passage devant cette assise pour vous lever.');return false;}transition={type:'stand',progress:0,from:seat.point.clone(),to:seat.approach.clone()};return true;}
 function tick(dt){if(pending&&Math.hypot(walk.position.x-pending.approach.x,walk.position.z-pending.approach.z)<arrival)beginSit();if(pending&&!walk.pathLength&&!walk.moving&&Math.hypot(walk.position.x-pending.approach.x,walk.position.z-pending.approach.z)>.15)pending=null;
 if(transition){transition.progress=Math.min(1,transition.progress+dt/(transition.type==='sit'?.8:.7));const t=transition.progress,p=transition.from.clone().lerp(transition.to,t*t*(3-2*t)),eye=p.clone().add(new T.Vector3(0,1.58,0));walk.setPose(eye,eye.clone().add(new T.Vector3(0,0,-1)));if(t===1){if(transition.type==='stand'){seat=null;walk.setActive(true);}transition=null;}}
 return {seated:!!seat&&transition?.type!=='stand',seatHeight:seat?.height,heading:seat?.heading,transition:transition?.type||null};}
 function reset(){if(seat){const p=seat.approach.clone().add(new T.Vector3(0,1.58,0));walk.setPose(p,p.clone().add(new T.Vector3(0,0,-1)));}seat=pending=transition=null;}
 return {sit,stand,tick,reset,get seated(){return !!seat;},get pending(){return pending?.id||null;},seats:()=>seats().map(s=>({...s,point:s.point.toArray(),approach:s.approach.toArray()})),get state(){return {seated:!!seat,seat:seat?.id||null,pending:pending?.id||null,transition:transition?.type||null,lastSeat:lastSeat?.id||null,seatFailure:failure,seatAttempts:attempts};}};
}
