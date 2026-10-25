// Existing AQUA HOME catalogue references, also used by independent washstands.
export const PLUMBING=Object.freeze([
 {id:'Chrome brillant',trap:'31141112704',drain:'000550'},
 {id:'Noir mat',trap:'31141112708',drain:'000553'},
 {id:'Or brossé',trap:'31141112709',drain:'000558'},
 {id:'Cuivre',trap:'31141112705',drain:'000559'},
 {id:'Inox brossé',trap:'31141112760',drain:'000556'},
 {id:'Gris canon',trap:'31141112706',drain:'000566'},
 {id:'Blanc mat',trap:'31141112703',drain:'000552'}
]);
export function matchingDrain(finish='Chrome brillant'){
 const value=PLUMBING.find(p=>p.id===finish)||PLUMBING[0];
 return {finish:value.id,reference:value.drain,name:'Clic-clac ronde Ø 63'};
}
