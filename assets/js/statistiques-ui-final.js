const START_YEAR=2023;
const MONTHS=['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
let syncing=false;
let desiredYear=null;
let desiredPeriod='annual';

function currentYear(){return new Date().getFullYear()}
function yearOptions(){const out=[];for(let y=START_YEAR;y<=currentYear();y++)out.push(y);return out.reverse()}
function hiddenType(){return document.getElementById('stats-period-type')}
function hiddenMonth(){return document.getElementById('stats-month')}
function hiddenYear(){return document.getElementById('stats-year')}

// Important : mémorise l'année AVANT que les anciens scripts ne réécrivent le select.
document.addEventListener('change',e=>{
  if(e.target?.id!=='stats-year')return;
  const v=Number(e.target.value);
  if(yearOptions().includes(v))desiredYear=v;
},true);

function injectStyles(){
  if(document.getElementById('stats-ui-final-style'))return;
  const s=document.createElement('style');s.id='stats-ui-final-style';s.textContent=`
    .stats-period-filters{grid-template-columns:minmax(120px,.7fr) minmax(220px,1.3fr) minmax(150px,1fr) minmax(170px,1fr)!important}
    .stats-simple-period-block select{font-weight:750}
    .stats-period-unavailable{display:none;background:#FFF8E8;border:1px solid #E8D79F;color:#695C32;border-radius:9px;padding:.7rem .8rem;margin:-.45rem 0 .8rem;font-size:.8rem}
    @media(min-width:761px){#stats-mobile-list{display:none!important}}
    @media(max-width:760px){#stats-table-wrap{display:none!important}}
  `;document.head.appendChild(s);
  const filters=document.getElementById('stats-period-filters');
  if(filters&&!document.getElementById('stats-period-unavailable'))filters.insertAdjacentHTML('afterend','<div id="stats-period-unavailable" class="stats-period-unavailable"></div>');
}

function normalizeYears(){
  const sel=hiddenYear();if(!sel)return;
  const wanted=yearOptions();
  if(desiredYear==null)desiredYear=Number(sel.value)||currentYear();
  if(!wanted.includes(desiredYear))desiredYear=currentYear();
  const actual=[...sel.options].map(o=>Number(o.value)).filter(Boolean);
  const same=actual.length===wanted.length&&actual.every((v,i)=>v===wanted[i]);
  if(!same)sel.innerHTML=wanted.map(y=>`<option value="${y}">${y}</option>`).join('');
  if(Number(sel.value)!==desiredYear)sel.value=String(desiredYear);
}

function hiddenPeriodEntries(){
  const sel=hiddenMonth();if(!sel)return [];
  return [...sel.options].map(o=>({value:o.value,text:o.textContent||''})).filter(x=>x.value);
}
function keyForMonth(month){
  const year=desiredYear||Number(hiddenYear()?.value||0),entries=hiddenPeriodEntries();
  return entries.find(x=>{
    const m=Number((x.value.match(/-(\d{2})(?:$|-)/)||[])[1]);
    if(m===month&&String(x.value).startsWith(String(year)))return true;
    return x.text.toLowerCase().includes(MONTHS[month].toLowerCase());
  })?.value||'';
}

function ensureSimplePeriodControl(){
  const existing=document.getElementById('stats-simple-period');if(existing)return existing;
  const yearBlock=hiddenYear()?.closest('.filter-block');if(!yearBlock)return null;
  const block=document.createElement('div');block.className='filter-block stats-simple-period-block';
  block.innerHTML='<label for="stats-simple-period">Période</label><select id="stats-simple-period"></select>';
  yearBlock.insertAdjacentElement('afterend',block);return block.querySelector('select');
}
function expectedPeriodOptions(){return ['annual',...Array.from({length:12},(_,i)=>`month:${i+1}`),'custom']}
function rebuildSimplePeriod(){
  const sel=ensureSimplePeriodControl();if(!sel)return;
  const wanted=expectedPeriodOptions(),actual=[...sel.options].map(o=>o.value);
  const same=actual.length===wanted.length&&actual.every((v,i)=>v===wanted[i]);
  if(!same){
    const months=Array.from({length:12},(_,i)=>i+1).map(m=>`<option value="month:${m}">${MONTHS[m]}</option>`).join('');
    sel.innerHTML=`<option value="annual">Année complète / en cours</option>${months}<option value="custom">Dates personnalisées</option>`;
  }
  if(!wanted.includes(desiredPeriod))desiredPeriod='annual';
  if(sel.value!==desiredPeriod)sel.value=desiredPeriod;
  if(!sel.dataset.finalBound){sel.dataset.finalBound='1';sel.addEventListener('change',()=>{desiredPeriod=sel.value;applySimpleSelection()})}
}

function showUnavailable(text=''){
  const box=document.getElementById('stats-period-unavailable');if(!box)return;
  box.textContent=text;box.style.display=text?'block':'none';
}
function clearResultsForUnavailable(month){
  const year=desiredYear||hiddenYear()?.value||'';showUnavailable(`Aucune situation statistique importée pour ${MONTHS[month]} ${year}. Les chiffres apparaîtront dès qu’un fichier correspondant sera ajouté.`);
  const tbody=document.getElementById('stats-body');if(tbody)tbody.innerHTML='';
  const mobile=document.getElementById('stats-mobile-list');if(mobile)mobile.innerHTML='';
  const count=document.getElementById('stats-result-count');if(count)count.textContent='';
  enforceResponsive();
}

function applySimpleSelection(){
  if(syncing)return;syncing=true;
  const type=hiddenType(),month=hiddenMonth();
  if(!type||!month){syncing=false;return}
  showUnavailable('');normalizeYears();
  if(desiredPeriod==='annual'){
    type.value='annual';type.dispatchEvent(new Event('change',{bubbles:true}));
    setTimeout(()=>{normalizeYears();forceSelectedYearText();syncing=false;enforceResponsive()},100);return;
  }
  if(desiredPeriod==='custom'){
    type.value='range';type.dispatchEvent(new Event('change',{bubbles:true}));
    setTimeout(()=>{normalizeYears();forceSelectedYearText();syncing=false;enforceResponsive()},100);return;
  }
  const m=Number(desiredPeriod.split(':')[1]||0),key=keyForMonth(m);
  type.value='month';type.dispatchEvent(new Event('change',{bubbles:true}));
  setTimeout(()=>{
    normalizeYears();
    if(key){month.value=key;month.dispatchEvent(new Event('change',{bubbles:true}));showUnavailable('')}
    else clearResultsForUnavailable(m);
    forceSelectedYearText();syncing=false;enforceResponsive();
  },70);
}

function forceSelectedYearText(){
  if(!desiredYear)return;
  const title=document.getElementById('stats-title');
  if(title&&/\b20\d{2}\b/.test(title.textContent||''))title.textContent=(title.textContent||'').replace(/\b20\d{2}\b/g,String(desiredYear));
}

function onYearChanged(){
  // desiredYear est déjà capturé en phase capture, avant les autres listeners.
  desiredPeriod='annual';
  setTimeout(()=>{
    normalizeYears();
    rebuildSimplePeriod();
    const simple=document.getElementById('stats-simple-period');if(simple)simple.value='annual';
    showUnavailable('');forceSelectedYearText();enforceResponsive();
  },120);
}

function enforceResponsive(){
  const table=document.getElementById('stats-table-wrap'),mobile=document.getElementById('stats-mobile-list');if(!table||!mobile)return;
  const hasTableRows=!!document.querySelector('#stats-body tr');
  const hasMobileCards=!!mobile.children.length;
  if(window.matchMedia('(max-width:760px)').matches){
    table.style.setProperty('display','none','important');
    mobile.style.setProperty('display',hasMobileCards?'grid':'none','important');
  }else{
    mobile.style.setProperty('display','none','important');
    table.style.setProperty('display',hasTableRows?'block':'none','important');
  }
}

function hideLegacyPeriodControls(){
  const type=hiddenType(),month=hiddenMonth();
  if(type?.closest('.filter-block'))type.closest('.filter-block').style.display='none';
  if(month?.closest('.filter-block'))month.closest('.filter-block').style.display='none';
}

function clarifyPartnerKpi(){
  const tabs=[...document.querySelectorAll('.partner-tab[data-partner]')];
  const total=tabs.filter(t=>t.dataset.partner!=='all').length;
  if(!total)return;
  document.querySelectorAll('#stats-kpis .kpi-card').forEach(card=>{
    const label=card.querySelector('span'),strong=card.querySelector('strong'),small=card.querySelector('small');
    if(!label||!strong)return;
    const txt=label.textContent.trim();
    if(txt==='Partenaires inclus'||txt==='Partenaires avec données'){
      const available=String(strong.textContent||'0').split('/')[0].trim();
      label.textContent='Partenaires avec données';strong.textContent=`${available} / ${total}`;
      if(small)small.textContent='pour la période sélectionnée';
    }
  });
}

function stabilize(){normalizeYears();hideLegacyPeriodControls();rebuildSimplePeriod();forceSelectedYearText();enforceResponsive();clarifyPartnerKpi()}
function init(){
  injectStyles();desiredYear=Number(hiddenYear()?.value)||currentYear();stabilize();
  const year=hiddenYear();if(year&&!year.dataset.finalBound){year.dataset.finalBound='1';year.addEventListener('change',()=>setTimeout(onYearChanged,0))}
  document.addEventListener('click',e=>{if(e.target.closest('.partner-tab'))setTimeout(()=>{stabilize();showUnavailable('')},120)});
  window.addEventListener('resize',enforceResponsive);
  let pending=false;const obs=new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;stabilize()})});obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(stabilize,180);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
