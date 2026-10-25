// Native scrollbars belong to their scrolling rail, not necessarily to the
// inspector inside it. Keep those gestures in the UI even if a browser retargets
// their last event to the canvas after scrolling or a layout refresh.
export function pointerInsidePanels(event,panels,{view=globalThis.window,document=globalThis.document}={}){
 const x=event.clientX,y=event.clientY,path=event.composedPath?.()||[],target=event.target;
 for(const panel of panels||[]){
  if(!panel||panel.hidden||panel.getAttribute?.('aria-hidden')==='true')continue;
  if(panel.getClientRects&&panel.getClientRects().length===0)continue;
  const rect=panel.getBoundingClientRect?.();if(!rect||rect.width<=0||rect.height<=0)continue;
  const style=view?.getComputedStyle?.(panel);
  if(style?.display==='none'||style?.visibility==='hidden'||style?.visibility==='collapse')continue;
  if(panel===target||panel.contains?.(target)||path.includes(panel))return true;
  if(Number.isFinite(x)&&Number.isFinite(y)&&x>=rect.left-1&&x<=rect.right+1&&y>=rect.top-1&&y<=rect.bottom+1)return true;
  // A classic document scrollbar can sit just beyond the last rail's border.
  // Include that real gutter only; do not grow the rail over the 3D viewport.
  const edge=document?.documentElement?.clientWidth,width=view?.innerWidth;
  if(Number.isFinite(edge)&&width>edge&&rect.right>=edge-1&&x>=edge&&x<=width&&y>=rect.top&&y<=rect.bottom)return true;
 }
 return false;
}

export function mountPanelPointerGuard({canvas,document=globalThis.document,view=globalThis.window,getPanels=()=>document.querySelectorAll('#settings,#object-editor,.lrf-workspace-overlay')}={}){
 const uiPointers=new Set(),listeners=[];
 const isPanelInteraction=event=>pointerInsidePanels(event,getPanels(),{document,view});
 const retargeted=event=>event.target===canvas&&uiPointers.has(event.pointerId);
 const blockCanvas=event=>{event.stopImmediatePropagation();};
 const down=event=>{
  uiPointers.delete(event.pointerId);
  if(!isPanelInteraction(event))return;
  uiPointers.add(event.pointerId);
  if(event.target===canvas)blockCanvas(event);
 };
 const move=event=>{if(retargeted(event))blockCanvas(event);};
 const up=event=>{if(retargeted(event))blockCanvas(event);uiPointers.delete(event.pointerId);};
 const wheel=event=>{if(event.target===canvas&&isPanelInteraction(event))blockCanvas(event);};
 const listen=(owner,type,handler)=>{owner?.addEventListener(type,handler,{capture:true,passive:true});listeners.push([owner,type,handler]);};
 listen(document,'pointerdown',down);listen(document,'pointermove',move);listen(document,'pointerup',up);listen(document,'pointercancel',up);listen(document,'wheel',wheel);
 const clear=()=>uiPointers.clear();listen(view,'blur',clear);
 return {isPanelInteraction,destroy(){for(const [owner,type,handler]of listeners)owner?.removeEventListener(type,handler,true);clear();}};
}
