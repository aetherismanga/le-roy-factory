// Dimensioned illustrations, built from catalogue geometry and documented material photos.
// These are diagrams of a format, never substitutes for a manufacturer photograph.
const W = 1600, H = 1200;
const textureCache = new Map();
const xml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = value => Number(String(value).replace(',', '.'));
const decimal = value => Number(value).toLocaleString('fr-FR', {maximumFractionDigits:3});
const folded = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const positive = value => Number.isFinite(value) && value > 0 && value < 10000;
const typeAliases = {
  plinthe:'skirting',zoccolino:'skirting',skirting:'skirting',
  margelle:'coping',margelles:'coping','pool-coping':'coping',coping:'coping',
  couvertine:'cap',couvertines:'cap',copertine:'cap',cap:'cap',
  marche:'step',marches:'step',gradini:'step',gradoni:'step',step:'step',
  pave:'paver',paves:'paver',cubetti:'paver',paver:'paver',
  dalle:'tile',dalles:'tile',tile:'tile',
  parement:'wall-panel','wall-panel':'wall-panel',muretto:'wall-panel',lamelle:'wall-panel',lamelles:'wall-panel',
  angle:'corner',angolo:'corner',corner:'corner',
  galet:'pebbles',galets:'pebbles',gravillons:'pebbles',granulati:'pebbles',ciottoli:'pebbles',paillettes:'pebbles',pebbles:'pebbles',
  sphere:'sphere',spheres:'sphere',sfere:'sphere',bordure:'kerb',bordures:'kerb',cordoli:'kerb',kerb:'kerb',opus:'opus',other:'other',
  'sawn-tile':'tile','cleft-tile':'tile','flamed-tile':'tile','roofing-slab':'tile',slab:'tile','stepping-stone':'tile',
  'roman-opus':'opus','rough-opus':'opus','crazy-paving':'opus',cobble:'paver','wall-block':'paver',binder:'kerb','walling-stone':'paver',
  'block-step':'step','riser-skirting':'skirting',riser:'skirting','wall-cap':'cap','strip-cladding':'wall-panel',cladding:'wall-panel',gravel:'pebbles',chips:'pebbles',boulder:'pebbles',palisade:'kerb'
};

