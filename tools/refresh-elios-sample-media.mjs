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
 const canonical=new Map(JSON.parse(read('shared/lrf-3d/commercial-surfaces.json')).products.map(p=>[p.key,p]));
 const nativeWood=JSON.parse(read('shared/lrf-3d/media/showroom/yosemite-native-sources.json'));
 const recovered=JSON.parse(read('reports/lrf-plan-pose/recovered-visuals-20261024.json')).samples;
 const catalogue=JSON.parse(read('assets/data/elios-samples.json'));
 const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const aliases={'bavariastone|stone':'Bavaria Stone','sedimenti|whiteselected':'White','sedimenti|beigeselected':'Beige','sedimenti|sandselected':'Sand','sedimenti|greyselected':'Grey'};
 let restored=0,upgraded=0;
 for(const product of catalogue.products){
  const collection=manufacturers.find(c=>c.name===product.collection),color=collection?.colors.find(c=>c.id===product.colorId);
  const format=collection?.formats.find(f=>f.id===product.format);
  const baseline=(color?.textureVariants?.max||color?.faces||[])[0]||'';
  product.image=baseline||canonical.get(product.key)?.preview||'';product.thumbnail=color?.file||product.image;product.definitionLimited=!!color?.definitionLimited;product.reconstructed=color?.textureProvenance?.kind==='ai-reconstruction';
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
  // A collection gallery also contains rooms. Only a reviewed swatch/panel,
  // or the explicitly named pool colour extract, can become a tile face.
  const candidate=candidates.filter(({asset})=>asset&&['manufacturer-colour-sample','manufacturer-colour-detail','manufacturer-decor-sample','manufacturer-catalogue-sample','manufacturer-decor-panel','catalogue-native-sample','catalogue-vector-swatch'].includes(asset.kind)).sort((a,b)=>(b.asset.width*b.asset.height)-(a.asset.width*a.asset.height))[0]
   ||candidates.find(({url})=>/\/pool-[^/]+\/color-[^/]+\.(jpeg|jpg|webp)$/i.test(url));
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
  if(product.collection==='Yosemite'){
   const native=nativeWood.find(s=>s.color===product.colorId&&s.file.endsWith('-02.jpg'));
   if(native){product.image=product.thumbnail='shared/lrf-3d/media/showroom/'+native.file;product.reconstructed=false;product.definitionLimited=false;product.imageResolution=[native.width,native.height];product.imageSource='Photographie matière fabricant · forme représentée selon le format';}
  }
  if(!product.image){
   const found=recovered.find(p=>p.collection===product.collection&&(clean(p.colorId)===clean(product.colorId)||clean(p.color)===clean(product.color)));
   if(found){product.image=product.thumbnail=found.preview;product.imageResolution=found.resolution;product.imageSource=found.previewSource;product.definitionLimited=true;product.reconstructed=false;}
  }
  if(product.collection==='Montreal'){
   const found=variants.find(url=>url.startsWith('https://peintner.shop/media/image/variation/')&&/montreal-boden-und-wandfliesen-85mm_farbe_/.test(url));
   if(found){product.image=product.thumbnail=found;product.imageResolution=[600,600];product.definitionLimited=false;product.reconstructed=false;product.imageSource='Sélection Elios · photo produit Montreal par coloris';}
  }
 }
 catalogue.version='20261113-elios-samples-v4';
 for(const file of ['assets/data/elios-samples.json','functions/elios-samples-catalogue.json'])fs.writeFileSync(path.join(root,file),JSON.stringify(catalogue));
 return {restored,upgraded,missing:catalogue.products.filter(p=>!p.image).map(p=>({reference:p.reference,collection:p.collection,color:p.color,format:p.format})),missingMerchandising:catalogue.merchandising.filter(p=>!p.images?.length).map(p=>({reference:p.reference,collection:p.collection,description:p.description}))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(refreshSampleMedia()));
