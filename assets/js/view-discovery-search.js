/* Search families only. Never used by quantities, ordering or 3D dimensions. */
(function(root){
  'use strict';
  const nominal=['5x15','5x20','6x25','7.5x30','7.5x40','10x10','15x15','15x60','20x20','20x40','20x90','20x120','24x120','25x22','30x30','30x60','33x100','40x40','40x60','40x120','50x100','60x60','60x90','60x120','80x80','90x90','45x90','80x180','120x240','100x100','120x120','120x278'];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const dims=v=>{const m=norm(v).replace(/,/g,'.').match(/(\d+(?:\.\d+)?)\s*[x×*\/]\s*(\d+(?:\.\d+)?)/);return m?[+m[1],+m[2]].sort((a,b)=>a-b):null};
  const key=v=>{const a=dims(v);return a?a.join('x'):''};
  const standards=nominal.map(v=>({key:key(v),dims:dims(v)}));
  function family(v){const a=dims(v);if(!a)return '';let best=null;for(const s of standards){const delta=a.map((n,i)=>Math.abs(n-s.dims[i]));if(delta.every((n,i)=>n<=2+1e-9&&n/s.dims[i]<=.026)){const score=delta.reduce((sum,n,i)=>sum+n/s.dims[i],0);if(!best||score<best.score)best={key:s.key,score};}}return best?.key||a.join('x');}
  function formatMatches(formats,query){const q=key(query);if(!q)return false;const standard=standards.some(s=>s.key===q);return formats.some(f=>key(f)===q||(standard&&family(f)===q));}
  function queryFormat(query){let s=norm(query).replace(/,/g,'.');let m=s.match(/\b(\d+(?:\.\d+)?)\s*(?:[x×*\/]|\s+)\s*(\d+(?:\.\d+)?)\b/);if(m)return {value:m[1]+'x'+m[2],rest:s.replace(m[0],' ')};for(const t of s.match(/\b\d{4,6}\b/g)||[]){const found=standards.find(x=>x.key.replace('x','')===t);if(found)return {value:found.key,rest:s.replace(t,' ')};}return {value:'',rest:s};}
  function matches(product,query){
    const meta=(root.LRF_VIEW_SEARCH_META||{})[product.slug]||{};
    const p={...product,...meta};const q=queryFormat(query);
    if(q.value&&!formatMatches(p.formats||[],q.value))return false;
    const finish=norm((p.finishes||[]).join(' '));
    let words=q.rest.replace(/\b(?:carrelage|carrelages|caro|carreau|carreaux|view|ceramica|ceramiche|imitation|effet|format|formats|cm|de|du|en|le|la|les|pour|et)\b/g,' ');
    if(/\bpol[iie]+s?\b/.test(words)){if(!/\bpoli\b|\bpolished\b/.test(finish))return false;words=words.replace(/\bpol[iie]+s?\b/g,' ');}
    if(/\bmat(?:e|s|es)?\b/.test(words)){if(!/\bmat\b|\bmatt\b/.test(finish))return false;words=words.replace(/\bmat(?:e|s|es)?\b/g,' ');}
    words=words.replace(/\b(?:antiderapant|antiderapante|antiderapants|antiderapantes)\b/g,'grip');
    const hay=norm([p.name,p.collection,p.slug,p.description,p.category,p.effect,...(p.colorFamilies||[]),...(p.colors||[]),...(p.finishes||[]),...(p.uses||[]),...(p.formats||[]),...(p.variants||[]).flatMap(v=>Object.values(v.refs||{}))].join(' '));
    return words.split(/\s+/).filter(Boolean).every(w=>hay.includes(w));
  }
  const api=Object.freeze({dims,key,family,formatMatches,queryFormat,matches});root.LRF_VIEW_DISCOVERY=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
