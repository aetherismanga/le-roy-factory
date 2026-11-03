import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {parse} from 'acorn';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
import {transformAnimaTapCompatibility} from '../functions/neobath-anima/studio-adapter/tap-compatibility-transform.mjs';

const source=transformAnimaTapCompatibility(transformCommonStudioSource(readFileSync(new URL('../studio-one/src/app.js',import.meta.url),'utf8'),'app.js'));
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),functions=new Map(ast.body.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,source.slice(n.start,n.end)]));
const position=()=>({set(x,y,z){Object.assign(this,{x,y,z});},copy(p){Object.assign(this,{x:p.x,y:p.y,z:p.z});}});
const tap=()=>({userData:{reference:'known-tap'},position:position(),rotation:{y:0},visible:true,removeFromParent(){this.detached=true;}});
function install(points){
 const asset={aquaTap:tap(),aquaTapExtra:tap(),faucets:[],root:{add(){}},spec:{bottom:.3,height:.52,topHeight:.012},getBasinCenters:()=>[99],getTapPositions:()=>points};
 const item={type:'cabinet',settings:{top:'test-basin',tap:'known-tap'},asset},product={reference:'known-tap',finish:'Chrome'};
 const context={__animaExactTap:reference=>reference===product.reference?product:null,__animaTapCheck:()=>({compatible:points.length>0,reason:'Pose murale nécessaire.',placements:points.map(point=>({...point,y:.832}))}),disposeObject(){},syncCabinetDrain(){},item};
 runInNewContext(functions.get('__animaClearAttachedTaps')+'\n'+functions.get('installCabinetTap')+'\ninstallCabinetTap(item);',context);return asset;
}
test('the actual atelier positions a prevalidated AquaHome tap at the safe lateral Anima hole and rotates the spout',()=>{
 const asset=install([{x:.25,z:-.03,rotationY:Math.PI/2}]);
 assert.equal(asset.aquaTap.position.x,.25);assert.equal(asset.aquaTap.position.z,-.03);assert.equal(asset.aquaTap.rotation.y,Math.PI/2);assert.equal(asset.aquaTap.position.y,.832);
 assert.equal(asset.aquaTap.visible,true);assert.equal(asset.aquaTapExtra,null);
});
test('two prevalidated basins retain their independent safe tap holes and orientations',()=>{
 const asset=install([{x:-.3,z:-.14,rotationY:0},{x:.3,z:.02,rotationY:-Math.PI/2}]);
 assert.equal(asset.aquaTapExtra.position.x,.3);assert.equal(asset.aquaTapExtra.position.z,.02);assert.equal(asset.aquaTapExtra.rotation.y,-Math.PI/2);assert.equal(asset.aquaTapExtra.visible,true);
});
test('a bare plan or a wall-mounted tap requirement removes every attached deck tap',()=>{
 const asset=install([]);assert.equal(asset.aquaTap,null);assert.equal(asset.aquaTapExtra,null);
});
