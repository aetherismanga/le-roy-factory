import test from 'node:test';
import assert from 'node:assert/strict';
import {publicProject} from '../../assets/js/lrf-plan-pose/privacy.mjs';
import {newProject,newRoom,nativeProject,parseProject,quantity} from '../../assets/js/lrf-plan-pose/core.mjs';
import {makeRoom} from '../../randal-general/src/room.js';
import {plinthReport} from '../../randal-general/src/plinths.js';

test('fichiers de reprise partagés : achats retirés à tous les niveaux sans modifier le projet local',()=>{
 const p=newProject(),r=newRoom([[0,0],[400,0],[400,300],[0,300]]);p.rooms=[r];p.client.name='Client du projet';r.tile.purchaseHT=17.5;r.tile.purchasePaletteHT=15.5;r.plinths.purchaseHT=12;r.plinths.product={reference:'PL',length:120,height:8,packPieces:8,purchaseHT:8};
 const safe=publicProject(p),back=parseProject(JSON.stringify(safe));
 assert.equal(back.client.name,p.client.name);assert.deepEqual(back.rooms[0].points,r.points);assert.equal(back.rooms[0].tile.purchaseHT,undefined);assert.equal(back.rooms[0].plinths.purchaseHT,undefined);assert.equal(back.rooms[0].plinths.product.purchaseHT,undefined);assert.equal(r.tile.purchaseHT,17.5);
});

test('transfert natif : exclusions partielles et faïence de cloison conservent le métré sans tarifs achat',()=>{
 const p=newProject(),r=newRoom([[0,0],[400,0],[400,300],[0,300]]);p.rooms=[r];r.confirmed=true;r.tile={...r.tile,brand:'ELIOS',collection:'Shell',color:'beige',format:'60x120',width:120,height:60,purchaseHT:22};r.partitions=[{id:'P',a:[100,5],b:[100,150],thickness:10,height:260}];r.plinths.type='wood';r.plinths.purchaseHT=12;r.plinthExclusions={'boundary-0':[[200,250]],'partition-P-0':[[30,70]]};r.wallTiling={'partition-P-1':true};
 const native=nativeProject(p,r);assert.deepEqual(native.room.plinthExclusions,r.plinthExclusions);assert.equal(native.walls[5].collection,'Creta');assert.equal(native.plinths.purchaseHT,undefined);
 const scene=makeRoom(native.room,0);scene.floor.setLayout(native.layouts.floor);const after=plinthReport(scene,native.plinths,native.walls);assert.ok(Math.abs(after.net-quantity(r,1).plinths.net)<1e-6);scene.dispose();
});
