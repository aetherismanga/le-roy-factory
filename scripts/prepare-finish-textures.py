"""Build colour-preserving texture tiers; originals stay in manufacturer archive.
Usage: python3 scripts/prepare-finish-textures.py /path/Serenade_alba_acabado.jpg
"""
from pathlib import Path
from PIL import Image, ImageCms, ImageStat
import hashlib, json, sys
root=Path(__file__).resolve().parents[1]
sources={'ALBA':Path(sys.argv[1])}
out=root/'dist/assets/finishes/20261022';out.mkdir(parents=True,exist_ok=True)
manifest={'collection':'STUDIO ONE','date':'2026-10-22','notes':['ALBA is the original manufacturer sample attached to Juan Carlos Segura email of 22 October 2026.','ROBLE/NOGAL/WHITE retain existing application assets pending access to the new original attachments.','Physical panel sample dimensions and measured gloss/roughness were not supplied; current material settings are retained.','Reference photographs are not used as flat textures.'],'finishes':{}}
for id,p in sources.items():
 im=Image.open(p)
 if im.info.get('icc_profile'):
  import io
  im=ImageCms.profileToProfile(im,ImageCms.ImageCmsProfile(io.BytesIO(im.info['icc_profile'])),ImageCms.createProfile('sRGB'),outputMode='RGB')
 else: im=im.convert('RGB')
 variants={}
 for mode,size in [('fluid',256),('balanced',1024),('max',2048)]:
  copy=im.copy();copy.thumbnail((size,size),Image.Resampling.LANCZOS)
  file=out/(id.lower()+'-'+mode+'.webp');copy.save(file,format='WEBP',quality=94 if mode=='max' else 90,method=6)
  variants[mode]={'file':str(file.relative_to(root/'dist/assets')),'size':list(copy.size),'bytes':file.stat().st_size}
 swatch=im.transpose(Image.Transpose.ROTATE_90);swatch.thumbnail((128,128),Image.Resampling.LANCZOS);swatch_file=out/(id.lower()+'-swatch.webp');swatch.save(swatch_file,format='WEBP',quality=92,method=6)
 mean=ImageStat.Stat(im.resize((64,64))).mean;hexcolor='#'+''.join(f'{round(x):02x}' for x in mean[:3])
 manifest['finishes'][id]={'original':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'sourcePixels':list(im.size),'newManufacturerSample':id=='ALBA','averageSRGB':hexcolor,'variants':variants,'swatch':str(swatch_file.relative_to(root/'dist/assets'))}
(out/'sources.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
