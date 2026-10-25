import {COLLECTIONS,formatsForColor} from './surface-catalog.js';

export const TILE_SELECTION_MODES=Object.freeze([
 ['single','Un carreau'],['horizontal','Rangée horizontale'],['vertical','Colonne verticale']
]);

// Per-cell edits keep the wall's physical grid. A colour offered only in a
// different manufacturer size must be selected through the wall's picker.
export function tileColorMatchesLayout(collection,color,layout={}){
 return !!COLLECTIONS[collection]?.colors.some(choice=>choice.id===color)&&formatsForColor(collection,color).some(format=>
  Math.abs(format.width-Number(layout.width))<.001&&Math.abs(format.height-Number(layout.height))<.001&&
  (format.shape||'rectangle')===(layout.shape||'rectangle'));
}

export function tileKeysForSelection(surface,key,mode='single'){
 const cells=surface?.tiles?.geometry?.userData.cells||[];
 if(!cells.some(cell=>cell.key===key))return [];
 const [col,row]=key.split(':').map(Number),vertical=surface.layout.direction==='vertical';
 return cells.filter(cell=>{const [x,y]=cell.key.split(':').map(Number);return mode==='single'?cell.key===key:mode==='horizontal'?(vertical?x===col:y===row):(vertical?y===row:x===col);}).map(cell=>cell.key);
}

// A joint is part of the same editable surface. Resolve only actual grout hits,
// never a backing, opening, decoration or foreground object, to a nearby tile.
export function tileKeyForHit(surface,hit){
 const cells=surface?.tiles?.geometry?.userData.cells||[];
 if(hit?.cellKey&&cells.some(cell=>cell.key===hit.cellKey))return hit.cellKey;
 if(hit?.object!==surface?.grout||!hit.point)return null;
 const point=surface.group.worldToLocal(hit.point.clone()),limit=(surface.layout.groutWidth||2)/1000+.0001;
 let nearest=null,distance=Infinity;
 for(const cell of cells)for(let i=0;i<(cell.bounds?.length||0);i++){
  const a=cell.bounds[i],b=cell.bounds[(i+1)%cell.bounds.length],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
  const t=length?Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.y-a[1])*dy)/length)):0;
  const d=Math.hypot(point.x-a[0]-t*dx,point.y-a[1]-t*dy);
  if(d<distance){distance=d;nearest=cell.key;}
 }
 return distance<=limit?nearest:null;
}

function installStyle(){
 if(document.getElementById('tile-selection-style'))return;
 const style=document.createElement('style');style.id='tile-selection-style';style.textContent=`
 .tile-selection-controls{display:grid;gap:8px;min-width:0;width:100%}
 .tile-selection-modes{display:flex;flex-wrap:wrap;gap:6px}
 .object-editor .tile-selection-modes button{min-height:44px;flex:1 1 100px;white-space:normal;touch-action:manipulation;border:1px solid #cbd2c2;border-radius:6px;padding:9px;color:#29483e;background:#fffdf7;font:12px/1.3 Arial,sans-serif}
 .object-editor .tile-selection-modes button[aria-pressed=true]{background:#294b3f;color:#fff;border-color:#294b3f;font-weight:600}
 .tile-selection-hint{font:12px/1.4 Arial,sans-serif;color:#65745c;margin:0}
 .object-editor .tile-pick-action{min-height:44px;touch-action:manipulation}
 `;document.head.append(style);
}

export function renderTileSelectionControls(parent,{mode='single',active=false,onMode}){
 installStyle();
 const root=document.createElement('div');root.className='tile-selection-controls';
 const modes=document.createElement('div');modes.className='tile-selection-modes';modes.setAttribute('role','group');modes.setAttribute('aria-label','Sélection des carreaux');
 for(const [id,label] of TILE_SELECTION_MODES){const button=document.createElement('button');button.type='button';button.dataset.tileSelectionMode=id;button.textContent=label;button.setAttribute('aria-pressed',String(mode===id));button.onclick=()=>onMode(id);modes.append(button);}
 const hint=document.createElement('p');hint.className='tile-selection-hint';hint.textContent=active?'Touchez le mur pour sélectionner '+(mode==='horizontal'?'une rangée.':mode==='vertical'?'une colonne.':'un carreau.'):'Choisissez le carreau, la rangée ou la colonne à modifier.';
 root.append(modes,hint);parent.append(root);return root;
}
