const paths=new WeakMap();
// Dense plans keep every cell. Grouping disjoint subpaths by material bounds
// the DOM node count without sampling the floor or changing the cutting list.
export function renderTileCells(layout,cells,fill=()=>''){
 const dense=cells.length>4000,groups=new Map();let markup='';
 for(const cell of cells){
  let shape=paths.get(cell);if(!shape){const points=cell.polygon.map(layout.transform.from).map(p=>p.join(','));shape={points:points.join(' '),path:'M'+points.join('L')+'Z'};paths.set(cell,shape);}
  const attributes=fill(cell),kind=cell.cut?' cut':'';
  if(!dense){markup+='<polygon class="tile'+kind+'"'+attributes+' points="'+shape.points+'"/>';continue;}
  const key=kind+'|'+attributes;let group=groups.get(key);if(!group){group={kind,attributes,parts:[]};groups.set(key,group);}group.parts.push(shape.path);
 }
 for(const group of groups.values())for(let i=0;i<group.parts.length;i+=2048){const parts=group.parts.slice(i,i+2048);markup+='<path class="tile'+group.kind+'"'+group.attributes+' data-tile-count="'+parts.length+'" d="'+parts.join('')+'"/>';}
 return markup;
}
