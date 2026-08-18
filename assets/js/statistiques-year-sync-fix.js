const START_YEAR=2023;
let chosenYear=null;
let applying=false;

function currentYear(){return new Date().getFullYear()}
function allowedYears(){const a=[];for(let y=START_YEAR;y<=currentYear();y++)a.push(y);return a.reverse()}
function yearSelect(){return document.getElementById('stats-year')}

function ensureOptions(){
  const sel=yearSelect();if(!sel)return;
  const years=allowedYears();
  if(chosenYear==null){const v=Number(sel.value);chosenYear=years.includes(v)?v:currentYear()}
  const actual=[...sel.options].map(o=>Number(o.value)).filter(Boolean);
  if(actual.length!==years.length||actual.some((v,i)=>v!==years[i])){
    sel.innerHTML=years.map(y=>`<option value="${y}">${y}</option>`).join('');
  }
  sel.value=String(chosenYear);
}

function forceVisualYear(){
  if(chosenYear==null)return;
  const title=document.getElementById('stats-title');
  if(title&&/\b20\d{2}\b/.test(title.textContent||''))title.textContent=(title.textContent||'').replace(/\b20\d{2}\b/g,String(chosenYear));
  const period=document.getElementById('stats-period');
  if(period&&/\b20\d{2}\b/.test(period.textContent||''))period.textContent=(period.textContent||'').replace(/\b20\d{2}\b/g,String(chosenYear));
}

function reapplyChosenYear(){
  if(applying||chosenYear==null)return;
  const sel=yearSelect();if(!sel)return;
  applying=true;
  ensureOptions();
  if(Number(sel.value)!==chosenYear)sel.value=String(chosenYear);
  forceVisualYear();
  setTimeout(()=>{applying=false;ensureOptions();forceVisualYear()},80);
}

function onYearCapture(e){
  const sel=e.target.closest?.('#stats-year');if(!sel)return;
  const v=Number(sel.value);if(!allowedYears().includes(v))return;
  chosenYear=v;
  // Capture la valeur avant les anciens listeners qui réécrivent le select.
  setTimeout(()=>{
    ensureOptions();
    // Relance une seconde fois seulement si le script principal a remis une autre année.
    if(Number(sel.value)!==chosenYear){
      sel.value=String(chosenYear);
      sel.dispatchEvent(new Event('change',{bubbles:true}));
    }
    forceVisualYear();
  },0);
}

document.addEventListener('change',onYearCapture,true);

function init(){
  const sel=yearSelect();if(!sel)return;
  chosenYear=Number(sel.value)||currentYear();
  ensureOptions();
  const obs=new MutationObserver(()=>{if(!applying)requestAnimationFrame(reapplyChosenYear)});
  obs.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest('.partner-tab'))setTimeout(reapplyChosenYear,120)});
  setTimeout(reapplyChosenYear,150);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
