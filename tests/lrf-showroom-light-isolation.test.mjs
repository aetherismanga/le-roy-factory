import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createShowroomLighting} from '../shared/lrf-3d/showroom-lighting.js';

function fixture(){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),renderer={toneMappingExposure:1.12,toneMapping:T.ACESFilmicToneMapping,shadowMap:{enabled:false}},originalEnvironment=new T.Texture();
 scene.environment=originalEnvironment;scene.environmentIntensity=.38;scene.fog=new T.Fog('#c9baa1',14,57);
 const originalLights=[new T.HemisphereLight(),new T.DirectionalLight(),new T.RectAreaLight(),new T.PointLight()];originalLights[3].visible=false;scene.add(...originalLights);
 const root=new T.Group();root.userData.showroom=true;root.position.set(7,0,11);root.rotation.y=.63;
 const ownLight=new T.HemisphereLight(),ownHidden=new T.PointLight();ownHidden.visible=false;root.add(ownLight,ownHidden);scene.add(root);root.updateMatrixWorld(true);
 const hall={root,dimensions:{width:30},navigableBounds:{minX:-15,maxX:15,minZ:-45,maxZ:0},appearance:{environmentIntensity:.54,exposure:.79,toneMapping:T.AgXToneMapping},updateLighting(_point,r){r.shadowMap.enabled=true;}};
 let selectedHall=hall;
 const lighting=createShowroomLighting({scene,renderer,camera,getHall:()=>selectedHall,makeEnvironment:()=>{throw Error('No sky required in this test');}});
 return {scene,camera,renderer,originalEnvironment,originalLights,hall,ownLight,ownHidden,lighting,inside(){camera.position.copy(root.localToWorld(new T.Vector3(0,1.58,-5)));},outside(){camera.position.copy(root.localToWorld(new T.Vector3(0,1.58,1)));},selectHall(value){selectedHall=value;}};
}

test('the hall isolates original hemisphere, sun, window area and furniture lights and restores their exact flags',()=>{
 const f=fixture(),originalVisible=f.originalLights.map(light=>light.visible),fog=f.scene.fog.color.clone();
 f.inside();assert.equal(f.lighting.update(),true);
 assert.deepEqual(f.originalLights.map(light=>light.visible),[false,false,false,false]);assert.equal(f.ownLight.visible,true);assert.equal(f.ownHidden.visible,false,'the hall retains its own light scheduling');
 assert.equal(f.scene.environmentIntensity,.54);assert.equal(f.renderer.toneMappingExposure,.79);assert.equal(f.renderer.toneMapping,T.AgXToneMapping);assert.equal(f.renderer.shadowMap.enabled,true);
 f.outside();assert.equal(f.lighting.update(),false);
 assert.deepEqual(f.originalLights.map(light=>light.visible),originalVisible);assert.equal(f.scene.environment,f.originalEnvironment);assert.equal(f.scene.environmentIntensity,.38);assert.equal(f.renderer.toneMappingExposure,1.12);assert.equal(f.renderer.toneMapping,T.ACESFilmicToneMapping);assert.equal(f.renderer.shadowMap.enabled,false);assert(f.scene.fog.color.equals(fog));assert.equal(f.scene.fog.near,14);assert.equal(f.scene.fog.far,57);
 f.lighting.dispose();f.originalEnvironment.dispose();
});

test('new bathroom lights and other exhibition halls stay isolated, including repeated updates and disposal while inside',()=>{
 const f=fixture(),otherHall=new T.Group(),otherLight=new T.HemisphereLight();otherHall.userData.showroom=true;otherHall.add(otherLight);f.scene.add(otherHall);
 f.inside();f.lighting.update();assert.equal(otherLight.visible,false,'another hall must not add global hemisphere light');
 const late=new T.RectAreaLight(),lateHidden=new T.PointLight();lateHidden.visible=false;f.scene.add(late,lateHidden);f.lighting.update();assert.equal(late.visible,false);assert.equal(lateHidden.visible,false);
 // Normal lighting refreshes may re-enable existing lamps before render.
 f.originalLights[0].visible=true;f.lighting.update();assert.equal(f.originalLights[0].visible,false);assert.equal(f.ownLight.visible,true);
 f.lighting.dispose();assert.deepEqual(f.originalLights.map(light=>light.visible),[true,true,true,false]);assert.equal(late.visible,true);assert.equal(lateHidden.visible,false);assert.equal(otherLight.visible,true);assert.equal(f.lighting.active,false);
 f.originalEnvironment.dispose();
});

test('switching reached halls restores the first snapshot before isolating lights for the next space',()=>{
 const f=fixture(),secondRoot=new T.Group(),secondLight=new T.PointLight();secondRoot.userData.showroom=true;secondRoot.position.set(-30,0,-10);secondRoot.add(secondLight);f.scene.add(secondRoot);secondRoot.updateMatrixWorld(true);
 const second={root:secondRoot,dimensions:{width:30},navigableBounds:{minX:-15,maxX:15,minZ:-45,maxZ:0}};
 f.inside();f.lighting.update();assert.equal(secondLight.visible,false);f.selectHall(second);f.camera.position.copy(secondRoot.localToWorld(new T.Vector3(0,1.58,-3)));f.lighting.update();
 assert.equal(secondLight.visible,true,'the next hall owns its lights');assert.equal(f.ownLight.visible,false,'previous hall stops contributing');assert.deepEqual(f.originalLights.map(light=>light.visible),[false,false,false,false]);
 f.selectHall(null);f.lighting.update();assert.equal(secondLight.visible,true);assert.equal(f.ownLight.visible,true);assert.equal(f.ownHidden.visible,false);assert.deepEqual(f.originalLights.map(light=>light.visible),[true,true,true,false]);assert.equal(f.renderer.toneMappingExposure,1.12);f.lighting.dispose();f.originalEnvironment.dispose();
});
