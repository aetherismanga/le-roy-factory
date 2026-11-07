(()=>{
 'use strict';const S=window.LRF_ELIOS_POSE_V2;if(!S)return;const {$,$$,state}=S;
 $$('.ep-tab').forEach(t=>t.onclick=()=>{state.group=t.dataset.group;state.pattern=S.groupPatterns(state.group)[0]?.id||state.pattern;S.renderAll();});
 $('#ep-surface').oninput=S.calculate;$('#ep-waste').onchange=S.calculate;
 const print=$('#ep-print');let printing=false;
 const signature=()=>JSON.stringify([state.group,state.last?.pattern,state.last?.rows?.map(row=>[row.ref,row.need])]);
 const ready=()=>{if(state.group==='segmento'&&(S.segmentoReady===false||!window.LRF_ELIOS_SEGMENTO?.ready))throw Error('L’aperçu Segmento est indisponible. Actualisez la page pour réessayer.');if(state.group!=='segmento'&&$('#ep-preview')?.dataset?.poseOrigin!=='lrf'&&window.LRF_ELIOS_POSE_OFFICIAL_PREVIEW?.ready)return window.LRF_ELIOS_POSE_OFFICIAL_PREVIEW.ready();return state.group==='segmento'?window.LRF_ELIOS_SEGMENTO.ready():state.group==='sedimenti'?window.LRF_ELIOS_SEDIMENTI_PREVIEW?.whenRendered?.():state.group==='small'?window.LRF_ELIOS_SMALL_DESIGNS?.whenRendered?.():null;};
 print.onclick=async()=>{
  if(printing)return;printing=true;const label=print.textContent;print.disabled=true;print.textContent='Préparation…';
  let status=$('#ep-print-status');if(!status){status=document.createElement('small');status.id='ep-print-status';status.setAttribute('role','status');print.after(status);}status.textContent='Chargement de l’aperçu avant impression…';
  try{
   for(let attempt=0;attempt<6;attempt++){const before=signature();await ready();if(before===signature()){status.textContent='';window.print();return;}}
   throw Error('Terminez votre choix de couleurs puis relancez l’impression.');
  }catch(error){status.textContent=error.message||'L’aperçu ne peut pas encore être imprimé. Réessayez.';}
  finally{printing=false;print.disabled=false;print.textContent=label;}
 };
 $('#ep-order').onclick=S.openOrder;S.renderAll();
})();
