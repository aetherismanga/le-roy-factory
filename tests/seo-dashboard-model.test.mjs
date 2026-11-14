import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDaily,mergeDaily,totals,selectedRows,comparePeriods,chartSeries,territoryRows,audienceRows,csvCell,isDate,changePercent} from '../assets/js/seo-dashboard-model.mjs';
test('daily metrics retain Google dates and reject impossible dates',()=>{
 assert.equal(isDate('2026-99-31'),false);assert.equal(isDate('2026-02-30'),false);
 assert.deepEqual(normalizeDaily([{date:'2026-11-01',clicks:2,impressions:10,position:3},{date:'wrong'}]),[{date:'2026-11-01',clicks:2,impressions:10,ctr:.2,position:3}]);
});
test('a refreshed day replaces its previous observation without duplicating history',()=>{
 const result=mergeDaily([{date:'2026-10-31',clicks:1,impressions:2,position:4},{date:'2026-11-01',clicks:2,impressions:8,position:8}],[{date:'2026-11-01',clicks:3,impressions:10,position:6}]);
 assert.equal(result.length,2);assert.equal(result[1].clicks,3);assert.equal(totals(result).clicks,4);
});
test('position and CTR are weighted by impressions, never averaged or summed across days',()=>{
 const t=totals([{clicks:50,impressions:100,position:2},{clicks:0,impressions:1,position:20}]);
 assert.equal(t.clicks,50);assert.equal(t.ctr,50/101);assert.equal(t.position,220/101);
});
test('unavailable history remains missing and comparison never invents a predecessor',()=>{
 const rows=normalizeDaily([{date:'2026-11-01',clicks:1,impressions:2,position:4},{date:'2026-11-03',clicks:2,impressions:3,position:5}]);
 assert.deepEqual(chartSeries(rows).map(r=>r.value),[2,null,3]);
 assert.equal(comparePeriods(rows,rows),null);assert.equal(changePercent(3,0),null);
 assert.equal(selectedRows(rows,'since','2026-11-02').length,1);
});
test('a complete prior period can be compared without zero filling',()=>{
 const daily=normalizeDaily([1,2,3,4].map(i=>({date:'2026-11-0'+i,clicks:i,impressions:i*10,position:i})));
 const current=selectedRows(daily,'2');const previous=comparePeriods(daily,current);
 assert.equal(previous.clicks,3);assert.equal(previous.impressions,30);assert.equal(totals(current).clicks,7);
});
test('territories measure search terms and audiences only measure their destination pages',()=>{
 assert.equal(territoryRows([{query:'carrelage Montpellier',clicks:1,impressions:2,position:3}]).find(r=>r.id==='montpellier').clicks,1);
 assert.equal(audienceRows([{page:'https://leroyfactory.fr/carrelage-architectes.html',clicks:2,impressions:3,position:4}]).find(r=>r.id==='architectes').clicks,2);
 assert.equal(audienceRows([]).every(r=>r.hasData===false),true);
});
test('CSV exports prevent formulas in text cells',()=>{assert.equal(csvCell('=HYPERLINK("bad")'),'"\'=HYPERLINK(""bad"")"');});
