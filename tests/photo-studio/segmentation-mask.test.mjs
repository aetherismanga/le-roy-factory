import test from 'node:test';
import assert from 'node:assert/strict';
import { conservativeFloorMask, largestComponent, selectComponents, FLOOR_POSTPROCESS } from '../../assets/js/lrf-photo-studio/segmentation-mask.mjs';

const logit = p => Math.log(p / (1 - p));
function tensorFixture(probabilities, { width, height, floorClass = 1 } = {}) {
  const logits = new Float32Array(probabilities.length * 4).fill(-6);
  probabilities.forEach((_, i) => { logits[i * 4 + (i === 0 ? floorClass : 0)] = 6; });
  return {
    logits: { data: logits, dims: [1, probabilities.length, 4] },
    masks: { data: Float32Array.from(probabilities.flatMap(values => values.map(logit))), dims: [1, probabilities.length, height, width] },
    width, height, floorIds: [1],
  };
}

test('floor competition excludes furniture and low-probability extrapolation; components never bridge gaps', () => {
  const floor = [...Array(6).fill(.01), ...Array(12).fill(.8)];
  const furniture = Array(18).fill(.001); furniture[8] = furniture[14] = .99;
  const result = conservativeFloorMask(tensorFixture([floor, furniture], { width: 6, height: 3 }));
  assert.deepEqual([...result.mask], [0, 0, 0, 0, 0, 0, 255, 255, 0, 255, 255, 255, 255, 255, 0, 255, 255, 255]);
  assert.equal(result.postprocess.candidatePixels, 10);
  assert.equal(result.postprocess.keptPixels, 10);
  assert.equal(result.postprocess.componentCount, 2);
  assert.equal(result.postprocess.discardedPixels, 0);
  assert.equal(result.postprocess.keptComponentCount, 2);
  assert.equal(result.coverage, 10 / 18);
  assert.ok(result.confidence > .99);
  assert.equal(result.postprocess.pixelProbabilityThreshold, .5);
});

test('a low floor-pixel probability is rejected even without a competing object query',()=>{
  const probabilities=Array(12).fill(.9);
  probabilities[5]=.1;
  const result=conservativeFloorMask(tensorFixture([probabilities],{width:4,height:3}));
  assert.equal(result.mask[5],0);
  assert.equal(result.mask[4],255);
  assert.equal(result.mask[6],255);
  assert.equal(result.postprocess.candidatePixels,11);
  assert.equal(result.coverage,11/12);
});

test('no floor label, rejected confidence and no-object results stay empty', () => {
  const input = tensorFixture([Array(6).fill(.9)], { width: 3, height: 2, floorClass: 0 });
  assert.equal(conservativeFloorMask(input).coverage, 0);
  input.logits.data.fill(0);
  assert.equal(conservativeFloorMask(input).coverage, 0);
  input.logits.data[3] = 20;
  assert.equal(conservativeFloorMask(input).coverage, 0);
});

test('mask resizing preserves pixel alignment and dimensions without a guessed floor polygon', () => {
  const input = tensorFixture([[.01, .99]], { width: 2, height: 1 });
  input.width = 4;
  const result = conservativeFloorMask(input);
  // Pixel-centred interpolation yields .01, .255, .745, .99. The low-probability
  // boundary pixel must remain outside the floor under the conservative .5 gate.
  assert.deepEqual([...result.mask], [0, 0, 255, 255]);
  assert.equal(result.width, 4);
  assert.equal(result.height, 1);
});

test('largest components use four-neighbor adjacency and stable ties', () => {
  const input = Uint8ClampedArray.from([255, 0, 0, 255]);
  const result = largestComponent(input, 2, 2);
  assert.deepEqual([...result.mask], [255, 0, 0, 0]);
  assert.equal(result.componentCount, 2);
  assert.deepEqual([...input], [255, 0, 0, 255]);
});

