import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {sampleRequestDetails,sampleMailto,sampleMailFiles,sampleReviewTable,selectionStorageKey,readSampleSelection} from '../assets/js/elios-samples-core.mjs';
const require=createRequire(import.meta.url),C=require('../functions/elios-samples-core.cjs');
const catalogue={products:[{key:'tile',reference:'REF60',collection:'Creta',color:'Avena',format:'60x60',vrac:true,packVerified:true,packArea:1.44,packPieces:4,image:'assets/img/test.jpg'}],merchandising:[]};
const account={societe:'Client <test>',owner:'client:1'},contact={name:'Contact',email:'client@example.invalid',address:'1 rue Test',telephone:''};
test('vrac recap and email contain only images, references, labels and quantities with no price columns or total',()=>{
 const quote=C.buildQuote([{type:'vrac',key:'tile',quantity:1}],catalogue),html=C.mailHTML({reference:'TEST',account,contact,quote,title:'Test'}),recap=sampleReviewTable(quote);
 for(const output of [html,recap]){assert.match(output,/<img/);assert.match(output,/REF60/);assert.match(output,/Avec étiquette/);assert.match(output,/1 pièce/);assert.doesNotMatch(output,/PU HT|payer HT|Remise|Valeur HT|0,00/);}
 assert.match(html,/Client &lt;test&gt;/);assert.doesNotMatch(html,/Jérôme & Coryne/);
});
test('mixed request keeps prices only inside the box section',()=>{
 const quote=C.buildQuote([{type:'vrac',key:'tile',quantity:1},{type:'box',key:'tile',quantity:2}],catalogue,{tile:{purchaseHT:12}}),html=C.mailHTML({reference:'TEST',account,contact,quote,title:'Test',box:true});
 const vrac=html.split('<h3>Échantillons en vrac</h3>')[1].split('<h3>Box expo</h3>')[0];assert.doesNotMatch(vrac,/HT|Remise|50 %/);assert.match(html,/17,28/);assert.match(html,/−50 %/);
});
test('edited contact, delivery address and note survive close/reopen and remain isolated per customer',()=>{
 const details=sampleRequestDetails({name:'New contact',email:'new@example.invalid',telephone:'123',address:'New delivery',note:'Updated note'},contact),storage=new Map([[selectionStorageKey('client:1'),JSON.stringify({details,items:[],boxId:null})]]),reader={getItem:key=>storage.get(key)??null};
 assert.deepEqual(readSampleSelection(reader,{owner:'client:1'}).selection.details,details);assert.equal(readSampleSelection(reader,{owner:'client:2'}).selection,null);assert.equal(sampleRequestDetails(null,contact).email,contact.email);assert.equal(sampleRequestDetails({telephone:''},contact).telephone,'');
});
test('native composer uses Caterina in To and Gyslaine, Jérôme, Coryne in CC with literal plus and accents preserved',()=>{
 const mail={to:C.TO,cc:C.CC,subject:'Essai + échantillons',text:'Contact + livraison\nQuantité : 1'},uri=sampleMailto(mail),u=new URL(uri);
 assert.equal(u.pathname,'ctoni@eliosceramica.it');assert.equal(u.searchParams.get('cc'),C.CC.join(','));assert.equal(u.searchParams.get('subject'),mail.subject);assert.equal(u.searchParams.get('body'),mail.text);
});
test('complete MIME draft and HD attachments decode without byte changes',async()=>{
 const bytes=Buffer.from([0,255,128,24]),files=sampleMailFiles({filename:'request.eml',content:Buffer.from('X-Unsent: 1\r\n').toString('base64'),files:[{filename:'image.png',type:'image/png',content:bytes.toString('base64')}]});
 assert.equal(await files.message.text(),'X-Unsent: 1\r\n');assert.equal(files.message.type,'message/rfc822');assert.deepEqual(Buffer.from(await files.attachments[0].arrayBuffer()),bytes);
});
