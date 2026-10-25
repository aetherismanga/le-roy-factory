import contract from './surface-contract.mjs';
import commercialSurfaces from './commercial-surfaces.json' with {type:'json'};

export const SURFACE_CONTRACT_VERSION=contract.version;
const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function surfaceDefinition(collection){return contract.collections.find(item=>norm(item.name)===norm(collection))||null;}
export function canonicalSurfaceColor(collection,color){
 const definition=surfaceDefinition(collection);if(!definition)return null;
 const raw=String(color??''),alias=definition.aliases?.[raw]||definition.aliases?.[norm(raw)];
 return definition.colors.find(item=>item.id===(alias||raw))?.id||definition.colors.find(item=>norm(item.id)===norm(alias||raw)||norm(item.name)===norm(alias||raw))?.id||null;
}
export function commercialSurfaceOptions(finish,products){
 const color=canonicalSurfaceColor(finish.collection,finish.color||finish.colorId);
 if(!color)return [];
 return products.filter(product=>norm(product.collection)===norm(finish.collection)&&canonicalSurfaceColor(product.collection,product.colorId||product.color)===color&&product.format===finish.format);
}
export function commercialSurfaceProduct(finish,products){
 const options=commercialSurfaceOptions(finish,products);
 const exact=options.find(product=>product.key===finish.catalogueKey)||options.find(product=>finish.reference&&product.reference===finish.reference);
 if(exact)return exact;
 // A per-cell colour inherits the wall's finish, but its SKU belongs to that
 // colour. Recover older rows from the source SKU when no finish was stored.
 const source=products.find(product=>product.key===finish.catalogueKey)||products.find(product=>finish.reference&&product.reference===finish.reference),requiredFinish=finish.finish||source?.finish;
 if(requiredFinish)return options.find(product=>product.finish===requiredFinish)||null;
 if(finish.catalogueKey||finish.reference)return null;
 return options[0]||null;
}

// Resolve only reviewed aliases. A commercial SKU/finish is never replaced by
// another SKU when its render colour has a different historical identifier.
export function canonicalSurfaceIdentity(tile,{products,usage}={}){
 if(!tile||typeof tile!=='object')throw Error('Référence de revêtement absente.');
 const key=tile.catalogueKey||tile.key||'',requested=key&&products?.find(product=>product.key===key);
 if(products&&key&&!requested)throw Error('La référence '+key+' n’existe pas dans le catalogue partagé.');
 if(requested){
  if(norm(requested.collection)!==norm(tile.collection)||(tile.format&&requested.format!==tile.format)||(tile.reference&&requested.reference&&tile.reference!==requested.reference))throw Error('La référence, la collection et le format du revêtement ne correspondent pas.');
  const requestedColor=canonicalSurfaceColor(tile.collection,requested.colorId||requested.color),tileColor=canonicalSurfaceColor(tile.collection,tile.sourceColorId||tile.colorId||tile.color);
  if(requestedColor!==tileColor)throw Error('Le coloris ne correspond pas à la référence commerciale enregistrée.');
 }
 const definition=surfaceDefinition(tile.collection);if(!definition)throw Error('Collection non reconnue : '+String(tile.collection||'sans nom')+'. Le projet d’origine est conservé.');
 if(usage&&definition.surfaces&&!definition.surfaces.includes(usage))throw Error(definition.name+' ne convient pas à cette surface.');
 const sourceColorId=String(requested?.colorId||tile.sourceColorId||tile.colorId||tile.color||''),color=canonicalSurfaceColor(definition.name,sourceColorId);
 if(!color)throw Error('Coloris non reconnu : '+definition.name+' / '+sourceColorId+'. Aucun autre coloris n’a été appliqué.');
 const format=requested?.format||tile.format||'';
 if(format&&!definition.formats.some(item=>item.id===format))throw Error('Format non reconnu pour '+definition.name+' : '+format+'.');
 const choice=definition.colors.find(item=>item.id===color),reference=requested?.reference||tile.reference||'';
 if(usage&&choice.exportable===false)throw Error('Le visuel 3D de '+definition.name+' '+choice.name+' n’est pas validé. Le plan et sa référence sont conservés.');
 const fidelity=choice.textureProvenance?.kind==='ai-reconstruction'?'ai-reconstruction':choice.definitionLimited===true&&choice.previewReviewed===true?'catalogue-preview':choice.references?.includes(reference)?'reference-verified':sourceColorId!==color?'color-preview':'manufacturer-face';
 return {collection:definition.name,color,colorId:color,sourceColorId,format,reference,catalogueKey:requested?.key||key,finish:requested?.finish||tile.finish||'',fidelity,contractVersion:contract.version};
}

