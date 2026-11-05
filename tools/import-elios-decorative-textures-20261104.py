"""Import reviewed official tile previews; never upscale or map an ambience as a tile.
Source JPEGs must first exist in --sources (downloaded from the cited official URLs).
"""
from pathlib import Path
import argparse, json, hashlib
from PIL import Image

P=argparse.ArgumentParser();P.add_argument('--sources',required=True);args=P.parse_args()
ROOT=Path(__file__).resolve().parents[1];S=Path(args.sources);PUBLIC='https://leroyfactory.fr/assets/img/lrf-plan-pose/faces/elios-20261104'
DEST=ROOT/'assets/img/lrf-plan-pose/faces/elios-20261104';records=[]
M=ROOT/'shared/lrf-3d/manufacturer-surfaces.json';C=ROOT/'shared/lrf-3d/commercial-surfaces.json'
manufacturer=json.loads(M.read_text());commercial=json.loads(C.read_text());collections={c['name']:c for c in manufacturer}
links={}
for family in ['deco','design-evo','azuli-mood','glow']:
 for r in json.loads((S.parent/(family+'-tiles.json')).read_text()):links[r['data-slug']]='https://eliosceramica.com/wp-content/uploads'+r['data-file']

def asset(family,color,slug,crop=None,face=1):
 original=S/(slug+'.jpg');raw=original.read_bytes();im=Image.open(original).convert('RGB');width,height=im.size
 if crop:im=im.crop(crop)
 native=im.size;urls={};outputs={}
 for quality,limit in [('fluid',512),('balanced',1024),('max',4096)]:
  # Shared dimensions reuse one file; no profile enlarges source dimensions.
  size=(min(limit,native[0]),min(limit,native[1]))
  copy=im.copy();copy.thumbnail((limit,limit),Image.Resampling.LANCZOS)
  key=copy.size
  if key not in outputs:
   filename=f'{color}-{face}-{copy.width}x{copy.height}.webp';path=DEST/family/filename;path.parent.mkdir(parents=True,exist_ok=True);copy.save(path,format='WEBP',lossless=max(native)<=512,quality=95,method=6)
   outputs[key]=PUBLIC+'/'+family+'/'+filename
  urls[quality]=outputs[key]
 record={'collection':family,'colorId':color,'face':face,'source':links[slug],'sourceSha256':hashlib.sha256(raw).hexdigest(),'sourceSize':[width,height],'crop':list(crop) if crop else None,'nativeSize':list(native),'variants':urls,'upscaled':False,'generated':False,'encoding':'lossless WebP' if max(native)<=512 else 'WebP quality95'}
 records.append(record);return urls,record

