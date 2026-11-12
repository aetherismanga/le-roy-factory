import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export function refreshSampleMedia(root=path.resolve('.')) {
 const read=file=>fs.readFileSync(path.join(root,file),'utf8');
 const context={window:{}};vm.createContext(context);
 for(const file of ['inspirations-elios-selection-media.js','inspirations-elios-color-media-20261101.js'])vm.runInContext(read('assets/js/'+file),context);
 const media=context.window.ELIOS_COLOR_MEDIA,selection=context.window.ELIOS_SELECTION_MEDIA;
 const manufacturers=JSON.parse(read('shared/lrf-3d/manufacturer-surfaces.json'));
 const catalogue=JSON.parse(read('assets/data/elios-samples.json'));
 const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const aliases={'bavariastone|stone':'Bavaria Stone','sedimenti|whiteselected':'White','sedimenti|beigeselected':'Beige','sedimenti|sandselected':'Sand','sedimenti|greyselected':'Grey'};
 let restored=0,upgraded=0;
 for(const product of catalogue.products){
  const collection=manufacturers.find(c=>c.name===product.collection),color=collection?.colors.find(c=>c.id===product.colorId);
  const format=collection?.formats.find(f=>f.id===product.format);
  const baseline=(color?.textureVariants?.max||color?.faces||[])[0]||'';
  if(baseline){product.image=baseline;product.thumbnail=color.file||baseline;product.definitionLimited=!!color.definitionLimited;product.reconstructed=color.textureProvenance?.kind==='ai-reconstruction';}
  product.shape=format?.shape||'rectangle';
  if(format){product.tileWidth=format.width;product.tileHeight=format.height;product.chevronAngle=format.chevronAngle||45;}
  let variants=[];
  for(const source of [media,selection]){
   const colors=source.variants?.[product.slug]||source.variants?.[product.slug==='Love&Decors'?'loveanddecors':product.slug]||Object.entries(source.variants||{}).find(([slug])=>clean(slug)===clean(product.slug))?.[1]||{};
   const wanted=clean(aliases[clean(product.collection)+'|'+clean(product.color)]||product.color);
   const key=Object.keys(colors).find(key=>clean(key)===wanted);
   if(key)variants.push(...colors[key]);
  }
  const candidates=variants.map(url=>({url,asset:media.assets?.[url]}));
  // Identity is established by the reviewed collection and colour mapping.
  // Never substitute the first colour or an unrelated room photograph.
  const candidate=candidates.find(({asset})=>asset?.width>=700&&asset.kind==='manufacturer-colour-sample')||candidates.find(({url})=>(!/ambiance|_amb|living|bagno|cucina|ristorante|esterno/i.test(url)||product.collection==='Venere'&&product.color==='Atlante'));
  const sourcePixels=(color?.resolution?.[0]||0)*(color?.resolution?.[1]||0),candidatePixels=(candidate?.asset?.width||0)*(candidate?.asset?.height||0);
  if(candidate&&(!product.image||product.reconstructed||candidatePixels>=sourcePixels&&candidatePixels>0||product.definitionLimited&&candidatePixels>sourcePixels||product.collection==='Stone Icon')){
   if(!product.image)restored++;else if(product.image!==(candidate.asset?.original||candidate.url))upgraded++;
   product.image=candidate.asset?.original||candidate.url;
   product.thumbnail=candidate.asset?.thumbnail||candidate.url;
   product.definitionLimited=!!candidate.asset?.definitionLimited;
   product.reconstructed=false;
   if(product.collection==='Stone Icon')product.image=product.thumbnail='assets/img/elios-samples-hd/stone-icon-'+product.colorId+'.jpg';
   product.imageSource='Sélection Elios · correspondance collection et coloris vérifiée';
   if(candidate.asset?.width)product.imageResolution=[candidate.asset.width,candidate.asset.height];
  }
 }
 catalogue.version='20261113-elios-samples-v3';
 for(const file of ['assets/data/elios-samples.json','functions/elios-samples-catalogue.json'])fs.writeFileSync(path.join(root,file),JSON.stringify(catalogue));
 return {restored,upgraded,missing:catalogue.products.filter(p=>!p.image).map(p=>({reference:p.reference,collection:p.collection,color:p.color,format:p.format})),missingMerchandising:catalogue.merchandising.filter(p=>!p.images?.length).map(p=>({reference:p.reference,collection:p.collection,description:p.description}))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(refreshSampleMedia()));
