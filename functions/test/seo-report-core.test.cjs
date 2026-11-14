'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{gzipSync}=require('node:zlib');
const {decodeReport,validateReport,mergeReport}=require('../seo-report-core.cjs');
const fixture=()=>({site:'sc-domain:leroyfactory.fr',trackingStartedAt:'2026-10-31',updatedAtIso:'2026-11-14T09:00:00Z',daily:[{date:'2026-11-01',clicks:1,impressions:5,position:3}],breakdown:{startDate:'2026-11-01',endDate:'2026-11-01',queries:[],pages:[],devices:[]}});
test('accepts a bounded real report for the expected property',()=>{const f=fixture();assert.equal(decodeReport(gzipSync(JSON.stringify(f)).toString('base64')).daily.length,1);});
test('rejects another property, duplicate dates and impossible metrics',()=>{
 assert.throws(()=>validateReport({...fixture(),site:'sc-domain:other.fr'}));
 const f=fixture();f.daily.push({...f.daily[0]});assert.throws(()=>validateReport(f));
 const g=fixture();g.daily[0].clicks=-1;assert.throws(()=>validateReport(g));
 const h=fixture();h.daily[0].date='2026-99-32';assert.throws(()=>validateReport(h));
});
test('rejects unexpected report destinations and decompression bombs',()=>{
 const f=fixture();f.breakdown.pages=[{page:'https://other.example/',clicks:0,impressions:1,position:1}];assert.throws(()=>validateReport(f));
 assert.throws(()=>decodeReport(gzipSync(' '.repeat(800000)).toString('base64')));
});
test('a late initial import cannot overwrite a more recent agent refresh',()=>{
 const incoming=validateReport(fixture());const current={...incoming,trackingStartedAt:'2026-10-30',updatedAtIso:'2026-11-15T09:00:00Z',daily:[{date:'2026-11-01',clicks:8,impressions:20,position:2},{date:'2026-11-02',clicks:3,impressions:10,position:4}]};
 const result=mergeReport(current,incoming);assert.equal(result.daily.length,2);assert.equal(result.daily[0].clicks,8);assert.equal(result.trackingStartedAt,'2026-10-30');
});
