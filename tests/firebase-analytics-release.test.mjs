import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,readFileSync as read,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const workflow=readFileSync(new URL('../.github/workflows/deploy-firebase-functions.yml',import.meta.url),'utf8');
const block=workflow.match(/          python - <<'PYTHON'\n([\s\S]*?)\n          PYTHON/)[1].split('\n').map(line=>line.slice(10)).join('\n');
function selected(changed,{event='push',group='affected'}={}){
  const dir=mkdtempSync(join(tmpdir(),'lrf-analytics-release-'));
  const output=join(dir,'outputs');
  try{
    const prefix=`import subprocess\nsubprocess.check_output=lambda *args,**kwargs:${JSON.stringify(changed.join('\n'))}\n`;
    const result=spawnSync('python3',['-c',prefix+block],{encoding:'utf8',env:{EVENT_NAME:event,FUNCTION_GROUP:group,GITHUB_OUTPUT:output}});
    assert.equal(result.status,0,result.stderr);
    return Object.fromEntries(read(output,'utf8').trim().split('\n').map(line=>line.split('=')));
  }finally{rmSync(dir,{recursive:true,force:true});}
}

test('analytics-only publication deploys the tracking and read endpoints',()=>{
  assert.equal(selected(['functions/randal-activity-core.cjs','functions/test/randal-activity.test.cjs','functions/lrf-analytics.js']).only,'functions:trackLrfActivity,functions:getLrfAnalytics');
  assert.equal(selected(['functions/lrf-analytics.js']).only,'functions:trackLrfActivity,functions:getLrfAnalytics');
  assert.equal(selected(['functions/lrf-analytics.js'],{event:'workflow_dispatch',group:'analytics'}).only,'functions:trackLrfActivity,functions:getLrfAnalytics');
  assert.equal(selected([],{event:'workflow_dispatch',group:'analytics'}).only,'functions:trackLrfActivity,functions:getLrfAnalytics');
});

test('existing deployment groups retain their exact targets',()=>{
  const cases=[
    [['functions/neobath-anima-access.js'],'functions:neobathAnimaApplication'],
    [['functions/plan-pose-access.js'],'functions:planPoseApplication'],
    [['functions/tariff-access.js'],'functions:getTariffPdf'],
    [['functions/configurator-projects.js'],'functions:randalProjects'],
    [['functions/configurator-purchase-prices.js'],'functions:getConfiguratorPurchasePrices'],
    [['functions/fenice-request.js'],'functions:feniceRequest'],
    [['functions/biopietra-request.js'],'functions:biopietraRequest'],
    [['functions/cerastone-request.js'],'functions:cerastoneRequest'],
    [['functions/group-mail-history.js'],'functions:sendGroupEmail,functions:scheduleGroupEmail,functions:processScheduledEmails'],
    [['functions/scripts/consolidate-group-mail-reports.cjs'],'functions:sendGroupEmail,functions:scheduleGroupEmail']
  ];
  for(const [changed,target] of cases) assert.equal(selected(changed).only,target);
  assert.equal(selected(['functions/lrf-analytics.js'],{event:'workflow_dispatch',group:'neobath-anima'}).only,'functions:neobathAnimaApplication');
});

test('mixed changes and manual affected retain the existing full fallback',()=>{
  for(const args of [[['functions/lrf-analytics.js','functions/index.js'],{}],[['functions/lrf-analytics.js'],{event:'workflow_dispatch'}]]){
    const target=selected(...args).only;
    assert.match(target,/functions:trackLrfActivity,functions:getLrfAnalytics/);
    assert.match(target,/functions:planPoseApplication/);
    assert.match(target,/functions:neobathAnimaApplication/);
  }
});
