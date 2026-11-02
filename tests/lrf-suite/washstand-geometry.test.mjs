import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeSanitary,SANITARIES,PLUMBING} from '../../shared/lrf-3d/sanitaries.js';
import {makeTrixieCeramicGeometry,makeTrixieHardwareGeometries,makeDaliaCeramicGeometry,DALIA_LAYOUT,TRIXIE_CERAMIC_PROVENANCE} from '../../shared/lrf-3d/sanitary-ceramics.js';
import {makeSanitary as studioSanitary} from '../../studio-one/src/sanitaries.js';
import {makeSanitary as generalSanitary} from '../../randal-general/src/sanitaries.js';
import {disposeObject} from '../../studio-one/src/composition.js';

function firstHit(geometry,origin,direction){const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial());mesh.updateMatrixWorld(true);return new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction)).intersectObject(mesh)[0]?.point;}
const close=(a,b,tolerance=1e-5)=>assert(Math.abs(a-b)<tolerance,`${a} ≈ ${b}`);

test('TRIXIE uses the manufacturer monobloc mesh, retaining the hollow bowl, drilled deck and towel aperture',()=>{
 const geometry=makeTrixieCeramicGeometry(),bounds=geometry.boundingBox,size=bounds.getSize(new T.Vector3());
 close(size.x,.625,.0002);close(size.z,.285,.0002);close(size.y,.15,.0002);assert.equal(geometry.index.count/3,24000);
 assert.equal(firstHit(geometry,[.104,.2,-.086],[0,-1,0]),undefined,'Real through-drain aperture remains open without its cap');
 const cavity=firstHit(geometry,[.17,.2,-.075],[0,-1,0]);assert(cavity&&cavity.y<.07,'The right hand bowl is hollow');
 const drilling=firstHit(geometry,[-.046,.2,-.175],[0,-1,0]);assert(!drilling||drilling.y<.12,'The faucet deck has its actual recessed drilling');
 const aperture=firstHit(geometry,[-.20,.080,.20],[0,0,-1]),front=firstHit(geometry,[-.20,.130,.20],[0,0,-1]);
 assert(aperture&&aperture.z<-.22,'The towel opening passes through the front shelf');assert(front&&front.z>-.02,'Ceramic remains above the towel opening');
 const hardware=makeTrixieHardwareGeometries(),coverSize=hardware.drain.boundingBox.getSize(new T.Vector3());close(coverSize.x,.063,.00003);close(coverSize.z,.063,.00003);
 assert.match(TRIXIE_CERAMIC_PROVENANCE.source.asset,/uptrend\.pl.*3D-models\.zip/);assert.match(TRIXIE_CERAMIC_PROVENANCE.source.sha256,/^[a-f0-9]{64}$/);assert(TRIXIE_CERAMIC_PROVENANCE.conversion.maxEstimatedErrorMetres<.00015);
 geometry.dispose();for(const part of Object.values(hardware))part.dispose();
});

test('DALIA has a continuous fine rim, recessed rectangular bowl and real faucet and drain holes',()=>{
 const geometry=makeDaliaCeramicGeometry(),size=geometry.boundingBox.getSize(new T.Vector3());close(size.x,.55);close(size.z,.31);close(size.y,.125);
 assert.equal(firstHit(geometry,[0,.2,DALIA_LAYOUT.tapZ],[0,-1,0]),undefined);assert.equal(firstHit(geometry,[0,.2,DALIA_LAYOUT.drainZ],[0,-1,0]),undefined);
 const floor=firstHit(geometry,[.10,.2,-.03],[0,-1,0]),rim=firstHit(geometry,[.25,.2,.07],[0,-1,0]),deck=firstHit(geometry,[0,.2,-.21],[0,-1,0]);
 assert(floor&&floor.y<.04);assert(rim&&rim.y>.12);close(deck.y,.125);assert(geometry.attributes.position.count/3<4000);geometry.dispose();
});

