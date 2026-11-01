/* Shared single-finger photo navigation. Native vertical scroll and pinch stay native. */
const bindings = new WeakMap();
const claimedStarts = new WeakSet();
let blockedClick;
// Some older galleries open from a document capture listener. Window capture
// consumes the synthetic click before those listeners can open another viewer.
globalThis.addEventListener?.('touchstart',() => { blockedClick = null; },{capture:true,passive:true});
globalThis.addEventListener?.('click',event => {
  const record=blockedClick;
  if (!record || Date.now()>=record.until || event.detail===0) return;
  const inStage=record.element.contains?.(event.target);
  const atFinger=Number.isFinite(event.clientX) && Math.hypot(event.clientX-record.x,event.clientY-record.y)<28;
  if (!inStage && !atFinger) return;
  blockedClick=null;event.preventDefault();event.stopImmediatePropagation();
},true);
export function bindGallerySwipe(element, options = {}) {
  if (!element?.addEventListener || typeof options.onSwipe !== 'function') return () => {};
  const previous = bindings.get(element);
  if (previous) { previous.options = options; return previous.dispose; }
  const binding = {options};
  let start = null, suppressUntil = 0;
  const now = () => Date.now();
  const enabled = () => {
    try {
      const scale = Number(globalThis.visualViewport?.scale || 1);
      return scale <= 1.02 && binding.options.isEnabled?.() !== false;
    } catch { return false; }
  };
  const ignoreControl = target => {
    const form = target?.closest?.('input,select,textarea,a,[contenteditable="true"],[role="slider"]');
    if (form && element.contains?.(form)) return true;
    const button = target?.closest?.('button,[role="button"]');
    // An image may itself be a button that opens the enlarged photo.
    return !!button && button !== element && element.contains?.(button) && !button.querySelector?.('img,picture');
  };
  const cancel = () => { start = null; };
  const touchStart = event => {
    cancel();
    if (claimedStarts.has(event) || event.touches?.length !== 1 || !enabled() || ignoreControl(event.target)) return;
    const point = event.touches[0];
    suppressUntil = 0;
    start = {id:point.identifier ?? 0,x:point.clientX,y:point.clientY,time:now(),horizontal:false};
    claimedStarts.add(event);
  };
  const pointFor = points => Array.from(points || []).find(point => (point.identifier ?? 0) === start?.id);
  const touchMove = event => {
    if (!start) return;
    if (event.touches?.length !== 1 || !enabled()) { cancel(); return; }
    const point = pointFor(event.touches);
    if (!point) { cancel(); return; }
    const dx = Math.abs(point.clientX-start.x), dy = Math.abs(point.clientY-start.y);
    if (!start.horizontal && dy > 12 && dy > dx*1.25) { cancel(); return; }
    if (dx > 12 && dx > dy*1.3) start.horizontal = true;
    if (start.horizontal && event.cancelable) event.preventDefault();
  };
  const touchEnd = event => {
    if (!start) return;
    const point = pointFor(event.changedTouches), candidate = start;
    cancel();
    if (!point || event.touches?.length || !enabled() || now()-candidate.time > 1400) return;
    const dx = point.clientX-candidate.x, dy = point.clientY-candidate.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy)*1.3) return;
    // Mark before changing the photo: handlers can synchronously render a new image.
    suppressUntil = now()+550;
    blockedClick={element,until:suppressUntil,x:point.clientX,y:point.clientY};
    if (binding.options.onSwipe(dx < 0 ? 1 : -1) === false) { suppressUntil = 0; blockedClick=null; }
  };
  const click = event => {
    if (now() >= suppressUntil || event.detail === 0) return;
    suppressUntil = 0;
    event.preventDefault();event.stopImmediatePropagation();
  };
  element.addEventListener('touchstart',touchStart,{passive:true});
  element.addEventListener('touchmove',touchMove,{passive:false});
  element.addEventListener('touchend',touchEnd,{passive:true});
  element.addEventListener('touchcancel',cancel,{passive:true});
  element.addEventListener('click',click,true);
  if (element.dataset) element.dataset.lrfPhotoSwipe = '1';
  binding.dispose = () => {
    cancel();
    element.removeEventListener('touchstart',touchStart);
    element.removeEventListener('touchmove',touchMove);
    element.removeEventListener('touchend',touchEnd);
    element.removeEventListener('touchcancel',cancel);
    element.removeEventListener('click',click,true);
    if (element.dataset) delete element.dataset.lrfPhotoSwipe;
    bindings.delete(element);
  };
  bindings.set(element,binding);
  return binding.dispose;
}
