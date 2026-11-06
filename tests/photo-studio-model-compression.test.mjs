import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compressModel,protobufFields,SOURCE_SHA256} from '../scripts/compress-photo-studio-model.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function varint(value){const out=[];while(value>=128){out.push(value%128|128);value=Math.floor(value/128);}return Buffer.from([...out,value]);}
const field=(number,value,wire=2)=>Buffer.concat([varint(number*8+wire),...(wire===2?[varint(value.length)]:[]),value]);
const str=(number,value)=>field(number,Buffer.from(value));
const int=(number,value)=>field(number,varint(value),0);
function floats(values){const bytes=Buffer.alloc(values.length*4);values.forEach((v,i)=>bytes.writeFloatLE(v,i*4));return bytes;}
function weight(name,dims,values){return Buffer.concat([...dims.map(v=>int(1,v)),int(2,1),str(8,name),field(9,floats(values))]);}
function fixture({rawOverride}={}){
 const conv=weight('conv',[2,1,1,3],[.1,.2,-.3,1,0,-1]);
 const matrix=weight('matrix',[2,2],[1,100,2,50]);
 const gemm=weight('gemm',[2,2],[1,2,100,50]);
 const node=(op,name,attributes=[])=>field(1,Buffer.concat([str(1,'image'),str(1,name),str(2,name+'_output'),str(3,name+'_node'),str(4,op),...attributes]));
 const unknown=field(100,Buffer.from('unrelated ONNX extension'));
 const attr=field(5,Buffer.concat([str(1,'transB'),int(3,1),int(20,2)]));
 const graph=Buffer.concat([node('Conv','conv'),node('MatMul','matrix'),node('Gemm','gemm',[attr]),str(2,'fixture'),field(5,rawOverride||conv),field(5,matrix),field(5,gemm),unknown]);
 return Buffer.concat([int(1,7),str(2,'upstream'),str(3,'original'),field(7,graph),field(8,int(2,12)),field(99,Buffer.from('model-extension'))]);
}
function transform(source){return compressModel(source,{expectedSourceSha256:sha(source)});}
const decodeInt=field=>{let result=0,m=1;for(const byte of field.value){result+=(byte&127)*m;m*=128;}return result;};
function tensors(model){
 const graph=protobufFields(model).find(f=>f.number===7).value;
 return new Map(protobufFields(graph).filter(f=>f.number===5).map(f=>{const v=protobufFields(f.value);return [v.find(f=>f.number===8).value.toString(),{dims:v.filter(f=>f.number===1).map(decodeInt),type:decodeInt(v.find(f=>f.number===2)),raw:v.find(f=>f.number===9).value}];}));
}

test('compression preserves unrelated model/graph bytes and every original inference node',()=>{
 const source=fixture(),{bytes,report}=transform(source),before=protobufFields(source),after=protobufFields(bytes);
 assert.equal(report.initializerCount,3);
 assert.equal(report.sourceSha256,sha(source));assert.equal(report.sha256,sha(bytes));
 assert.deepEqual(after.find(f=>f.number===99).raw,before.find(f=>f.number===99).raw);
 const oldGraph=protobufFields(before.find(f=>f.number===7).value),newGraph=protobufFields(after.find(f=>f.number===7).value);
 assert.deepEqual(newGraph.find(f=>f.number===100).raw,oldGraph.find(f=>f.number===100).raw);
 const originalNodes=oldGraph.filter(f=>f.number===1),newNodes=newGraph.filter(f=>f.number===1);
 assert.equal(newNodes.length,originalNodes.length+6);
 assert.deepEqual(newNodes.slice(-originalNodes.length).map(f=>f.raw),originalNodes.map(f=>f.raw));
 const ops=newNodes.map(f=>protobufFields(f.value).find(v=>v.number===4).value.toString());
 assert.deepEqual(ops,['DequantizeLinear','Mul','DequantizeLinear','Mul','DequantizeLinear','Mul','Conv','MatMul','Gemm']);
});

test('Conv, MatMul and transposed Gemm retain the correct independent output-channel scales',()=>{
 const {bytes,report}=transform(fixture()),all=tensors(bytes);
 for(const [name,expectedAxis,scaleDims,original]of [
  ['conv',0,[2,1,1,1],[.1,.2,-.3,1,0,-1]],
  ['matrix',1,[1,2],[1,100,2,50]],
  ['gemm',0,[2,1],[1,2,100,50]],
 ]){
  const detail=report.weights.find(w=>w.name===name);assert.equal(detail.axis,expectedAxis);
  const quantized=all.get(name+'__lrf_weight_q8'),scale=all.get(name+'__lrf_weight_q8_scale');
  assert.equal(quantized.type,3);assert.deepEqual(scale.dims,scaleDims);
  const stride=detail.shape.slice(expectedAxis+1).reduce((a,b)=>a*b,1);
  for(let i=0;i<original.length;i++){
   const channel=Math.floor(i/stride)%detail.shape[expectedAxis],s=scale.raw.readFloatLE(channel*4);
   const restored=quantized.raw.readInt8(i)*s;
   assert.ok(Math.abs(restored-Math.fround(original[i]))<=s/2+1e-6,`${name}[${i}]`);
  }
 }
});

test('same pinned input transforms deterministically and output cannot be accidentally compressed twice',()=>{
 const source=fixture(),a=transform(source),b=transform(source);
 assert.deepEqual(a.bytes,b.bytes);assert.deepEqual(a.report,b.report);
 assert.throws(()=>compressModel(source),/source model hash/);
 assert.throws(()=>compressModel(a.bytes,{expectedSourceSha256:sha(source)}),/source model hash/);
 assert.match(SOURCE_SHA256,/^[a-f0-9]{64}$/);
});

test('corrupt protobuf and invalid float tensors fail before emitting an output',()=>{
 for(const malformed of [Buffer.from([0]),Buffer.from([10,8,1]),Buffer.from([8,128]),Buffer.from([15])])assert.throws(()=>protobufFields(malformed));
 const invalid=Buffer.concat([int(1,2),int(1,1),int(1,1),int(1,3),int(2,1),str(8,'conv'),field(9,Buffer.alloc(1))]);
 assert.throws(()=>transform(fixture({rawOverride:invalid})),/Invalid float32 ONNX weight data/);
 const nonfinite=Buffer.concat([int(1,2),int(1,1),int(1,1),int(1,3),int(2,1),str(8,'conv'),field(9,floats([NaN,1,2,3,4,5]))]);
 assert.throws(()=>transform(fixture({rawOverride:nonfinite})),/Non-finite/);
});
