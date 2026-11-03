import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const media=existsSync(resolve(root,'assets/data/ragreage/media.json'))?load('assets/data/ragreage/media.json'):{byUrl:{},brands:{}};
const franceComparison=existsSync(resolve(root,'assets/data/ragreage/comparison-france.json'))?load('assets/data/ragreage/comparison-france.json'):{};
const compact=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const mediaPath=url=>{const result=media.byUrl?.[url];const p=typeof result==='string'?result:result?.path;return p&&existsSync(resolve(root,p))?p:null;};
const countries=[],brands=[];
for(const file of ['france','spain','italy']){
 const source=load(`assets/data/ragreage/${file}.json`);
 countries.push({id:source.country,label:source.countryLabel});
 for(const b of source.brands){
  const id=b.id.startsWith(source.country+'-')?b.id:source.country+'-'+b.id;
  const aliases=[b.id,id,b.name,b.id.replace(/^(fr|es|it)-/,'').replace(/-(fr|es|it)$/,'')].map(compact);
  const found=Object.entries(media.brands||{}).find(([key,value])=>aliases.includes(compact(key))||aliases.includes(compact(value.name)));
  const foundPath=found?.[1]?.path;
  const logoPath=mediaPath(b.logoUrl)||(foundPath&&existsSync(resolve(root,foundPath))?foundPath:null);
  brands.push({...b,id,country:source.country,countryLabel:source.countryLabel,logoPath,logoBackground:found?.[1]?.background||null,
   logoUrl:b.logoUrl||found?.[1]?.sourceUrl||null,
   products:(b.products||[]).map(p=>{
    const pid=p.id.startsWith(source.country+'-')?p.id:source.country+'-'+p.id;
    const extracted=media.products?.[p.id]||media.products?.[pid];
    const extractedPath=extracted?.path;
    return {...p,id:pid,comparison:source.country==='fr'&&franceComparison[p.id]?franceComparison[p.id]:p.comparison,imageNote:extracted?.imageNote||p.imageNote||null,imagePath:extractedPath&&existsSync(resolve(root,extractedPath))?extractedPath:mediaPath(p.imageUrl)||mediaPath(p.imagePdf)||null};
   })});
 }
}
const ids=brands.map(b=>b.id);if(new Set(ids).size!==ids.length)throw Error('Duplicate manufacturer identifiers');
for(const b of brands)for(const p of b.products){
 if(!(p.rate>0&&p.bag>0&&p.min>=0&&p.max>=p.min&&/^https:\/\//.test(p.sourceUrl||'')))throw Error('Incomplete product: '+p.id);
 for(const key of ['supports','locations','finishes','heating'])if(!Array.isArray(p[key])||!p[key].length)throw Error('Missing domain: '+p.id+' '+key);
}
const output=`/* Generated from manufacturer technical catalogues; run node scripts/build-ragreage-catalog.mjs. */\nexport const COUNTRIES=${JSON.stringify(countries)};\nexport const BRANDS=${JSON.stringify(brands,null,2)};\n`;
writeFileSync(resolve(root,'assets/js/ragreage-catalog.mjs'),output);
console.log(JSON.stringify({countries:countries.length,brands:brands.length,qualifiedBrands:brands.filter(b=>b.products.length).length,products:brands.reduce((n,b)=>n+b.products.length,0),localLogos:brands.filter(b=>b.logoPath).length,localBags:brands.flatMap(b=>b.products).filter(p=>p.imagePath).length}));
