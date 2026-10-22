import test from 'node:test';
import assert from 'node:assert/strict';
import {orthogonalContour,dimensionValue,solveDimensions,chooseReadings,nearestWall} from '../../assets/js/lrf-plan-pose/dimensions.mjs';
import {measuredPoints,normalizePixels,readPlan} from '../../assets/js/lrf-plan-pose/plan-reader.mjs';
import {newRoom,metrics,distance,polygonError} from '../../assets/js/lrf-plan-pose/core.mjs';

const points=[[0,0],[455,0],[455,344],[237,344],[237,249],[0,249]];
const shape=()=>orthogonalContour(points);

test('lecture des unités : cm par défaut, virgule décimale et unités explicites',()=>{
 assert.equal(dimensionValue('455'),455);assert.equal(dimensionValue('4,55 m'),455);assert.equal(dimensionValue('4550 mm'),455);assert.equal(dimensionValue('4.55','m'),455);assert.equal(dimensionValue('Porte 84'),null);assert.equal(dimensionValue('455 x 344'),null);assert.equal(dimensionValue('-45'),null);assert.equal(dimensionValue('Infinity'),null);
});

test('le contour en L est reconstruit par les cotes, même si le dessin est déformé',()=>{
 const sketch=orthogonalContour([[0,0],[500,0],[500,310],[260,310],[260,220],[0,220]]),r=solveDimensions(sketch,[455,344,218,null,null,249]);
 assert.equal(r.error,'');assert.deepEqual(r.points,points);assert.equal(r.area,13.4005);assert.deepEqual(r.inferred,[3,4]);assert.deepEqual(r.lengths,[455,344,218,95,237,249]);
});

test('une cote absente ne reçoit jamais une valeur tirée des pixels',()=>{
 const r=solveDimensions(shape(),[null,344,218,null,null,249]);assert.ok(r.error);assert.equal(r.area,undefined);
});

test('cotes contradictoires : le plan reste bloqué au lieu de modifier les nombres',()=>{
 const r=solveDimensions(shape(),[455,344,218,86,null,249]);assert.ok(r.error.includes('ne se referment pas'));assert.equal(r.points,undefined);
});

test('les valeurs non finies et les niveaux de murs inversés sont refusés',()=>{
 assert.ok(solveDimensions(shape(),[455,344,218,NaN,null,249]).error);assert.ok(solveDimensions(shape(),[80,344,218,null,null,249]).error);
});

test('une porte écrite à côté du mur ne remplace pas la cote principale',()=>{
 const options=[[{text:'455',score:35},{text:'84',score:65}],[{text:'344',score:85}],[{text:'218',score:70}],[],[],[{text:'249',score:60}]],r=chooseReadings(shape(),options);
 assert.equal(r.error,'');assert.equal(r.readings[0].text,'455');assert.equal(r.area,13.4005);
});

test('des lectures partielles incompatibles ne fabriquent pas une petite pièce cohérente',()=>{
 const options=[[{text:'84',score:36}],[{text:'344',score:88},{text:'244',score:19}],[{text:'218',score:51}],[{text:'86',score:68}],[{text:'35',score:25}],[{text:'249',score:31}]],r=chooseReadings(shape(),options);
 assert.ok(r.error);assert.equal(r.area,undefined);
});

test('métrés et distances restent exacts après remise du plan mesuré sur une photo inclinée',()=>{
 const angle=.08,scale=1.3,c=Math.cos(angle),s=Math.sin(angle),row={shape:{...shape(),angle,points:points.map(([x,y])=>[70+x*c/scale-y*s/scale,80+x*s/scale+y*c/scale])}},solved=solveDimensions(shape(),[455,344,218,null,null,249]),converted=measuredPoints(row,solved,scale),room=newRoom(converted);
 assert.equal(polygonError(converted),'');assert.ok(Math.abs(metrics(room,scale).area-13.4005)<1e-9);assert.ok(Math.abs(distance(converted[0],converted[1])*scale-455)<1e-9);
});

test('les annotations à l’intérieur de la pièce ne servent pas de cotes extérieures',()=>{
 assert.equal(nearestWall(shape(),[300,100]),null);assert.equal(nearestWall(shape(),[200,-20]).wall,0);
});

test('la normalisation d’une feuille uniforme ne crée aucun trait',()=>{
 const pixels=new Uint8ClampedArray(40*30*4).fill(255),result=normalizePixels(pixels,40,30);for(let i=0;i<result.length;i+=4){assert.equal(result[i],230);assert.equal(result[i+3],255);}
});

test('une lecture contradictoire peut être déduite mais reste signalée à vérifier',()=>{
 const options=[[{text:'455',score:45}],[{text:'344',score:88}],[{text:'218',score:55}],[{text:'86',score:68}],[],[{text:'249',score:31}]],r=chooseReadings(shape(),options);
 assert.equal(r.error,'');assert.equal(r.area,13.4005);assert.equal(r.requiresReview,true);assert.deepEqual(r.rejected,[{wall:3,text:'86',proposed:95}]);assert.equal(r.readings[3],null);
});

test('annuler pendant le chargement du lecteur libère immédiatement le parcours',async()=>{
 const controller=new AbortController(),reading=readPlan({shapes:[shape()]},{signal:controller.signal,workerFactory:()=>new Promise(()=>{})});
 controller.abort();await assert.rejects(reading,/annulée/);
});

test('une déduction horizontale reste disponible quand une cote verticale manque',()=>{
 const s=orthogonalContour([[100,100],[349,100],[349,555],[5,555],[5,337],[100,337]]),r=solveDimensions(s,[249,455,344,null,null,null]);
 assert.ok(r.error);assert.equal(r.area,undefined);assert.equal(r.partialLengths[4],95);assert.equal(r.partialLengths[5],null);assert.deepEqual(r.deductions.find(d=>d.wall===4).terms.map(t=>[t.value,t.sign]),[[344,1],[249,-1]]);
});

test('lecture 97 au lieu de 95 : calcul partiel conservé et fausse lecture signalée',()=>{
 const s=orthogonalContour([[100,100],[349,100],[349,555],[5,555],[5,337],[100,337]]),cs=[249,455,344,null,97,null].map(v=>v?[{text:String(v),score:70}]:[]),r=chooseReadings(s,cs);
 assert.ok(r.error);assert.equal(r.readings[0].text,'249');assert.equal(r.readings[4],null);assert.equal(r.partialLengths[4],95);assert.deepEqual(r.rejected,[{wall:4,text:'97',proposed:95}]);
 cs[3]=[{text:'218',score:70}];const complete=chooseReadings(s,cs);assert.equal(complete.error,'');assert.equal(complete.area,13.4005);assert.equal(complete.lengths[5],237);assert.deepEqual(complete.deductions.find(d=>d.wall===5).terms.map(t=>[t.value,t.sign]),[[455,1],[218,-1]]);
 assert.ok(solveDimensions(s,[249,455,344,218,97,null]).error,'une saisie humaine contradictoire ne doit pas être modifiée');
});
