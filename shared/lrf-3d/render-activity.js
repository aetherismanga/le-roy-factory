// Effects may settle after a gesture; the image and texture resolution never
// change here. Keep one final frame, then return to on-demand rendering.
export class RenderActivity{
 constructor({settleMs=180}={}){this.settleMs=settleMs;this.reset();}
 reset(){this.active=false;this.lastMotion=-Infinity;}
 update(now,moving){
  const previous=this.active;
  if(moving){this.lastMotion=now;this.active=true;}
  else if(this.active&&now-this.lastMotion>=this.settleMs)this.active=false;
  return previous!==this.active;
 }
}