/** Parse only dimensions explicitly documented in the reference. Ranges stay ranges. */
export function parseGeometry(reference, label = '', unit = '', productType = '') {
  const v = typeof reference === 'object' && reference !== null ? reference : {reference,label,unit,productType};
  const source = String(v.reference || v.label || '').replace(/[×✕*]/g, 'x');
  const text = folded(source + ' ' + (v.label || ''));
  const geometry = {type:typeAliases[folded(v.productType || v.type || '')] || 'other',edge:'straight',formatLabel:'',dimensionsKnown:false};
  if (/toro|bullnose|nez arrondi|bord.{0,6}arrondi/.test(text)) geometry.edge='bullnose';
  else if (/smuss|chanfrein|biseaut/.test(text)) geometry.edge='chamfer';
  else if (/cliv|brut|naturale|naturelle/.test(text)) geometry.edge='natural';
  const thickness = source.match(/(?:\bsp\.?|[ée]p(?:aisseur|\.)?)\s*(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+(?:[.,]\d+)?))?\s*(mm|cm)?/i);
  if (thickness) {
    const factor = thickness[3]?.toLowerCase()==='mm' ? .1 : 1;
    const first = num(thickness[1])*factor;
    if (positive(first)) {
      if(thickness[2])geometry.thicknessRange=[first,num(thickness[2])*factor];
      else geometry.thicknessCm=first;
    }
  }
  const beforeThickness = thickness ? source.slice(0,thickness.index) : source;
  const grain = beforeThickness.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*mm\b/i);
  if (grain) geometry.grainMm=[num(grain[1]),num(grain[2])];
  const variable = /(?:A\s*C\.?|longueur libre|long\.?\s*libre|misure miste)/i.test(beforeThickness) || /\d\s*[\/-]\s*\d[^\n]*x|x\s*\(|x\s*\d+(?:[.,]\d+)?\s*[-/]\s*\d/i.test(beforeThickness);
  geometry.variable=variable;
  const dimensions = !variable && beforeThickness.match(/(?<![\d.,/])(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)(?:\s*x\s*(\d+(?:[.,]\d+)?))?/i);
  if (dimensions) {
    const values=dimensions.slice(1).filter(Boolean).map(num);
    const suffix=beforeThickness.slice(dimensions.index+dimensions[0].length).match(/^\s*(mm|cm)\b/i)?.[1]?.toLowerCase();
    const factor=suffix==='mm'?.1:1;
    geometry.widthCm=values[0]*factor;
    geometry.lengthCm=values[values.length===3?2:1]*factor;
    if(values.length===3) geometry.thicknessCm=values[1]*factor;
    geometry.dimensionsKnown=true;
    geometry.formatLabel=values.map(n=>decimal(n*factor)).join(' × ')+' cm';
  }
  const corner = beforeThickness.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*\+\s*(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/i);
  if(corner){geometry.heightCm=num(corner[1]);geometry.legsCm=[num(corner[2]),num(corner[4])];geometry.formatLabel=`${decimal(num(corner[1]))} × ${decimal(num(corner[2]))} + ${decimal(num(corner[3]))} × ${decimal(num(corner[4]))} cm`;}
  const module = beforeThickness.match(/\bmod(?:ulo|ule)?\.?\s*(\d+)/i);
  if (module) {geometry.moduleCount=num(module[1]);geometry.formatLabel=`Module ${module[1]}`;geometry.dimensionsKnown=false;}
  if(geometry.type==='other'){
    if(/sfere|spher/.test(text))geometry.type='sphere';
    else if(/angolo|\bangle\b/.test(text))geometry.type='corner';
    else if(/ciottoli|galets|granulati|gravillons|paillettes/.test(text))geometry.type='pebbles';
    else if(/cordoli|bordures?/.test(text))geometry.type='kerb';
    else if(/copertine|couvertine/.test(text))geometry.type='cap';
    else if(/bordi piscina|margell/.test(text))geometry.type='coping';
    else if(/gradini|gradoni|marches?/.test(text))geometry.type='step';
    else if(/zoccolin|plinthe/.test(text)||(/^ml$/i.test(v.unit||'')&&geometry.widthCm<=15&&geometry.lengthCm>=35))geometry.type='skirting';
    else if(/muretto|parement|lamell|listell|\bLG\s*\d/i.test(source))geometry.type='wall-panel';
    else if(/opus|losette|lauzes/.test(text)||module)geometry.type='opus';
    else if(/cubetti|paves?/.test(text)||(geometry.widthCm<=20&&geometry.lengthCm<=20))geometry.type='paver';
    else if(geometry.dimensionsKnown||/piastrelle|dalles/.test(text))geometry.type='tile';
  }
  if(geometry.type==='sphere'){
    const diameter=beforeThickness.match(/(?:sfere|sphere|spheres)[^\d]*(\d+(?:[.,]\d+)?)\s*cm/i);
    if(diameter){geometry.diameterCm=num(diameter[1]);geometry.formatLabel=`Ø ${decimal(geometry.diameterCm)} cm`;geometry.dimensionsKnown=true;}
  }
  if(geometry.grainMm){geometry.type='pebbles';geometry.formatLabel=geometry.grainMm.map(decimal).join('–')+' mm';geometry.dimensionsKnown=false;}
  if(!geometry.formatLabel&&variable){
    const widths=beforeThickness.match(/(\d+(?:[.,]\d+)?(?:\s*[/-]\s*\d+(?:[.,]\d+)?)*)(?:\s*x\s*(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?))?\s*(?:A\s*C\.?|en longueur libre|longueur libre)/i);
    geometry.formatLabel=widths?widths[1].replace(/\s+/g,'')+' cm · longueur libre':'Dimensions variables';
  }
  if(!geometry.formatLabel)geometry.formatLabel=String(v.format||'Dimensions selon référence');
  const merged={...geometry,...(v.geometry||{})};
  if(merged.moduleCount){
    merged.type='opus';
    merged.dimensionsKnown=false;
    if(merged.moduleCount===4&&!merged.moduleFormatsCm)merged.moduleFormatsCm=[[20,20],[20,40],[40,40],[40,60]];
  }
  if(merged.type==='sphere'&&positive(merged.diameterCm)){
    merged.dimensionsKnown=true;
    if(!v.geometry?.formatLabel)merged.formatLabel=`Ø ${decimal(merged.diameterCm)} cm`;
  }
  return merged;
}

