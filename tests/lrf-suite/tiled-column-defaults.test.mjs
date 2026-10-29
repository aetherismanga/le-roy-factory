import test from 'node:test';
import assert from 'node:assert/strict';
import {newTiledZone} from '../../shared/lrf-3d/tiled-zone-controls.js';
const surface={polygon:[[0,0],[4.5,0],[4.5,2.6],[0,2.6]],layout:{width:1.2,height:.6,direction:'horizontal',pattern:'straight'}};
const finish={collection:'Creta',color:'avena',format:'60x120'};
test('New wall columns have two removable vertical silver profiles, never top or bottom',()=>{
 const before=JSON.stringify(finish),zone=newTiledZone(surface,finish,'wall');assert.equal(zone.profile,true);assert.equal(zone.profileColor,'Argent');assert.deepEqual(zone.profileEdges,{left:'Argent',right:'Argent',top:'none',bottom:'none'});assert.equal(JSON.stringify(finish),before);
 zone.profile=false;zone.profileEdges.left=zone.profileEdges.right='none';const saved=JSON.parse(JSON.stringify(zone));assert.equal(saved.profileEdges.left,'none');assert.equal(saved.profileEdges.right,'none');
});
test('Floor rug defaults are not changed by the wall-column option',()=>{const rug=newTiledZone(surface,finish,'floor');assert.equal(rug.profile,undefined);assert.equal(rug.profileEdges,undefined);});
