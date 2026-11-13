'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {publicImageURL,selectionImageAttachments}=require('../elios-samples-images.cjs'),C=require('../elios-samples-core.cjs');
const bytes=Buffer.from('89504e470d0a1a0a0000000000000000','hex');
const fetchImage=async()=>({ok:true,headers:{get:()=>String(bytes.length)},arrayBuffer:async()=>bytes});
test('server catalogue images become safe canonical URLs and duplicate images share one inline attachment',async()=>{
 const rows=[{image:'assets/img/example.png'},{image:'https://leroyfactory.fr/assets/img/example.png'},{image:'javascript:alert(1)'},{image:''}];
 const a=await selectionImageAttachments(rows,{fetchImage});assert.equal(a.length,1);assert.equal(a[0].contentType,'image/png');assert.equal(rows[0].imageCID,rows[1].imageCID);assert(a[0].content.equals(bytes));assert.equal(rows[2].image,'');assert.equal(publicImageURL('data:image/png;base64,x'),'');
});
test('a missing or over-budget inline image never drops any selection row and retains its canonical photo link',async()=>{
 const rows=[{image:'assets/img/a.png'},{image:'assets/img/b.png'}];let a=await selectionImageAttachments(rows,{fetchImage,maxBytes:bytes.length});assert.equal(a.length,1);assert.equal(rows.length,2);assert.equal(rows[1].imageCID,undefined);assert.equal(rows[1].image,'https://leroyfactory.fr/assets/img/b.png');
 const failed=[{image:'assets/img/a.png'}];a=await selectionImageAttachments(failed,{fetchImage:async()=>{throw Error('Unavailable image');}});assert.equal(a.length,0);assert.equal(failed[0].image,'https://leroyfactory.fr/assets/img/a.png');
});
test('a complete email includes the box HD, the vrac photo and the merchandising photo with all quantities',()=>{
 const catalogue={products:[{key:'tile',reference:'TILE',collection:'Collection',color:'Beige',format:'60x60',vrac:true,packVerified:true,packArea:1.44,packPieces:4,image:'assets/img/tile.png'}],merchandising:[{id:'kit',reference:'KIT',collection:'Collection',description:'Présentoir',valueUnitHT:170,images:[{image:'assets/img/kit.webp'}]}]};
 const quote=C.buildQuote([{type:'box',key:'tile',quantity:2},{type:'vrac',key:'tile',quantity:1,image:'https://attacker.invalid/photo'},{type:'merchandising',key:'kit',quantity:2}],catalogue,{tile:{purchaseHT:12}});
 quote.rows[1].imageCID='tile@lrf';quote.rows[2].imageCID='kit@lrf';
 const html=C.mailHTML({reference:'QA-ONLY',title:'Projet test',account:{societe:'Magasin test'},contact:{name:'Contact',email:'qa@example.invalid',address:'Adresse de test'},quote,box:true});
 assert(html.includes('cid:elios-box-hd@leroyfactory.fr'));assert(html.includes('cid:tile@lrf'));assert(html.includes('cid:kit@lrf'));assert(html.includes('Vrac avec étiquette'));assert(html.includes('Merchandising'));assert(html.includes('2 boîte(s)'));assert(!html.includes('attacker.invalid'));assert.equal(quote.rows.length,3);assert.equal(quote.subtotalHT,17.28);
});
