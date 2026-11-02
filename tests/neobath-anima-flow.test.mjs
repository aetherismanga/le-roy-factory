import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {normalizeProject, linePrice, quoteLines, compatibleTops, compatibleBasins} from '../functions/neobath-anima/app-source.mjs';
import {normalizeProject as normalizeServerProject} from '../functions/neobath-anima-projects.cjs';

const catalogue = {
  finishes: [{id:'gesso',name:'Bianco Gesso',color:'#eeeedd'}],
  products: [
    {id:'m80',category:'module',subtype:'vanity',facade:'PURA',ref:'APUR-PL8052',label:'Pura 80 deux tiroirs',width:80,height:52,depth:46,drawers:2,doors:0,pricePublicHT:568,prices:[{key:'standard',label:'Standard',price:568}],codeStatus:'verified'},
    {id:'m100',category:'module',subtype:'vanity',facade:'PURA',ref:'APUR-PL10052',label:'Pura 100 deux tiroirs',width:100,height:52,depth:46,drawers:2,doors:0,pricePublicHT:603,prices:[{key:'standard',label:'Standard',price:603}],codeStatus:'verified'},
    {id:'column',category:'module',subtype:'column',facade:'PURA',ref:'APUR-CO40140',label:'Colonne',width:40,height:140,depth:22,doors:1,pricePublicHT:620},
    {id:'tk80',category:'worktop',subtype:'integrated',ref:'TK80',label:'Lavabo TK80',width:81,height:1.8,depth:46.5,compatibleWidths:[80],compatibleSubtypes:['vanity'],integratedBasin:true,prices:[{key:'gloss',label:'Blanc brillant',price:200},{key:'black',label:'Noir mat',price:620}]},
    {id:'tk100',category:'worktop',subtype:'integrated',ref:'TK100',label:'Lavabo TK100',width:101,height:1.8,depth:46.5,compatibleWidths:[100],compatibleSubtypes:['vanity'],prices:[{key:'gloss',label:'Blanc brillant',price:243}]},
    {id:'linear',category:'worktop',subtype:'linear',ref:'TPGEA12',label:'Plan Geacril au cm',width:100,height:1.2,depth:46.5,configurableWidth:true,unit:'linear-cm',compatibleSubtypes:['vanity','base'],prices:[{key:'white',label:'Blanc mat',price:4.63},{key:'ncs',label:'Couleur NCS',price:5.76}]},
    {id:'vessel',category:'basin',subtype:'countertop',ref:'FO01',label:'Vasque à poser',width:40,height:12,depth:40,compatibleTopIds:['linear'],prices:[{key:'white',label:'Blanc mat',price:250}]},
    {id:'mirror',category:'mirror',ref:'SFT8070',label:'Miroir cadre satiné',width:80,height:70,depth:3,pricePublicHT:149},
    {id:'unknown-price',category:'accessory',ref:'OPTION',label:'Option sur devis',pricePublicHT:null}
  ]
};
const item = () => ({key:'cabinet-a',productId:'m80',finishId:'gesso',priceKey:'standard',handle:'black',hinge:'left',x:0,bottom:30,z:0,topId:'',topPriceKey:'standard',topWidth:null,basinId:'',basinPriceKey:'standard',mirrorId:'',lightId:'',accessoryId:''});
const project = () => ({schema:'neobath-anima-project',version:1,id:'anima-1234567890',revision:0,title:'Salle de bains',items:[item()],room:{width:300,depth:260,height:250,wall:'#e8e6de',floor:'#b6b5a6'},view:'studio',quality:'normal'});

test('project import preserves a complete valid composition without mutating its input',()=>{
  const input=project();input.items[0]={...input.items[0],topId:'tk80',topPriceKey:'black',topWidth:81,mirrorId:'mirror'};
  const before=structuredClone(input),saved=normalizeProject(input,catalogue);
  assert.deepEqual(input,before);assert.equal(saved.items[0].topPriceKey,'black');assert.equal(saved.items[0].mirrorId,'mirror');assert.equal(saved.items[0].bottom,30);
  assert.deepEqual(quoteLines(saved,catalogue).map(l=>l.price),[568,620,149]);
});

