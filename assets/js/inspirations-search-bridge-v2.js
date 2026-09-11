(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  const requested=(params.get('partner')||'').trim();
  const query=(params.get('search')||'').trim();
  const requestedSeries=(params.get('series')||'').trim();
  const requestedRef=(params.get('ref')||'').trim();
  const open=params.get('open')==='1';
  if(!requested&&!query&&!requestedSeries&&!requestedRef)return;

  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const compact=v=>norm(v).replace(/\s+/g,'');
  const categories={
    'Elios Ceramica':'carrelage','View Ceramica':'carrelage','La Fenice':'carrelage',
    "Petracer's":'exception','Pecchioli Firenze':'exception','Bulbo':'exception','Reviglass':'mosaique',
    'Biopietra':'parement','Neobath':'meubles','Randal Pro':'meubles','Aquahome':'robinetterie','Opal':'robinetterie'
  };
  const names=Object.keys(categories);
  const canonical=v=>{const c=compact(v);return names.find(n=>compact(n)===c||compact(n.split(' ')[0])===c)||v};

  function flattenStrings(value,out=[]){
    if(value==null)return out;
    if(typeof value==='string'||typeof value==='number'){out.push(String(value));return out;}
    if(Array.isArray(value)){value.forEach(v=>flattenStrings(v,out));return out;}
    if(typeof value==='object')Object.values(value).forEach(v=>flattenStrings(v,out));
    return out;
  }
  function productHay(p){
    const vals=[p.name,p.collection,p.catalogueLabel,p.slug,p.description,p.category,p.productType,...(p.formats||p.dimensions||[]),...(p.colors||[]),...(p.finishes||[])];
    (p.variants||[]).forEach(v=>{flattenStrings(v,vals)});flattenStrings(p.refs,vals);flattenStrings(p.references,vals);flattenStrings(p.reference,vals);
    return norm(vals.filter(Boolean).join(' '));
  }
  function score(p,q){
    const qq=norm(q),qc=compact(q),title=norm(p.name||p.collection||''),tc=compact(title),hay=productHay(p),hc=compact(hay);let s=0;
    if(tc===qc)s+=1000;else if(tc.startsWith(qc))s+=500;else if(tc.includes(qc))s+=300;if(hc.includes(qc))s+=220;
    qq.split(/\s+/).filter(Boolean).forEach(t=>{if(hay.includes(t))s+=45});return s;
  }
  function guess(q){
    const rq=compact(requestedRef||q);
    const rev=(window.LRF_REVIGLASS_SEARCH_INDEX||[]).some(s=>(s.refs||[]).some(r=>compact(r)===rq));
    if(rev)return 'Reviglass';
    const all=[];
    if(Array.isArray(window.ELIOS_CATALOGUE))window.ELIOS_CATALOGUE.forEach(p=>all.push({name:'Elios Ceramica',s:score(p,requestedRef||q)}));
    if(Array.isArray(window.VIEW_CATALOGUE))window.VIEW_CATALOGUE.forEach(p=>all.push({name:'View Ceramica',s:score(p,requestedRef||q)}));
    if(Array.isArray(window.NEOBATH_CATALOGUE))window.NEOBATH_CATALOGUE.forEach(p=>all.push({name:'Neobath',s:score(p,requestedRef||q)}));
    all.sort((a,b)=>b.s-a.s);if(all[0]?.s>0)return all[0].name;
    const qn=norm(q);return names.find(n=>qn.includes(norm(n.split(' ')[0])))||'Elios Ceramica';
  }
  function choose(name){
    name=canonical(name);const cat=categories[name];if(cat)document.querySelector(`[data-cat="${cat}"]`)?.click();
    const button=[...document.querySelectorAll('[data-partner]')].find(el=>compact(el.dataset.partner)===compact(name));button?.click();return name;
  }

  function exactRevTarget(){
    const index=window.LRF_REVIGLASS_SEARCH_INDEX||[];
    if(requestedSeries){const s=index.find(x=>x.id===requestedSeries);if(s)return {series:s,ref:requestedRef||query};}
    const wanted=compact(requestedRef||query);if(!wanted)return null;
    for(const s of index){const r=(s.refs||[]).find(x=>compact(x)===wanted);if(r)return {series:s,ref:r};}
    return null;
  }
  function openReviglass(){
    const target=exactRevTarget();
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const card=target?.series?.id?document.querySelector(`[data-reviglass-id="${CSS.escape(target.series.id)}"]`):null;
      if(card){
        clearInterval(timer);card.click();
        if(target.ref){
          let inner=0;const refTimer=setInterval(()=>{
            inner++;
            const modal=document.getElementById('reviglass-pool-modal');
            const spans=[...(modal?.querySelectorAll('.reviglass-ref-list span')||[])];
            const refEl=spans.find(x=>compact(x.textContent)===compact(target.ref));
            if(refEl){clearInterval(refTimer);refEl.click();setTimeout(()=>refEl.scrollIntoView?.({block:'center',behavior:'smooth'}),80);}
            else if(inner>60)clearInterval(refTimer);
          },70);
        }
      }else if(tries>80)clearInterval(timer);
    },70);
  }

  function genericProductOpen(partner){
    const searchValue=query||requestedRef;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const input=document.getElementById('v2-search');
      if(searchValue&&input){input.value=searchValue;input.dispatchEvent(new Event('input',{bubbles:true}));}
      const cards=[...document.querySelectorAll('#partner-products .product-card-v2,#partner-products .view-product-card,#partner-products .view-safe-card')];
      if(cards.length){
        const q=compact(query||requestedRef);
        const exact=cards.find(c=>compact(c.querySelector('h3')?.textContent||c.textContent||'')===q);
        const candidate=exact||cards[0];
        if(open&&candidate){candidate.click();
          if(requestedRef)setTimeout(()=>{
            const modal=document.getElementById('product-modal-v2-card')||document.querySelector('.view-modal,.modal-v2-card');
            const nodes=[...(modal?.querySelectorAll('button,span,div,td,strong')||[])];
            const hit=nodes.find(n=>compact(n.textContent)===compact(requestedRef));
            hit?.scrollIntoView?.({block:'center',behavior:'smooth'});
          },200);
        }
        document.getElementById('partner-workspace')?.scrollIntoView({behavior:'smooth',block:'start'});
        clearInterval(timer);
      }else if(tries>80)clearInterval(timer);
    },80);
  }

  function apply(){
    const partner=canonical(requested||guess(query||requestedRef));choose(partner);
    if(partner==='Reviglass'&&(requestedSeries||requestedRef||exactRevTarget())){openReviglass();return;}
    genericProductOpen(partner);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,120),{once:true});else setTimeout(apply,120);
})();