import test from 'node:test';
import assert from 'node:assert/strict';
import {win32,posix} from 'node:path';
import {assertIsolatedOutput,allowedPublicPath} from '../scripts/build-public-site.mjs';

for(const [name,api,root] of [['Windows',win32,'E:\\workspace\\site'],['POSIX',posix,'/workspace/site']]){
  test(`${name}: the public output must remain strictly inside its source directory`,()=>{
    assert.doesNotThrow(()=>assertIsolatedOutput(root,api.join(root,'public-site'),api));
    for(const output of [root,api.dirname(root),api.join(root,'..','site-other'),api.join(root,'public-site','..','..')]){
      assert.throws(()=>assertIsolatedOutput(root,output,api),/isolated child/);
    }
    if(name==='Windows')assert.throws(()=>assertIsolatedOutput(root,'C:\\outside',api),/isolated child/);
  });
}
test('test PDFs, QA tools and private server code remain excluded from public output',()=>{
  for(const path of ['reports/pdf-visual-local/real/neobathANIMA.pdf','reports/pdf-visual-local/server.cjs','functions/pro-client-access.cjs','assets/js/lrf-plan-pose/app.mjs'])assert.equal(allowedPublicPath(path),false);
  assert.equal(allowedPublicPath('assets/js/pdf-reader-runtime.js'),true);
});