test('malformed imports, unknown references and nonfinite positions never become a partial project',()=>{
  for(const bad of [null,[],{}, {...project(),version:99}, {...project(),items:Array(81).fill(item())}])assert.throws(()=>normalizeProject(bad,catalogue));
  for(const patch of [{productId:'DNA-unrelated'},{finishId:'invented'},{x:NaN},{bottom:Infinity},{z:'0'},{bottom:-1},{priceKey:'invented'},{handle:'invalid'},{hinge:'invalid'}]){
    const input=project();Object.assign(input.items[0],patch);assert.throws(()=>normalizeProject(input,catalogue),JSON.stringify(patch));
  }
  for(const room of [{width:149},{depth:NaN},{height:0},{wall:'url(javascript:alert(1))'},{floor:'#fff'}])assert.throws(()=>normalizeProject({...project(),room:{...project().room,...room}},catalogue));
});

test('fixed-width plans and vessel placements obey furniture compatibility',()=>{
  const m80=catalogue.products.find(p=>p.id==='m80');
  assert.ok(compatibleTops(m80,catalogue).some(p=>p.id==='tk80'));
  assert.ok(!compatibleTops(m80,catalogue).some(p=>p.id==='tk100'));
  assert.deepEqual(compatibleTops(catalogue.products.find(p=>p.id==='column'),catalogue),[]);
  const wrong=project();Object.assign(wrong.items[0],{topId:'tk100',topPriceKey:'gloss'});assert.throws(()=>normalizeProject(wrong,catalogue));
  const withoutTop=project();Object.assign(withoutTop.items[0],{basinId:'vessel',basinPriceKey:'white'});assert.throws(()=>normalizeProject(withoutTop,catalogue));
  assert.deepEqual(compatibleBasins(catalogue.products.find(p=>p.id==='tk80'),catalogue),[]);
  const valid=project();Object.assign(valid.items[0],{topId:'linear',topPriceKey:'white',topWidth:160,basinId:'vessel',basinPriceKey:'white'});assert.equal(normalizeProject(valid,catalogue).items[0].topWidth,160);
});

test('custom Geacril prices are per centimetre and unavailable prices stay unknown',()=>{
  const linear=catalogue.products.find(p=>p.id==='linear');
  assert.equal(linePrice(linear,'white',100),463);assert.equal(linePrice(linear,'ncs',160),921.6);
  assert.equal(linePrice(linear,'white',NaN),null);assert.equal(linePrice(linear,'invented',100),null);
  assert.equal(linePrice(catalogue.products.find(p=>p.id==='unknown-price')),null);
  const input=project();input.items[0].accessoryId='unknown-price';const lines=quoteLines(normalizeProject(input,catalogue),catalogue);assert.equal(lines.at(-1).price,null);
});

test('duplicated item identities and corrupt equipment variants are rejected before saving',()=>{
  const repeated=project();repeated.items.push({...repeated.items[0]});assert.throws(()=>normalizeProject(repeated,catalogue));
  const input=project();Object.assign(input.items[0],{topId:'tk80',topPriceKey:'unavailable-matte-white'});assert.throws(()=>normalizeProject(input,catalogue));
  const mismatched=project();mismatched.items[0].mirrorId='vessel';assert.throws(()=>normalizeProject(mismatched,catalogue));
});

