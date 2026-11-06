/** Build-time weight compression for the pinned Apache-2.0 DETR model.
 * Activations and original inference operators remain float32. The small
 * lossless protobuf reader preserves every unrelated field, including unknowns.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const SOURCE_SHA256='f41a80cd659d1ae2e4981f2423955d983d28657d747e965ddc980b7768042de1';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

function varint(value){
  if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid protobuf integer.');
  const bytes=[];while(value>=128){bytes.push(value%128|128);value=Math.floor(value/128);}bytes.push(value);return Buffer.from(bytes);
}
function readInteger(bytes,start=0,end=bytes.length){
  let value=0,multiple=1,index=start;
  for(let count=0;count<10&&index<end;count++){
    const byte=bytes[index++];value+=(byte&127)*multiple;
    if(!(byte&128)){if(!Number.isSafeInteger(value))throw Error('Oversized protobuf integer.');return {value,index};}multiple*=128;
  }
  throw Error('Invalid protobuf integer.');
}
/** Return original wire slices; length-delimited values are views, not copies. */
export function protobufFields(input){
  const bytes=Buffer.isBuffer(input)?input:Buffer.from(input),result=[];
  let index=0;
  while(index<bytes.length){
    const start=index,key=readInteger(bytes,index);index=key.index;
    const number=Math.floor(key.value/8),wire=key.value%8;
    if(!number)throw Error('Invalid protobuf field.');
    let valueStart=index,valueEnd;
    if(wire===0){let count=0;while(index<bytes.length&&(bytes[index++]&128)){if(++count>=10)throw Error('Invalid protobuf varint.');}if(index>bytes.length||bytes[index-1]&128)throw Error('Truncated protobuf varint.');valueEnd=index;}
    else if(wire===1){index+=8;valueEnd=index;}
    else if(wire===2){const size=readInteger(bytes,index);valueStart=size.index;index=size.index+size.value;valueEnd=index;}
    else if(wire===5){index+=4;valueEnd=index;}
    else throw Error('Unsupported protobuf wire type.');
    if(index>bytes.length)throw Error('Truncated protobuf field.');
    result.push({number,wire,raw:bytes.subarray(start,index),value:bytes.subarray(valueStart,valueEnd)});
  }
  return result;
}
const encoded=(number,value,wire=2)=>Buffer.concat([varint(number*8+wire),...(wire===2?[varint(value.length)]:[]),value]);
const text=(number,value)=>encoded(number,Buffer.from(value));
const integer=(number,value)=>encoded(number,varint(value),0);
const strings=(fields,number)=>fields.filter(f=>f.number===number&&f.wire===2).map(f=>f.value.toString());
function integerValue(field){if(!field||field.wire!==0)throw Error('Invalid ONNX integer field.');return readInteger(field.value).value;}
function tensorInfo(bytes){
  const fields=protobufFields(bytes),name=strings(fields,8)[0];
  const dims=[];
  for(const field of fields.filter(f=>f.number===1)){
    if(field.wire===0)dims.push(integerValue(field));
    else if(field.wire===2){let index=0;while(index<field.value.length){const value=readInteger(field.value,index);dims.push(value.value);index=value.index;}}
    else throw Error('Invalid ONNX dimensions.');
  }
  const dataType=integerValue(fields.find(f=>f.number===2));
  const raw=fields.find(f=>f.number===9&&f.wire===2)?.value;
  return {fields,name,dims,dataType,raw};
}
function tensor(name,dims,dataType,raw){return Buffer.concat([...dims.map(d=>integer(1,d)),integer(2,dataType),text(8,name),encoded(9,raw)]);}
function node(op,inputs,outputs,name){return Buffer.concat([...inputs.map(v=>text(1,v)),...outputs.map(v=>text(2,v)),text(3,name),text(4,op)]);}
function floatBytes(values){const bytes=Buffer.allocUnsafe(values.length*4);for(let i=0;i<values.length;i++)bytes.writeFloatLE(values[i],i*4);return bytes;}
function roundEven(value){const floor=Math.floor(value),fraction=value-floor;return fraction<.5?floor:fraction>.5?floor+1:floor%2===0?floor:floor+1;}

