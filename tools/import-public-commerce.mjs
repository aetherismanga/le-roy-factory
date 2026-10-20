// Import existing catalogue; publish TTC amounts only. Run with the audited site checkout.
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const root=process.argv[2];if(!root)throw Error('Pass the read-only source checkout');
const source=readFileSync(root+'/assets/js/studio-one/catalog.js','utf8');
const context={window:{}};vm.runInNewContext(source,context);
const c=context.window.StudioOneCatalog;
const ids=['two','three','one-xl','two-xl'];
// C1 contains furniture purchase bases. V04 mirrors already contain public HT.
const gross=n=>Math.round(n*240),catalogueGross=n=>Math.round(n*120);
const media='https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/';
const data={source:{repository:'aetherismanga/le-roy-factory',commit:'233ab6dda7fb71c5048ac1f983a67ceb3fe0b0c9',path:'assets/js/studio-one/catalog.js',sha256:createHash('sha256').update(source).digest('hex'),rule:'Meubles et colonne : C1 × 2 × 1,20. Vasques et miroirs : prix public HT RANDAL V04 × 1,20. Contrôle indépendant du PDF source pages 36, 38 et 41.',vat:20},media,
 models:c.models.map((m,i)=>({id:ids[i],name:m.name,height:m.height,depth:46,base:m.base,top:m.top,bareTTC:m.sans.map(gross),topTTC:m.avec.map(gross),image:media+['2-tiroirs.webp','3-tiroirs.webp','1-tiroir-xl.webp','2-tiroirs-xl.webp'][i]})),
 finishes:c.finishes.map(f=>({id:f.code==='BISC.'?'BISC':f.code,refCode:f.code,name:f.name,hex:f.hex})),sizes:c.sizes,
 inset:Object.fromEntries(Object.entries(c.inset).map(([name,colors])=>[name.toLowerCase(),Object.fromEntries(Object.entries(colors).map(([color,rows])=>[color,Object.fromEntries(Object.entries(rows).map(([width,[price,ref]])=>[width,{ttc:Math.round(price*120),ref}]))]))])),
 insetColors:c.insetColors,vesselColors:c.vesselColors,
 vesselTTC:gross(113),
 mirrors:Object.entries(c.mirrors).map(([name,rows],i)=>({id:['basic','zen','ilse','capsule','metal-rect','round'][i],name,image:media+'accessories/mirror-'+['basic','zen-led','ilse-led','capsula-led','metal-rectangular','metal-round'][i]+'.webp',metal:!!c.mirrorRefs[name],sizes:rows.map(([label,ref,price])=>({label,ref,ttc:catalogueGross(price),width:Number(label.match(/\d+/g)[0]),height:Number(label.match(/\d+/g)[1]||label.match(/\d+/g)[0]),refs:c.mirrorRefs[name]?.[label]||null}))})),
 column:{name:c.column.name,width:c.column.width,height:c.column.height,depth:c.column.depth,ref:c.column.ref,ttc:gross(c.column.price),image:null},
 gaps:['Conditions commerciales individuelles RANDAL : absentes de validateProSession et des sources consultées.','Colonne 14177 : photographie isolée avec correspondance certaine introuvable. Aucun visuel d’un autre modèle utilisé.','Miroirs : prix public vérifié dans RANDAL V04 page 36 ; prix d’achat professionnel non documenté, sur demande.','Largeur 40 cm : confirmation usine déjà demandée par le configurateur historique.','Doubles vasques 120 cm : références présentes mais géométrie non prise en charge par la Bêta ; non proposées dans le parcours.','Accessoires, robinetterie, sanitaires, revêtements et profilés : aucun prix repris sans grille vérifiée.']};
writeFileSync('src/commerce/catalog.js','// Public TTC only. Generated from the existing source; see tools/import-public-commerce.mjs.\nexport const CATALOG = '+JSON.stringify(data,null,2)+';\n');
