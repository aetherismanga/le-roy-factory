// Catalogue presence, visual definition and technical availability are separate.
// Reviewed limited samples stay selectable with an honest label in the picker.
const reviewedExclusions=Object.freeze({'Glow|washington':'framed-blank-image','Marechiaro|amalfi':'floral-panel-excluded'});
export function surfaceColorIssue(collection,color){
 if(!color||color.available3d===false)return 'no-usable-manufacturer-face';
 if(collection==='Peinture')return /^#[\da-f]{6}$/i.test(color.hex||'')?null:'missing-paint-colour';
 const reviewed=reviewedExclusions[collection+'|'+color.id];if(reviewed)return reviewed;
 if(collection==='Skultura'&&color.nativeFaces!==true)return 'prelit-relief-photograph';
 const faces=color.faces?.length?color.faces:color.file?[color.file]:[];
 if(!faces.length||faces.some(file=>typeof file!=='string'||!file.trim()))return 'missing-texture-file';
 const [width,height]=color.resolution||[];
 if(!(width>0&&height>0))return 'unreviewed-source-definition';
 if(color.definitionLimited===true&&['Slate','Allure','COCO','Venere'].includes(collection))return null;
 // Newly reviewed catalogue extracts remain honest previews. Their source
 // pixels are preserved, and neither this exception nor a larger derivative
 // marks them as original manufacturer HD faces.
 if(color.definitionLimited===true&&color.previewReviewed===true&&color.nativeFaces===false&&color.textureProvenance?.kind==='manufacturer-catalogue-sample'&&/^https:\/\/eliosceramica\.com\/wp-content\/uploads\/.+\.pdf(?:#.*)?$/i.test(color.textureProvenance.source||''))return null;
 if(Math.max(width,height)<700||width*height<150000)return 'insufficient-source-definition';
 return null;
}