test('both actual applications keep the same synchronous sanitary implementation and original project dimensions',()=>{
 assert.equal(studioSanitary,makeSanitary);assert.equal(generalSanitary,makeSanitary);
 for(const reference of ['TR443','STR4335']){
  const spec=SANITARIES.find(p=>p.id===reference),asset=makeSanitary('washstand',{reference});
  close(asset.dimensions.width,spec.width);close(asset.dimensions.depth,spec.depth);assert.equal(asset.root.userData.reference,reference);assert.equal(asset.root.userData.editTarget,'washstand');
  if(reference==='TR443'){assert(!asset.root.getObjectByName('Tablette').isMesh);assert(!asset.root.getObjectByName('Porte_serviettes').isMesh);assert(!asset.root.getObjectByName('Joue_tablette'));assert(!/JSON|tarif|cote PDF/i.test(spec.note));}
  let triangles=0,calls=0;asset.root.traverse(object=>{if(!object.isMesh)return;calls++;const g=object.geometry;triangles+=(g.index?g.index.count:g.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);for(const value of g.attributes.position.array)assert(Number.isFinite(value));if(g.attributes.normal)for(let i=0;i<g.attributes.normal.count;i++){const normal=new T.Vector3().fromBufferAttribute(g.attributes.normal,i);assert(Number.isFinite(normal.length()));}});
  assert(triangles<55000,reference+' bounded triangles '+triangles);assert(calls<45,reference+' bounded draw calls '+calls);disposeObject(asset.root);
 }
});

test('every round and square siphon joins its drain, body, D32 outlet and the installed wall with finish-specific references',()=>{
 for(const reference of ['TR443','STR4335'])for(const pairing of PLUMBING)for(const trap of ['round','square']){
  const asset=makeSanitary('washstand',{reference,metal:pairing.id,trap}),root=asset.root,assembly=root.getObjectByName('Vidage_et_siphon'),stem=root.getObjectByName('Tube_vertical_G1_1_4'),body=root.getObjectByName('Siphon_'+(trap==='square'?'31141112702':pairing.trap)),outlet=root.getObjectByName('Sortie_D32'),rosette=root.getObjectByName('Rosace_murale_D32'),cover=root.getObjectByName('Bonde_'+pairing.drain);
  assert(assembly&&body&&cover);root.updateMatrixWorld(true);const bb=o=>new T.Box3().setFromObject(o),stemBox=bb(stem),bodyBox=bb(body),pipeBox=bb(outlet),roseBox=bb(rosette),coverBox=bb(cover);
  close(stem.position.x,assembly.userData.continuity.drain[0]);close(stem.position.z,assembly.userData.continuity.drain[2]);assert(stemBox.intersectsBox(bodyBox),'Inlet overlaps the actual trap body');assert(stemBox.max.y>=coverBox.min.y-.004,'The stem reaches the underside of the click-clack');
  assert(pipeBox.intersectsBox(bodyBox),'The D32 tube reaches the trap');assert(pipeBox.intersectsBox(roseBox),'The D32 tube reaches the wall rosette');close(roseBox.min.z,-.23);close(outlet.geometry.parameters.radiusTop,.016);assert(root.getObjectByName('Ecrou_sortie_D32'));assert(root.getObjectByName('Ecrou_sous_vasque_G1_1_4'));assert(root.getObjectByName('Interieur_sortie_D32'));
  assert.equal(cover.material.color.getHex(),body.material.color.getHex());close(bodyBox.max.y-bodyBox.min.y,trap==='square'?.128:.180);disposeObject(root);
 }
 for(const reference of ['TR443','STR4335']){const asset=makeSanitary('washstand',{reference,trap:'square',drain:'square'});assert(asset.root.getObjectByName('Bonde_000560'));assert(asset.root.getObjectByName('Siphon_31141112702'));disposeObject(asset.root);}
});
