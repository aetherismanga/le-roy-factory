import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'acorn';
import {CATALOG as C,RAW_CATALOGUE,modelProduct} from '../functions/neobath-anima/studio-adapter/commerce/catalog.js';
import {initialDraft,normalizeDraft,draftProject} from '../functions/neobath-anima/studio-adapter/commerce/guided.js';
import {quoteProject} from '../functions/neobath-anima/studio-adapter/commerce/pricing.js';
import {validateProject,encodeProject,decodeProject,continuousPlanGroups,continuousTopCompatible} from '../functions/neobath-anima/studio-adapter/projects.js';
import {transformHomeSource} from '../functions/neobath-anima/studio-adapter/home-transform.mjs';
import {normalizeCabinetRoles} from '../functions/neobath-anima/studio-adapter/cabinet-role.js';

test('the original Studio One catalogue contract covers all 42 Anima modules and only its six finishes',()=>{
  assert.equal(C.models.length,16);
  const refs=C.models.flatMap(m=>Object.values(m.productsByWidth).map(p=>p.id)).concat(C.columns.map(c=>c.productId));
  assert.equal(refs.length,42);assert.equal(new Set(refs).size,42);
  assert.deepEqual(C.finishes.map(f=>f.id),RAW_CATALOGUE.finishes.map(f=>f.id));
  assert.ok(!C.finishes.some(f=>['ROBLE','ALBA','NOGAL','WHITE'].includes(f.id)));
  for(const m of C.models)for(const width of m.allowedWidths)assert.equal(modelProduct(m.id,width).height,m.height);
});
test('the Studio One guided path produces the actual Anima 80cm cabinet plus TK80 and exact public TTC',()=>{
  const draft=normalizeDraft({...initialDraft(),top:'tk80-integrated-top'});
  assert.equal(draft.basinColor,'white-gloss');
  const p=draftProject(draft),quote=quoteProject(p);
  assert.equal(p.version,2);assert.equal(p.manufacturer,'neobath-anima');
  assert.equal(p.items.find(i=>i.type==='cabinet').settings.format,'two');
  assert.deepEqual(quote.rows.map(r=>r.ref),['APUR-PL8052','TK80']);
  assert.equal(quote.publicTTC,92160);
  assert.deepEqual(quote.missing,[]);assert.deepEqual(quote.excluded,[]);
  assert.ok(p.items.some(i=>i.type==='window'));assert.ok(p.items.some(i=>i.type==='door'));
});
test('the quote does not count room openings as unpriced articles but still identifies extra equipment',()=>{
  const project=draftProject({...initialDraft(),top:'tk80-integrated-top'});
  const quote=quoteProject(project);
  assert.equal(quote.rows.length,2);assert.ok(quote.rows.every(row=>Number.isInteger(row.publicTTC)));
  assert.equal(quote.publicTTC,92160);assert.equal(quote.excluded.length,0);
  project.items.push({id:'extra-tap',type:'tap',settings:{use:'basin',tap:'illustrative-tap'},placement:{wall:0,u:125,height:85}});
  const withTap=quoteProject(project);
  assert.equal(withTap.publicTTC,92160);assert.deepEqual(withTap.missing,[]);
  assert.deepEqual(withTap.excluded,[{id:'extra-tap',type:'tap',reference:'illustrative-tap'}]);
});
test('Ribelle H26 starts as the real base SKU and switches to its source vanity SKU only with a basin',()=>{
  const p=draftProject({...initialDraft(),format:'ribelle-one',width:80,grass:true});
  const q=quoteProject(p);
  assert.equal(q.rows[0].ref,'ARIB-BA8026');assert.equal(q.publicTTC,52854); // BA:383 HT + GRASS15%, TVA20%.
  const withBasin=draftProject({...initialDraft(),format:'ribelle-one',width:80,grass:true,top:'tk80-integrated-top'}),basinQuote=quoteProject(withBasin);
  assert.equal(withBasin.items[0].settings.format,'ribelle-one');assert.equal(withBasin.items[0].settings.topDrawer,'siphon');
  assert.deepEqual(basinQuote.rows.map(row=>row.ref),['ARIB-PL8026','TK80']);assert.equal(basinQuote.rows[0].publicTTC,56442);assert.equal(basinQuote.publicTTC,80442); // PL:409 HT, same15% + TK80:200HT.
  assert.equal(p.items[0].placement.height,56);
  assert.throws(()=>normalizeDraft({...initialDraft(),format:'three'}));
  assert.throws(()=>normalizeDraft({...initialDraft(),width:70}));
});
test('per-centimetre tops and integrated bowl supplements stay separate tariff lines',()=>{
  const p=draftProject({...initialDraft(),width:100,top:'tpgea12-b938-1-basin'});
  const q=quoteProject(p);
  assert.deepEqual(q.rows.map(r=>r.ref),['APUR-PL10052','TPGEA12','B938']);
  assert.equal(q.publicTTC,195120);
  assert.equal(q.rows[1].publicTTC,55560);
  assert.equal(q.rows[2].publicTTC,67200);
});
test('the actual quote follows automatic base-to-vanity conversion and returns to the base price after basin removal',()=>{
  const project=draftProject(initialDraft()),host=project.items[0];
  assert.equal(host.settings.format,'pura-base-two');assert.equal(quoteProject(validateProject(project)).publicTTC,64800);
  host.settings={...host.settings,top:'tk80-integrated-top',basinColor:'white-gloss'};
  const fitted=normalizeCabinetRoles(project),withBasin=quoteProject(validateProject(fitted));
  assert.equal(fitted.items[0].id,host.id);assert.deepEqual(fitted.items[0].placement,host.placement);
  assert.equal(fitted.items[0].settings.format,'two');assert.equal(fitted.items[0].settings.topDrawer,'siphon');
  assert.deepEqual(withBasin.rows.map(row=>row.ref),['APUR-PL8052','TK80']);assert.equal(withBasin.publicTTC,92160);
  fitted.items[0].settings.top='bare';fitted.items[0].settings.basinColor='standard';
  const removed=normalizeCabinetRoles(fitted),withoutBasin=quoteProject(validateProject(removed));
  assert.equal(removed.items[0].settings.format,'pura-base-two');assert.equal(removed.items[0].settings.topDrawer,'full');
  assert.deepEqual(withoutBasin.rows.map(row=>row.ref),['APUR-BA8052']);assert.equal(withoutBasin.publicTTC,64800);
});
test('unpierced covers and linear plans use their own valid finish keys before project validation',()=>{
  const cover=normalizeDraft({...initialDraft(),top:'tpc80-cover'});
  assert.equal(cover.basinColor,'furniture-finish');
  const coverQuote=quoteProject(validateProject(draftProject(cover)));
  assert.deepEqual(coverQuote.rows.map(row=>row.ref),['APUR-BA8052','TPC80']);assert.equal(coverQuote.rows[0].publicTTC,64800);assert.equal(coverQuote.publicTTC,75840); // BA540HT, cover92HT.
  const linear=normalizeDraft({...initialDraft(),top:'tpgea12-linear-top'});
  assert.equal(linear.basinColor,'white-matte');
  const linearQuote=quoteProject(validateProject(draftProject(linear)));
  assert.deepEqual(linearQuote.rows.map(row=>row.ref),['APUR-BA8052','TPGEA12']);assert.equal(linearQuote.rows[1].publicTTC,44448);assert.equal(linearQuote.publicTTC,109248);
  const ncs=normalizeDraft({...linear,basinColor:'ncs-matte',ncsCode:'S 2010-G10Y'});
  assert.equal(quoteProject(validateProject(draftProject(ncs))).publicTTC,120096);
});
test('projects keep the original Studio One room structure and reject unknown furniture and basin colours',()=>{
  const p=draftProject({...initialDraft(),top:'tk80-integrated-top',column:true,columnModel:'ribelle-column'});
  const round=decodeProject(encodeProject(p));assert.deepEqual(round,p);
  const bad=structuredClone(p);bad.items[0].settings.finish='ROBLE';assert.throws(()=>validateProject(bad));
  const colour=structuredClone(p);colour.items[0].settings.basinColor='invented-color';assert.throws(()=>validateProject(colour));
  const cross=structuredClone(p);cross.manufacturer='studio-one';assert.throws(()=>validateProject(cross));
});
function continuous140Project() {
  const project=draftProject({...initialDraft(),width:100});
  const host=project.items.find(item=>item.type==='cabinet');
  const base=structuredClone(host);base.id='adjacent-base-40';base.settings={...base.settings,format:'pura-base-door',width:40,top:'bare',drawers:[0]};base.placement.u=host.placement.u+70;
  project.items.push(base);
  host.settings={...host.settings,top:'to140sx-integrated-top',topSpan:140,topOffset:20,basinColor:'white-matte'};
  return normalizeCabinetRoles(project);
}
test('a 140cm source plan spans one actual 100cm vanity and its adjacent 40cm base with one charge',()=>{
  const project=continuous140Project(),host=project.items[0],groups=continuousPlanGroups(project,host.id);
  assert.ok(groups.some(group=>group.span===140&&group.offset===20&&group.ids.length===2));
  assert.equal(continuousTopCompatible(project,host.id,host.settings.top,140,20),true);
  const validated=validateProject(project),q=quoteProject(validated);
  assert.deepEqual(validated.items.filter(item=>item.type==='cabinet').map(item=>item.settings.width),[100,40]);
  assert.equal(q.rows.filter(row=>row.ref==='TO140SX').length,1);
  assert.equal(q.rows.find(row=>row.ref==='TO140SX').publicTTC,96480);
  assert.equal(q.publicTTC,213840);
  assert.deepEqual(decodeProject(encodeProject(validated)),validated);
});
test('floating spans, wrong offsets, mismatched height and unsupported fake-wide bodies are rejected',()=>{
  for(const change of [
    p=>p.items.pop(),p=>p.items.at(-1).placement.u+=1,p=>p.items.at(-1).placement.height-=1,
    p=>p.items[0].settings.topSpan=160,p=>p.items[0].settings.topOffset=0,p=>p.items[0].settings.width=140,
    p=>p.items.at(-1).settings.top='tpgea12-linear-top'
  ]){const project=continuous140Project();change(project);assert.throws(()=>validateProject(project));}
  const broken=continuous140Project();broken.items.pop();assert.equal(quoteProject(broken).publicTTC,null);
});
test('continuous plan candidates include supported 140cm subgroups inside a wider cabinet chain',()=>{
  const project=continuous140Project(),host=project.items[0];
  const left=structuredClone(project.items.at(-1));left.id='adjacent-left-40';left.placement.u=host.placement.u-70;
  project.items.push(left);
  const groups=continuousPlanGroups(project,host.id);
  assert.ok(groups.some(group=>group.span===140&&group.offset===-20));
  assert.ok(groups.some(group=>group.span===140&&group.offset===20));
  assert.ok(groups.some(group=>group.span===180&&group.offset===0));
});
test('a 160cm double-bowl plan needs two genuine vanities and the pair is billed once',()=>{
  const project=continuous140Project(),host=project.items[0],companion=project.items.find(item=>item.id==='adjacent-base-40');
  host.settings={...host.settings,width:80,top:'tpgea12-b855-2-basin',topSpan:160,topOffset:40};
  companion.settings={...companion.settings,format:'pura-base-two',width:80,drawers:[0,0]};companion.placement.u=host.placement.u+80;
  const normalized=normalizeCabinetRoles(project),q=quoteProject(validateProject(normalized));
  assert.equal(q.rows.filter(row=>row.ref==='APUR-PL8052').length,2,'both real supports become vanities under their own bowl');
  assert.equal(q.rows.filter(row=>row.ref==='B855').length,1);assert.equal(q.rows.find(row=>row.ref==='B855').publicTTC,206520);
  assert.equal(q.rows.find(row=>row.ref==='TPGEA12').publicTTC,88896);assert.equal(q.publicTTC,431736);
  normalized.items.find(item=>item.id===companion.id).settings.format='pura-base-two';
  assert.throws(()=>validateProject(normalized),/sous-vasque/);assert.equal(quoteProject(normalized).publicTTC,null);
});
test('the Anima build adapts the original five-step Studio One source and retains its workspace and quote controls',()=>{
  const source=readFileSync(new URL('../studio-one/src/commerce/home.js',import.meta.url),'utf8');
  const adapted=transformHomeSource(source);parse(adapted,{ecmaVersion:'latest',sourceType:'module'});
  for(const marker of ["$('#new-project').onclick","const projectWorkspace=createWorkspace",'function renderAccount()','function renderQuote()','function launch(','product-grid','model-card'])assert.ok(adapted.includes(marker),marker);
  assert.ok(adapted.includes('ANIMA_TOP_OPTIONS'));assert.ok(!adapted.includes("name:{sella:'Sella encastrée'"));
  assert.ok(!adapted.includes("C.media+'hero-meuble-hd.webp'"));
});
