import assert from 'node:assert/strict';
import {createHDCapture,captureSize} from '../src/hd-capture.js';
for(const failure of [null,'download','render']){
 const calls=[],state={profile:'fluid',mode:'auto',project:{width:80,finish:'ALBA'}},original=JSON.stringify(state);
 const capture=createHDCapture({snapshot(){calls.push('snapshot');return {...state};},async prepare(){calls.push('prepare');state.profile='max';await Promise.resolve();if(failure==='download')throw Error('download');},render(){calls.push('render');assert.equal(state.profile,'max');if(failure==='render')throw Error('render');return 'data:image/png;base64,hd';},restore(before){calls.push('restore');Object.assign(state,before);}});
 const one=capture(),two=capture();assert.equal(one,two,'double clicks share the same capture transaction');
 if(failure)await assert.rejects(one,new RegExp(failure));else assert.equal(await one,'data:image/png;base64,hd');
 assert.equal(JSON.stringify(state),original,'profile, automatic choice and project survive successful/failed captures');assert.equal(calls.at(-1),'restore');assert.equal(calls.filter(v=>v==='snapshot').length,1);
 if(failure===null)assert.equal(await capture(),'data:image/png;base64,hd','next capture can run after completion');
}
assert.deepEqual(captureSize(1920,16/9),{width:1920,height:1080});
assert.equal(captureSize(1920,390/700).width,1920,'portrait phone exports retain HD horizontal resolution');
const large=captureSize(20000,.25,4096);assert(large.width<=4096&&large.height<=4096&&large.width*large.height<=16777216,'GPU texture and pixel memory budgets apply');
console.log('HD capture: success, failed download, failed encoder, duplicate clicks, project preservation and output budgets passed.');
