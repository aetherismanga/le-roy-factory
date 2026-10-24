import {test} from 'node:test';
import assert from 'node:assert/strict';
import {affectedApplications as impact} from '../scripts/release-impact.mjs';
test('only the application whose runtime/build inputs changed is selected',()=>{
  assert.deepEqual(impact(['studio-one/src/app.js']),['studio-one']);
  assert.deepEqual(impact(['randal-general/src/model.js']),['randal-general']);
  assert.deepEqual(impact(['assets/js/lrf-plan-pose/core.mjs']),['site']);
  assert.deepEqual(impact(['scripts/build-public-site.mjs']),['site']);
  assert.deepEqual(impact(['api/agent-tariffs.mjs']),['site']);
});
test('shared runtime and lockfiles select all consumers; docs and QA do not create deployments',()=>{
  const all=['site','studio-one','randal-general'];
  assert.deepEqual(impact(['shared/lrf-3d/performance.js']),all);
  assert.deepEqual(impact(['shared/lrf-3d/manufacturer-surfaces.json']),all);
  assert.deepEqual(impact(['package-lock.json']),all);
  assert.deepEqual(impact(['tests/release-impact.test.mjs','README.md','.github/workflows/suite-quality.yml','reports/test.json']),[]);
});
test('renamed/deleted inputs remain relevant and duplicate apps are consolidated',()=>{
  assert.deepEqual(impact(['randal-general/src/old.js','randal-general/src/new.js','studio-one/src/room.js']),['studio-one','randal-general']);
});
