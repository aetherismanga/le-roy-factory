// Selection policy only. Keep catalogue definitions and their source files intact
// so existing projects can still restore older materials.
const reviewedExclusions=Object.freeze({
 'Glow|washington':'framed-blank-image',
 'Marechiaro|amalfi':'floral-panel-excluded',
 'Allure|eden':'botanical-panel-excluded'
});
export function surfaceColorIssue(collection,color){
 if(!color||color.available3d===false)return 'no-usable-manufacturer-face';
 if(collection==='Peinture')return /^#[\da-f]{6}$/i.test(color.hex||'')?null:'missing-paint-colour';
 const reviewed=reviewedExclusions[collection+'|'+color.id];if(reviewed)return reviewed;
 // HTTP review found 47–56 px delivered faces despite the catalogue's 1200×700 metadata.
 if(collection==='Azuli Mood')return 'insufficient-delivered-face-definition';
 if(collection==='Skultura'&&color.nativeFaces!==true)return 'prelit-relief-photograph';
 const faces=color.faces?.length?color.faces:color.file?[color.file]:[];
 if(!faces.length||faces.some(file=>typeof file!=='string'||!file.trim()))return 'missing-texture-file';
 // Use the original source resolution, never dimensions produced by upscaling.
 // Long, narrow wood faces are retained when their genuine source has detail.
 const [width,height]=color.resolution||[];
 if(!(width>0&&height>0))return 'unreviewed-source-definition';
 if(Math.max(width,height)<700||width*height<150000)return 'insufficient-source-definition';
 return null;
}
