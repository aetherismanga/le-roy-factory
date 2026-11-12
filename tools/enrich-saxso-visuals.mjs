import {readFileSync,writeFileSync,existsSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve,dirname,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {parseGeometry,finishLabel} from '../assets/js/saxso-product-visual.mjs';

// Source assets are never enlarged. Format illustrations are constructed separately.
const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,arg,index,list)=>arg.startsWith('--')?[...pairs,[arg.slice(2),list[index+1]]]:pairs,[]));
if(!args.audit||!args.official)throw Error('Provide --audit and --official source manifests.');
const root=resolve(dirname(new URL(import.meta.url).pathname),'..');
const cataloguePath=resolve(root,args.catalogue||'assets/data/saxso-catalogue.json');
const data=JSON.parse(readFileSync(cataloguePath,'utf8'));
const audit=JSON.parse(readFileSync(resolve(args.audit),'utf8'));
const official=JSON.parse(readFileSync(resolve(args.official),'utf8'));
const supplements=args.supplement&&existsSync(resolve(args.supplement))?JSON.parse(readFileSync(resolve(args.supplement),'utf8')):{};
Object.assign(official.assets,supplements.assets||{});
const profiles=args.profiles&&existsSync(resolve(args.profiles))?JSON.parse(readFileSync(resolve(args.profiles),'utf8')):{};
const colours=args.colours&&existsSync(resolve(args.colours))?JSON.parse(readFileSync(resolve(args.colours),'utf8')):{};
const records=new Map(audit.variants.map(v=>[v.id,v]));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const provenance={version:'20261112-saxso-hd2',sourcePdf:data.provenance?.sourceFile||'Book_of_stones_Saxso_2023_OK.pdf',sourcePdfSha256:audit.summary.sourceSha256,officialSource:'https://www.saxso.it/',assets:[],references:[]};
const copied=new Map();
const stats={references:0,exactSourcePhotographs:0,officialMaterialPhotographs:0,sourceMaterialDetails:0,formatIllustrations:0,sourceOnlyReferences:0,hdAmbiences:0,collections:0};
const assetRecord=(a,label,extra={})=>({url:a.url,preview:a.url,width:a.width,height:a.height,kind:'photo',label,sourceUrl:a.sourceUrl,sourcePage:a.pages?.[0]||a.sourcePage,sourceType:a.sourceUrl?.includes('saxso.it/')?'official':'retailer',...extra});
const copySource=source=>{
  if(!source?.localPath||!existsSync(source.localPath))return null;
  let url='assets/img/saxso-2026/'+basename(source.localPath);
  if(!existsSync(resolve(root,url)))url='assets/img/saxso-hd/catalogue/'+basename(source.localPath);
  if(!existsSync(resolve(root,url))){mkdirSync(dirname(resolve(root,url)),{recursive:true});copyFileSync(source.localPath,resolve(root,url));}
  if(!copied.has(url)){copied.set(url,true);provenance.assets.push({url,width:source.width,height:source.height,sourceType:'catalogue',sourcePdf:'assets/pdf/Book_of_stones_Saxso_2023_OK.pdf',page:source.page,xref:source.xref,sha256:sha(readFileSync(resolve(root,url)))});}
  return {url,preview:url,width:source.width,height:source.height,kind:'photo',label:'Photographie du fabricant · page '+source.page,sourceType:'catalogue',sourcePage:source.page,sourceXref:source.xref,sourceUrl:'assets/pdf/Book_of_stones_Saxso_2023_OK.pdf#page='+source.page,note:'Photographie du catalogue fabricant, conservée à sa résolution native.'};
};
const colourFr=value=>String(value||'').replace(/Grigio/g,'Gris').replace(/Misto|Mista/g,'Mélangé').replace(/Giallo/g,'Jaune').replace(/Rosa/g,'Rose').replace(/Rosso/g,'Rouge').replace(/Nero|Nera/g,'Noir').replace(/Bianco|Bianca/g,'Blanc').replace(/Verde/g,'Vert').replace(/Rossiccio/g,'Roux');

