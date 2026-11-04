import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, readFileSync as read, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const workflow=readFileSync(new URL('../.github/workflows/deploy-firebase-functions.yml',import.meta.url),'utf8');
const block=workflow.split("          python - <<'PYTHON'\n")[1].split('          PYTHON')[0].split('\n').map(line=>line.slice(10)).join('\n');
const previous="prefix\nexports.sendGroupEmail = onRequest(oldSend);\nexports.scheduleGroupEmail = onRequest(existingSchedule);\nworker unchanged";
function targets({changed=['functions/index.js'],current=previous.replace('oldSend','newSend'),group='affected',event='push'}={}) {
  const directory=mkdtempSync(join(tmpdir(),'crm-release-test-')),output=join(directory,'output');
  const mock=`import subprocess, os, json\nscenario=json.loads(os.environ['SCENARIO'])\ndef mocked(command, **kwargs):\n    if command[1]=='diff': return '\\n'.join(scenario['changed'])\n    if command[2]=='HEAD^:functions/index.js': return scenario['previous']\n    if command[2]=='HEAD:functions/index.js': return scenario['current']\n    raise AssertionError(command)\nsubprocess.check_output=mocked\n`;
  try {
    execFileSync('python3',['-c',mock+'\n'+block],{env:{...process.env,SCENARIO:JSON.stringify({changed,current,previous}),EVENT_NAME:event,FUNCTION_GROUP:group,GITHUB_OUTPUT:output}});
    return Object.fromEntries(read(output,'utf8').trim().split('\n').map(line=>line.split('=')));
  }finally{rmSync(directory,{recursive:true,force:true});}
}

test('a send-only source change deploys only sendGroupEmail, without mail data jobs',()=>{
  const result=targets({changed:['functions/index.js','functions/scripts/verify-group-mail-deployment.cjs']});
  assert.equal(result.only,'functions:sendGroupEmail');assert.equal(result.group_mail_backfill,'false');assert.equal(result.group_mail_consolidation,'false');
});

test('a scheduler change in index.js cannot be mistaken for a send-only source change',()=>{
  const result=targets({current:previous.replace('existingSchedule','changedSchedule')});
  assert.equal(result.only,'functions:sendGroupEmail,functions:scheduleGroupEmail,functions:processScheduledEmails');
});

test('manual send-only dispatch never selects a scheduler, backfill or consolidation',()=>{
  const result=targets({group:'send-only',event:'workflow_dispatch',changed:['functions/unrelated.js']});
  assert.equal(result.only,'functions:sendGroupEmail');assert.equal(result.group_mail_backfill,'false');assert.equal(result.group_mail_consolidation,'false');
});

test('analytics dispatch preserves its existing target and mail verifier uses the deployment scope',()=>{
  assert.equal(targets({group:'analytics',event:'workflow_dispatch'}).only,'functions:getLrfAnalytics');
  assert.match(workflow,/MAIL_VERIFY_FUNCTIONS:.*only == 'functions:sendGroupEmail'.*'sendGroupEmail'/);
  const verifier=readFileSync(new URL('../functions/scripts/verify-group-mail-deployment.cjs',import.meta.url),'utf8');
  assert.match(verifier,/process\.env\.MAIL_VERIFY_FUNCTIONS/);assert.match(verifier,/names\.some\(name=>!allowed\.includes\(name\)\)/);
});
