import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {verifyBytes} from '../scripts/fetch-photo-studio-model.mjs';

const vendor=new URL('../assets/vendor/lrf-photo-studio/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',vendor),'utf8'));
const model=manifest.refinementModel;
const prefix=`models/${model.localId}/`;
const entries=manifest.files.filter(file=>file.path.startsWith(prefix));

test('the refinement distribution has immutable model sources and complete byte totals',()=>{
  assert.equal(model.model,'Xenova/slimsam-77-uniform');
  assert.equal(model.revision,'5850ab45f587c112167512ffef949107115e26a0');
  assert.equal(model.dtype,'q8');
  assert.equal(model.license,'Apache-2.0');
  assert.equal(new Set(manifest.files.map(file=>file.path)).size,manifest.files.length);
  assert.equal(manifest.totalBytes,manifest.files.reduce((sum,file)=>sum+file.bytes,0));
  assert.equal(model.totalBytes,entries.reduce((sum,file)=>sum+file.bytes,0));
  assert.equal(entries.length,5);
  for(const file of entries){
    assert.match(file.sha256,/^[a-f0-9]{64}$/);
    assert.ok(file.bytes>0);
    assert.match(file.source,/\/(?:resolve\/)?[a-f0-9]{40}\//);
  }
  const onnx=entries.filter(file=>file.path.endsWith('.onnx'));
  assert.deepEqual(onnx.map(file=>file.path.slice(prefix.length)).sort(),[
    'onnx/prompt_encoder_mask_decoder_quantized.onnx',
    'onnx/vision_encoder_quantized.onnx',
  ]);
  assert.equal(onnx.reduce((sum,file)=>sum+file.bytes,0),13785975);
});

test('published SlimSAM config and license bytes match their verified manifest',async()=>{
  for(const file of entries.filter(file=>!file.path.endsWith('.onnx'))){
    assert.ok(verifyBytes(await readFile(new URL(file.path,vendor)),file),file.path);
  }
  const config=JSON.parse(await readFile(new URL(prefix+'config.json',vendor),'utf8'));
  const processor=JSON.parse(await readFile(new URL(prefix+'preprocessor_config.json',vendor),'utf8'));
  assert.equal(config.model_type,'sam');
  assert.equal(processor.processor_class,'SamProcessor');
  assert.equal(processor.size.longest_edge,1024);
  assert.deepEqual(processor.pad_size,{height:1024,width:1024});
});
