import {COLLECTIONS,formatsForColor,layoutPatterns} from './surface-catalog.js';
import {availableColors} from './surface-picker.js';
import {canonicalSurfaceIdentity,commercialSurfaceOptions} from './surface-identity.mjs';
import commercialSurfaces from './commercial-surfaces.json' with {type:'json'};

// A wall band starts at one selected tile across; rotating the tile changes
// that physical width. The wall height stays independent and remains editable.
export function newTiledZone(surface,finish,kind='wall'){
 const xs=surface.polygon.map(p=>p[0]*100),ys=surface.polygon.map(p=>p[1]*100),bounds={x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
 const collection=finish.collection==='Peinture'?'Creta':finish.collection,choices=COLLECTIONS[collection]?.colors||[],color=choices.some(c=>c.id===finish.color)?finish.color:availableColors(collection)[0]?.id;
 if(finish.collection!=='Peinture'&&!choices.some(c=>c.id===finish.color))throw Error('Le coloris enregistré est inconnu. Choisissez un carrelage avant de créer la bande.');
 const formats=formatsForColor(collection,color),layout=surface.layout||{},format=formats.find(f=>f.id===finish.format)||formats.find(f=>Math.abs(f.width-layout.width)<.001&&Math.abs(f.height-layout.height)<.001)||formats[0];
 if(!format)throw Error('Choisissez d’abord un carrelage et son format.');
 const direction=layout.direction==='vertical'?'vertical':'horizontal',tileWidth=(direction==='vertical'?format.height:format.width)*100,tileHeight=(direction==='vertical'?format.width:format.height)*100;
 const width=Math.min(bounds.width,tileWidth*(kind==='floor'?2:1)),height=kind==='wall'?bounds.height:Math.min(bounds.height,tileHeight*2),patterns=layoutPatterns(collection,color,format.id,layout);
 // Carry the chosen commercial variant only when its collection, colour and
 // format still describe this new band. A fallback size or paint conversion
 // must never attach the previous wall's SKU, finish or custom carton to it.
 let identity={};const sameSelection=finish.collection===collection&&finish.color===color&&finish.format===format.id;
 if(sameSelection){
  try{const resolved=canonicalSurfaceIdentity(finish,{products:commercialSurfaces.products}),options=commercialSurfaceOptions(finish,commercialSurfaces.products),chosen=options.find(p=>p.key===finish.catalogueKey)||options.find(p=>p.reference===finish.reference);
   const consistent=(!finish.finish||!chosen||chosen.finish===finish.finish)&&(!finish.finish||chosen||options.some(p=>p.finish===finish.finish));
   if(consistent)identity=Object.fromEntries(['catalogueKey','reference','finish','colorId','sourceColorId','fidelity','contractVersion'].filter(k=>finish[k]!==undefined||resolved[k]!==undefined).map(k=>[k,finish[k]??resolved[k]]));
  }catch{} // An unresolvable legacy identity stays on its original surface.
  const packKey=[collection,color,format.id].join('|'),copy=v=>JSON.parse(JSON.stringify(v));
  if(finish.pack?.format===format.id&&(!finish.pack.collection||finish.pack.collection===collection)&&(!finish.pack.color||finish.pack.color===color))identity.pack=copy(finish.pack);
  if(finish.packs?.[packKey])identity.packs={[packKey]:copy(finish.packs[packKey])};
 }
 const grouts={Blanc:'#f7f5ed','Gris clair':'#c5c5c2',Gris:'#858585',Anthracite:'#343638',Beige:'#c6ad89',Ivoire:'#e8dbc0'};
 // Only new wall columns get the removable vertical trims. Existing zones
 // and floor rugs keep their explicit choices, including "Sans profil".
 const profiles=kind==='wall'?{profile:true,profileColor:'Argent',profileEdges:{left:'Argent',right:'Argent',top:'none',bottom:'none'}}:{};
 return {...identity,...profiles,name:kind==='wall'?'Bande murale':'Tapis de carrelage',x:Math.round(bounds.x+(bounds.width-width)/2),y:kind==='wall'?bounds.y:Math.round(bounds.y+(bounds.height-height)/2),width,height,collection,color,format:format.id,direction,pattern:patterns.some(p=>p.id===layout.pattern)?layout.pattern:patterns[0]?.id||'straight',groutColor:/^#[a-f0-9]{6}$/i.test(finish.groutColor||'')?finish.groutColor:grouts[finish.groutColor]||'#d5d0c3',groutWidth:layout.groutWidth||2};
}

export function zoneEditorCSS(){return `
 .rug-selection-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;overflow:hidden}.rug-selection-overlay polygon{fill:none;stroke:#b79850;stroke-width:2;stroke-dasharray:6 4;vector-effect:non-scaling-stroke}
 .renovation-zone-panel{position:absolute;inset:76px 12px auto auto;z-index:45;width:340px;max-width:calc(100% - 24px);max-height:calc(100% - 88px);padding:16px;border:1px solid #cdd1c4;border-radius:12px;background:#fffdf7;color:#2b3c32;box-shadow:0 8px 26px #19352b22;overflow:auto;overscroll-behavior:contain;box-sizing:border-box}
 .renovation-zone-panel .zone-panel-heading{position:sticky;top:-16px;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fffdf7;padding:8px 0;z-index:2}
 .renovation-zone-panel h2{font:22px/1.2 Georgia,serif;margin:0}
 .renovation-zone-panel .renovation-fields{gap:9px}
 .renovation-zone-panel label{font:12px Arial,sans-serif;display:grid;gap:5px;min-width:0}
 .renovation-zone-panel input,.renovation-zone-panel select{font:12px Arial,sans-serif;min-height:36px;padding:7px;width:100%;box-sizing:border-box;border:1px solid #ccd2c3;border-radius:7px;background:white;color:#29483e}
 .renovation-zone-panel button{font:12px Arial,sans-serif;min-height:36px;padding:7px 10px;border:1px solid #cdd1c4;border-radius:7px;background:#faf9f2;color:#29483e;cursor:pointer}
 .renovation-zone-panel .renovation-actions{gap:6px;margin:10px 0 0}
 .renovation-zone-panel p{font:12px/1.45 Arial,sans-serif;margin:8px 0}
 .renovation-zone-panel .renovation-status{min-height:0;color:#6c7469}
 .renovation-zone-panel .zone-panel-full{grid-column:1/-1}
 #settings.zone-editor-open>:not(#tile-zone-editor){display:none!important}
 #settings .renovation-zone-panel.zone-panel-docked{position:static;inset:auto;width:100%;max-width:none;max-height:none;padding:0;border:0;border-radius:0;box-shadow:none;overflow:visible}
 .renovation-zone-panel details{margin-top:10px;border-top:1px solid #d9dccf;padding-top:8px}
 .renovation-zone-panel summary{cursor:pointer;min-height:32px;font:12px/1.5 Arial,sans-serif;color:#53654f}
 .renovation-zone-panel details>.renovation-fields{padding-top:8px}
 .renovation-zone-panel [disabled]{opacity:.6}
 .renovation-zone-panel .zone-panel-minimize{display:none}
 .renovation-zone-panel .zone-panel-close{flex-shrink:0;min-width:36px;font-size:17px}
 @media(max-width:760px){.renovation-zone-panel{inset:auto 8px 8px;width:auto;max-width:calc(100% - 16px);max-height:48%;padding:12px}.renovation-zone-panel .zone-panel-heading{top:-12px}.renovation-zone-panel .zone-panel-heading h2{font-size:19px;flex:1}.renovation-zone-panel input,.renovation-zone-panel select,.renovation-zone-panel button{min-height:44px;font-size:16px}.renovation-zone-panel .zone-panel-heading button{font-size:12px;min-width:44px;flex-shrink:0}.renovation-zone-panel .zone-panel-minimize{display:block}.renovation-zone-panel.zone-panel-minimized>:not(.zone-panel-heading){display:none!important}}
 `;}
