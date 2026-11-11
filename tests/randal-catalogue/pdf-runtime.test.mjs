import test from 'node:test';
import assert from 'node:assert/strict';
import {openPdfDocument} from '../../assets/js/randal-catalogue/pdf-runtime.mjs';

test('the reader keeps partial loading when HTTP ranges work',async()=>{
 const pdf={numPages:43},requests=[];
 const library={getDocument:options=>{requests.push(options);return {promise:Promise.resolve(pdf),destroy(){throw Error('A successful document must remain open');}};}};
 assert.equal(await openPdfDocument(library,'catalogue.pdf'),pdf);
 assert.equal(requests.length,1);assert.equal(requests[0].disableStream,true);
});

test('a rejected range request automatically recovers with normal streaming',async()=>{
 const pdf={numPages:43},requests=[];let destroyed=0;
 const library={getDocument:options=>{requests.push(options);return {promise:requests.length===1?Promise.reject(Error('Range interrupted')):Promise.resolve(pdf),async destroy(){destroyed++;}};}};
 assert.equal(await openPdfDocument(library,'catalogue.pdf'),pdf);
 assert.equal(destroyed,1);assert.equal(requests.length,2);
 assert.equal(requests[1].url,'catalogue.pdf');assert.equal(requests[1].disableRange,true);assert.notEqual(requests[1].disableStream,true);
});

test('an unavailable PDF releases both failed loading tasks and allows a manual retry',async()=>{
 let destroyed=0;
 const library={getDocument:()=>({promise:Promise.reject(Error('Unavailable')),async destroy(){destroyed++;}})};
 await assert.rejects(openPdfDocument(library,'catalogue.pdf'),/Unavailable/);assert.equal(destroyed,2);
});