for(const c of data.collections){
  stats.collections++;
  const web=official.collections[c.id]||{};
  const scenes=(web.sceneCandidates||[]).map(id=>official.assets[id]).filter(a=>a&&a.role==='scene'&&a.width>=1200);
  const originalImages=c.images.filter(i=>!['official','retailer'].includes(i.sourceType));
  const unique=new Set();
  c.images=[...scenes.map(a=>assetRecord(a,c.name+' · Photographie d’ambiance SAXSO')),...originalImages].filter(i=>!unique.has(i.url)&&unique.add(i.url));
  if(scenes.length)c.cover=assetRecord(scenes[0],c.name+' · Ambiance SAXSO');
  stats.hdAmbiences+=scenes.length;
  for(const v of c.variants){
    stats.references++;
    const source=records.get(v.id);if(!source)throw Error('Missing audited reference '+v.id);
    v.productType=source.productType||source.kind;
    v.piece=source.productTypeLabel||source.kindLabel;
    v.finish=source.surfaceFinish||finishLabel(v)||'Finition selon référence';
    v.colour=colourFr(source.color||source.colors?.join(' / ')||'');
    if(v.id==='saxso-107-548-500-rosso-verona-granulati-812-16-mm'){
      v.sourceReference=source.reference;
      v.reference=v.reference.replace('812/16','12/16');
      v.label=v.label.replace('812/16','12/16');
      v.note='Calibre 12/16 mm : correction de la coquille « 812/16 » du catalogue, confirmée par la ligne correspondante en sacs.';
    }
    delete v.geometry;delete v.format;
    v.geometry=parseGeometry(v);
    const profileText=(source.surfaceFinishSource||[]).join(' ').toLowerCase();
    if(/toro|bullnose|arrotondat|bord[^.]{0,20}arrondi/.test(profileText))v.geometry.edge='bullnose';
    else if(/smusso|chanfrein|biseaut/.test(profileText))v.geometry.edge='chamfer';
    else if(/lati lunghi a spacco|côtés longs clivés/.test(profileText))v.geometry.edge='natural';
    if(/gocciolatoio|goutte.?d.?eau/.test(profileText))v.geometry.dripEdge=true;
    if(v.productType==='coping'&&/^Sakkara Grey/.test(v.reference))Object.assign(v.geometry,{edge:'bullnose',profileSource:'https://www.saxso.it/product_category/outdoor-floor-sakkara/'});
    Object.assign(v.geometry,profiles[v.id]||{});
    // The source headings identify pieces that were omitted from reference strings.
    if(v.productType==='sphere'&&!v.geometry.diameterCm){const value=v.reference.match(/(\d+(?:[.,]\d+)?)\s*$/);if(value){v.geometry.diameterCm=Number(value[1].replace(',','.'));v.geometry.dimensionsKnown=true;v.geometry.formatLabel='Ø '+value[1]+' cm';}}
    v.format=v.geometry.formatLabel+(v.geometry.thicknessCm?' · ép. '+String(v.geometry.thicknessCm).replace('.',',')+' cm':v.geometry.thicknessRange?' · ép. '+v.geometry.thicknessRange.map(n=>String(n).replace('.',',')).join('–')+' cm':'');
    v.productPhoto=null;v.materialPhoto=null;delete v.visual;
    const photo=copySource(source.productPhoto);
    if(photo){v.productPhoto={...photo,matchConfidence:source.matchConfidence||source.confidence,sourceReference:source.reference};stats.exactSourcePhotographs++;}
    const match=official.variants[v.id]?.materialAssetId?official.variants[v.id]:(supplements.variants?.[v.id]||official.variants[v.id]);
    const material=match?.materialAssetId&&official.assets[match.materialAssetId];
    if(material){
      v.materialPhoto=assetRecord(material,match.finishExact?'Matière et finition photographiées':'Nuance de la matière · photographie SAXSO',{finishExact:!!match.finishExact,shapeExact:false,note:match.finishExact?'Photographie de la matière et de la finition indiquées dans cette référence.':'Nuancier photographique de la couleur. Consultez Produit pour la finition et Format pour les dimensions de la pièce.'});
      if(match.sampleRegion){const r=match.sampleRegion;v.materialPhoto.cropRect=[r.x,r.y,r.width,r.height];v.materialPhoto.note+=' '+(match.sampleRegionMeaning||'Partie du nuancier correspondant au produit.');}
      const primary=match.primaryPhotoAssetId&&official.assets[match.primaryPhotoAssetId];
      if(primary&&match.shapeExact)v.productPhoto=assetRecord(primary,'Photographie du produit · '+v.label,{shapeExact:true,finishExact:true,note:'Photographie du produit SAXSO diffusée par le distributeur Rouchy : Sakkara Grey adouci et vieilli, 40 × 60 cm, épaisseur 1 cm.'});
      stats.officialMaterialPhotographs++;
    }else if(source.materialPhoto||photo){
      const matter=copySource(source.materialPhoto)||photo;
      const crop=source.materialPhoto?.cropRect||source.materialCropRect;
      v.materialPhoto={...matter,label:'Matière · photographie du catalogue',finishExact:source.matchConfidence==='high',textureEligible:!!crop,note:source.matchConfidence==='high'?'Photographie source correspondant à la référence, conservée à sa taille native.':'Exemple de matière du catalogue. Les différentes nuances sont indiquées dans la référence.'};
      if(crop)v.materialPhoto.cropRect=crop;
      stats.sourceMaterialDetails++;
    }else stats.sourceOnlyReferences++;
    if(v.materialPhoto?.textureEligible===false&&colours[v.id]){
      v.geometry.materialColor=colours[v.id].hex;
      v.geometry.materialColorSource={page:colours[v.id].sourcePage,xref:colours[v.id].sourceXref,method:colours[v.id].method};
    }
    stats.formatIllustrations++;
    v.visualSource={page:source.page,match:source.matchConfidence||source.confidence,basis:source.mappingBasis,photograph:!!photo,formatIllustration:true};
    provenance.references.push({id:v.id,productType:v.productType,piece:v.piece,finish:v.finish,colour:v.colour,sourcePage:source.page,productPhoto:v.productPhoto?.url||null,materialPhoto:v.materialPhoto?.url||null,match:v.visualSource.match,basis:source.mappingBasis,dimensionsKnown:v.geometry.dimensionsKnown});
  }
}
const used=new Set(data.collections.flatMap(c=>[c.cover?.url,...c.images.map(i=>i.url),...c.variants.flatMap(v=>[v.productPhoto?.url,v.materialPhoto?.url])]).filter(Boolean));
for(const a of Object.values(official.assets))if(used.has(a.url))provenance.assets.push({url:a.url,width:a.width,height:a.height,sourceUrl:a.sourceUrl,sourcePage:a.pages?.[0],sourceType:'official',nativeWidth:a.nativeWidth,nativeHeight:a.nativeHeight,sourceSha256:a.sourceSha256,sha256:a.outputSha256});
data.version='20261112-saxso-hd2';
data.provenance.visualAudit={...stats,sourcePhotographsUpscaled:false,illustrationsLabelled:true,manifest:'assets/data/saxso-visual-sources.json'};
writeFileSync(cataloguePath,JSON.stringify(data)+'\n');
writeFileSync(resolve(root,'assets/data/saxso-visual-sources.json'),JSON.stringify({...provenance,summary:stats})+'\n');
console.log(JSON.stringify(stats));