/** Translate documented finish words only; colour and unknown wording remain in the reference. */
export function finishLabel(variant){
  if(variant?.finish)return String(variant.finish);
  const text=folded((variant?.reference||'')+' '+(variant?.label||''));
  const options=[[/levigat|adouci/,'Adouci'],[/anticat|vieilli/,'Vieilli'],[/sabbiat|sable/,'Sablé'],[/spazzolat|brosse/,'Brossé'],[/fiammat|flamme/,'Flammé'],[/bocciardat|boucharde/,'Bouchardé'],[/granigliat|grenaille/,'Grenaillé'],[/lucidat|\bpoli\b/,'Poli'],[/spaccat|cliv/,'Brut de clivage'],[/smillat|smille|lavorat.{0,10}punta/,'Smillé'],[/naturale|surface naturelle/,'Naturel']];
  return options.filter(([re])=>re.test(text)).map(([,label])=>label).join(' · ')||'Finition selon référence';
}

const typeLabels={tile:'Dalle',skirting:'Plinthe',coping:'Margelle',cap:'Couvertine',step:'Marche',paver:'Pavé','wall-panel':'Parement',corner:'Angle',pebbles:'Matière et calibre',sphere:'Sphère',kerb:'Bordure',opus:'Composition de formats',other:'Pièce'};
const points = a => a.map(p=>p.map(n=>Number(n.toFixed(2))).join(',')).join(' ');
const poly=(a,attr='')=>`<polygon points="${points(a)}" ${attr}/>`;
const line=(a,b,attr='')=>`<path d="M${a.map(n=>n.toFixed(2)).join(',')}L${b.map(n=>n.toFixed(2)).join(',')}" ${attr}/>`;
const dataSvg = svg => 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
const thumbnailSvg = svg => svg.replace('width="1600" height="1200" viewBox="0 0 1600 1200"','width="320" height="240" viewBox="0 0 1600 1200"');

// materialPhoto.cropRect is a pixel rectangle [x,y,width,height] in the ORIGINAL
// image. materialPhoto.width/height must be the original pixel dimensions.
// Crop through a nested SVG viewBox; the source bitmap is neither edited nor
// upscaled into an alleged new photograph. Never supply normalized fractions.
function validatedCrop(photo){
  const crop=photo?.cropRect,sourceWidth=Number(photo?.width),sourceHeight=Number(photo?.height);
  const valid=Array.isArray(crop)&&crop.length===4&&crop.every(Number.isFinite)&&positive(sourceWidth)&&positive(sourceHeight)&&crop[0]>=0&&crop[1]>=0&&crop[2]>0&&crop[3]>0&&crop[0]+crop[2]<=sourceWidth+.01&&crop[1]+crop[3]<=sourceHeight+.01;
  return valid?{crop,sourceWidth,sourceHeight}:null;
}
function textureImage(photo,texture,width,height,attributes=''){
  const box=validatedCrop(photo);
  if(box)return `<g ${attributes}><svg width="${width}" height="${height}" viewBox="${box.crop.join(' ')}" preserveAspectRatio="xMidYMid slice"><image href="${texture}" width="${box.sourceWidth}" height="${box.sourceHeight}"/></svg></g>`;
  return `<image href="${texture}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" ${attributes}/>`;
}

