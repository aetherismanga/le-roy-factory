const START_YEAR=2023;
const MONTHS=['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
let syncing=false;

function currentYear(){return new Date().getFullYear()}
function yearOptions(){const out=[];for(let y=START_YEAR;y<=currentYear();y++)out.push(y);return out.reverse()}
function activePartner(){return document.querySelector('.partner-tab.active')?.dataset.partner||'elios-ceramica'}
function hiddenType(){return document.getElementById('stats-period-type')}
function hiddenMonth(){return document.getElementById('stats-month')}
function hiddenYear(){return document.getElementById('stats-year')}

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
  const wanted=yearOptions(),previous=Number(sel.value)||currentYear();
  const signature=wanted.join('|');if(sel.dataset.fullYearSignature===signature)return;
  sel.innerHTML=wanted.map(y=>`<option value="${y}">${y}</option>`).join('');
  sel.value=String(wanted.includes(previous)?previous:currentYear());
  sel.dataset.fullYearSignature=signature;
}

function hiddenPeriodEntries(){
  const sel=hiddenMonth();if(!sel)return [];
  return [...sel.options].map(o=>({value:o.value,text:o.textContent||''})).filter(x=>x.value);
}
function keyForMonth(month){
  const year=Number(hiddenYear()?.value||0),entries=hiddenPeriodEntries();
  return entries.find(x=>{
    const m=Number((x.value.match(/-(\d{2})(?:$|-)/)||[])[1]);
    if(m===month&&String(x.value).startsWith(String(year)))return true;
    const t=x.text.toLowerCase();return t.includes(MONTHS[month].toLowerCase());
  })?.value||'';
}
function latestAvailableKey(){
  const entries=hiddenPeriodEntries();
  const year=String(hiddenYear()?.value||'');
  return entries.filter(x=>x.value.startsWith(year)).at(-1)?.value||entries.at(-1)?.value||'';
}

function ensureSimplePeriodControl(){
  const existing=document.getElementById('stats-simple-period');
  if(existing){existing.dataset.finalUi='1';return existing}
  const yearBlock=hiddenYear()?.closest('.filter-block');if(!yearBlock)return null;
  const block=document.createElement('div');block.className='filter-block stats-simple-period-block';
  block.innerHTML='<label for="stats-simple-period">Période</label><select id="stats-simple-period" data-final-ui="1"></select>';
  yearBlock.insertAdjacentElement('afterend',block);return block.querySelector('select');
}
function rebuildSimplePeriod(){
  const sel=ensureSimplePeriodControl();if(!sel)return;
  const previous=sel.value||'annual';
  const months=Array.from({length:12},(_,i)=>i+1).map(m=>`<option value="month:${m}">${MONTHS[m]}</option>`).join('');
  sel.innerHTML=`<option value="annual">Année complète / en cours</option>${months}<option value="custom">Dates personnalisées</option>`;
  if([...sel.options].some(o=>o.value===previous))sel.value=previous;else sel.value='annual';
}

function showUnavailable(text=''){
  const box=document.getElementById('stats-period-unavailable');if(!box)return;
  box.textContent=text;box.style.display=text?'block':'none';
}
function clearResultsForUnavailable(month){
  const year=hiddenYear()?.value||'';showUnavailable(`Aucune situation statistique importée pour ${MONTHS[month]} ${year}. Les chiffres apparaîtront dès qu’un fichier correspondant sera ajouté.`);
  const tbody=document.getElementById('stats-body');if(tbody)tbody.innerHTML='';
  const mobile=document.getElementById('stats-mobile-list');if(mobile)mobile.innerHTML='';
  const count=document.getElementById('stats-result-count');if(count)count.textContent='';
}

function applySimpleSelection(){
  if(syncing)return;syncing=true;
  try{
    const simple=document.getElementById('stats-simple-period'),type=hiddenType(),month=hiddenMonth();if(!simple||!type||!month)return;
    showUnavailable('');
    if(simple.value==='annual'){
      type.value='annual';type.dispatchEvent(new Event('change',{bubbles:true}));return;
    }
    if(simple.value==='custom'){
      type.value='range';type.dispatchEvent(new Event('change',{bubbles:true}));return;
    }
    const m=Number(simple.value.split(':')[1]||0),key=keyForMonth(m);
    type.value='month';type.dispatchEvent(new Event('change',{bubbles:true}));
    setTimeout(()=>{
      if(key){month.value=key;month.dispatchEvent(new Event('change',{bubbles:true}));showUnavailable('')}
      else clearResultsForUnavailable(m);
    },40);
  } finally {setTimeout(()=>{syncing=false},80)}
}

function onYearChanged(){
  rebuildSimplePeriod();
  const simple=document.getElementById('stats-simple-period');if(simple)simple.value='annual';
  showUnavailable('');
  const type=hiddenType();if(type){type.value='annual';type.dispatchEvent(new Event('change',{bubbles:true}))}
}

function enforceResponsive(){
  const table=document.getElementById('stats-table-wrap'),mobile=document.getElementById('stats-mobile-list');if(!table||!mobile)return;
  const hasRows=!!document.querySelector('#stats-body tr');
  if(window.matchMedia('(max-width:760px)').matches){
    table.style.setProperty('display','none','important');
    mobile.style.setProperty('display',hasRows?'grid':'none','important');
  }else{
    mobile.style.setProperty('display','none','important');
    table.style.setProperty('display',hasRows?'block':'none','important');
  }
}

function hideLegacyPeriodControls(){
  const type=hiddenType(),month=hiddenMonth();
  if(type?.closest('.filter-block'))type.closest('.filter-block').style.display='none';
  if(month?.closest('.filter-block'))month.closest('.filter-block').style.display='none';
}

function init(){
  injectStyles();normalizeYears();hideLegacyPeriodControls();rebuildSimplePeriod();
  const simple=document.getElementById('stats-simple-period');
  if(simple&&!simple.dataset.finalBound){simple.dataset.finalBound='1';simple.addEventListener('change',applySimpleSelection)}
  const year=hiddenYear();if(year&&!year.dataset.finalBound){year.dataset.finalBound='1';year.addEventListener('change',()=>setTimeout(onYearChanged,0))}
  document.addEventListener('click',e=>{if(e.target.closest('.partner-tab'))setTimeout(()=>{normalizeYears();rebuildSimplePeriod();showUnavailable('');enforceResponsive()},100)});
  window.addEventListener('resize',enforceResponsive);
  const obs=new MutationObserver(()=>{normalizeYears();hideLegacyPeriodControls();enforceResponsive()});obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(enforceResponsive,150);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
