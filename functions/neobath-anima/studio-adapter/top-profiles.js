// Profile proportions reconstructed from manufacturer family photos. Source
// exterior basin dimensions are retained whenever the catalogue supplies them.
function sourceShape(p){const ref=String(p?.ref||'').toUpperCase(),shape=p?.basinGeometry||p?.shape||'';
  if(/FO01|B578|ECLISSE116/.test(ref))return 'round';
  if(/FO03/.test(ref))return 'square';
  if(/FO04|PF149380|ECLISSE114|B571|B860|B861|B862/.test(ref))return 'rectangle';
  if(/FO02|CVR45|ECLISSE115/.test(ref))return 'oval';
  return /round|circle|rond/.test(shape)?'round':/oval|ovale/.test(shape)?'oval':'rectangle';
}
export function animaWellProfile(top,basin,width){
  const ref=String(top.ref||'').toUpperCase();
  if(basin)return {w:(basin.width||48)/100,d:(basin.depth||30)/100,power:sourceShape(basin)==='oval'?2.1:sourceShape(basin)==='round'?2:5.0,depth:Math.min(.16,(basin.height||14)/100),knownWidth:!!basin.width,knownDepth:!!basin.depth};
  const room=width-.13;
  if(ref.startsWith('PIC'))return {w:Math.min(room,.88),d:.31,power:2.25,depth:.13};
  if(ref.startsWith('JUST'))return {w:width-.055,d:.33,power:7.4,depth:.12};
  if(ref.startsWith('TA'))return {w:width-.075,d:.33,power:7.4,depth:.14};
  if(ref.startsWith('BNT'))return {w:Math.min(room,.49),d:.28,power:3.9,depth:.14};
  if(ref.startsWith('TMS')||ref.startsWith('TM'))return {w:Math.min(room,.54),d:.30,power:7.0,depth:.14};
  if(ref.startsWith('TOS')||ref.startsWith('TO'))return {w:Math.min(room,.55),d:.30,power:4.0,depth:.14};
  return {w:Math.min(room,.54),d:.30,power:4.6,depth:.14};
}

// The catalogue distinguishes these actual drain/floor constructions. Their
// dimensions below remain photographic preview proportions, never cutout data.
export function animaBasinStyle(top,basin){
  const ref=String(basin?.ref||top?.ref||'').toUpperCase();
  const hpl=ref.match(/^VASCA\s+(EB|[ABCDE])\d/);
  if(hpl){const family=hpl[1];return {family:'hpl-fenix-'+family.toLowerCase(),panels:!['E','EB'].includes(family),drain:family==='A'||family==='E'||family==='EB'?'rectangular-matched':family==='B'?'round-matched':family==='C'?'continuous-slot':'round-chrome',slope:family==='C',gelcoat:family==='EB'?'white':family==='E'?'colored':null,sourcePdfPage:74};}
  if(/^HIDE/.test(ref))return {family:'gres-hide',panels:true,drain:'full-length-matched',sourcePdfPage:73};
  if(/^SIMPLY|^TWS/.test(ref))return {family:/^TWS/.test(ref)?'gres-twospace':'gres-simply',panels:true,drain:'continuous-slot',slope:true,sourcePdfPage:73};
  if(/^BASIC/.test(ref))return {family:'gres-basic',panels:true,drain:'round-chrome',sourcePdfPage:73};
  // A separately selected Eclisse retains its own waste fitting regardless
  // of the material of the supporting slab (e.g. TPGEA Geacril).
  if(/^ECLISSE/.test(ref))return {family:'eclisse',panels:false,drain:'round-chrome',sourcePdfPage:75};
  if(/^TXT/.test(top?.ref||''))return {family:'geacril-stone',panels:false,drain:'rectangular-matched',sourcePdfPage:72};
  if(/^TPGEA/.test(top?.ref||''))return {family:'geacril',panels:false,drain:'rectangular-matched',sourcePdfPage:71};
  if(/^PF149380/.test(ref))return {family:'ocritech-soft-rectangle',drain:'rectangular-matched',sourcePdfPage:75};
  return {family:/^ECLISSE/.test(ref)?'eclisse':'ceramic',panels:false,drain:'round-chrome',sourcePdfPage:/^ECLISSE/.test(ref)?75:70};
}

// One pure layout authority for validation and the actual drilled mesh. For
// older fixed tops without a published bowl envelope we retain the fitted
// catalogue preview proportions. Moving a bowl never shrinks that envelope.
export function animaWellLayout(selection){
  if(!selection?.integrated||!selection.top)return [];
  const positions=selection.positions||[],positionsZ=selection.positionsZ||positions.map(()=>.020);
  const W=selection.topWidth/100,D=selection.previewDepth/100,referenceD=(selection.referenceDepth??selection.top.depth??selection.previewDepth)/100;
  const offsetX=(selection.basinOffsetX||0)/100,offsetZ=(selection.basinOffsetZ||0)/100;
  if(!positions.length||![W,D,referenceD,...positions,...positionsZ].every(Number.isFinite)||positionsZ.length!==positions.length)return null;
  const family=animaWellProfile(selection.top,selection.basin,W/positions.length),style=animaBasinStyle(selection.top,selection.basin),edge=.025,bridge=.025,tapRadius=.017;
  const nominal=positions.map(x=>x-offsetX),nominalZ=.020,tapZ=-referenceD/2+.055;
  const result=[];
  for(let index=0;index<positions.length;index++){
    const x=positions[index],z=positionsZ[index],baseX=nominal[index];
    const neighbours=nominal.filter((_,i)=>i!==index).map(other=>Math.abs(other-baseX));
    const halfWidth=Math.min(baseX+W/2-edge,W/2-edge-baseX,...neighbours.map(gap=>gap/2-bridge/2));
    const halfDepth=Math.min(referenceD/2-edge-nominalZ,nominalZ-(tapZ+tapRadius+.012));
    if(halfWidth<=.055||halfDepth<=.055)return null;
    if(family.knownWidth&&family.w>halfWidth*2+.0001||family.knownDepth&&family.d>halfDepth*2+.0001)return null;
    const width=family.knownWidth?family.w:Math.min(family.w,halfWidth*2),depth=family.knownDepth?family.d:Math.min(family.d,halfDepth*2);
    const well={x,z,width,depth,innerDepth:family.depth,power:style.panels?24:family.power,tapX:x,tapZ:tapZ+offsetZ,tapRadius};
    if(Math.abs(x)+width/2>W/2-edge+1e-7||Math.abs(z)+depth/2>D/2-edge+1e-7||Math.abs(well.tapX)+tapRadius>W/2-.007+1e-7||Math.abs(well.tapZ)+tapRadius>D/2-.007+1e-7)return null;
    if(result.some(other=>Math.abs(other.x-x)<(other.width+width)/2+bridge-1e-7&&Math.abs(other.z-z)<(other.depth+depth)/2+bridge-1e-7))return null;
    result.push(well);
  }
  return result;
}
