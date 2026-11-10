const api='https://us-central1-le-roy-factory.cloudfunctions.net/neobathAnimaApplication';
const $=id=>document.getElementById(id);
const search=$('search'),category=$('category'),host=$('products'),status=$('status'),families=$('families'),dialog=$('product-dialog');
const names={module:'Meubles et colonnes',top:'Plans et plans-vasques',worktop:'Plans et plans-vasques',basin:'Vasques',mirror:'Miroirs',light:'Éclairages',lighting:'Éclairages',accessory:'Accessoires',operation:'Fabrication'};
const money=n=>Number.isInteger(n)?new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n/100):'Sur devis';
const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};
const cleanLabel=value=>String(value||'Prix de vente').replace(/\b(?:HT|TTC)\b/gi,'').replace(/\s+/g,' ').trim();
const dimensions=p=>[p.width,p.height,p.depth].filter(value=>typeof value==='number'&&value>0).join(' × ');
const unit=p=>p.unit&&!['piece','unit','pièce'].includes(p.unit)?' / '+p.unit:'';
const prices=p=>Array.isArray(p.prices)?p.prices:[];
let products=[],filtered=[],viewProducts=[],current=0,opener=null,loadTurn=0;
function imageURL(p){try{const url=new URL(p.image||'','https://leroyfactory.fr/');return p.image&&url.protocol==='https:'?url.href:'';}catch{return '';}}
function addImage(parent,p,{lazy=true,alt=p.label||p.ref||'Produit Neobath'}={}){
 const image=node('img');image.alt=alt;image.decoding='async';image.draggable=false;if(lazy)image.loading='lazy';
 const missing=node('span','Visuel à venir','image-unavailable');missing.hidden=true;
 image.addEventListener('error',()=>{image.hidden=true;missing.hidden=false;},{once:true});
 const src=imageURL(p);if(src)image.src=src;else{image.hidden=true;missing.hidden=false;}
 parent.append(image,missing);return image;
}
function priceSummary(p){const values=prices(p).map(value=>value.publicTTC).filter(Number.isInteger);if(!values.length)return 'Sur devis';const from=values.length>1&&new Set(values).size>1;return (from?'Dès ':'')+money(Math.min(...values))+unit(p);}
function setCategory(value){category.value=value;render();}
function renderFamilies(){
 families.replaceChildren();const all=node('button',undefined,'family-button');all.type='button';all.dataset.category='';all.append(node('span','▦','family-all'),node('span','Tout ANIMA'));all.addEventListener('click',()=>setCategory(''));families.append(all);
 for(const value of [...new Set(products.map(p=>p.category).filter(Boolean))]){const p=products.find(p=>p.category===value&&imageURL(p))||products.find(p=>p.category===value),button=node('button',undefined,'family-button');button.type='button';button.dataset.category=value;button.setAttribute('aria-label',names[value]||value);const wrap=node('span',undefined,'family-image');addImage(wrap,p,{alt:''});button.append(wrap,node('span',names[value]||value));button.addEventListener('click',()=>setCategory(value));families.append(button);}
 families.hidden=false;
}
function render(){
 const q=search.value.trim().toLocaleLowerCase('fr');filtered=products.filter(p=>(!category.value||p.category===category.value)&&(!q||[p.ref,p.label,p.subtype,...prices(p).map(v=>v.label)].join(' ').toLocaleLowerCase('fr').includes(q)));
 const fragment=document.createDocumentFragment();status.textContent=filtered.length+' référence'+(filtered.length===1?'':'s');
 for(const button of families.querySelectorAll('button')){const active=button.dataset.category===category.value;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
 for(const p of filtered){
  const card=node('article',undefined,'product-card'),button=node('button',undefined,'product-open'),image=node('div',undefined,'card-image');button.type='button';button.setAttribute('aria-label','Découvrir '+(p.label||p.ref));addImage(image,p);const indicator=node('span','↗','card-open-indicator');indicator.setAttribute('aria-hidden','true');image.append(indicator);
  const info=node('div',undefined,'card-info');info.append(node('span',names[p.category]||p.category,'card-family'),node('h2',p.label||p.ref),node('span',p.ref||'Référence à confirmer','card-ref'),node('span',priceSummary(p),'card-price'));button.append(image,info);button.addEventListener('click',()=>openProduct(p,button));card.append(button);fragment.append(card);
 }
 if(!filtered.length)fragment.append(node('p','Aucune référence ne correspond. Essayez une autre recherche ou une autre famille.','empty-products'));
 host.replaceChildren(fragment);
}
function renderThumbnails(){
 const fragment=document.createDocumentFragment();viewProducts.forEach((p,index)=>{const button=node('button',undefined,'detail-thumb');button.type='button';button.dataset.index=String(index);button.setAttribute('aria-label',(p.label||p.ref)+' · '+(p.ref||''));addImage(button,p,{alt:''});button.addEventListener('click',()=>showProduct(index));fragment.append(button);});$('detail-thumbnails').replaceChildren(fragment);
}
function showProduct(index){
 if(!viewProducts.length)return;current=Math.max(0,Math.min(viewProducts.length-1,index));const p=viewProducts[current];
 $('detail-position').textContent=(current+1)+' / '+viewProducts.length;$('detail-family').textContent=names[p.category]||p.category;$('detail-title').textContent=p.label||p.ref;$('detail-reference').textContent=p.ref?'Réf. '+p.ref:'Référence à confirmer';$('detail-dimensions').textContent=dimensions(p)?dimensions(p)+' cm':'';
 const image=$('detail-image'),missing=image.nextElementSibling;image.hidden=false;missing.hidden=true;image.alt=p.label||p.ref||'Produit ANIMA';image.onerror=()=>{image.hidden=true;missing.hidden=false;};const src=imageURL(p);if(src)image.src=src;else{image.removeAttribute('src');image.hidden=true;missing.hidden=false;}
 const list=$('detail-prices');list.replaceChildren();const variants=prices(p);for(const value of variants){const row=node('li');row.append(node('span',cleanLabel(value.label)),node('strong',money(value.publicTTC)+unit(p)));list.append(row);}if(!variants.length){const row=node('li');row.append(node('span','Prix de vente'),node('strong','Sur devis'));list.append(row);}
 $('detail-prev').disabled=current===0;$('detail-next').disabled=current===viewProducts.length-1;
 for(const thumb of $('detail-thumbnails').children){if(Number(thumb.dataset.index)===current)thumb.setAttribute('aria-current','true');else thumb.removeAttribute('aria-current');}
 const strip=$('detail-thumbnails'),selected=strip.children[current];if(selected)strip.scrollTo({left:selected.offsetLeft-strip.offsetLeft-(strip.clientWidth-selected.offsetWidth)/2,behavior:'auto'});
 $('detail-live').textContent=(p.label||p.ref)+', '+(current+1)+' sur '+viewProducts.length;
}
function openProduct(p,button){
 opener=button;viewProducts=filtered.slice();current=viewProducts.findIndex(item=>item.id===p.id);if(current<0)return;renderThumbnails();dialog.showModal();document.body.classList.add('product-opened');showProduct(current);$('detail-close').focus();
}
function closeProduct(){dialog.close();}
dialog.addEventListener('close',()=>{document.body.classList.remove('product-opened');viewProducts=[];$('detail-thumbnails').replaceChildren();opener?.focus({preventScroll:true});opener=null;});
dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeProduct();});
$('detail-close').addEventListener('click',closeProduct);$('detail-prev').addEventListener('click',()=>showProduct(current-1));$('detail-next').addEventListener('click',()=>showProduct(current+1));
dialog.addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey||/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;if(event.key==='ArrowLeft'){event.preventDefault();showProduct(current-1);}if(event.key==='ArrowRight'){event.preventDefault();showProduct(current+1);}});
let swipe=null;
$('detail-stage').addEventListener('touchstart',event=>{swipe=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;},{passive:true});
$('detail-stage').addEventListener('touchcancel',()=>{swipe=null;},{passive:true});
$('detail-stage').addEventListener('touchend',event=>{if(!swipe||event.changedTouches.length!==1)return;const dx=event.changedTouches[0].clientX-swipe.x,dy=event.changedTouches[0].clientY-swipe.y;swipe=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.6)showProduct(current+(dx<0?1:-1));},{passive:true});
async function load(){
 const turn=++loadTurn;status.textContent='Chargement du catalogue ANIMA…';host.setAttribute('aria-busy','true');
 try{const response=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'catalogue'}),signal:AbortSignal.timeout(30000)}),data=await response.json();if(turn!==loadTurn)return;if(!response.ok||!data.success||!Array.isArray(data.products))throw Error(data.error||'Catalogue momentanément indisponible.');products=data.products;category.replaceChildren(new Option('Toutes les familles',''));for(const value of [...new Set(products.map(p=>p.category).filter(Boolean))])category.append(new Option(names[value]||value,value));renderFamilies();render();}
 catch(error){if(turn!==loadTurn)return;status.textContent=(error?.message||'Catalogue momentanément indisponible.')+' ';const retry=node('button','Réessayer','retry-button');retry.type='button';retry.addEventListener('click',load);status.append(retry);}
 finally{if(turn===loadTurn)host.setAttribute('aria-busy','false');}
}
search.addEventListener('input',render);category.addEventListener('change',render);load();