test('significant components keep floor islands around furniture and discard small detached noise', () => {
  const input = Uint8ClampedArray.from([255, 255, 0, 255, 0, 0, 0, 0, 255, 255, 255, 0]);
  const result = selectComponents(input, 4, 3, { minimumPixels: 2 });
  assert.deepEqual([...result.mask], [255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0]);
  assert.equal(result.pixels, 5);
  assert.equal(result.componentCount, 3);
  assert.equal(result.keptComponentCount, 2);
});

test('a tiny isolated floor prediction leaves an empty mask for guided manual tracing', () => {
  const probabilities = Array(400).fill(.001);
  probabilities[250] = .9;
  const result = conservativeFloorMask(tensorFixture([probabilities], { width: 20, height: 20 }));
  assert.equal(result.coverage, 0);
  assert.equal(result.confidence, 0);
  assert.equal(result.mask.some(Boolean), false);
  assert.equal(result.postprocess.candidatePixels, 1);
  assert.equal(result.postprocess.keptPixels, 0);
});

test('high-confidence rug masks override overlapping floor; low-confidence rugs do not erase floor', () => {
  function rugFixture(confidence) {
    const classes = 202, logits = new Float32Array(2 * classes).fill(-20);
    logits[118] = 20;
    logits[classes + 200] = Math.log(confidence / (1 - confidence));
    logits[classes + 201] = 0;
    const input = tensorFixture([Array(6).fill(.95), [.01, .9, .01, .01, .9, .01]], { width: 3, height: 2 });
    input.logits = { data: logits, dims: [1, 2, classes] };
    input.floorIds = [118, 190];
    return input;
  }
  const protectedResult = conservativeFloorMask(rugFixture(.9));
  assert.deepEqual([...protectedResult.mask], [255, 0, 255, 255, 0, 255]);
  assert.equal(protectedResult.postprocess.protectedRugPixels, 2);
  assert.equal(protectedResult.postprocess.keptComponentCount, 2);
  const uncertain = conservativeFloorMask(rugFixture(.7));
  assert.deepEqual([...uncertain.mask], Array(6).fill(255));
  assert.equal(uncertain.postprocess.protectedRugPixels, 0);
});

test('corrupt model outputs reject before processing and thresholds are immutable', () => {
  assert.throws(() => conservativeFloorMask({}), /Invalid DETR/);
  const input = tensorFixture([[.9]], { width: 1, height: 1 });
  input.masks.dims[1] = 2;
  assert.throws(() => conservativeFloorMask(input), /Invalid DETR/);
  assert.equal(Object.isFrozen(FLOOR_POSTPROCESS), true);
});

function objectFixture(objects,{width=40,height=40,floorY=20}={}){
  const classes=202,pixels=width*height,queries=objects.length+1;
  const logits=new Float32Array(queries*classes).fill(-20);
  logits[190]=20;
  const probabilities=[Array.from({length:pixels},(_,i)=>Math.floor(i/width)>=floorY ? .8 : .001)];
  for(let n=0;n<objects.length;n++){
    const {label,probability,confidence=.99}=objects[n],offset=(n+1)*classes;
    logits[offset+label]=logit(confidence);logits[offset+classes-1]=0;
    probabilities.push(Array.from({length:pixels},(_,i)=>probability(i%width,Math.floor(i/width))));
  }
  return {width,height,logits:{data:logits,dims:[1,queries,classes]},masks:{data:Float32Array.from(probabilities.flatMap(p=>p.map(logit))),dims:[1,queries,height,width]}};
}

