(() => {
 'use strict';
 const S=window.LRF_ELIOS_POSE_V2;if(!S)return;
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 S.tileSampleFor=(series,color)=>{
  const slug=S.collectionKeys[series]||S.slug(series),options=window.ELIOS_COLOR_MEDIA?.variants?.[slug]||{},key=Object.keys(options).find(key=>normalize(key)===normalize(String(color||'').replace(/ Selected$/,''))),files=key?options[key]:[];
  return files.find(file=>/catalogue-native|tacca|_z(?:[-.]|\.)|_600\./i.test(file)&&!/_pav|_amb|Salvia_1/i.test(file))||'';
 };
 const previous=S.renderSelection;
 function render(){
  previous();if(S.state.group!=='small')return;
  const family=S.small(),host=S.$('#ep-product-controls'),selected=S.smallChoice();
  const panel=document.createElement('details');panel.className='ep-real-samples';panel.innerHTML='<summary>Voir les couleurs et leurs références</summary>';
  const grid=document.createElement('div');grid.className='ep-real-samples-grid';
  for(const color of family.colors){
   const source=S.tileSampleFor(family.series,color.color),button=document.createElement('button');button.type='button';button.setAttribute('aria-label',color.color+' · '+color.ref);button.setAttribute('aria-pressed',String(color.ref===selected?.ref));
   if(source){const img=document.createElement('img');img.src=source;img.alt='';img.loading='lazy';img.decoding='async';img.onerror=()=>{img.hidden=true;};button.append(img);}
   const name=document.createElement('b'),reference=document.createElement('small');name.textContent=color.color;reference.textContent=color.ref;button.append(name,reference);button.onclick=()=>{S.state.smallColor=color.color;S.renderSelection();};grid.append(button);
  }
  panel.append(grid);host.append(panel);
 }
 S.renderSelection=render;
 const style=document.createElement('style');style.textContent='.ep-real-samples{grid-column:1/-1;min-width:0}.ep-real-samples summary{cursor:pointer;padding:10px 0;font-weight:600;font-size:.8rem}.ep-real-samples-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.ep-real-samples-grid button{padding:6px;border:1px solid #d7cbb5;border-radius:8px;background:#fff;color:#2a241b;text-align:left;min-width:0;cursor:pointer;min-height:44px}.ep-real-samples-grid button[aria-pressed=true]{border:2px solid #a87b20;background:#fff9eb;padding:5px}.ep-real-samples-grid img{display:block;width:100%;height:54px;object-fit:cover;margin-bottom:5px}.ep-real-samples-grid b,.ep-real-samples-grid small{display:block;font-size:.65rem;overflow-wrap:anywhere}.ep-real-samples-grid small{font-size:.6rem;margin-top:3px;color:#716653}@media(max-width:480px){.ep-real-samples-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media print{.ep-real-samples{display:none!important}}';document.head.append(style);
})();
