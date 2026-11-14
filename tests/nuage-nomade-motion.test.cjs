const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const game=path.join(__dirname,'../nuage-nomade');

function fixture(level=8){
  const blits=[];
  const gradient={addColorStop(){}};
  function context(record=false){return new Proxy({drawImage(...args){if(record)blits.push(args);},createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(object,key)=>key in object?object[key]:()=>{}});}
  const ctx=context(true),state={levelIndex:level-1,progress:0,time:0,mode:'adventure',screen:'map',particles:[],sparks:[],flash:0};
  class Image {constructor(){this.complete=true;this.naturalWidth=941;this.naturalHeight=1672;}decode(){return Promise.resolve();}}
  const document={head:{appendChild(){}},createElement:tag=>tag==='canvas'?{width:0,height:0,getContext:()=>context()}:{}};
  const sandbox={window:{},Image,document,console,URL,Promise,setTimeout,clearTimeout};vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(game,'hotfix.js'),'utf8'),sandbox);
  const image=new Image();
  const runtime=sandbox.window.installNuageNomadeVisuals({
    state,W:540,H:960,ctx,HD_L1:{bg:image,islands:image},HD_L1_RECTS:{islands:[[0,0,10,10],[0,0,10,10],[0,0,10,10],[0,0,10,10]]},HD_L4:{pack:image},HD_L4_RECTS:{storms:[[0,0,10,10]]},HD_L6:{bg:image},
    level1AssetsReady:()=>true,level4AssetsReady:()=>true,preloadLevel1HD:()=>Promise.resolve(true),preloadLevel4HD:()=>Promise.resolve(true),drawSpriteCenter(){},showToast(){},drawBg(){throw Error('legacy background used');},drawStorm(){},startLevel(index){state.levelIndex=index;state.progress=0;state.time=0;},LEVEL_CARD_ART:{},levelTheme:()=>({speed:242}),initBackground(){}
  });
  return {runtime,state,blits};
}

test('levels 8–10 actually scroll left, preserve phase and reset on replay',async()=>{
  for(const level of [8,9,10]){
    const {runtime,state,blits}=fixture(level);
    runtime.drawBg();const origin=blits[0][1];blits.length=0;
    state.progress=2;state.time=2;runtime.drawBg();
    assert.ok(blits[0][1]<origin-30,'background must visibly travel left');
    const moved=runtime.diagnostics.scroll().offset;
    state.paused=true;runtime.drawBg();assert.equal(runtime.diagnostics.scroll().offset,moved);
    state.progress=runtime.diagnostics.scroll().period/(242*.075)+.1;
    runtime.drawBg();assert.ok(runtime.diagnostics.scroll().offset<2,'wrap preserves continuous small overshoot');
    await runtime.startLevel(level-1);assert.equal(runtime.diagnostics.scroll().offset,0);
  }
});

test('animated bolts cache repeat frames and bound texture memory',()=>{
  const {runtime,state}=fixture();
  runtime.drawLightningStrikeFancy(240,true,false);const first=runtime.diagnostics.effectCache().bolts;
  for(let i=0;i<60;i++)runtime.drawLightningStrikeFancy(240,true,false);
  assert.equal(runtime.diagnostics.effectCache().bolts,first);
  for(let i=0;i<100;i++){state.time=i/16;runtime.drawLightningStrikeFancy(100+i*24,true,i%2===0);}
  assert.ok(runtime.diagnostics.effectCache().bolts<=32);
});

test('bonus HUD assigns image once across frames and still updates feather count',()=>{
  const source=fs.readFileSync(path.join(game,'parts/part-009.txt'),'utf8');
  const snippet=source.slice(source.indexOf('  const HUD_NODES ='),source.indexOf('  const BIRD_FILTERS_BY_LEVEL='));
  const nodes=new Map();let imageWrites=0;
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,{textContent:'',style:{},classList:{toggle(){}},set src(value){imageWrites++;}});return nodes.get(id);}};
  const state={mode:'adventure',levelIndex:7,score:20,progress:1,collected:0,featherCount:3,bonusType:'foudre',bonusTimer:5,difficulty:'normal',nearMiss:0};
  const sandbox={document,state,fmt:n=>String(n),levelTheme:()=>({id:8,name:'Aurores',duration:42,starGoal:14}),FEATHER_BONUS_ASSET_SRC:{foudre:{icon:'data:cached'},aimant:{icon:'data:other'}}};
  vm.createContext(sandbox);vm.runInContext(snippet,sandbox);
  for(let i=0;i<60;i++)vm.runInContext('updateHUD()',sandbox);
  assert.equal(imageWrites,1);assert.equal(nodes.get('featherCount').textContent,'3');
  state.featherCount=0;state.bonusType='aimant';vm.runInContext('updateHUD()',sandbox);
  assert.equal(imageWrites,2);assert.equal(nodes.get('featherCount').textContent,'0');
});
