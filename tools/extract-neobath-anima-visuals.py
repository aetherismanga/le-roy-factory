"""Extract identified manufacturer photographs, never synthesize a product view.

Run against the 81-page, 35 MB ANIMA catalogue. Native raster dimensions are
preserved; vector-only diagrams are rendered explicitly as technical drawings.
"""
from pathlib import Path
import argparse, hashlib, io, json, re
import fitz
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--pdf', required=True)
parser.add_argument('--finishes', help='Verified finish extraction manifest')
parser.add_argument('--materials', help='Verified official ceramic material manifest')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
pdf = fitz.open(args.pdf)
catalogue = json.loads((root/'functions/neobath-anima/catalogue.json').read_text())
out = root/'assets/img/neobath-anima-2026/product-photos'
gallery = root/'assets/img/neobath-anima-2026/gallery-hd'
out.mkdir(parents=True, exist_ok=True)
gallery.mkdir(parents=True, exist_ok=True)
manifest = {'version':'20261102-anima-manufacturer-visuals-2', 'source':{
    'url':'https://www.diffusionedesign.com/wp-content/uploads/2026/09/NEOBATH-ANIMA-2026.pdf',
    'sha256':hashlib.sha256(Path(args.pdf).read_bytes()).hexdigest(), 'pages':len(pdf)},
    'products':{}, 'families':{}, 'compositions':{}, 'finishes':{}, 'facades':{}, 'materials':{},
    'policy':{'noUpscaling':True,'noGeneratedProductPhotographs':True,'nativeRasterDimensionsPreserved':True}}

def save_webp(im,path,lossless=False):
    encoded=io.BytesIO()
    im.save(encoded,'WEBP',quality=94,lossless=lossless,method=4)
    data=encoded.getvalue()
    if not data:raise RuntimeError('Empty manufacturer image encoding: '+str(path))
    Image.open(io.BytesIO(data)).verify()
    temporary=path.with_suffix('.pending')
    temporary.write_bytes(data)
    if temporary.stat().st_size!=len(data):raise RuntimeError('Image write incomplete: '+str(path))
    temporary.replace(path)
    Image.open(path).verify()

def native(key, page, xref, crop=None):
    data = pdf.extract_image(xref)
    im = Image.open(io.BytesIO(data['image'])).convert('RGB')
    original = list(im.size)
    if crop: im = im.crop(crop)
    path = out/(key+'.webp')
    save_webp(im,path)
    value = {'image':'/'+path.relative_to(root).as_posix(), 'width':im.width,'height':im.height,
             'nativeSize':original, 'sourcePdfPage':page, 'sourceXref':xref,
             'kind':'manufacturer-photograph', 'familyImage':True,
             'quality':'native-catalogue-photograph', 'upscaled':False}
    if crop: value['nativeCrop'] = list(crop)
    manifest['families'][key] = value
    return value

