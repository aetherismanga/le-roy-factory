import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {initialDraft,draftProject} from '../src/commerce/guided.js';
import {quoteProject,money} from '../src/commerce/pricing.js';
import {cabinetDrawing,bevelSection} from '../src/commerce/visuals.js';
import {FLOW_KEY,QUOTE_KEY,CURRENT_KEY,SAVED_KEY,ACTIVE_ID,ORDER_TO,storeQuote,saveComposition,orderText,composeLinks,readStored} from '../src/commerce/flow.js';
import {bindQuoteReturn} from '../src/commerce/atelier.js';
class Storage{constructor(){this.map=new Map();}getItem(k){return this.map.get(k)||null;}setItem(k,v){this.map.set(k,String(v));}removeItem(k){this.map.delete(k);}}
const storage=new Storage(),base=draftProject({...initialDraft(),format:'three',width:100,top:'tampa',basinColor:'black',column:true,columnFinish:'NOGAL',mirror:'ilse',mirrorSize:2,finish:'BISC'});
const quote=quoteProject(base);assert.equal(quote.publicTTC,278880);
let a=saveComposition(storage,base);const first=a.id;
a=saveComposition(storage,{...base,title:'Projet renommé'},{id:first});assert.equal(readStored(storage,SAVED_KEY).length,1);assert.equal(a.id,first);
const b=saveComposition(storage,{...base,title:'Projet renommé'});assert.notEqual(b.id,first);assert.equal(readStored(storage,SAVED_KEY).length,2);assert.equal(storage.getItem(ACTIVE_ID),b.id);
const scene={...base,title:'Modifié dans la 3D',floor:{collection:'Shell',color:'ivory'},profiles:{enabled:true,color:'Bronze',overrides:{one:{enabled:false}}},views:[{position:[1,2,3],target:[0,1,0]}],items:[...base.items,{...base.items[0],id:'second-cabinet',placement:{wall:2,u:150,height:0},settings:{...base.items[0].settings,width:90}},{id:'window',type:'window',settings:{width:100,height:100,color:'black'},placement:{wall:1,u:120,height:100}}]};
const link={};bindQuoteReturn(link,()=>scene,storage);let prevented=false;link.onclick({preventDefault(){prevented=true;}});assert.equal(prevented,false);assert.deepEqual(readStored(storage,QUOTE_KEY),scene);assert.deepEqual(readStored(storage,CURRENT_KEY),scene);assert.equal(readStored(storage,FLOW_KEY).view,'quote');assert.equal(readStored(storage,QUOTE_KEY).items.length,5);
let error=false;const broken={setItem(){throw Error('Quota');}};bindQuoteReturn(link,()=>scene,broken,()=>{error=true;});link.onclick({preventDefault(){prevented=true;}});assert(error&&prevented,'Stay in scene if quote storage fails');
const body=orderText(scene,{name:'Client de test',email:'qa@example.invalid'});assert(body.includes('13043'));assert(body.includes('TOTAL MOBILIER PUBLIC TTC : '+money(quoteProject(scene).publicTTC)));assert(!body.includes('LRF-'));assert(body.includes('hors total mobilier'));assert(!JSON.stringify(readStored(storage,SAVED_KEY)).includes('qa@example.invalid'));
const links=composeLinks(body,'Commande de test');assert.deepEqual(new URL(links.gmail).searchParams.get('to'),ORDER_TO.join(','));assert.equal(new URL(links.outlook).searchParams.get('body'),body);assert(links.mailto.startsWith('mailto:jerome@leroyfactory.fr,coryne@leroyfactory.fr?'));
const pro=orderText(base,{client:{codeClient:'LRF-12345',societe:'Compte synthétique'}});assert(pro.includes('LRF-12345'));assert(!pro.includes('PRO HT :'));
for(const format of ['two','three','one-xl','two-xl']){const svg=cabinetDrawing(format,{range:true});assert(svg.includes('46'));assert(svg.includes('L. 40–120 cm'));assert(!/NaN|undefined/.test(svg));}
assert(bevelSection().includes('M100 65L164 129'),'Section slopes down from exterior lip to interior');
const result={passed:true,checks:['Save/update by stable ID without duplicate project; equal names remain distinct projects','Full scene returns to quote, including extra cabinet, window, materials, views and profile overrides','Quota failure prevents leaving the scene','Order message preserves exact references and computed public quote, no invented PRO','Email compose only; recipients copied from existing RANDAL configurator; no message transmitted','Contact details remain out of saved project data','Fresh SVG dimensions and correct inward-descending 45-degree section'],realWebGL:'Existing GPU test limitation remains; actual scene restoration covered by existing controller suite'};writeFileSync('reports/simple-flow-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
