import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {AQUAHOME,makeTap,tapsFor,metalMaterial} from '../../shared/lrf-3d/taps.js';

const byRef=reference=>AQUAHOME.find(product=>product.reference===reference);
function destroy(root){const materials=new Set();root.traverse(object=>{object.geometry?.dispose();if(object.material)materials.add(object.material);});for(const material of materials)material.dispose();}
test('every exposed catalogue reference has finite complete geometry and a bounded mobile budget',()=>{
 assert.equal(AQUAHOME.length,208);assert.equal(new Set(AQUAHOME.map(p=>p.reference)).size,208);
 for(const product of AQUAHOME){
  const root=makeTap(product),bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3());let triangles=0,calls=0;
  assert.equal(root.userData.reference,product.reference);assert.match(root.userData.provenance,/pas un fichier CAO/);
  assert(size.toArray().every(value=>Number.isFinite(value)&&value>0),product.reference+' finite positive bounds');
  assert(size.x<.6&&size.y<2.2&&size.z<.6,product.reference+' metre-scale geometry');
  root.traverse(object=>{if(!object.isMesh)return;calls++;const g=object.geometry;for(const value of g.attributes.position.array)assert(Number.isFinite(value),product.reference+' finite positions');triangles+=(g.index?g.index.count:g.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);});
  assert(triangles<26000,product.reference+' triangle budget '+triangles);assert(calls<65,product.reference+' draw budget '+calls);destroy(root);
 }
 assert.throws(()=>makeTap({...byRef('11340112701'),use:'unknown'}),/sans modèle 3D validé/);
});
test('Flip and Bel Air preserve round silhouettes, technical outlet heights and distinct head detailing',()=>{
 for(const [reference,height,outlet]of [['11350112701',.165,.063],['11350212701',.302,.168],['11340112701',.165,.066],['11340212701',.274,.168]]){
  const root=makeTap(byRef(reference)),body=root.getObjectByName('Corps'),nozzle=root.getObjectByName('Bague_mousseur');assert.equal(body.geometry.type,'LatheGeometry');assert(Math.abs(nozzle.position.y-outlet)<.00001);const b=new T.Box3().setFromObject(root);assert(Math.abs(b.max.y-height)<.01);
  assert.equal(!!root.getObjectByName('Moletage_Flip'),reference.startsWith('1135'));destroy(root);
 }
 const square=makeTap(byRef('13240112701')),classic=makeTap(byRef('14640212701')),bora=makeTap(byRef('13340112701'));
 assert.equal(square.getObjectByName('Corps').geometry.type,'RoundedBoxGeometry');assert(classic.getObjectByName('Commande_croisillon'));assert(bora.getObjectByName('Levier_ajoure'));[square,classic,bora].forEach(destroy);
});
test('column identities keep thermostats, rain shape, bath spout and hydromassage jets',()=>{
 const sofia=makeTap(byRef('520000013')),suprema=makeTap(byRef('520000014')),lyonBath=makeTap(byRef('510000019')),hydro=makeTap(byRef('550000016'));
 assert(sofia.getObjectByName('Commande_thermostatique'));assert.equal(sofia.getObjectByName('Pomme_pluie').geometry.type,'LatheGeometry');assert.equal(suprema.getObjectByName('Pomme_pluie').geometry.type,'RoundedBoxGeometry');assert(lyonBath.getObjectByName('Bec_bain'));let jets=0;hydro.traverse(object=>{if(object.name==='Buse_hydromassage')jets++;});assert.equal(jets,5);for(const root of [sofia,suprema,lyonBath,hydro]){assert(root.getObjectByName('Picots_silicone').isInstancedMesh);destroy(root);}
});
test('additional placements use their actual installation rather than falling back to a bath mixer',()=>{
 for(const use of ['basin-wall','basin-floor','bidet','shower-mixer','shower-concealed','shower-kit']){
  assert(tapsFor(use).length>0);const root=makeTap(tapsFor(use)[0]);assert(!root.getObjectByName('Mitigeur_bain'),use);assert(root.userData.model);destroy(root);
 }
 const wall=makeTap(tapsFor('shower-mixer')[0]),floor=makeTap(tapsFor('basin-floor')[0]);assert(Math.abs(wall.getObjectByName('Mitigeur_douche').position.y)<.001);assert(!floor.getObjectByName('Douchette'));destroy(wall);destroy(floor);
 const bidet=makeTap(tapsFor('bidet')[0]),swivel=bidet.getObjectByName('Rotule_mousseur_bidet');assert(swivel);for(const name of ['Bague_mousseur','Mousseur','Grille_mousseur'])assert.equal(bidet.getObjectByName(name).parent,swivel);destroy(bidet);
});
test('physical finishes cover aged brass and release only their own microfinish texture',()=>{
 const brass=metalMaterial('Latón Envejecido'),chrome=metalMaterial('Cr Apertura Frío'),black=metalMaterial('Noir mat'),white=metalMaterial('Blanc mat'),a=metalMaterial('Inox brossé'),b=metalMaterial('Inox brossé');
 assert.notEqual(brass.color.getHex(),chrome.color.getHex());assert.equal(black.metalness,0);assert.equal(white.metalness,0);assert(a.bumpMap);assert.notEqual(a.bumpMap,b.bumpMap);let disposed=0;a.bumpMap.addEventListener('dispose',()=>disposed++);a.dispose();assert.equal(disposed,1);for(const material of [brass,chrome,black,white,b])material.dispose();
});
