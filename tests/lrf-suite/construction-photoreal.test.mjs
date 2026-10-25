import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPhotorealPrompt} from '../../shared/lrf-3d/photoreal-export.js';

test('construction finishes and installation remain in the private-data-free visual export',()=>{
 const secret='PRIVATE_CONSTRUCTION_PRICE_MARKER';
 const finish={collection:'Creta',color:'avena',format:'60x120',layout:{width:1.2,height:.6,x:17,y:23,pattern:'straight'},purchaseHT:secret};
 const project={room:{height:260,points:[[0,0],[400,0],[400,350],[0,350]],partitions:[{a:[210,0],b:[210,140],thickness:14,height:185,fullHeight:false,profileEdges:{a:'Noir',b:'none',top:'Doré',purchaseHT:secret},client:secret}]},items:[
  {type:'shower',settings:{trayType:'tile',trayInstallation:'raised',trayHeight:18,trayCovering:{mode:'split',top:finish,reveal:{...finish,color:'caramello'}},trayProfile:true,trayProfileColor:'Bronze',purchaseHT:secret},placement:{wall:0,u:100,height:0}},
  {type:'toilet',settings:{support:true,supportHeight:112,supportCovering:{mode:'all',back:finish},client:secret},placement:{wall:1,u:80,height:0}}
 ]};
 const before=JSON.stringify(project),prompt=buildPhotorealPrompt(project);
 const data=JSON.parse(prompt.split('DONNÉES VISUELLES DU PROJET :\n\n')[1]);
 assert.equal(JSON.stringify(project),before);
 assert(!prompt.includes(secret));
 assert.deepEqual(data.piece.cloisons[0].profileEdges,{a:'Noir',b:'none',top:'Doré'});
 assert.equal(data.piece.cloisons[0].fullHeight,false);
 assert.equal(data.elements[0].settings.trayInstallation,'raised');
 assert.equal(data.elements[0].settings.trayHeight,18);
 assert.equal(data.elements[0].settings.trayProfileColor,'Bronze');
 assert.deepEqual(data.elements[0].settings.trayCovering.top.layout,{width:1.2,height:.6,x:17,y:23,pattern:'straight'});
 assert.equal(data.elements[0].settings.trayCovering.reveal.color,'caramello');
 assert.equal(data.elements[1].settings.supportCovering.back.collection,'Creta');
});