// Grout/layout defaults may flow into a child band; a wall's commercial
// identity belongs only to its own collection, colour, size and finish.
const commercialIdentityFields=['catalogueKey','key','reference','sourceColorId','colorId','finish','fidelity','contractVersion','pack','packs'];
function childZoneFinish(parent,zone){
 const collection=zone.collection||parent.collection,color=zone.color||parent.color,format=zone.format||(norm(collection)===norm(parent.collection)?parent.format:'');
 const sameSelection=norm(collection)===norm(parent.collection)&&canonicalSurfaceColor(collection,color)===canonicalSurfaceColor(parent.collection,parent.color)&&format===parent.format;
 const ownKey=zone.catalogueKey||zone.key,ownReference=zone.reference,differentSKU=ownKey&&ownKey!==(parent.catalogueKey||parent.key)||ownReference&&ownReference!==parent.reference;
 const inherited={...parent,zones:undefined};
 if(!sameSelection||differentSKU)for(const key of commercialIdentityFields)delete inherited[key];
 if(norm(collection)!==norm(parent.collection)&&!zone.format)delete inherited.format;
 return {...inherited,...zone,collection,color,zones:undefined};
}

// Validate before touching the live scene. Unsupported legacy data stays in its
// saved project and produces an explicit error instead of a first-colour fallback.
export function normalizeProjectSurfaceIdentities(project){
 const data=structuredClone(project),notices=[];
 const resolve=(finish,layout,label,zone=false)=>{
  if(!finish?.collection||!finish?.color)return finish;
  const definition=surfaceDefinition(finish.collection);
  const format=finish.format||definition?.formats.find(item=>Math.abs(item.width-Number(layout?.width))<.001&&Math.abs(item.height-Number(layout?.height))<.001)?.id||'';
  const selected={...finish,format};
  // Resolve an independent band's own SKU, including legacy bands that stored
  // only a colour. Do not replace an unknown explicit reference with a default.
  const product=zone?commercialSurfaceProduct(selected,commercialSurfaces.products):null,key=selected.catalogueKey||selected.key;
  const exact=product&&(!key&&!selected.reference||product.key===key||product.reference===selected.reference);
  const identity=canonicalSurfaceIdentity(exact?{...selected,catalogueKey:product.key,reference:product.reference,finish:product.finish}:selected,exact?{products:commercialSurfaces.products}:undefined);
  if(identity.fidelity==='color-preview')notices.push(label+' : référence et finition conservées, aperçu de la couleur fabricant '+identity.color+'.');
  if(identity.fidelity==='catalogue-preview')notices.push(label+' : échantillon fabricant de définition limitée ; référence et finition conservées.');
  if(identity.fidelity==='ai-reconstruction')notices.push(label+' : reconstitution visuelle à partir du visuel officiel ; teinte indicative, tampons non originaux du fabricant.');
  return {...finish,...identity,zones:finish.zones?.map((zone,index)=>resolve(childZoneFinish({...finish,...identity},zone),zone,'Zone '+(index+1),true))};
 };
 if(data.floor)data.floor=resolve(data.floor,data.layouts?.floor,'Sol');
 if(Array.isArray(data.walls))data.walls=data.walls.map((finish,index)=>resolve(finish,data.layouts?.walls?.[index],'Mur '+(index+1)));
 data.surfaceNotices=[...new Set(notices)];return data;
}
