import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
for(const [file,origin]of [['studio-one-configurateur.html','https://studio-one-beta-test-v2.vercel.app'],['randal-configurateur.html','https://randal-catalogue-general-3d.vercel.app']])test(file+': only the existing configurator frame receives sensor delegation',()=>{
 const frames=read(file).match(/<iframe\b[^>]*>/g)||[];assert.equal(frames.length,1);const frame=frames[0],allow=frame.match(/\ballow="([^"]*)"/)[1];assert(frame.includes('data-configurator-origin="'+origin+'"'));assert.deepEqual(new Set(allow.split(';').map(feature=>feature.trim())),new Set(['fullscreen','clipboard-write','accelerometer','gyroscope']));assert(!allow.includes('*'));assert(frame.includes('referrerpolicy="strict-origin-when-cross-origin"'));
});
test('nested private frames retain their fixed targets and sandbox with only the two motion features added',()=>{
 const source=read('studio-one/src/portal/randal-portal.js');assert(source.includes("frame.setAttribute('allow','fullscreen; accelerometer; gyroscope')"));assert(source.includes("frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-downloads allow-modals')"));assert(source.includes('frame.src=randalPortalFrameURL(variant,lang)'));
 for(const name of ['studio-one/vercel.json','randal-general/vercel.json']){const headers=JSON.parse(read(name)).headers||[];assert(!headers.some(rule=>rule.headers.some(header=>header.key.toLowerCase()==='permissions-policy'&&/(?:accelerometer|gyroscope)=\(\)/.test(header.value))));}
});