test('complete manufacturer source contains all furniture formats, six finishes and sixteen images',()=>{
  const cat=JSON.parse(readFileSync(new URL('../functions/neobath-anima/catalogue.json',import.meta.url),'utf8'));
  const modules=cat.products.filter(p=>p.category==='module');
  assert.equal(modules.length,42);assert.equal(cat.finishes.length,6);assert.equal(cat.presets.length,16);
  assert.equal(new Set(cat.products.map(p=>p.id)).size,cat.products.length);
  for(const facade of ['PURA','RIBELLE']){
    const subset=modules.filter(p=>p.facade===facade);assert.equal(subset.length,21);
    for(const subtype of ['vanity','base','wall','column'])assert.ok(subset.some(p=>p.subtype===subtype));
    for(const width of [60,80,100,120])for(const height of [26,52])assert.ok(subset.some(p=>p.subtype==='vanity'&&p.width===width&&p.height===height));
  }
  for(const p of modules){assert.ok(p.width>0&&p.height>0&&p.depth>0);assert.ok(p.ref||(p.codeStatus==='ambiguous-source'&&p.printedRef));assert.ok(p.codeStatus);assert.ok(p.source);assert.ok(linePrice(p,p.prices?.[0]?.key||'standard')>0);}
  for(const p of cat.presets){assert.ok(p.image);const relative=p.image.replace(/^https:\/\/leroyfactory\.fr\//,'').replace(/^\//,'');assert.ok(existsSync(fileURLToPath(new URL('../'+relative,import.meta.url))),relative);}
  const by=(ref,predicate=()=>true)=>modules.find(p=>p.ref===ref&&predicate(p));
  assert.equal(linePrice(by('APUR-PL8052',p=>p.drawers===2)),568);
  assert.equal(linePrice(by('ARIB-PL8026')),409);
  assert.equal(linePrice(by('APUR-BA4052')),375);
  assert.equal(linePrice(by('ARIB-CO40140')),660);
  const linear=cat.products.find(p=>p.ref==='TPGEA12');
  assert.equal(linePrice(linear,'white-matte',100),463);
  assert.equal(linePrice(linear,'ncs-matte',141),812.16);
  const ambiguous=modules.filter(p=>p.codeStatus==='ambiguous-source');
  assert.equal(ambiguous.length,2);assert.ok(ambiguous.every(p=>p.ref===null&&p.doors===2&&p.subtype==='base'&&p.width===80));
});

test('actual catalogue equipment keeps source prices, unpriced structures and GRASS supplements distinct',()=>{
  const cat=JSON.parse(readFileSync(new URL('../functions/neobath-anima/catalogue.json',import.meta.url),'utf8'));
  const p=cat.products.find(p=>p.ref==='APUR-PL8052'&&p.drawers===2);
  const input=project();Object.assign(input.items[0],{productId:p.id,finishId:cat.finishes[0].id,grass:true});
  const lines=quoteLines(normalizeProject(input,cat),cat);
  assert.equal(lines[0].price,568);assert.equal(lines[1].ref,'GRASS');assert.equal(lines[1].price,113.6);
  const drawer26=cat.products.find(p=>p.ref==='ARIB-PL8026');Object.assign(input.items[0],{productId:drawer26.id});
  assert.equal(quoteLines(normalizeProject(input,cat),cat)[1].price,61.35);
  const double=cat.products.find(p=>p.id==='tpgea12-b855-2-basin');assert.equal(linePrice(double,'white-matte'),1721);
  const structures=cat.products.filter(p=>/bridge/i.test(p.id+' '+p.label));assert.ok(structures.length>0);assert.equal(structures.filter(p=>linePrice(p,p.prices?.[0]?.key||'standard')===null).length,5);
  const pricedStructure=structures.find(p=>p.ref==='BRIDGE100');assert.equal(linePrice(pricedStructure),262);
});

test('actual catalogue rejects out-of-range custom tops and double basins wider than the plan',()=>{
  const cat=JSON.parse(readFileSync(new URL('../functions/neobath-anima/catalogue.json',import.meta.url),'utf8'));
  const p=cat.products.find(p=>p.ref==='APUR-PL8052'&&p.drawers===2),top=cat.products.find(p=>p.ref==='TPGEA12');
  const input=project();Object.assign(input.items[0],{productId:p.id,finishId:cat.finishes[0].id,topId:top.id,topPriceKey:'white-matte',topWidth:120,basinId:'tpgea12-b855-2-basin',basinPriceKey:'white-matte'});
  assert.equal(normalizeProject(input,cat).items[0].topWidth,120);
  const lines=quoteLines(normalizeProject(input,cat),cat);assert.equal(lines.find(l=>l.productId==='tpgea12-b855-2-basin').quantity,1);assert.equal(lines.find(l=>l.productId==='tpgea12-b855-2-basin').price,1721);
  for(const width of [1,top.maxWidth+1,100]){const bad=structuredClone(input);bad.items[0].topWidth=width;assert.throws(()=>normalizeProject(bad,cat),'invalid width '+width);}
});

test('actual catalogue validates mirror lighting and top-specific perforation accessories',()=>{
  const cat=JSON.parse(readFileSync(new URL('../functions/neobath-anima/catalogue.json',import.meta.url),'utf8'));
  const p=cat.products.find(p=>p.ref==='APUR-PL8052'&&p.drawers===2),lamp=cat.products.find(p=>p.ref==='BARLED80'),satin=cat.products.find(p=>p.ref==='SFT8070'),backlit=cat.products.find(p=>p.ref==='SFR8070'),touch=cat.products.find(p=>p.ref==='TOUCH');
  const input=project();Object.assign(input.items[0],{productId:p.id,finishId:cat.finishes[0].id,lightId:lamp.id});
  assert.throws(()=>normalizeProject(input,cat));input.items[0].mirrorId=satin.id;assert.doesNotThrow(()=>normalizeProject(input,cat));
  input.items[0].mirrorId=backlit.id;assert.throws(()=>normalizeProject(input,cat));input.items[0].lightId='';input.items[0].accessoryId=touch.id;assert.doesNotThrow(()=>normalizeProject(input,cat));
  input.items[0].mirrorId=satin.id;assert.throws(()=>normalizeProject(input,cat));
  Object.assign(input.items[0],{mirrorId:'',topId:'tpgea12-linear-top',topPriceKey:'white-matte',topWidth:120,accessoryId:'mla-geacril'});
  assert.doesNotThrow(()=>normalizeProject(input,cat));assert.equal(quoteLines(normalizeProject(input,cat),cat).at(-1).price,68);
  input.items[0].accessoryId='mla-accessory';assert.throws(()=>normalizeProject(input,cat));
});

test('complete UI configuration survives server normalization and reopening without losing equipment options',()=>{
  const cat=JSON.parse(readFileSync(new URL('../functions/neobath-anima/catalogue.json',import.meta.url),'utf8'));
  const byRef=ref=>cat.products.find(p=>p.ref===ref);
  const input=project();
  Object.assign(input.items[0],{
    productId:byRef('ARIB-PL8052').id,finishId:'verde-agave',priceKey:'standard',handle:'chrome',hinge:'right',x:37.5,bottom:39,z:4.25,
    topId:'tpgea12-linear-top',topPriceKey:'ncs-matte',topWidth:160,topOffset:16.5,grass:true,ncsCode:'S 2010-G10Y',
    basinId:'tpgea12-b855-1-basin',basinPriceKey:'ncs-matte',mirrorId:byRef('SFT8070').id,mirrorPriceKey:'standard',
    lightId:byRef('BARLED80').id,lightPriceKey:'standard',accessoryId:'mla-geacril',accessoryPriceKey:'standard'
  });
  input.view='room';input.quality='minimum';
  const ui=normalizeProject(input,cat),server=normalizeServerProject(ui,cat);
  assert.deepEqual(server.items,ui.items);
  assert.deepEqual(server.room,ui.room);assert.equal(server.view,ui.view);assert.equal(server.quality,ui.quality);
  const reopened=normalizeProject(server,cat);
  assert.deepEqual(reopened.items,ui.items);assert.deepEqual(quoteLines(reopened,cat),quoteLines(ui,cat));
  const details=quoteLines(reopened,cat).find(l=>l.productId==='tpgea12-linear-top').details;
  assert.match(details,/160 cm/);assert.match(details,/16\.5 cm/);assert.match(details,/NCS S 2010-G10Y/);
});
