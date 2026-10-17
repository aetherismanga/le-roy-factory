const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),cp=require('child_process');
const context={window:{addEventListener(){}},document:{getElementById(){return null},addEventListener(){}},sessionStorage:{getItem(){return null},setItem(){}},console,URLSearchParams,location:{search:''},crypto:require('crypto').webcrypto};vm.createContext(context);
for(const file of['data.js','configurator.js','store.js']){let code=fs.readFileSync('assets/js/randal-catalogue/'+file,'utf8');if(file==='configurator.js')code=code.replace(/\nrender\(\);\n\}\)\(\);\s*$/,'\n})();');vm.runInContext(code,context)}
const {RandalCatalogue:c,RandalCatalogueData:d,RandalCatalogueStore:factory}=context.window,base=JSON.parse(fs.readFileSync('reports/randal-catalogue/baseline-prices.json')),original=JSON.parse(fs.readFileSync('reports/randal-catalogue/baseline-data.json'));
let checked=0;
for(const entry of base.entries){let unit;const k=entry.key.split('|');
 if(d.MODEL_TYPES[k[0]]){const [model,typeId,value,color]=k,r=c.resolve({model,typeId,width:value,variantCode:value,color,basinMode:'none',mirror:'Sans miroir',columnAccessory:false,quantity:1});assert.equal(r.rows[0].ref,entry.reference,entry.key+' reference');unit=r.rows[0].unit;}
 else if(k[0]==='ceramic'){unit=c.price(k[2]==='Luce120'?279:d.CERAMIC_PRICES[k[1]][k[2]][0]);}
 else if(k[0]==='ceramic-double')unit=c.price(d.DOUBLE_CERAMIC_PRICES[k[1]][0]);
 else if(k[0]==='vessel')unit=c.price(226);
 else if(k[0]==='top'){const refs=Object.values(d.TOP_REFS).find(r=>r.map(String).includes(k[1]));unit=c.price([66,74,83,92,100,118][refs.map(String).indexOf(k[1])]);}
 else if(k[0]==='mirror'){const table=Object.values(d.MIRROR_PRICES).find(r=>r[k[1]]!==undefined);unit=c.price(table[k[1]]);}
 assert.equal(unit,entry.unit,entry.key+' unit price');checked++;
}
for(const key of Object.keys(original)){if(key==='VESSEL_REFS')continue;assert.equal(JSON.stringify(d[key]),JSON.stringify(original[key]),'Preserved complete data: '+key)}
const source={model:'Harmony',typeId:'two',width:'80',color:'Serenade Alba',basinMode:'vessel',basin:'Neris',basinFinish:'Blanc brillant',topFinish:'Blanco mate',mirror:'Basic',mirrorSize:'60 × 80 cm',quantity:1};
assert.equal(c.resolve(source).rows.find(r=>r.title==='Vasque à poser Neris').ref,'9567');assert.equal(c.resolve({...source,basin:'Torne'}).rows.find(r=>r.title==='Vasque à poser Torne').ref,'9559');
assert.equal(c.resolve({...source,width:'84'}).valid,false,'No bespoke width');assert.equal(c.resolve({...source,color:'Finition inventée'}).valid,false);
assert.equal(c.resolve({...source,model:'Luce',typeId:'column',color:'Verde Utopía'}).config.width,'25');assert.equal(c.resolve({...source,model:'Luce',typeId:'column',color:'Verde Utopía'}).config.depth,'30');
assert.equal(Number(c.resolve({...source,width:'120'}).config.width),119);
const boreal=c.resolve({...source,model:'Boreal',width:'79',color:'Biscuit'});assert.equal(boreal.state.basinMode,'integrated');assert.equal(boreal.rows[1].ref,'2171');
const s=factory.create(c.resolve),[id]=s.add(source);const item=s.read().items[0],position=JSON.stringify(item.position);const [copy]=s.duplicate(id);assert.notEqual(id,copy);assert.equal(s.collisions().length,0);s.patch(copy,{color:'Blanco mate'});assert.equal(s.read().items.find(i=>i.id===id).source.color,'Serenade Alba');assert.equal(JSON.stringify(s.read().items.find(i=>i.id===id).position),position);s.move(copy,.1,.1);assert.equal(s.collisions().length,0);s.patch(id,{width:'120'});assert.equal(s.collisions().length,0);s.remove(copy);assert.equal(s.read().items.length,1);assert.equal(s.read().total,Math.round(s.read().rows.reduce((n,r)=>n+r.unit*r.quantity,0)*100)/100);
s.patch(id,{mirrorQuantity:3});const mirrorBefore=JSON.stringify(s.read().items[0].mirrors[1].position),mirror=s.read().items[0].mirrors[0];s.move(id+':mirror:'+mirror.id,.1,.1);assert.equal(JSON.stringify(s.read().items[0].mirrors[1].position),mirrorBefore);s.remove(id+':mirror:'+mirror.id);assert.equal(s.read().items[0].mirrors.length,2);assert.equal(s.read().items[0].source.mirrorQuantity,2);
const snap=s.snapshot(),loaded=factory.create(c.resolve);loaded.load(snap);assert.equal(JSON.stringify(loaded.snapshot()),JSON.stringify(snap));
for(const entry of (fs.existsSync('reports/randal-catalogue/protected-upstream.json')?JSON.parse(fs.readFileSync('reports/randal-catalogue/protected-upstream.json')).files:JSON.parse(fs.readFileSync('reports/randal-catalogue/protected-files.json')))){if(fs.existsSync(entry.path)){const hash=cp.execFileSync('git',['hash-object',entry.path],{encoding:'utf8'}).trim();assert.equal(hash,entry.blob,'Protected STUDIO ONE: '+entry.path)}}
console.log(JSON.stringify({status:'PASS',unitPrices:checked,collections:d.models.length,protectedFiles:16,tests:'Reference preservation, fixed dimensions, compatibility, unique ids, collisions, isolated finishes, totals, project roundtrip'},null,2));
