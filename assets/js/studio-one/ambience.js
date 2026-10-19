/* STUDIO ONE defaults and its five neutral grout colours. Units are metres. */
(()=>{'use strict';
 const grouts=Object.freeze([
  {id:'white',name:'Blanc',hex:'#f2f0e9'},
  {id:'light-grey',name:'Gris clair',hex:'#c8c9c5'},
  {id:'grey',name:'Gris',hex:'#8f928e'},
  {id:'beige',name:'Beige',hex:'#baa88e'},
  {id:'ivory',name:'Ivoire',hex:'#ded5c1'}
 ].map(Object.freeze));
 function nearest(hex){const value=/^#[\da-f]{6}$/i.test(hex||'')?hex:'#c8c9c5';const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),v=rgb(value);return grouts.reduce((best,g)=>{const distance=rgb(g.hex).reduce((n,c,i)=>n+(c-v[i])**2,0);return distance<best.distance?{...g,distance}:best;},{distance:Infinity}).hex;}
 function recommend(collection,color){
  if(collection==='elios-creta'&&color==='caramello')return grouts[1].hex;
  if(/avena|avorio|ivory|cream|zucchero|bone|seta/.test(color))return grouts[4].hex;
  if(/white|bianco|blanc|chalk|pure/.test(color))return grouts[0].hex;
  if(/carbon|black|nero|pepe|anthracite|antracite|coffee|dark/.test(color))return grouts[2].hex;
  if(/beige|sand|sabbia|biscotto|malto|honey|amber|canyon|rust|natural|caramel/.test(color))return grouts[3].hex;
  return grouts[1].hex;
 }
 const room=Object.freeze({width:4.5,depth:4.5,height:2.6});
 const tile=(color,groutColor)=>Object.freeze({collection:'elios-creta',color,format:'60x120',orientation:'horizontal',layout:'straight',groutWidth:2,groutColor});
 window.StudioOneAmbience=Object.freeze({room,grouts,nearest,recommend,floor:tile('caramello',grouts[1].hex),wall:tile('avena',grouts[4].hex)});
})();
