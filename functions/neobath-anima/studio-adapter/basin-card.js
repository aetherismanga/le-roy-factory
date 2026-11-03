const number=n=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:2});
const positive=n=>Number.isFinite(n)&&n>0;

// Integrated products describe a cuve, not the full made-to-measure slab.
// Keep unconfirmed heights absent instead of displaying a preview dimension.
export function basinFormatLabel(product){
 const dimensions=[['L',product?.width],['P',product?.depth],['H',product?.height]].filter(([,value])=>positive(value));
 const format=dimensions.map(([axis,value])=>axis+' '+number(value)).join(' × ');
 // Anima p.145: TWOSPACE TWS110 is one continuous 110×30 trough for
 // two taps. Its full format must not be labelled as two separate cuves.
 const perBowl=Number(product?.basinCount)>1&&product?.ref!=='TWS110';
 return (perBowl?'Par cuve · ':'')+(format?format+' cm':'Format à confirmer')+(perBowl?' · '+product.basinCount+' cuves':'');
}

export function appendBasinCardContent(document,button,product,{image,price}={}){
 button.className+=' anima-basin-choice';
 const append=(tag,text,cls)=>{const node=document.createElement(tag);node.textContent=text;node.className=cls;button.append(node);return node;};
 if(image){const img=document.createElement('img');img.src=image;img.alt=product.label+' · '+product.ref;img.width=132;img.height=112;img.loading='lazy';img.decoding='async';button.append(img);}
 else append('span','Visuel catalogue','anima-basin-photo-placeholder');
 append('strong',product.label,'anima-basin-name');
 append('small','Réf. '+product.ref,'anima-basin-reference');
 append('strong',basinFormatLabel(product),'anima-basin-format');
 if(price)append('small',price,'anima-basin-price');
 button.setAttribute('aria-label',product.label+' · '+product.ref+' · '+basinFormatLabel(product)+(price?' · '+price:''));
 return button;
}

// max-content prevents scrollable grid tracks from sharing the capped height
// and leaving images and text painted over neighbouring cards.
export const BASIN_CARD_CSS=`
.anima-premium .anima-basin-cards,.anima-standalone .anima-independent-basin-cards{grid-template-columns:minmax(0,1fr);grid-auto-rows:max-content;align-content:start;align-items:start;min-height:0;max-height:360px;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;padding:1px 4px 2px 1px}
.anima-premium .anima-basin-choice,.anima-standalone .anima-basin-choice{box-sizing:border-box;display:grid;grid-template-columns:88px minmax(0,1fr);grid-template-rows:repeat(4,max-content);align-content:start;align-items:start;column-gap:10px;row-gap:5px;width:100%;height:auto;min-height:132px;max-height:none;margin:0;white-space:normal;overflow:hidden;flex:none}
.anima-premium .anima-basin-choice>img,.anima-standalone .anima-basin-choice>img,.anima-basin-choice>.anima-basin-photo-placeholder{grid-column:1;grid-row:1/5;box-sizing:border-box;width:88px;height:112px;max-width:100%;object-fit:contain;align-self:center;background:#fff}
.anima-basin-choice>.anima-basin-photo-placeholder{display:grid;place-items:center;text-align:center;font:11px/1.4 Arial,sans-serif;color:#65715f}
.anima-basin-choice>.anima-basin-name,.anima-basin-choice>.anima-basin-reference,.anima-basin-choice>.anima-basin-format,.anima-basin-choice>.anima-basin-price{grid-column:2;min-width:0;max-width:100%;display:block;position:static;white-space:normal;overflow-wrap:anywhere;margin:0;line-height:1.4}
.anima-premium .anima-basin-choice>.anima-basin-name,.anima-standalone .anima-basin-choice>.anima-basin-name{font:600 13px/1.4 Arial,sans-serif}
.anima-premium .anima-basin-choice>.anima-basin-format,.anima-standalone .anima-basin-choice>.anima-basin-format{font:600 12px/1.5 Arial,sans-serif;color:#29483e}
.anima-basin-choice>.anima-basin-reference,.anima-basin-choice>.anima-basin-price{font:12px/1.5 Arial,sans-serif;color:#65715f}
`;
