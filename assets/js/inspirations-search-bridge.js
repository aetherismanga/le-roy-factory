(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  const requested=(params.get('partner')||'').trim();
  const query=(params.get('search')||'').trim();
  const open=params.get('open')==='1';
  if(!requested&&!query)return;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const compact=v=>norm(v).replace(/\s+/g,'');
  const categories={
    'Elios Ceramica':'carrelage','View Ceramica':'carrelage','La Fenice':'carrelage',
    "Petracer's":'exception','Pecchioli Firenze':'exception','Bulbo':'exception','Reviglass':'mosaique',
    'Biopietra':'parement','Neobath':'meubles','Randal Pro':'meubles','Aquahome':'robinetterie','Opal':'robinetterie'
  };
  const names=Object.keys(categories);
  function canonical(v){const c=compact(v);return names.find(n=>compact(n)===c||compact(n.split(' ')[0])===c)||v}
  function score(p,q){const qq=norm(q),qc=compact(q),title=norm(p.name||p.collection||''),tc=compact(title);const hay=norm([p.name,p.collection,p.catalogueLabel,p.slug,p.description,p.category,p.productType,...(p.formats||p.dimensions||[]),...(p.colors||[]),...(p.finishes||[])].filter(Boolean).join(' '));let s=0;if(tc===qc)s+=1000;else if(tc.startsWith(qc))s+=500;else if(tc.includes(qc))s+=300;if(compact(hay).includes(qc))s+=150;for(const t of qq.split(/\s+/).filter(Boolean))if(hay.includes(t))s+=40;return s}
  function guess(q){const all=[];if(Array.isArray(window.ELIOS_CATALOGUE))window.ELIOS_CATALOGUE.forEach(p=>all.push({name:'Elios Ceramica',s:score(p,q)}));if(Array.isArray(window.NEOBATH_CATALOGUE))window.NEOBATH_CATALOGUE.forEach(p=>all.push({name:'Neobath',s:score(p,q)}));all.sort((a,b)=>b.s-a.s);if(all[0]?.s>0)return all[0].name;const qn=norm(q);return names.find(n=>qn.includes(norm(n.split(' ')[0])))||'Elios Ceramica'}
  function choose(name){name=canonical(name);const cat=categories[name];if(cat)document.querySelector(`[data-cat="${cat}"]`)?.click();const button=[...document.querySelectorAll('[data-partner]')].find(el=>compact(el.dataset.partner)===compact(name));button?.click()}
  function apply(){const partner=canonical(requested||guess(query));choose(partner);setTimeout(()=>{const input=document.getElementById('v2-search');if(query&&input){input.value=query;input.dispatchEvent(new Event('input',{bubbles:true}))}document.getElementById('partner-workspace')?.scrollIntoView({behavior:'smooth',block:'start'});if(open&&query)setTimeout(()=>{const q=compact(query);const cards=[...document.querySelectorAll('#partner-products .product-card-v2[data-id]')];const exact=cards.find(c=>compact(c.querySelector('h3')?.textContent||'')===q);(exact||cards[0])?.click()},120)},50)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,80),{once:true});else setTimeout(apply,80);
})();