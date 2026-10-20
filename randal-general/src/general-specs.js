// RANDAL Général V04, photos and technical sheets pp. 3–34.
// Hardware choices are catalogue references, never unpriced colour variants.
export const HANDLE_FINISHES=Object.freeze({
 black:{id:'black',name:'Noir',hex:'#242729',metalness:.72,roughness:.3},
 gold:{id:'gold',name:'Doré',hex:'#b89b61',metalness:.88,roughness:.29},
 silver:{id:'silver',name:'Aluminium',hex:'#bbc0c3',metalness:.9,roughness:.32},
 nickel:{id:'nickel',name:'Nickel',hex:'#bdc0bc',metalness:.82,roughness:.36},
 white:{id:'white',name:'Blanc',hex:'#f4f3ee',metalness:.05,roughness:.3},
 'aged-gold':{id:'aged-gold',name:'Or vieilli',hex:'#ac8c51',metalness:.8,roughness:.43},
 'aged-silver':{id:'aged-silver',name:'Argent vieilli',hex:'#a5a6a1',metalness:.8,roughness:.44}
});
export const panelThickness=form=>['harmony','less'].includes(form.collection)?.016:.019;
export function handleChoices(form){
 if(['harmony','brunei','sima','amat'].includes(form.collection))return [];
 const ids=form.collection==='brent'?['aged-gold','aged-silver']:form.collection==='less'?['white','nickel','black']:form.collection==='luce'?['gold']:['aruba','aruba-rainure','boreal'].includes(form.collection)?['black']:['silver'];
 return ids.map(id=>HANDLE_FINISHES[id]);
}
export function handleFinish(form,finish){
 if(form.collection==='brent')return finish?.includes('argent-vieilli')?'aged-silver':'aged-gold';
 if(form.collection==='less')return finish?.includes('tirador-blanco')?'white':finish?.includes('tirador-negro')?'black':'nickel';
 return handleChoices(form)[0]?.id||null;
}
export function finishForHandle(form,finish,handle){
 if(!handleChoices(form).some(c=>c.id===handle))return null;
 if(form.collection==='brent')return finish.replace(/(?:or|argent)-vieilli$/,handle==='aged-gold'?'or-vieilli':'argent-vieilli');
 if(form.collection==='less')return form.finishes.find(f=>f.endsWith('tirador-'+({white:'blanco',nickel:'niquel',black:'negro'}[handle])))||null;
 return finish;
}
export function joineryLayout(form,W,H,B){
 const panel=panelThickness(form),double=W>=1.19&&!['luce','amat','sima','less'].includes(form.collection),doorWidth=form.collection==='amat'?W/3:form.door?W:0;
 const bays=double?[{x:-W/4,width:W/2},{x:W/4,width:W/2}]:[{x:form.collection==='amat'?(form.doorSide==='left'?doorWidth/2:-doorWidth/2):0,width:W-doorWidth}];
 const rows=Array.from({length:form.drawers},(_,i)=>{
  const cell=H/(form.niche?3:form.drawers),top=B+H-i*cell;
  if(form.collection==='brunei'){
   const h=(H-.026-(panel+.002)-.028)/2,bottom=i===0?B+panel+.002+h+.028:B+panel+.002;
   return {y:bottom+h/2,height:h,bottom,top:bottom+h,z:.2005,gap:.028};
  }
  const gap=form.collection==='boreal'?.024:.006,height=cell-gap;
  return {y:top-gap-height/2,height,bottom:top-cell,top:top-gap,z:.230-panel/2,gap};
 });
 return {panel,bays,rows,doorWidth,double};
}
