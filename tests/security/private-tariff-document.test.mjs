import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

test('public RANDAL tariff description exposes neither the private PDF nor its purchase conversion rule',()=>{
 const source=readFileSync(new URL('../../tarifs-pro.html',import.meta.url),'utf8');
 const entry=source.split('},{').find(s=>s.includes('RANDAL-STUDIO-ONE-VASQUES-TARIF-PRO-HT.pdf'));
 assert(entry,'The verified agent document link remains available');
 assert.doesNotMatch(entry,/remise\s+de\s+50\s*%|prix\s+publics\s+HT\s*\(prix\s+TTC/i);
 assert.match(entry,/réservé aux agents/);
 assert.equal(existsSync(new URL('../../assets/pdf/RANDAL-STUDIO-ONE-VASQUES-TARIF-PRO-HT.pdf',import.meta.url)),false);
});