# PDF page, image XObject. Every association was visually checked against its
# printed model heading. Formats sharing a family retain a family image.
families = {
 'pura-vanity-2-drawers':(65,426), 'ribelle-vanity-2-drawers':(65,418),
 'pura-base-2-drawers':(65,442), 'ribelle-base-2-drawers':(65,438),
 'pura-vanity-2-doors':(65,430), 'ribelle-vanity-2-doors':(65,434),
 'pura-base-2-doors':(65,446), 'ribelle-base-2-doors':(65,422),
 'pura-vanity-1-drawer':(66,457), 'ribelle-vanity-1-drawer':(66,465),
 'pura-base-1-drawer':(66,461), 'ribelle-base-1-drawer':(66,469),
 'pura-base-1-door':(67,487), 'ribelle-base-1-door':(67,491),
 'pura-column':(67,499), 'ribelle-column':(67,503), 'tpc-cover':(67,483),
 'tk-single':(68,516), 'tk-double':(68,518), 'picasso':(68,526), 'just':(68,522),
 'ta-single':(68,530), 'ta-double':(68,528),
 'bnt-single':(69,540), 'bnt-offset':(69,541),
 'bnt-colour-single-hd':(69,538), 'bnt-colour-double-hd':(69,539),
 'geacril-b938':(70,568), 'geacril-b855':(70,570), 'geacril-b570':(70,566),
 'geacril-b574':(70,574), 'geacril-b452':(70,572),
 'geacril-double-layout':(70,552), 'geacril-deep-double-layout':(70,560),
 'geacril-single-layout':(70,556), 'geacril-deep-single-layout':(70,564),
 'geacril-stone-b575':(71,586), 'geacril-stone-b576':(71,584),
 'ocritech-conca':(72,614), 'ocritech-conca-h12':(72,618),
 'mineral-single':(72,622), 'mineral-double':(72,626),
 'mineral-h10-single':(72,630), 'mineral-h10-double':(72,634),
 'gres-basic':(73,638), 'gres-hide':(73,653), 'gres-simply':(73,649), 'gres-tws':(73,651),
 'hpl-fenix-a':(74,673), 'hpl-fenix-b':(74,721), 'hpl-fenix-c':(74,695),
 'hpl-fenix-d':(74,717), 'hpl-fenix-e':(74,725),
 'ocritech-round':(75,742), 'ocritech-oval':(75,746),
 'eclisse-round':(75,747), 'eclisse-oval':(75,748), 'eclisse-square':(75,749),
 'ceramic-fo01':(76,784), 'ceramic-fo02':(76,776), 'ceramic-fo03':(76,772),
 'ceramic-fo04':(76,780), 'ceramic-cvr45':(76,788),
 'geacril-b571':(76,760), 'geacril-b578':(76,768), 'geacril-b860':(76,764),
 'mirror-sf':(77,794), 'mirror-sfr':(77,796), 'mirror-sfi':(77,798),
 'mirror-spt':(77,800), 'mirror-sptr':(77,802), 'mirror-edn':(77,804),
 'mirror-ar':(78,814), 'mirror-arl':(78,816), 'mirror-ars':(78,818),
 'mirror-makeup-oval':(78,808), 'mirror-makeup-round':(78,810), 'mirror-makeup-rect':(78,812),
 'mirror-offset':(79,822), 'mirror-up':(79,824), 'mirror-sft':(79,826),
 'touch':(79,827), 'lamp-moon':(80,845), 'lamp-barled':(80,839), 'lamp-plexy':(80,837),
 'lamp-diamante':(80,831), 'lamp-smart':(80,835), 'lamp-solarq':(80,843), 'lamp-solarr':(80,841),
 'support-stf40':(74,961), 'drain-mcpi':(71,588), 'sidebar':(54,260), 'bridge-family':(56,270),
}
for key, (page,xref) in families.items(): native(key,page,xref)
native('pura-wall',67,495,(0,0,107,201))
native('ribelle-wall',67,495,(107,0,216,201))
# Ocritech doubles and metal frame diagrams are vectors/combinations of native
# pieces in the source. Keep the exact source outline rather than a proxy photo.
for key,page,rect in [
 ('bridge-h15',57,(827,716,972,752)), ('bridge-h35',57,(966,690,1114,754))]:
    scale=3 if page==57 else 150/72
    pix=pdf[page-1].get_pixmap(matrix=fitz.Matrix(scale,scale),clip=fitz.Rect(rect),alpha=False)
    im=Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
    path=out/(key+'.webp');save_webp(im,path,lossless=True)
    manifest['families'][key]={'image':'/'+path.relative_to(root).as_posix(),'width':im.width,'height':im.height,
      'sourcePdfPage':page,'sourceRect':list(rect),'kind':'manufacturer-technical-view',
      'quality':'source-page-extract','familyImage':True,'upscaled':False}

# The catalogue places the same native bowl image twice for BNT120DV. Preserve
# those source pixels and arrangement, excluding overlaid dimension ticks.
source_bowl=Image.open(io.BytesIO(pdf.extract_image(542)['image'])).convert('RGB')
double=Image.new('RGB',(source_bowl.width*2,source_bowl.height))
double.paste(source_bowl,(0,0));double.paste(source_bowl,(source_bowl.width,0))
double_path=out/'bnt-double.webp';save_webp(double,double_path)
manifest['families']['bnt-double']={'image':'/'+double_path.relative_to(root).as_posix(),
 'width':double.width,'height':double.height,'sourcePdfPage':69,'sourceXref':542,
 'nativeSize':[source_bowl.width,source_bowl.height],'sourcePlacements':2,
 'kind':'manufacturer-combined-source-image','quality':'native-catalogue-photograph',
 'familyImage':True,'upscaled':False}