/** Lightweight pure SVG: the caller can embed it as a data URI in an image. */
export function buildProductSvg(variant, textureDataUri = '') {
  const v=variant||{},g=parseGeometry(v), type=String(v.piece||typeLabels[g.type]||'Pièce');
  const texture=/^data:image\/(?:jpeg|png|webp|avif);base64,[A-Za-z0-9+/=\s]+$/.test(textureDataUri)?textureDataUri:'';
  const materialColor=/^#[a-fA-F0-9]{6}$/.test(g.materialColor||'')?g.materialColor:'';
  const hasTexture=!!texture, fill=hasTexture?'url(#matter)':materialColor||'#d3d1c7';
  let drawing='';
  const dimensionsLabel=g.formatLabel||'Dimensions selon référence';
  const thicknessLabel=positive(g.thicknessCm)?`Épaisseur ${decimal(g.thicknessCm)} cm`:g.thicknessRange?.every(positive)?`Épaisseur ${g.thicknessRange.map(decimal).join('–')} cm`:'';
  const svgTitle=`${type} · ${v.label||v.reference||''}`;
  const paintFace=(a,shade=0)=>poly(a,`fill="${fill}" stroke="#5c6258" stroke-opacity=".36" stroke-width="1.3"`)+(shade?poly(a,`fill="#18211d" fill-opacity="${shade}"`):'');
  if(g.type==='sphere'){
    drawing=`<ellipse cx="800" cy="840" rx="270" ry="45" fill="#344038" opacity=".13" filter="url(#shadow)"/><circle cx="800" cy="555" r="270" fill="${fill}"/><circle cx="800" cy="555" r="270" fill="url(#sphereShade)" stroke="#626657" stroke-opacity=".35"/>`;
  }else if(g.type==='pebbles'){
    drawing=`<rect x="350" y="250" width="900" height="600" rx="12" fill="${fill}" stroke="#b7b9ac" stroke-width="2"/><path d="M350 890H1250" stroke="#7b8173" stroke-width="2"/><path d="M350 875V905M1250 875V905" stroke="#7b8173" stroke-width="2"/>`;
  }else if(g.type==='corner'){
    const leg1=g.legsCm?.[0]||20,leg2=g.legsCm?.[1]||30,height=g.heightCm||g.widthCm||15;
    const sc=Math.min(1100/((leg1+leg2)*.9),520/(height+Math.max(leg1,leg2)*.32));
    const mid=[780,450],lh=height*sc;
    const a=[[mid[0]-leg1*sc*.9,mid[1]-leg1*sc*.30],[...mid],[mid[0],mid[1]+lh],[mid[0]-leg1*sc*.9,mid[1]+lh-leg1*sc*.30]];
    const b=[[...mid],[mid[0]+leg2*sc*.9,mid[1]-leg2*sc*.30],[mid[0]+leg2*sc*.9,mid[1]+lh-leg2*sc*.30],[mid[0],mid[1]+lh]];
    drawing=paintFace(a,.08)+paintFace(b,.20)+line(a[1],a[2],'stroke="#f9faf3" stroke-width="3" stroke-opacity=".6"');
  }else if(g.type==='opus'&&g.moduleCount===4){
    const formats=g.moduleFormatsCm||[[20,20],[20,40],[40,40],[40,60]];
    drawing=formats.map(([width,length],i)=>{
      const sc=6.2,cx=i%2?1110:460,cy=i<2?320:640;
      const thick=positive(g.thicknessCm)?g.thicknessCm:g.thicknessRange?.[0]||2;
      const x=cx-(length+width*.48)*sc/2+width*.48*sc;
      const p=(a,b,z)=>[x+(a-b*.48)*sc,cy+(b*.55-z)*sc];
      const top=[p(0,0,thick),p(length,0,thick),p(length,width,thick),p(0,width,thick)];
      const front=[top[3],top[2],p(length,width,0),p(0,width,0)],side=[top[1],top[2],p(length,width,0),p(length,0,0)];
      let tile=paintFace(front,.26)+paintFace(side,.16)+paintFace(top);
      if(hasTexture)tile+=`<clipPath id="moduleClip${i}">${poly(top)}</clipPath><g clip-path="url(#moduleClip${i})">${textureImage(v.materialPhoto,texture,length,width,`transform="matrix(${sc} 0 ${-.48*sc} ${.55*sc} ${x} ${cy-thick*sc})"`)}</g>${poly(top,'fill="none" stroke="#5c6258" stroke-opacity=".36" stroke-width="1.3"')}`;
      return tile+`<text x="${cx}" y="${cy+width*.55*sc+58}" text-anchor="middle" font-family="Arial,sans-serif" font-size="27" fill="#56614f">${decimal(width)} × ${decimal(length)} cm</text>`;
    }).join('');
  }else if(g.type==='opus'&&!g.dimensionsKnown){
    const blocks=[[330,330,440,270],[810,330,460,270],[330,640,270,210],[640,640,310,210],[990,640,280,210]];
    drawing=blocks.map((b,i)=>`<rect x="${b[0]}" y="${b[1]+12}" width="${b[2]}" height="${b[3]}" fill="#aaa99c"/><rect x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" fill="${fill}" stroke="#7c8276" stroke-opacity=".35"/>`).join('');
  }else if(!g.dimensionsKnown&&g.type==='other'){
    drawing=`<rect x="350" y="250" width="900" height="600" rx="4" fill="${fill}" stroke="#b4b9ac" stroke-width="2"/>`;
  }else{
    const defaults={skirting:[8,60,1.2],coping:[30,60,3],cap:[35,100,4],step:[35,100,3],kerb:[8,100,25],'wall-panel':[15,60,2],paver:[10,10,5]};
    const d=defaults[g.type]||[40,60,2];
    const width=positive(g.widthCm)?g.widthCm:d[0],length=positive(g.lengthCm)?g.lengthCm:d[1];
    const thick=positive(g.thicknessCm)?g.thicknessCm:g.thicknessRange?.every(positive)?g.thicknessRange[0]:d[2];
    const scale=Math.min(1150/(length+width*.48),600/(width*.55+thick));
    const x=(W-(length+width*.48)*scale)/2+width*.48*scale;
    const y=310+(600-(width*.55+thick)*scale)/2+thick*scale;
    const p=(a,b,z)=>[x+(a-b*.48)*scale,y+(b*.55-z)*scale];
    const top=[p(0,0,thick),p(length,0,thick),p(length,width,thick),p(0,width,thick)];
    const front=[top[3],top[2],p(length,width,0),p(0,width,0)];
    const side=[top[1],top[2],p(length,width,0),p(length,0,0)];
    drawing=poly(top.map(a=>[a[0],a[1]+thick*scale+22]),'fill="#202f25" opacity=".12" filter="url(#shadow)"')+paintFace(front,.26)+paintFace(side,.16)+paintFace(top);
    // The photographed matter is cropped to the real face ratio before projection.
    // This keeps a square mineral feature square on the stone plane, not on screen.
    if(hasTexture)drawing+=`<clipPath id="topClip">${poly(top)}</clipPath><g clip-path="url(#topClip)">${textureImage(v.materialPhoto,texture,length,width,`transform="matrix(${scale} 0 ${-.48*scale} ${.55*scale} ${x} ${y-thick*scale})"`)}</g>${poly(top,'fill="none" stroke="#5c6258" stroke-opacity=".36" stroke-width="1.3"')}`;
    if(g.edge==='bullnose')drawing+=`<linearGradient id="bullnoseShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".46"/><stop offset=".38" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#1d2a17" stop-opacity=".38"/></linearGradient>`+poly(front,'fill="url(#bullnoseShade)"')+line(top[3],top[2],`stroke="#fffef5" stroke-width="${Math.max(3,Math.min(10,thick*scale*.35))}" stroke-opacity=".7"`)+line(front[3],front[2],'stroke="#3c4437" stroke-width="2" stroke-opacity=".3"');
    if(g.edge==='chamfer')drawing+=poly([top[3],top[2],[top[2][0],top[2][1]+4],[top[3][0],top[3][1]+4]],'fill="#fff" opacity=".4"');
    if(g.dripEdge===true){
      const a=p(0,width-1.5,0),b=p(length,width-1.5,0);
      drawing+=line(a,b,'stroke="#3b4931" stroke-width="2.8" stroke-opacity=".65"')+line([a[0],a[1]+2],[b[0],b[1]+2],'stroke="#fffef4" stroke-width="1.6" stroke-opacity=".65"')+`<text x="800" y="955" text-anchor="middle" fill="#747b6f" font-size="22">Goutte d’eau sous face · profil illustratif</text>`;
    }
    if(g.type==='wall-panel'&&/incastro|embo[iî]tement/i.test(v.reference+' '+v.label))drawing+=`<text x="800" y="955" text-anchor="middle" fill="#747b6f" font-size="22">Emboîtement : voir la photographie de la pièce</text>`;
    if(g.dimensionsKnown){
      const first=[top[3][0],front[3][1]+50],last=[top[2][0],front[2][1]+50];
      drawing+=line(first,last,'stroke="#8f9587" stroke-width="1.8"')+line([first[0],first[1]-10],[first[0],first[1]+10],'stroke="#8f9587" stroke-width="1.8"')+line([last[0],last[1]-10],[last[0],last[1]+10],'stroke="#8f9587" stroke-width="1.8"');
      drawing+=`<text x="${(first[0]+last[0])/2}" y="${first[1]+37}" text-anchor="middle" font-size="25" fill="#56614f">${xml(decimal(length))} cm</text>`;
    }
  }
  const geometryNote=g.moduleCount===4?'4 formats documentés · disposition illustrative, sans quantitatif':g.type==='opus'?'Composition illustrative · sans quantitatif':g.dimensionsKnown?'Géométrie d’après les dimensions du catalogue':'Schéma de principe · dimensions selon référence';
  const surfaceNote=hasTexture?'Matière issue du visuel source · nuances naturelles variables':materialColor?'Teinte indicative issue de la photographie source':'Vue de forme · finition à consulter sur la photo source';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc"><title id="title">${xml(svgTitle)}</title><desc id="desc">Illustration du format. ${xml(geometryNote)}. ${xml(surfaceNote)}.</desc><defs><pattern id="matter" width="1" height="1" patternContentUnits="objectBoundingBox">${hasTexture?textureImage(v.materialPhoto,texture,1,1):''}</pattern><filter id="shadow" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="18"/></filter><radialGradient id="sphereShade" cx=".3" cy=".22" r=".82"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#07170e" stop-opacity=".5"/></radialGradient></defs><rect width="1600" height="1200" fill="#f3f1e9"/><path d="M160 175H1440" stroke="#d3d5c8"/><text x="160" y="114" fill="#4e5a49" font-family="Arial,sans-serif" font-size="23" letter-spacing="4">${xml(type.toUpperCase())}</text><text x="1440" y="114" text-anchor="end" fill="#838a7b" font-family="Arial,sans-serif" font-size="20" letter-spacing="2">ILLUSTRATION DU FORMAT</text><g>${drawing}</g><g font-family="Arial,sans-serif" text-anchor="middle"><text x="800" y="1020" fill="#263421" font-size="32">${xml(dimensionsLabel)}</text>${thicknessLabel?`<text x="800" y="1065" fill="#596650" font-size="24">${xml(thicknessLabel)}</text>`:''}<text x="800" y="1120" fill="#737e69" font-size="20">${xml(geometryNote)}</text><text x="800" y="1154" fill="#818975" font-size="19">${xml(surfaceNote)}</text></g></svg>`;
}

export function productThumbnail(variant) { return dataSvg(thumbnailSvg(buildProductSvg(variant))); }

function bytesBase64(bytes){
  if(typeof Buffer!=='undefined')return Buffer.from(bytes).toString('base64');
  let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return btoa(binary);
}

async function loadTexture(photo,forMaterialDetail=false){
  // A source packshot with unverified surface cropping may still be viewed as
  // a photograph, but must never be projected onto a new product silhouette.
  if(!forMaterialDetail&&photo?.textureEligible===false)return '';
  const url=photo?.url;
  if(!url)return '';
  if(/^data:image\/(?:jpeg|png|webp|avif);base64,/.test(url))return url;
  if(!textureCache.has(url)){
    const job=(async()=>{
      const base=typeof document!=='undefined'?document.baseURI:import.meta.url;
      const resolved=new URL(url,base);
      if(typeof location!=='undefined'&&resolved.origin!==location.origin)return '';
      if(!/^https?:$/.test(resolved.protocol))return '';
      const response=await fetch(resolved.href,{credentials:'same-origin',cache:'force-cache'});
      if(!response.ok)throw new Error('Visuel matière indisponible');
      const blob=await response.blob();
      if(blob.size>8_000_000||!/^image\/(jpeg|png|webp|avif)$/.test(blob.type))return '';
      return `data:${blob.type};base64,${bytesBase64(new Uint8Array(await blob.arrayBuffer()))}`;
    })().catch(()=>{textureCache.delete(url);return '';});
    textureCache.set(url,job);
  }
  return textureCache.get(url);
}

/** Real source texture + a crisp vector diagram of the selected documented format. */
export async function renderProductVisual(variant,materialPhoto=variant?.materialPhoto){
  const texture=await loadTexture(materialPhoto),geometry=parseGeometry(variant||{});
  const svg=buildProductSvg({...variant,materialPhoto},texture),url=dataSvg(svg),preview=dataSvg(thumbnailSvg(svg));
  return {url,preview,width:W,height:H,previewWidth:320,previewHeight:240,kind:'illustration',label:'Illustration du format',source:materialPhoto?.source||materialPhoto?.url||'Catalogue SAXSO',finish:finishLabel(variant),format:geometry.formatLabel,textureDocumented:!!texture};
}

/** Display the documented part of a source photo at its real pixel resolution. */
export async function renderMaterialDetail(photo){
  if(!photo||photo.cropApplied)return photo;
  const box=validatedCrop(photo);
  if(!box)return photo;
  const texture=await loadTexture(photo,true);
  if(!texture)return photo;
  const [x,y,width,height]=box.crop;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}" role="img"><title>${xml(photo.label||'Détail de la matière source')}</title><image href="${texture}" width="${box.sourceWidth}" height="${box.sourceHeight}"/></svg>`;
  const url=dataSvg(svg);
  return {...photo,url,preview:url,width,height,kind:'photo',cropApplied:true,nativeSourceUrl:photo.url,sourceWidth:box.sourceWidth,sourceHeight:box.sourceHeight};
}
