import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {animaFacadeGeometry,RIBELLE_PROFILE,ANIMA_WOOD_PERIOD} from '../functions/neobath-anima/studio-adapter/facades.js';
import {createTopSurfaceController} from '../functions/neobath-anima/studio-adapter/surface-materials.js';
import {MANUFACTURER_SURFACES,normalizeTopSurface,surfaceOptions} from '../functions/neobath-anima/studio-adapter/premium-materials.js';
import {topSelection} from '../functions/neobath-anima/studio-adapter/anima-data.js';

test('Ribelle uses rounded analytic normals and the same physical UV axes as Pura',()=>{
 for(const width of [.596,1.196]){
  const smooth=animaFacadeGeometry(width,.256,false),ribbed=animaFacadeGeometry(width,.256,true);
  assert.ok(ribbed.index,'The smooth rib surface shares indexed front vertices');
  assert.ok(Math.abs(ribbed.userData.animaFacade.pitch-RIBELLE_PROFILE.pitch)<.0001);
  for(const geometry of[smooth,ribbed]){
   const p=geometry.attributes.position,uv=geometry.attributes.uv,n=geometry.attributes.normal;
   for(let i=0;i<p.count;i++){
    assert.ok(Math.abs(uv.getX(i)-(p.getX(i)/ANIMA_WOOD_PERIOD.horizontal+.5))<1e-6,'x remains horizontal in both facade families');
    assert.ok(Math.abs(uv.getY(i)-(p.getY(i)/ANIMA_WOOD_PERIOD.vertical+.5))<1e-6,'y remains vertical without swapping wood axes');
    assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-6);
   }
   geometry.dispose();
  }
  assert.ok(RIBELLE_PROFILE.depth<.0015,'Shallow relief avoids an exaggerated dark comb profile');
 }
});

test('surface choices stay in their source family and preserve the manufacturer price key',()=>{
 for(const [id,family]of[['tfx1-linear-top','fenix'],['thpl1-linear-top','hpl'],['tgrs1a-linear-top','gres'],['tpgea12-linear-top','geacril'],['txt12-linear-top','geacril-stone']]){
  const settings={top:id,width:120,format:'two',basinColor:'white-matte'},selection=topSelection(id,120,'two');
  const options=surfaceOptions(settings,selection);assert.ok(options.length);
  for(const option of options){const normalized=normalizeTopSurface({...settings,topSurfaceId:option.id},selection);assert.equal(normalized.family,family);assert.equal(normalized.id,option.id);}
 }
 const settings={top:'tpgea12-linear-top',width:120,format:'two',basinColor:'ncs-matte',topSurfaceNcs:'s 2010-g30y'};
 const selected=normalizeTopSurface(settings);assert.equal(selected.surface.customNcs,true);assert.equal(selected.priceKey,'ncs-matte');assert.equal(selected.ncsCode,'S 2010-G30Y');
});

test('each plan owns filtered texture clones with a bounded cache and disposes them after a return to bare',async()=>{
 const sources=[],sourceDisposals=[];
 const loader={async loadAsync(url){const texture=new T.Texture({src:url,width:16,height:16});texture.addEventListener('dispose',()=>sourceDisposals.push(url));sources.push(texture);return texture;}};
 const wood=new T.MeshPhysicalMaterial({color:'#c9a884'}),ceramic=new T.MeshPhysicalMaterial({color:'#f6f5f1'});
 const controller=createTopSurfaceController({wood,ceramic,textureLoader:loader}),other=createTopSurfaceController({wood,ceramic,textureLoader:loader});
 const selection=topSelection('thpl1-linear-top',120,'two'),surfaces=MANUFACTURER_SURFACES.filter(s=>s.family==='hpl'&&s.texture).slice(0,6),maps=[];let disposed=0;
 assert.ok(surfaces.length>4);
 for(const surface of surfaces){controller.apply({topSurfaceId:surface.id},selection);await controller.ready();const texture=controller.material.map;texture.addEventListener('dispose',()=>disposed++);maps.push(texture);assert.equal(texture.image.src,surface.texture);assert.equal(texture.colorSpace,T.SRGBColorSpace);assert.equal(texture.minFilter,T.LinearMipmapLinearFilter);}
 assert.ok(disposed>=2,'Old textures are evicted before more than four remain');
 other.apply({topSurfaceId:surfaces.at(-1).id},selection);await other.ready();assert.notEqual(other.material,controller.material);assert.notEqual(other.material.map,controller.material.map);
 controller.apply({},topSelection('bare',120,'two'));controller.dispose();other.dispose();
 assert.equal(disposed,maps.length);assert.equal(sourceDisposals.length,0,'Injected/shared source textures are never disposed by a clone owner');
 for(const source of sources)source.dispose();wood.dispose();ceramic.dispose();
});

test('uniform Fenix uses its official manufacturer RGB rather than photographic lighting gradients',()=>{
 const ceramic=new T.MeshPhysicalMaterial(),wood=new T.MeshPhysicalMaterial(),controller=createTopSurfaceController({wood,ceramic});
 const surface=MANUFACTURER_SURFACES.find(s=>s.family==='fenix'),selection=topSelection('tfx1-linear-top',120,'two');
 controller.apply({topSurfaceId:surface.id},selection);
 assert.equal(controller.material.color.getHexString().toLowerCase(),surface.hex.replace('#','').toLowerCase());assert.equal(controller.material.map,null);assert.equal(controller.material.userData.animaSurface.colourIdentity,'manufacturer-rgb');
 controller.dispose();ceramic.dispose();wood.dispose();
});
