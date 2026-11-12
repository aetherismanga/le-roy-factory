import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {allowedPublicPath} from '../../scripts/build-public-site.mjs';
const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n');

test('public entry contains only the construction screen, with an accessible GIF and reduced-motion still',()=>{
  const html=read('lrf-plan-pose.html');
  assert.match(html,/En cours de construction/);assert.match(html,/aux petits oignons/);assert.match(html,/carreleur\.gif/);assert.match(html,/prefers-reduced-motion/);assert.doesNotMatch(html,/id="board"|id="project-file"|src="assets\/js\/lrf-plan-pose\/app\.mjs/);
});
test('static publications omit executable entry and private template',()=>{
  assert.equal(allowedPublicPath('assets/js/lrf-plan-pose/app.mjs'),false);assert.equal(allowedPublicPath('functions/plan-pose/application.html'),false);assert.equal(allowedPublicPath('functions/plan-pose/generated-app.mjs'),false);assert.equal(allowedPublicPath('assets/js/plan-pose-access.mjs'),true);
  assert.match(read('_config.yml'),/\n  - assets\/js\/lrf-plan-pose\/app\.mjs\n/);assert.match(read('sw.js'),/url.pathname==='\/assets\/js\/lrf-plan-pose\/app.mjs'/);
});
test('server authorization uses Firebase verification with revocation, and editor remains intact',()=>{
  assert.match(read('functions/plan-pose-access.js'),/getAgent: getAgentFromRequest/);assert.match(read('functions/auth.js'),/verifyIdToken\(match\[1\], true\)/);
  assert.match(read('functions/plan-pose/application.html'),/id="board"/);assert.match(read('functions/plan-pose/application.html'),/id="project-file"/);
  const returnPattern=read('agent.html').match(/const safeReturn = (\/[^\n]+\/[a-z]*)\.test\(returnTo\)/);
  assert(returnPattern,'Agent return destinations use an explicit allowlist');
  const allowed=runInNewContext(returnPattern[1]);
  for(const target of ['analyse-clients-lrf.html','lrf-plan-pose.html','lrf-plan-pose.html?project=local'])assert(allowed.test(target));
  for(const target of ['https://external.invalid/lrf-plan-pose.html','//external.invalid/','javascript:alert(1)','../lrf-plan-pose.html'])assert.equal(allowed.test(target),false);
});
