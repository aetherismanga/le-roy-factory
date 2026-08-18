const START_YEAR=2023;
const MONTHS=['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
let desiredYear=new Date().getFullYear();
let desiredPeriod='annual';
let applying=false;

const currentYear=()=>new Date().getFullYear();
const years=()=>{const out=[];for(let y=START_YEAR;y<=currentYear();y++)out.push(y);return out.reverse()};
const yearEl=()=>document.getElementById('stats-year');
const typeEl=()=>document.getElementById('stats-period-type');
const monthEl=()=>document.getElementById('stats-month');

function addStyles(){
  if(document.getElementById('stats-ui-final-style'))return;
  const s=document.createElement('style');s.id='stats-ui-final-style';s.textContent=`
    .stats-period-filters{grid-template-columns:minmax(120px,.7fr) minmax(220px,1.3fr) minmax(150px,1fr) minmax(170px,1fr)!important}
    .stats-simple-period-block select{font-weight:750}
    .stats-period-unavailable{display:none;background:#FFF8E8;border:1px solid #E8D79F;color:#695C32;border-radius:9px;padding:.7rem .8rem;margin:-.45rem 0 .8rem;font-size:.8rem}
    @media(min-width:761px){#stats-mobile-list{display:none!important}}
    @media(max-width:760px){#stats-table-wrap{display:none!important}}
  `;document.head.appendChild(s);
}

function setYears(){
  const sel=yearEl();if(!sel)return;
  const opts=years();
  const values=[...sel.options].map(o=>Number(o.value));
  if(values.length!==opts.length||values.some((v,i)=>v!==opts[i]))sel.innerHTML=opts.map(y=>`<option value="${y}">${y}</option>`).join('');
  if(opts.includes(desiredYear))sel.value=String(desiredYear);
}

function ensureSimplePeriod(){
  let sel=document.getElementById('stats-simple-period');
  if(!sel){
    const yb=yearEl()?.closest('.filter-block');if(!yb)return null;
    const block=document.createElement('div');block.className='filter-block stats-simple-period-block';
    block.innerHTML='<label for="stats-simple-period">Période</label><select id="stats-simple-period"></select>';
    yb.insertAdjacentElement('afterend',block);sel=block.querySelector('select');
  }
  const wanted=['annual',...Array.from({length:12},(_,i)=>`month:${i+1}`),'custom'];
  const actual=[...sel.options].map(o=>o.value);
  if(actual.length!==wanted.length||actual.some((v,i)=>v!==wanted[i])){
    sel.innerHTML=`<option value="annual">Année complète / en cours</option>${MONTHS.slice(1).map((m,i)=>`<option value="month:${i+1}">${m}</option>`).join('')}<option value="custom">Dates personnalisées</option>`;
  }
  sel.value=desiredPeriod;
  return sel;
}

function hideLegacy(){
  const t=typeEl(),m=monthEl();
  if(t?.closest('.filter-block'))t.closest('.filter-block').style.display='none';
  if(m?.closest('.filter-block'))m.closest('.filter-block').style.display='none';
}

function availableMonthKey(month){
  const y=String(desiredYear),m=String(month).padStart(2,'0');
  const options=[...(monthEl()?.options||[])];
  return options.find(o=>o.value.startsWith(`${y}-${m}`))?.value||options.find(o=>(o.textContent||'').toLowerCase().includes(MONTHS[month].toLowerCase()))?.value||'';
}

function showMessage(text=''){
  let box=document.getElementById('stats-period-unavailable');
  if(!box){const filters=document.getElementById('stats-period-filters');if(!filters)return;filters.insertAdjacentHTML('afterend','<div id="stats-period-unavailable" class="stats-period-unavailable"></div>');box=document.getElementById('stats-period-unavailable')}
  box.textContent=text;box.style.display=text?'block':'none';
}

function applyPeriod(){
  if(applying)return;applying=true;
  const t=typeEl(),m=monthEl();if(!t||!m){applying=false;return}
  showMessage('');
  if(desiredPeriod==='annual'){
    t.value='annual';t.dispatchEvent(new Event('change',{bubbles:true}));
  }else if(desiredPeriod==='custom'){
    t.value='range';t.dispatchEvent(new Event('change',{bubbles:true}));
  }else{
    const month=Number(desiredPeriod.split(':')[1]);
    const key=availableMonthKey(month);
    t.value='month';t.dispatchEvent(new Event('change',{bubbles:true}));
    setTimeout(()=>{
      if(key){m.value=key;m.dispatchEvent(new Event('change',{bubbles:true}))}
      else showMessage(`Aucune situation statistique importée pour ${MONTHS[month]} ${desiredYear}.`);
    },30);
  }
  setTimeout(()=>{setYears();ensureSimplePeriod();enforceResponsive();applying=false},80);
}

function enforceResponsive(){
  const table=document.getElementById('stats-table-wrap'),mobile=document.getElementById('stats-mobile-list');if(!table||!mobile)return;
  if(matchMedia('(max-width:760px)').matches){table.style.setProperty('display','none','important');if(mobile.children.length)mobile.style.setProperty('display','grid','important')}
  else{mobile.style.setProperty('display','none','important');if(document.querySelector('#stats-body tr'))table.style.setProperty('display','block','important')}
}

function init(){
  addStyles();
  desiredYear=Number(yearEl()?.value)||currentYear();
  setYears();hideLegacy();const simple=ensureSimplePeriod();enforceResponsive();

  const y=yearEl();
  y?.addEventListener('change',e=>{
    desiredYear=Number(e.target.value)||currentYear();
    desiredPeriod='annual';
    const s=ensureSimplePeriod();if(s)s.value='annual';
    setTimeout(()=>{setYears();applyPeriod()},0);
  },true);

  simple?.addEventListener('change',e=>{desiredPeriod=e.target.value;applyPeriod()});

  document.addEventListener('click',e=>{
    if(e.target.closest('.partner-tab'))setTimeout(()=>{setYears();hideLegacy();ensureSimplePeriod();applyPeriod()},80);
  });
  window.addEventListener('resize',enforceResponsive);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
