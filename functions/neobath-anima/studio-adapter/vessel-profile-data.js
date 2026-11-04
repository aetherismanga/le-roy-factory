// Only the external W/D/H are manufacturer dimensions. Curves, wall gauge,
// ledge and mounting proportions below reconstruct the catalogue photographs;
// they must never be used as machining or installation templates.
export function animaVesselProfile(product={}){
  const ref=String(product.ref||'').toUpperCase(),shape=product.basinGeometry||product.shape||'';
  const family=/FO01|B578|ECLISSE116/.test(ref)?'round':/FO03/.test(ref)?'square':/FO04|PF149380|ECLISSE114|B571|B860|B861|B862/.test(ref)?'rectangle':/FO02|CVR45|ECLISSE115/.test(ref)?'oval':/round|circle|rond/.test(shape)?'round':/oval|ovale/.test(shape)?'oval':'rectangle';
  const width=(product.width||40)/100,depth=(product.depth||40)/100,height=(product.height||14)/100,power=['round','oval'].includes(family)?2:/B571|B860|B861|B862/.test(ref)?12:family==='square'?8:4.5;
  // DNA PDF 42 / composition 012 identifies this photo as ECLISSE114/S.
  // No equivalent ledge is documented for 114 à poser, 115 or 116.
  const ledge=/^ECLISSE114\s*\/\s*S$/.test(ref);
  return {family,width,depth,height,power,openingWidth:ledge?width-.016:width*(family==='round'||family==='oval'?.354/.370:.446/.460),openingDepth:ledge?depth-.098:depth*(family==='round'||family==='oval'?.354/.370:.316/.330),openingOffsetZ:ledge?.036:0,
    tap:ledge?{x:0,z:-depth/2+.044,radius:.017,mount:'basin',approximate:true}:null,
    reconstruction:{approximate:true,externalDimensions:'catalogue',sourcePdf:'ANIMA',sourcePdfPage:75,...(ledge?{designSourcePdf:'DNA',designSourcePdfPage:42,sourceComposition:'012',note:'Plage arrière et proportions de cuve reconstruites depuis la photographie ECLISSE114/S ; perçages et découpe à confirmer sur le gabarit fabricant.'}:{note:'Courbure et épaisseur de paroi reconstruites depuis la photographie de famille ; dimensions extérieures conservées.'})}};
}
