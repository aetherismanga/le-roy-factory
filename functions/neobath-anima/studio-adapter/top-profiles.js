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
