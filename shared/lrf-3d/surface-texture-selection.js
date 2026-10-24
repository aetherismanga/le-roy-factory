import {COLLECTIONS} from './surface-catalog.js';
import products from './commercial-surfaces.json' with {type:'json'};
import {commercialSurfaceProduct} from './surface-identity.mjs';
const commercialProduct=finish=>commercialSurfaceProduct(finish,products.products);

// The commercial reference identifies a physical format and finish. A new HD
// face must never replace the legacy colour source for a different reference.
export function resolveSurfaceTexture(collection,id,profile='balanced',finish={},context={}){
 const collections=context.collections||COLLECTIONS,definition=collections[collection],choice=definition?.colors.find(color=>color.id===id);
 const productFor=context.productFor||commercialProduct,format=finish.format||'',product=definition?.brand==='ELIOS'&&choice?.textureVariantsByReference?productFor({...finish,collection,color:id,format}):null;
 const reference=product?.reference||'',candidate=choice?.textureVariantsByReference?.[reference];
 const formatMatches=!!format&&product?.format===format&&(!candidate?.format||candidate.format===format)&&(!candidate?.formats||candidate.formats.includes(format));
 const mapped=definition?.brand==='ELIOS'&&product?.brand==='ELIOS'&&product?.colorId===id&&candidate?.verified===true&&formatMatches&&finish.texturePattern!=='opus';
 const selected=mapped?candidate.textureVariants?.[profile]:choice?.textureVariants?.[profile]||(choice?.faces?.length?choice.faces:choice?.file?[choice.file]:[]);
 const faceCounts=mapped?['fluid','balanced','max'].map(quality=>candidate.textureVariants?.[quality]).filter(Array.isArray).map(files=>files.length).filter(Boolean):[];
 const limit=faceCounts.length?Math.min(40,...faceCounts):40;
 const files=(Array.isArray(selected)?selected:selected?[selected]:[]).filter(file=>typeof file==='string'&&file.trim()).slice(0,limit);
 const sourceKey=JSON.stringify(mapped?[collection,id,format,reference]:[collection,id,'legacy']);
 return {files,sourceKey,cacheKey:'surface|'+sourceKey+'|'+profile,format,reference,profile,mapped,rotation:mapped?candidate.textureRotation:choice?.textureRotation,choice};
}

export function finishForSurface(collection,color,layout={},finish={},collections=COLLECTIONS){
 const format=collections[collection]?.formats.find(f=>Math.abs(f.width-Number(layout.width))<.001&&Math.abs(f.height-Number(layout.height))<.001);
 // Geometry is authoritative when a saved catalogueKey belongs to an older size.
 const sized=Number(layout.width)>0&&Number(layout.height)>0;
 return {...finish,collection,color,format:format?.id||(sized?'':finish.format||''),texturePattern:layout.pattern||finish.texturePattern||finish.pattern};
}
