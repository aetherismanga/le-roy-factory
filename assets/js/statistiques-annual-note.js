const PARTNERS=[
  ['elios-ceramica','ELIOS CERAMICA'],['view-ceramica','VIEW CERAMICA'],['la-fenice','LA FENICE'],['reviglass','REVIGLASS'],['biopietra','BIOPIETRA'],['petracers',"PETRACER'S"],['pecchioli-firenze','PECCHIOLI FIRENZE'],['bulbo','BULBO'],['randal-pro','RANDAL PRO'],['floor-italia','FLOOR ITALIA'],['propamsa','PROPAMSA'],['cermed','CERMED'],['neobath','NEOBATH'],['koibath','KOIBATH'],['aquahome','AQUAHOME'],['opal','OPAL'],['bilt','BILT']
];
const names=Object.fromEntries(PARTNERS);
const STATUS={
  2025:{
    'view-ceramica':{kind:'full'},'randal-pro':{kind:'full'},
    'elios-ceramica':{kind:'partial',through:'jusqu’à mi-juin 2025',missing:'mi-juin à décembre 2025'},
    'reviglass':{kind:'partial',through:'jusqu’à mi-juin 2025',missing:'mi-juin à décembre 2025'},
    'floor-italia':{kind:'partial',through:'jusqu’à mi-juin 2025',missing:'mi-juin à décembre 2025'},
    'petracers':{kind:'partial',through:'jusqu’à mi-juin 2025',missing:'mi-juin à décembre 2025'},
    'pecchioli-firenze':{kind:'partial',through:'jusqu’à mi-juin 2025',missing:'mi-juin à décembre 2025'},
    'cermed':{kind:'partial',through:'jusqu’à mi-juin 2025',missing:'mi-juin à décembre 2025'},
    'propamsa':{kind:'partial',through:'jusqu’à mi-juin 2025',missing:'mi-juin à décembre 2025'},
    'biopietra':{kind:'partial',through:'jusqu’à mi-juin 2025',missing:'mi-juin à décembre 2025'}
  },
  2026:{
    'elios-ceramica':{kind:'partial',through:'jusqu’à fin juillet 2026',missing:'août à décembre 2026'},
    'view-ceramica':{kind:'partial',through:'jusqu’à fin juillet 2026',missing:'août à décembre 2026'}
  }
};
function noteFor(partner,year){
  const x=STATUS[year]?.[partner];
  if(!x)return {kind:'none',text:`${names[partner]||partner} : aucune donnée ${year}`};
  if(x.kind==='full')return {kind:'full',text:`${names[partner]||partner} : année complète`};
  return {kind:'partial',text:`${names[partner]||partner} : ${x.through} — manque ${x.missing}`};
}
function refresh(){
  const mode=document.getElementById('stats-period-type')?.value||'';
  const active=document.querySelector('.partner-tab.active')?.dataset.partner||'';
  const year=Number(document.getElementById('stats-year')?.value||0);
  const notice=document.getElementById('stats-detail-notice');
  const annualOption=document.querySelector('#stats-period-type option[value="annual"]');
  if(annualOption)annualOption.textContent='Année — cumul disponible';
  if(mode!=='annual'||!year)return;

  document.querySelectorAll('#stats-kpis .kpi-card').forEach(card=>{
    if(card.querySelector('span')?.textContent?.trim()==='Partenaires inclus'){
      const small=card.querySelector('small');if(small)small.textContent='Complets + incomplets disponibles';
    }
  });

  if(!notice)return;
  const notes=active==='all'?PARTNERS.map(([id])=>noteFor(id,year)):[noteFor(active,year)];
  const full=notes.filter(x=>x.kind==='full'),partial=notes.filter(x=>x.kind==='partial'),none=notes.filter(x=>x.kind==='none');
  const blocks=[];
  if(full.length)blocks.push(`Complet : ${full.map(x=>x.text.replace(/ : année complète$/,'')).join(', ')}`);
  if(partial.length)blocks.push(`Incomplet mais inclus dans le total : ${partial.map(x=>x.text).join(' • ')}`);
  if(none.length)blocks.push(`Sans données : ${none.map(x=>x.text.replace(` : aucune donnée ${year}`,'' )).join(', ')}`);
  if(blocks.length){notice.style.display='block';notice.textContent=blocks.join(' | ')}
}
let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh()})}
const obs=new MutationObserver(schedule);
obs.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','style']});
document.addEventListener('change',e=>{if(e.target.matches('#stats-year,#stats-period-type,#stats-month'))setTimeout(refresh,0)});
document.addEventListener('click',e=>{if(e.target.closest('.partner-tab'))setTimeout(refresh,30)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,60),{once:true});else setTimeout(refresh,60);