test('object prompts use a true confident interior pixel even for a concave chair mask',()=>{
  const inside=(x,y)=>x>=6&&x<28&&y>=5&&y<30&&(x<12||y<11||y>=24);
  const input=objectFixture([{label:62,probability:(x,y)=>inside(x,y) ? .95 : .001}]);
  const originalLogits=new Float32Array(input.logits.data),originalMasks=new Float32Array(input.masks.data);
  const result=conservativeFloorMask(input);
  assert.equal(result.protectedObjects.length,1);
  const object=result.protectedObjects[0],[x,y]=object.point;
  assert.equal(object.label,62);
  assert.ok(object.score>.6);
  assert.deepEqual(object.bounds,{minX:6,minY:5,maxX:27,maxY:29});
  assert.equal(inside((object.bounds.minX+object.bounds.maxX)/2,(object.bounds.minY+object.bounds.maxY)/2),false,'the bbox centre is outside this chair');
  assert.equal(inside(x,y),true);
  let area=0,sumX=0,sumY=0;
  for(let py=0;py<input.height;py++)for(let px=0;px<input.width;px++)if(inside(px,py)){area++;sumX+=px;sumY+=py;}
  assert.equal(object.area,area);
  const cx=sumX/area,cy=sumY/area,actualDistance=(x-cx)**2+(y-cy)**2;
  for(let py=0;py<input.height;py++)for(let px=0;px<input.width;px++)if(inside(px,py)){
    assert.ok(actualDistance<=(px-cx)**2+(py-cy)**2+1e-10);
  }
  assert.deepEqual(Object.keys(object).sort(),['area','bounds','label','point','score']);
  assert.deepEqual(input.logits.data,originalLogits);
  assert.deepEqual(input.masks.data,originalMasks);
});

test('tiny, high, uncertain and unrelated objects do not produce floor-protection prompts',()=>{
  const rectangle=(x0,y0,x1,y1,p=.95)=>(x,y)=>x>=x0&&x<x1&&y>=y0&&y<y1 ? p : .001;
  const input=objectFixture([
    {label:62,probability:rectangle(4,25,5,26)}, // Too small.
    {label:63,probability:rectangle(8,2,22,9)}, // Entirely above the floor.
    {label:64,confidence:.59,probability:rectangle(24,18,32,32)},
    {label:65,probability:rectangle(7,21,15,32,.7)}, // No p>.8 interior point.
    {label:85,probability:rectangle(26,22,36,35)}, // Clock, not a floor object.
  ]);
  assert.deepEqual(conservativeFloorMask(input).protectedObjects,[]);
  const noFloor=objectFixture([{label:62,probability:rectangle(8,10,25,30)}],{floorY:40});
  assert.deepEqual(conservativeFloorMask(noFloor).protectedObjects,[]);
});

test('an object point must use the confident core rather than its uncertain centre',()=>{
  const probability=(x,y)=>{
    if((x===12&&y===12)||(x===27&&y===27))return .95;
    return x>=10&&x<30&&y>=10&&y<30 ? .7 : .001;
  };
  const result=conservativeFloorMask(objectFixture([{label:63,probability}]));
  assert.equal(result.protectedObjects.length,1);
  const [x,y]=result.protectedObjects[0].point;
  assert.ok(probability(x,y)>.8);
  assert.equal(probability(20,20),.7);
});

test('only the eight largest eligible object prompts are retained as compact metadata',()=>{
  const objects=Array.from({length:10},(_,n)=>({label:62,probability:(x,y)=>x>=n*7+2&&x<n*7+5&&y>=35&&y<40+n ? .95 : .001}));
  const result=conservativeFloorMask(objectFixture(objects,{width:80,height:80,floorY:30}));
  assert.equal(result.protectedObjects.length,8);
  assert.deepEqual(result.protectedObjects.map(object=>object.area),[42,39,36,33,30,27,24,21]);
  assert.ok(JSON.stringify(result.protectedObjects).length<2500);
  assert.ok(result.protectedObjects.every(object=>object.point.every(Number.isInteger)));
});

test('COCO furniture-stuff IDs protect kitchen cabinets, counters, shelves and merged tables',()=>{
  for(const label of [107,156,188,189]){
    const result=conservativeFloorMask(objectFixture([{label,probability:(x,y)=>x>=10&&x<25&&y>=10&&y<30 ? .95 : .001}]));
    assert.equal(result.protectedObjects.length,1);
    assert.equal(result.protectedObjects[0].label,label);
  }
});
