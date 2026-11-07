'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const data=require('../elios-pose-order-data');
test('Roma Viminale and Palatino use the manufacturer R10 prepacked module without invented prices',()=>{
 for(const reference of ['085M100','085M170'])assert.deepEqual(data.get(reference),{boxM2:.75,pcs:6,price:null});
 assert.equal(data.get('085M101'),null);assert.equal(data.get('085M171'),null);
 assert.equal(data.version,'20261107-elios-pose-creations-1');
});
