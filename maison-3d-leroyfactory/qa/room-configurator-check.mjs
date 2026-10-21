import fs from 'node:fs';
import assert from 'node:assert/strict';
// Check the distributable human, not a placeholder or a network-service dependency.
const file=fs.readFileSync('assets/avatar/resident-v1.glb');assert.equal(file.readUInt32LE(0),0x46546c67);
const doc=JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString());
assert.equal(doc.skins[0].joints.length,80);assert.equal(doc.meshes[0].weights.length,4);assert.ok(doc.meshes[0].extras.targetNames.some(n=>n.includes('EyeBlinkLeft')));assert.ok(doc.meshes[0].extras.targetNames.some(n=>n.includes('MouthSmileRight')));
assert.deepEqual(doc.materials.map(m=>m.name).sort(),['m002_body','m002_head','m002_opacity']);assert.ok(!doc.images?.length);assert.ok(file.length<3000000);
for(const name of ['body_color','body_normal','head_color','head_normal','opacity_color'])assert.ok(fs.statSync('assets/avatar/m002_'+name+'.webp').size>100000);
assert.match(fs.readFileSync('assets/avatar/LICENSE.txt','utf8'),/Copyright \(c\) 2020 Microsoft/);
console.log(JSON.stringify({result:'PASS',riggedHuman:true,joints:80,expressions:4,localTextures:5,license:'MIT',glbBytes:file.length}));