photo_pages={1:7,2:11,3:15,4:18,5:20,6:25,7:27,8:30,9:32,10:36,11:38,12:39,13:42,14:44,15:46,16:49}
for number,page in photo_pages.items():
    info=max(pdf[page-1].get_image_info(xrefs=True),key=lambda d:d['width']*d['height'])
    im=Image.open(io.BytesIO(pdf.extract_image(info['xref'])['image'])).convert('RGB')
    path=gallery/f'composition-{number:02}-native.webp';save_webp(im,path)
    manifest['compositions'][f'{number:02}']={'image':'/'+path.relative_to(root).as_posix(),'width':im.width,
      'height':im.height,'sourcePdfPage':page,'sourceXref':info['xref'],'quality':'native-hd','upscaled':False}

def family_for(p):
    cat=p['category'];ref=str(p.get('ref') or p.get('printedRef') or '').upper();id=p['id'];sub=p.get('subtype','')
    if cat=='module':
        facade=p['facade'].lower()
        if sub in ['wall','column']:return facade+'-'+sub
        count=p.get('drawers') or p.get('doors');kind='drawer' if p.get('drawers') else 'door'
        return f'{facade}-{sub}-{count}-{kind}'+('s' if count>1 else '')
    if cat=='worktop':
        if sub=='cover':return 'tpc-cover'
        if ref.startswith('TK'):return 'tk-double' if p.get('basinCount')==2 else 'tk-single'
        if ref.startswith('PIC'):return 'picasso'
        if ref.startswith('JUST'):return 'just'
        if ref.startswith('TA'):return 'ta-double' if p.get('basinCount')==2 else 'ta-single'
        if ref.startswith('BNT'):return 'bnt-double' if p.get('basinCount')==2 else 'bnt-offset' if ref.endswith(('SX','DX')) else 'bnt-single'
        if ref.startswith('TOS'):return 'ocritech-conca-h12'
        if re.match(r'TO\d',ref):return 'ocritech-conca'
        if ref.startswith('TMS'):return 'mineral-h10-double' if p.get('basinCount')==2 else 'mineral-h10-single'
        if ref.startswith('TM'):return 'mineral-double' if p.get('basinCount')==2 else 'mineral-single'
        if ref.startswith('TPGEA'):return 'geacril-b855'
        if ref.startswith('TXT'):return 'geacril-stone-b575'
        if ref.startswith('TGRS'):return 'gres-hide'
        if ref.startswith(('THPL','TFX')):return 'hpl-fenix-a'
    if cat=='basin':
        if ref in ['B938','B855','B570','B574','B452']:return 'geacril-'+ref.lower()
        if ref in ['B575','B576']:return 'geacril-stone-'+ref.lower()
        if ref.startswith('BASIC'):return 'gres-basic'
        if ref.startswith('HIDE'):return 'gres-hide'
        if ref.startswith('SIMPLY'):return 'gres-simply'
        if ref.startswith('TWS'):return 'gres-tws'
        if ref.startswith('VASCA '):return 'hpl-fenix-'+ref[6:7].lower()
        if ref=='PF132690A':return 'ocritech-round'
        if ref=='PF149380A':return 'ocritech-oval'
        if ref.startswith('ECLISSE116'):return 'eclisse-round'
        if ref.startswith('ECLISSE115'):return 'eclisse-oval'
        if ref.startswith('ECLISSE114'):return 'eclisse-square'
        if ref.startswith('FO'):return 'ceramic-'+ref.lower()
        if ref=='CVR45':return 'ceramic-cvr45'
        if ref in ['B571','B578']:return 'geacril-'+ref.lower()
        if ref in ['B860','B861','B862']:return 'geacril-b860'
    if cat=='mirror':
        if ref.startswith('MAKEUPROUND'):return 'mirror-makeup-round'
        if ref.startswith('MAKEUPOVAL'):return 'mirror-makeup-oval'
        if ref.startswith('MAKEUP'):return 'mirror-makeup-rect'
        if ref.startswith('OFFSET'):return 'mirror-offset'
        if ref=='UP':return 'mirror-up'
        for prefix in ['SPTR','SFR','SFI','SFT','SPT','EDN','ARL','ARS','AR','SF']:
            if ref.startswith(prefix):return 'mirror-'+prefix.lower()
    if cat=='lighting':
        for prefix in ['DIAMANTE','BARLED','MOON','SMART','PLEXY','SOLARQ','SOLARR']:
            if ref.startswith(prefix):return 'lamp-'+prefix.lower()
    if cat=='accessory':
        if ref=='SIDEBAR':return 'sidebar'
        if ref=='TOUCH':return 'touch'
        if ref=='STF40':return 'support-stf40'
        if ref=='MCPI':return 'drain-mcpi'
        if sub=='frame':return 'bridge-h15' if p.get('height')==15 else 'bridge-h35'
    return None

