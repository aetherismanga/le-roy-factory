import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

function sources(directory) {
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry => {
    const path=join(directory,entry.name);
    return entry.isDirectory()?sources(path):/\.(?:mjs|js)$/.test(entry.name)?[path]:[];
  });
}

// Mozilla's documented CVE-2024-4367 workaround must be applied on every
// opening, including thumbnails and PDF text extraction used for prices.
test('every public and mobile PDF opening explicitly disables evaluation', () => {
  let openings=0;
  for (const file of [...sources('assets/js'),...sources('mobile')]) {
    const source=readFileSync(file,'utf8');
    for (const match of source.matchAll(/\.getDocument\s*\(/g)) {
      openings++;
      const argument=source.slice(match.index+match[0].length);
      assert.match(argument,/^\s*\{[^}]*\bisEvalSupported\s*:\s*false\s*[,}]/,file+' must fail closed rather than use PDF.js defaults');
    }
  }
  assert.ok(openings>=20,'the scan must include catalogue, thumbnail and private readers');
});
