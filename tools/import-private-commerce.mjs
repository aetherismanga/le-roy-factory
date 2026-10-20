// Server-only exact historical purchase grid. Never imported by a browser entry.
import {readFileSync,writeFileSync} from 'node:fs';import vm from 'node:vm';import {createHash} from 'node:crypto';
const source=readFileSync(process.argv[2]+'/assets/js/studio-one/catalog.js','utf8'),ctx={window:{}};vm.runInNewContext(source,ctx);const c=ctx.window.StudioOneCatalog,prices={};
const put=(ref,value)=>{const cents=Math.round(value*100);if(prices[ref]!=null&&prices[ref]!==cents)throw Error('Conflicting reference '+ref);prices[ref]=cents;};
for(const m of c.models)for(const [i,b]of c.sizes.entries())for(const f of c.finishes){put(m.base+' '+b.ref+'@'+f.code,m.sans[i]);put(m.top+' '+b.ref+'@'+f.code,m.avec[i]);}
for(const colors of Object.values(c.inset))for(const rows of Object.values(colors))for(const [value,ref] of Object.values(rows))put(ref,value/2);
for(const color of c.vesselColors)for(const name of ['Neris','Torne'])put(color[name],113);
for(const f of c.finishes)put(c.column.ref+' '+f.code,c.column.price);
for(const [name,rows] of Object.entries(c.mirrors))for(const [label,ref,price]of rows){const refs=c.mirrorRefs[name]?.[label];if(refs)Object.values(refs).forEach(r=>put(r,price));else put(ref,price);}
writeFileSync('server/data/studio-one-purchase.json',JSON.stringify({source:{commit:'233ab6dda7fb71c5048ac1f983a67ceb3fe0b0c9',path:'assets/js/studio-one/catalog.js',sha256:createHash('sha256').update(source).digest('hex'),rule:'Original lines()/total() used by lrfCode(total()); basin source/2. Common historical grid, no additional individual discount.'},prices},null,2)+'\n');
console.log(Object.keys(prices).length+' historical purchase references imported server-side');