for p in catalogue['products']:
    family=family_for(p)
    if family not in manifest['families']:
        manifest['products'][p['id']]={'image':None,'images':[],'kind':'service-or-no-isolated-photograph',
          'sourcePdfPage':p.get('source',{}).get('pdfPage'),'note':'Aucun visuel isolé fabricant disponible; aucune image de substitution inventée.'}
        continue
    value=dict(manifest['families'][family]);value['family']=family;value['images']=[value['image']]
    if p.get('category')=='worktop' and p.get('subtype')=='linear':
        value['note']='Exemple de matériau avec vasque du même catalogue; la configuration et les perçages sélectionnés sont représentés par le moteur 3D.'
    if p.get('category')=='worktop' and p.get('basinCount')==2 and p.get('material')=='ocritech':
        value['depictedBasinCount']=1
        value['note']='Photo de forme de la famille Conca. Aucun visuel isolé fabricant de la version double; le double bac est représenté par le moteur 3D.'
    if p.get('subtype')=='frame':
        value['images'].append(manifest['families']['bridge-family']['image'])
    if p.get('ref') in ['B861','B862']:
        value['note']='Photo fabricant de la même famille rectangulaire B860/B861/B862; format réel défini par la référence sélectionnée.'
    if str(p.get('ref') or '').startswith('ECLISSE') and p.get('subtype')=='semi-recessed':
        value['note']='Forme Eclisse fabricant; la différence posé/semi-encastré est définie par la référence et la géométrie.'
    manifest['products'][p['id']]=value

# Attach the full native composition photographs only to references explicitly
# listed in their source composition, not to look-alike or guessed products.
for preset in catalogue['presets']:
    photo=manifest['compositions'][preset['id']]
    for item in preset['items']:
        if item.get('productId') in manifest['products']:
            value=manifest['products'][item['productId']]
            if photo['image'] not in value['images']:value['images'].append(photo['image'])
            value.setdefault('compositionReferences',[]).append(preset['id'])

if args.finishes:
    details=json.loads(Path(args.finishes).read_text())
    source_names={f['id']:f['name'] for f in catalogue['finishes']}
    for f in details['finishes']:
        wood=f['id']=='rovere-alba'; material=f['material']; preview=f['preview']
        manifest['finishes'][f['id']]={'id':f['id'],'name':source_names[f['id']],
          'hex':material['sampledColor'],'color':material['sampledColor'],
          'swatch':preview['url'],'preview':preview['url'],'image':preview['url'],
          'texture':material['url'],'frontTexture':material['url'],
          'sideTexture':details['verticalOak']['url'] if wood else material['url'],
          'ribelleFrontTexture':details['verticalOak']['url'] if wood else material['url'],
          'frontRotation':0,'frontRepeat':[1,1],'repeat':[1,1],
          'type':'wood' if wood else 'matte','roughness':0.75,
          'previewFacade':f['previewFacade'],'source':material['source'],
          'textureSize':[material['width'],material['height']],
          'swatchSize':[preview['width'],preview['height']],
          'colorAccuracy':'exact manufacturer photographic sample, not a calibrated RAL/NCS measurement',
          'woodGrainDirection':f['woodGrainDirection'],'upscaled':False}
    for key, value in details['facades'].items():
        manifest['facades'][key]={**value,'image':value['url'],'kind':'manufacturer-facade-detail','upscaled':False}
    manifest['finishOverview']={**details['overview'],'image':details['overview']['url']}
    manifest['finishLimitations']=details['limitations']
if args.materials:
    for m in json.loads(Path(args.materials).read_text()):
        manifest['materials'][m['id']]=m

def absolute(value):
    if isinstance(value,str) and value.startswith('/assets/'):return 'https://leroyfactory.fr'+value
    if isinstance(value,list):return [absolute(v) for v in value]
    if isinstance(value,dict):return {k:absolute(v) for k,v in value.items()}
    return value
manifest=absolute(manifest)

target=root/'assets/data/neobath-anima-visuals.json'
temporary=target.with_suffix('.pending')
temporary.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
temporary.replace(target)
print(json.dumps({'families':len(manifest['families']),'products':len(manifest['products']),
 'withImage':sum(bool(p['image']) for p in manifest['products'].values()),'nativeCompositions':len(manifest['compositions'])}))
