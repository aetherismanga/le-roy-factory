// Catalogue presence, visual definition and technical availability are separate.
// Reviewed limited samples stay selectable with an honest label in the picker.
const reviewedExclusions=Object.freeze({'Glow|washington':'framed-blank-image','Marechiaro|amalfi':'floral-panel-excluded'});
function reviewedNativeDecor(collection,color){
 const p=color.textureProvenance,size=color.resolution,official=/^https:\/\/eliosceramica\.com\/wp-content\/uploads\/.+\.(?:jpe?g|png)$/i;
 if(!['Deco','D_esign Evo'].includes(collection)||color.definitionLimited!==true||color.previewReviewed!==true||color.nativeFaces!==false||p?.kind!=='manufacturer-catalogue-sample'||!official.test(p.source||'')||!/^([a-f0-9]{64})$/.test(p.sourceSha256||'')||p.generated!==false||p.upscaled!==false||p.referenceAssignmentVerified!==true||!color.references?.includes(p.reference)||color.formats?.length!==1||color.formats[0]!=='20x20'||!Array.isArray(size)||size.length!==2||!Array.isArray(p.nativeDimensions)||p.nativeDimensions.length!==2||p.nativeDimensions.some((v,i)=>v!==size[i]))return false;
 if(!p.faces?.length||p.faces.length!==color.faces?.length)return false;
 return p.faces.every((face,i)=>official.test(face.source||'')&&face.source===p.source&&face.sourceSha256===p.sourceSha256&&face.generated===false&&face.upscaled===false&&face.nativeSize?.length===2&&face.sourceSize?.length===2&&face.nativeSize.every((v,j)=>Number.isInteger(v)&&v>=100&&v<=250&&v<=face.sourceSize[j])&&face.variants?.max===color.faces[i]&&/^https:\/\/leroyfactory\.fr\/assets\/img\/lrf-plan-pose\/faces\/elios-20261104\/(?:deco|design-evo)\//.test(color.faces[i])&&(!face.crop||face.crop.length===4&&face.crop[0]>=0&&face.crop[1]>=0&&face.crop[2]<=face.sourceSize[0]&&face.crop[3]<=face.sourceSize[1]&&face.crop[2]-face.crop[0]===face.nativeSize[0]&&face.crop[3]-face.crop[1]===face.nativeSize[1]));
}
function reviewedSegmentoFace(collection,color){
 const p=color?.textureProvenance,size=color?.resolution;
 return collection==='Segmento'&&color.nativeFaces===true&&color.previewReviewed===true&&p?.kind==='manufacturer-transfer-original'&&p.manufacturerOriginal===true&&p.generated===false&&p.upscaled===false&&p.referenceAssignmentVerified===true&&/^04I15[0-9A-F]0$/.test(p.reference||'')&&color.references?.includes(p.reference)&&/^[a-f0-9]{64}$/.test(p.sourceSha256||'')&&Array.isArray(size)&&size.length===2&&size.every((v,i)=>v>=529&&v<=535&&v===p.nativeDimensions?.[i])&&(color.faces||[]).every(file=>/^https:\/\/leroyfactory\.fr\/assets\/img\/elios-segmento-20261107\/originals\/[a-z-]+\.jpg$/.test(file));
}
function reviewedMysteriumSlab(collection,color){
 if(collection!=='Mysterium')return false;
 return Object.entries(color.textureVariantsByReference||{}).some(([reference,mapping])=>{
  const p=mapping.textureProvenance;
  return /^LB120[1-6]$/.test(reference)&&mapping.reference===reference&&mapping.colorId===color.id&&mapping.format==='120x278'&&mapping.verified===true&&mapping.nativeFaces===true&&mapping.resolution?.[0]===2780&&mapping.resolution?.[1]===1200&&p?.kind==='manufacturer-portal-original'&&p.manufacturerOriginal===true&&p.reference===reference&&p.format===mapping.format&&p.referenceAssignmentVerified===true&&p.generated===false&&p.upscaled===false&&p.sourceFiles?.length===4&&p.sourceFiles.every((f,i)=>f.filename===reference+'@'+(i+1)+'.jpg'&&/^[a-f0-9]{64}$/.test(f.sha256))&&['fluid','balanced','max'].every(tier=>mapping.textureVariants?.[tier]?.length===4&&mapping.textureVariants[tier].every(file=>typeof file==='string'&&file.startsWith('https://leroyfactory.fr/assets/img/elios-mysterium-20261113/')));
 });
}
export function surfaceColorIssue(collection,color){
 if(!color||color.available3d===false)return 'no-usable-manufacturer-face';
 if(collection==='Peinture')return /^#[\da-f]{6}$/i.test(color.hex||'')?null:'missing-paint-colour';
 const reviewed=reviewedExclusions[collection+'|'+color.id];if(reviewed)return reviewed;
 if(collection==='Skultura'&&color.nativeFaces!==true)return 'prelit-relief-photograph';
 const faces=color.faces?.length?color.faces:color.file?[color.file]:[];
 if(!faces.length||faces.some(file=>typeof file!=='string'||!file.trim()))return 'missing-texture-file';
 const [width,height]=color.resolution||[];
 if(!(width>0&&height>0))return 'unreviewed-source-definition';
 // The collection may have verified HD for one physical SKU while another
 // format keeps its independent, honestly limited catalogue sample.
 if(reviewedMysteriumSlab(collection,color))return null;
 if(color.definitionLimited===true&&['Slate','Allure','COCO','Venere'].includes(collection))return null;
 // Newly reviewed catalogue extracts remain honest previews. Their source
 // pixels are preserved, and neither this exception nor a larger derivative
 // marks them as original manufacturer HD faces.
 if(color.definitionLimited===true&&color.previewReviewed===true&&color.nativeFaces===false&&color.textureProvenance?.kind==='manufacturer-catalogue-sample'&&/^https:\/\/eliosceramica\.com\/wp-content\/uploads\/.+\.pdf(?:#.*)?$/i.test(color.textureProvenance.source||''))return null;
 if(reviewedNativeDecor(collection,color)||reviewedSegmentoFace(collection,color))return null;
 if(Math.max(width,height)<700||width*height<150000)return 'insufficient-source-definition';
 return null;
}