/** The optional digest is for in-memory unit fixtures; CLI always pins upstream. */
export function compressModel(input,{expectedSourceSha256=SOURCE_SHA256}={}){
  const source=Buffer.isBuffer(input)?input:Buffer.from(input),sourceSha256=hash(source);
  if(sourceSha256!==expectedSourceSha256)throw Error('Unexpected Photo Studio source model hash.');
  const modelFields=protobufFields(source),graphField=modelFields.find(f=>f.number===7&&f.wire===2);
  if(!graphField)throw Error('ONNX graph missing.');
  const graphFields=protobufFields(graphField.value),initializers=new Map(),axes=new Map();
  for(const field of graphFields.filter(f=>f.number===5&&f.wire===2)){
    const info=tensorInfo(field.value);if(!info.name||initializers.has(info.name))throw Error('Invalid or duplicate ONNX initializer.');initializers.set(info.name,info);
  }
  for(const field of graphFields.filter(f=>f.number===1&&f.wire===2)){
    const fields=protobufFields(field.value),op=strings(fields,4)[0],inputs=strings(fields,1),weight=initializers.get(inputs[1]);
    if(!['Conv','MatMul','Gemm'].includes(op)||!weight||weight.dataType!==1||weight.dims.length<2)continue;
    let axis=op==='Conv'?0:weight.dims.length-1;
    if(op==='Gemm'){
      let transpose=0;
      for(const attribute of fields.filter(f=>f.number===5&&f.wire===2)){
        const attr=protobufFields(attribute.value);if(strings(attr,1)[0]==='transB')transpose=integerValue(attr.find(f=>f.number===3));
      }
      axis=transpose?0:1;
    }
    if(!axes.has(weight.name))axes.set(weight.name,new Set());axes.get(weight.name).add(axis);
  }
  const generatedNodes=[],replacements=new Map(),details=[];
  for(const [name,info]of initializers){
    if(!axes.has(name))continue;
    const {dims,raw}=info,length=dims.reduce((a,b)=>a*b,1);
    if(!Number.isSafeInteger(length)||length<1||!raw||raw.length!==length*4)throw Error('Invalid float32 ONNX weight data.');
    const axis=axes.get(name).size===1?[...axes.get(name)][0]:null,channels=axis===null?1:dims[axis],stride=axis===null?length:dims.slice(axis+1).reduce((a,b)=>a*b,1);
    const maxima=new Float32Array(channels),scales=new Float32Array(channels);
    for(let i=0;i<length;i++){
      const value=raw.readFloatLE(i*4);if(!Number.isFinite(value))throw Error('Non-finite ONNX weight.');
      const channel=axis===null?0:Math.floor(i/stride)%channels;maxima[channel]=Math.max(maxima[channel],Math.abs(value));
    }
    for(let c=0;c<channels;c++)scales[c]=maxima[c]>0?Math.fround(maxima[c]/127):1;
    const quantized=Buffer.allocUnsafe(length);let maxAbsoluteError=0;
    for(let i=0;i<length;i++){
      const value=raw.readFloatLE(i*4),channel=axis===null?0:Math.floor(i/stride)%channels;
      const q=Math.max(-127,Math.min(127,roundEven(Math.fround(value/scales[channel]))));
      quantized.writeInt8(q,i);maxAbsoluteError=Math.max(maxAbsoluteError,Math.abs(Math.fround(q*scales[channel])-value));
    }
    const qName=name+'__lrf_weight_q8',unit=qName+'_unit',zero=qName+'_zero',float=qName+'_float',scale=qName+'_scale';
    for(const generated of [qName,unit,zero,float,scale])if(initializers.has(generated))throw Error('Generated ONNX name collision.');
    const scaleDims=axis===null?[]:dims.map((d,i)=>i===axis?d:1);
    replacements.set(name,[tensor(qName,dims,3,quantized),tensor(unit,[],1,floatBytes([1])),tensor(zero,[],3,Buffer.from([0])),tensor(scale,scaleDims,1,floatBytes(scales))].map(value=>encoded(5,value)));
    generatedNodes.push(encoded(1,node('DequantizeLinear',[qName,unit,zero],[float],qName+'_dequantize')),encoded(1,node('Mul',[float,scale],[name],qName+'_rescale')));
    details.push({name,axis,shape:dims,maxAbsoluteError});
  }
  if(!details.length)throw Error('No compressible float32 ONNX weights.');
  const newGraph=[];let nodesInserted=false;
  for(const field of graphFields){
    if(field.number===1&&!nodesInserted){newGraph.push(...generatedNodes);nodesInserted=true;}
    if(field.number===5&&field.wire===2){const name=tensorInfo(field.value).name;newGraph.push(...(replacements.get(name)||[field.raw]));}
    else newGraph.push(field.raw);
  }
  if(!nodesInserted)throw Error('ONNX inference graph missing.');
  const graph=Buffer.concat(newGraph),output=[];
  for(const field of modelFields){
    if(field===graphField)output.push(encoded(7,graph));
    else if(field.number===2)output.push(text(2,'LRF weight-only int8 download compression'));
    else if(field.number===3)output.push(text(3,'1'));
    else output.push(field.raw);
  }
  const bytes=Buffer.concat(output);
  return {bytes,report:{sourceSha256,method:'symmetric-per-output-channel-int8-weights-constant-DQ-Mul-float32-activations',opset:12,initializerCount:details.length,bytes:bytes.length,sha256:hash(bytes),weights:details}};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [sourcePath,targetPath]=process.argv.slice(2);if(!sourcePath||!targetPath)throw Error('Usage: node scripts/compress-photo-studio-model.mjs SOURCE.onnx TARGET.onnx');
  if(resolve(sourcePath)===resolve(targetPath))throw Error('Source and target must differ.');
  const result=compressModel(await readFile(sourcePath));await writeFile(targetPath,result.bytes);await writeFile(targetPath+'.json',JSON.stringify(result.report,null,2)+'\n');
  const {weights,...summary}=result.report;console.log(JSON.stringify(summary));
}
