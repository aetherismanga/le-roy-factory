/* STUDIO ONE visual selector. Only usable collections and five grout shades. */
(()=>{'use strict';
 const imageURL=url=>window.RandalSurfaceTextureURL(url),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.RandalSurfacePicker=function(host,{prefix,surface='floor',value,onChange}){
  const C=window.RandalSurfaceCatalogue,A=window.StudioOneAmbience,collator=new Intl.Collator('fr',{sensitivity:'base',numeric:true});
  const available=brand=>C.collections.filter(c=>c.brand===brand&&c.available3d&&c.surfaces.includes(surface)&&c.colors.some(co=>co.available3d&&co.faces.length&&co.formats.length)).sort((a,b)=>collator.compare(a.name,b.name));
  let current=C.resolve(value,surface)||C.resolve(A[surface],surface);const choices=new Map([[current.brand,current]]);
  const select=(field,label,options,v)=>'<label>'+label+'<select data-field="'+field+'" id="'+prefix+'-'+field+'">'+options.map(o=>'<option value="'+esc(o.id)+'" '+(o.id===v?'selected':'')+'>'+esc(o.label)+'</option>').join('')+'</select></label>';
  function tileChoice(col,color,format){const co=col.colors.find(co=>co.id===color&&co.available3d)||col.colors.find(co=>co.available3d&&co.faces.length);return {...current,collection:col.id,color:co.id,format:co.formats.includes(format)?format:co.formats.includes('60x120')?'60x120':co.formats[0],groutWidth:2,groutColor:A.recommend(col.id,co.id)};}
  function render(focus){
   const col=C.collections.find(c=>c.id===current.collection),color=col.colors.find(c=>c.id===current.color),list=available(current.brand);
   host.innerHTML=select('brand','Fabricant',[{id:'elios',label:'ELIOS'},{id:'view',label:'VIEW'}].filter(b=>available(b.id).length),current.brand)+select('collection','Collection',list.map(c=>({id:c.id,label:c.name})),col.id)+'<div class="rv-colors" role="group" aria-label="Coloris">'+col.colors.filter(co=>co.available3d&&co.faces.length).map(co=>'<button type="button" data-color="'+esc(co.id)+'" aria-pressed="'+(co.id===color.id)+'"><img crossorigin="anonymous" loading="lazy" src="'+esc(imageURL(co.preview||co.faces[0]))+'" alt=""><span>'+esc(co.name)+'</span></button>').join('')+'</div>'+select('format','Format réel',col.formats.filter(f=>color.formats.includes(f.id)).map(f=>({id:f.id,label:f.label})),current.format)+select('orientation','Sens de pose',[{id:'horizontal',label:'Horizontal'},{id:'vertical',label:'Vertical'}],current.orientation)+select('layout','Pose',[{id:'straight',label:'Joints alignés'},{id:'staggered',label:'Décalée ½ carreau'}],current.layout)+'<fieldset class="studio-grouts"><legend>Couleur des joints</legend><div role="group" aria-label="Couleur des joints">'+A.grouts.map(g=>'<button type="button" class="studio-grout-button" data-grout="'+g.hex+'" aria-label="Joints '+g.name+'" aria-pressed="'+(g.hex===current.groutColor)+'"><span style="background-color:'+g.hex+'"></span>'+g.name+'</button>').join('')+'</div></fieldset><div class="rv-preview"><img crossorigin="anonymous" src="'+esc(imageURL(color.preview||color.faces[0]))+'" alt="'+esc(current.label)+'"></div><p class="rv-source">Échantillon officiel · '+color.resolution.join(' × ')+' px. <a href="'+esc(col.source)+'" target="_blank" rel="noopener">Voir la collection '+col.brand.toUpperCase()+' ↗</a></p>';
   host.querySelectorAll('[data-field]').forEach(el=>el.onchange=()=>{
    const field=el.dataset.field;
    if(field==='brand'){choices.set(current.brand,current);const first=available(el.value)[0];update(choices.get(el.value)||tileChoice(first,null,current.format),true,'brand');return;}
    if(field==='collection'){const c=list.find(c=>c.id===el.value);update(tileChoice(c,null,current.format),true,field);return;}
    update({...current,[field]:el.value},true,field);
   });
   host.querySelectorAll('[data-color]').forEach(el=>el.onclick=()=>update(tileChoice(col,el.dataset.color,current.format),true,'color:'+el.dataset.color));
   host.querySelectorAll('[data-grout]').forEach(el=>el.onclick=()=>update({...current,groutColor:el.dataset.grout},true,'grout:'+el.dataset.grout));
   if(focus){const selector=focus.startsWith('color:')?'[data-color="'+focus.slice(6)+'"]':focus.startsWith('grout:')?'[data-grout="'+focus.slice(6)+'"]':'[data-field="'+focus+'"]';host.querySelector(selector)?.focus({preventScroll:true});}
  }
  function update(v,emit=false,focus){const next=C.resolve(v,surface);if(!next)return;current=next;choices.set(next.brand,next);render(focus);if(emit)onChange({...current});}
  host.classList.add('rv-surface-picker');render();return {set:update,get:()=>({...current})};
 };
})();