def color(family,id,name,slug,reference=None,mix=None):
 if mix:
  # Manufacturer 4×4/2×7 montage is split into its actual individual tiles.
  original=Image.open(S/(slug+'.jpg'));columns,rows=mix;faces=[];provenance=[]
  for y in range(rows):
   for x in range(columns):
    # Exclude the thin printed grout boundary without synthesizing source pixels.
    crop=(round(x*original.width/columns)+2,round(y*original.height/rows)+2,round((x+1)*original.width/columns)-2,round((y+1)*original.height/rows)-2)
    variants,record=asset(family,id,slug,crop,face=len(faces)+1);faces.append(variants);provenance.append(record)
 else:
  original=Image.open(S/(slug+'.jpg'));w,h=original.size;side=min(w,h);crop=((w-side)//2,(h-side)//2,(w+side)//2,(h+side)//2) if family=='design-evo' and reference is None else None
  variants,record=asset(family,id,slug,crop);faces=[variants];provenance=[record]
 v={q:[f[q] for f in faces] for q in ['fluid','balanced','max']};size=provenance[0]['nativeSize'];limited=max(size)<512
 return {'id':id,'name':name,'file':v['max'][0],'faces':v['max'],'available3d':True,'formats':['20x20'],'source':links[slug],'resolution':size,'nativeFaces':False,'definitionLimited':limited,'previewReviewed':True,'definition':'Carreau décoratif officiel · définition native limitée' if limited else 'Échantillon matière officiel · définition native conservée','continuousDecor':not bool(mix),'textureRotation':0,'textureVariants':v,'textureProvenance':{'kind':'manufacturer-catalogue-sample','source':links[slug],'sourceSha256':provenance[0]['sourceSha256'],'nativeDimensions':size,'generated':False,'upscaled':False,'referenceAssignmentVerified':bool(reference),'reference':reference or '', 'faces':provenance},**({'references':[reference]} if reference else {})}

def product(collection,co,ref,source):
 return {'key':'ELIOS|'+ref,'brand':'ELIOS','collection':collection,'color':co['name'],'colorId':co['id'],'format':'20x20','reference':ref,'finish':'R10 · 10 mm' if collection=='D_esign Evo' else 'R10 · 9 mm','preview':co['file'],'priceTTC':None,'packVerified':True,'packArea':1.2,'packPieces':30,'packSource':source+' · tableau données techniques 30 pcs / 1,20 m²','priceSource':'','priceNote':'','nativeFaces':False,'definitionLimited':co['definitionLimited'],'continuousDecor':co['continuousDecor'],'textureProvenance':co['textureProvenance']}

# Exact references transcribed from the manufacturer's technical table.
deco=[('nordic-a','Nordic A','deco-nordic-a','089D4A1'),('nordic-b','Nordic B','deco-nordic-b','089D4B1'),('nordic-c','Nordic C','deco-nordic-c','089D4C1'),('geo-a-light-blue','Geo A Light Blue','deco-geo-a-light-blue','089D2A1'),('geo-b-bw','Geo B B&W','deco-geo-b-bw','089D2B1'),('geo-c-taupe','Geo C Taupe','deco-geo-c-taupe','089D2C1'),('original-b-bw','Original B B&W','deco-original-b-bw','089D3B1'),('original-b-light-blue','Original B Light Blue','deco-original-b-light-blue','089D3B2'),('original-c-grey','Original C Grey','deco-anthology-original-c-grey','089D3C1'),('original-c-taupe','Original C Taupe','deco-original-c-taupe','089D3C4'),('original-d-grey','Original D Grey','deco-original-d-grey','089D3D1'),('original-d-taupe','Original D Taupe','deco-original-d-taupe','089D3D3'),('etnic-a-bw','Etnic A B&W','deco-etnic-a-bw','089D1A2'),('etnic-a-light-blue','Etnic A Light Blue','deco-etnic-a-light-blue','089D1A1'),('etnic-b-bw','Etnic B B&W','deco-anthology-etnic-b-bw','089D1B2'),('etnic-b-light-blue','Etnic B Light Blue','deco-anthology-etnic-b-light-blue','089D1B1'),('etnic-c-bw','Etnic C B&W','deco-anthology-etnic-c-bw','089D1C1')]
evo=[]
for letter in ['E','F','G','B','A','C','D','Z']:evo.append(('palazzo-ducale-'+letter.lower(),'Palazzo Ducale '+letter,'design-evo-decoro-p-ducale-sogg-'+letter.lower(),'079D50'+letter,None))
for letter in ['X','D','Z','B']:evo.append(('palazzo-ducale-bw-'+letter.lower(),'Palazzo Ducale B&W '+letter,'design-evo-decoro-p-ducale-bw-sogg-'+letter.lower(),'079D60'+letter,None))
for tone,code in [('senape','54'),('ciano','57')]:
 for letter in ['A','B']:evo.append(('evo-'+tone+'-'+letter.lower(),'Evo '+tone.title()+' '+letter,'design-evo-decoro-evo-'+tone+'-sogg-'+letter.lower(),'079D'+code+letter,None))
evo += [('palazzo-ducale-mix','Palazzo Ducale Mix','design-evo-decoro-palazzo-ducale','079D500',(7,2)),('evo-senape-mix','Evo Senape Mix','design-evo-decoro-evo-senape-mix','079D540',(4,4)),('evo-ciano-mix','Evo Ciano Mix','design-evo-decoro-evo-ciano-mix','079D570',(4,4))]
for collection,family,rows,pdf in [('Deco','deco',[(*r,None) for r in deco],'https://eliosceramica.com/wp-content/uploads/2021/03/Deco.pdf'),('D_esign Evo','design-evo',evo,'https://eliosceramica.com/wp-content/uploads/2021/03/DEsigEvo.pdf')]:
 target=collections[collection];ids={r[0] for r in rows};target['colors']=[c for c in target['colors'] if c['id'] not in ids]
 for id,name,slug,ref,mix in rows:
  co=color(family,id,name,slug,ref,mix)
  # The official placement schemas use whole20cm tiles, with a four-tile
  # rosette for Original C and diamonds for Geo. Original B/D are already
  # symmetric single-tile motifs: never crop those as if they were panels.
  if collection=='Deco' and (id.startswith('original-c-') or id.startswith('geo-')):
   co['decorRotations']={'columns':2,'rows':2,'quarterTurns':[0,3,1,2] if id.startswith('original-c-') else [1,0,2,3]}
   co['decorLayoutSource']=pdf+('#page=6' if id.startswith('original-c-') else '#page=5')
  target['colors'].append(co)
  commercial['products']=[p for p in commercial['products'] if p.get('key')!='ELIOS|'+ref]
  row=product(collection,co,ref,pdf)
  if co.get('decorRotations'):row['decorRotations']=co['decorRotations']
  commercial['products'].append(row)
 # Base stock colors only exist as20×20 in this manufacturer collection.
 if collection=='D_esign Evo':
  target['source']='https://eliosceramica.com/collezione/design-evo/'
  for co in target['colors']:
   if co['id'] in ['bianco','brown','grigio','ciano','antracite','verde-inglese','burro','terra-di-siena','tortora']:
    slug='design-evo-'+co['id'];updated=color(family,co['id'],co['name'],slug)
    # This broad material photograph is a reviewed preview, not a native stamp.
    updated['definitionLimited']=False;updated['definition']='Échantillon matière officiel · définition native conservée';co.update(updated)
    for p in commercial['products']:
     if p['collection']==collection and p.get('colorId')==co['id'] and p.get('format')=='20x20':p.update(preview=co['file'],nativeFaces=False,definitionLimited=False)
 for p in commercial['products']:
  if p['collection']==collection and p.get('format')=='20x20' and p.get('reference'):
   p.update(packArea=1.2,packPieces=30,packVerified=True,packSource=pdf+' · tableau données techniques 30 pcs / 1,20 m²')
# Matched source pixels for each physical stock format. These are reviewed
# swatch crops, explicitly not labelled as original manufacturer tile stamps.
for collection,family in [('Azuli Mood','azuli-mood'),('Glow','glow')]:
 target=collections[collection]
 for co in target['colors']:
  if collection=='Glow' and co['id']=='washington':
   # The public source is blank with black borders, not a usable tile face.
   source=co.get('manufacturerSample',{}).get('url',co['source'])
   co.update(file=source,faces=[source],available3d=False,previewReviewed=False,definitionLimited=True,definition='Visuel public non exploitable · tampon fabricant authentique requis')
   co.pop('textureVariantsByReference',None)
   co.pop('textureVariants',None)
   for row in commercial['products']:
    if row['collection']==collection and row.get('colorId')=='washington':row.update(preview='',nativeFaces=False,definitionLimited=True)
   continue
  slug=family+'-'+co['id'];original=Image.open(S/(slug+'.jpg'));w,h=original.size
  stock=[p for p in commercial['products'] if p['collection']==collection and p.get('colorId')==co['id'] and p.get('reference')]
  byref={};forformats={}
  for row in stock:
   dims=[float(v) for v in row['format'].split('x')];aspect=max(dims)/min(dims)
   cropw=min(w,round(h*aspect));croph=min(h,round(w/aspect));x=(w-cropw)//2;y=(h-croph)//2
   variants,record=asset(family,co['id'],slug,(x,y,x+cropw,y+croph));formatted={q:[url] for q,url in variants.items()}
   byref[row['reference']]={'verified':True,'reference':row['reference'],'colorId':co['id'],'format':row['format'],'textureRotation':0,'nativeFaceCount':1,'nativeFaces':False,'textureVariants':formatted,'textureProvenance':{**record,'kind':'manufacturer-swatch-crop','reference':row['reference'],'format':row['format'],'referenceAssignmentVerified':True,'originalManufacturerTileStamp':False}}
   forformats[row['format']]=(formatted,record)
   row.update(preview=variants['max'],nativeFaces=False,definitionLimited=True,textureProvenance=byref[row['reference']]['textureProvenance'])
  default=next((forformats[f['id']] for f in target['formats'] if f['id'] in forformats),next(iter(forformats.values())))
  variants,record=default
  co.update(file=variants['max'][0],faces=variants['max'],textureVariants=variants,textureVariantsByReference=byref,source=links[slug],resolution=record['nativeSize'],nativeFaces=False,definitionLimited=True,previewReviewed=True,definition='Échantillon matière officiel recadré au format du carreau · pas un tampon fabricant original',textureRotation=0,manufacturerSample={'url':links[slug],'resolution':[w,h]},textureProvenance={'kind':'manufacturer-swatch-crop','source':links[slug],'sourceSha256':record['sourceSha256'],'nativeDimensions':record['nativeSize'],'generated':False,'upscaled':False,'originalManufacturerTileStamp':False,'referenceAssignmentVerified':True})
M.write_text(json.dumps(manufacturer,separators=(',',':'),ensure_ascii=False)+'\n');C.write_text(json.dumps(commercial,separators=(',',':'),ensure_ascii=False)+'\n')
# Remove obsolete derivatives from earlier runs of this dedicated import only.
used={u for record in records for u in record['variants'].values()}
for file in DEST.rglob('*.webp'):
 if PUBLIC+'/'+file.relative_to(DEST).as_posix() not in used:file.unlink()
(DEST/'decor-source-provenance.json').write_text(json.dumps({'source':'Official Elios public collection pages and native source JPEGs','fetchedDate':'2026-11-04','notes':['Native 250px individual decor previews are not advertised as HD.','Mix montages are split into physical per-tile pixels, never repeated as one tile.','No source is upscaled, recolored, sharpened or generated.'],'assets':records},indent=2,ensure_ascii=False)+'\n')
print(json.dumps({'decoDecorVariants':len(deco),'designEvoDecorVariants':len(evo),'nativeFaces':len(records),'assetFiles':len(list(DEST.rglob('*.webp')))}))
