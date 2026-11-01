#!/usr/bin/env python3
"""Merge official web metadata with verified catalogue indexes and PDF-only ranges.
Run after build_fenice_catalogue.py. PDFs are optional local extraction inputs,
kept outside source. Source pages are PDF page numbers, printedPage is the paper
folio. The public dataset never contains professional prices.
"""
import pathlib,json,re,unicodedata,urllib.parse
ROOT=pathlib.Path(__file__).resolve().parents[1]
PDFS=ROOT.parent/'fenice-pdfs'
P=ROOT/'assets/data/fenice-catalogue.json'
def slug(s):return re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip('-')
def norm(s):return re.sub('[^a-z0-9]','',slug(s))
def uniq(s):return list(dict.fromkeys(s))
data=json.loads(P.read_text())
label_map={'Novità Cersaie 2026':('cersaie-2026','Nouveautés Cersaie 2026'),'Aspen':('aspen','Aspen'),'Collections 2026 120×120':('collections-120x120','Collections 2026 · 120×120'),'Rivestimenti e Levigati 2026/2027':('wall-2026-2027','Revêtements et polis 2026/2027'),'Catalogo Generale 2026/2027':('general-2026-2027','Catalogue général 2026/2027'),'Merchandising 2026/2027':('merchandising-2026-2027','Merchandising 2026/2027'),'Novità Cersaie 2025':('cersaie-2025','Nouveautés Cersaie 2025'),'Nuove Collezioni 2025':('collections-2025','Nouvelles collections 2025'),'La Fenice Home':('fenice-home','La Fenice Home')}
for c in data['catalogues']:
 c['id'],c['label']=label_map.get(c['name'],(c['id'],c['name']))
cats={c['id']:c for c in data['catalogues']}
effects={'contemporary':'Effet béton et résine','marble':'Effet marbre','metal':'Effet métal','new-traditions':'Tradition et couleur','stone':'Effet pierre','wood':'Effet bois','art':'Décor et matière'}
for c in data['collections']:
 c['slug']=c['id'];c['id']='fenice-'+c['slug'];c['sourceUrl']=c['url']
 c['swatches']=c['colors'];c['colors']=[s['name'] for s in c['swatches'] if s['name']]
 c['effect']=next((label for key,label in effects.items() if any(key in slug(e) for e in c['effects'])),'Carrelage')
 c['finishes']=[];c['sources']=[];c['catalogueIds']=[]
 c['categories']=[{'FLOOR TILE - Pavimenti':'Sol','WALL TILE - Rivestimenti':'Mur','OUTDOOR - Esterno':'Extérieur','WALL BRICK - Muretti':'Parement'}.get(x,x) for x in c['categories']]
# Marble Velvet colour families share one collection, kept separate from polished Statuario.
mv=[c for c in data['collections'] if c['name'].startswith('Marble Velvet')]
if mv:
 base=dict(mv[0]);base.update(id='fenice-marble-velvet',slug='marble-velvet',name='Marble Velvet',colors=[c['name'].split('–')[-1].strip() for c in mv],swatches=[],images=uniq(u for c in mv for u in c['images']),formats=uniq(f for c in mv for f in c['formats']),decors=[x for c in mv for x in c['decors']])
 data['collections']=[c for c in data['collections'] if c not in mv]+[base]
# Public PDF-only ranges do not yet have detail pages in the official A-Z index.
supp=[
 ('Allure',['120x120','60x120','90x90'],['Diamante','Perla','Ambra','Quarzo'],'Effet marbre',['Soft touch'],'cersaie-2026',2,[4,6,8]),
 ('Aspen',['60x60','20x120','7,5x60','7,5x30'],['White','Sand','Oak','Ash','Greige','Dark'],'Effet bois',[],'cersaie-2026',12,[14,16,18]),
 ('City Loft',['120x120','60x120','60x60'],['Tokyo','New York','Milano','Berlino','Oslo','Miami'],'Effet béton et résine',['Soft touch'],'cersaie-2026',24,[26,28,30]),
 ('Heritage',['60x60','30x30','7,5x30'],['Bianco Gioia','Calacatta Oro','Madreperla','Tortora Chiaro','Cashmere','Tabacco Brown','Nero Antico','Calacatta Cardinale','Rosso Francia','Verde Smeraldo'],'Effet marbre',['Soft touch','Bord vieilli'],'cersaie-2026',40,[42,44,46]),
 ('Oykos',['120x120','90x90','60x120','60x60'],['White','Ivory','Beige','Taupe','Grey'],'Effet pierre',['Mat','Grip'],'cersaie-2026',52,[54,58,60]),
 ('Oykos Fossil',['60x60','30x60'],['White','Ivory','Beige','Taupe','Grey'],'Effet pierre',[],'cersaie-2026',54,[56,57]),
 ('Bianchi',['30x90','30x60','20x20','10x10'],['Bianco'],'Revêtement mural',['Mat','Brillant'],'wall-2026-2027',10,[12]),
 ('Cromie 2.0',['20x20'],['Marengo','Nero','Bianco','Grigio','Osso','Bordeaux','Celeste','Cobalto','Alga','Verde','Beige','Crema','Giallo','Mostarda','Rosso'],'Tradition et couleur',['Mat','Brillant'],'wall-2026-2027',12,[14,16]),
 ('Living Wall',['20x60'],['Bianco','Grigio','Beige','Avorio'],'Effet béton et résine',['Mat'],'wall-2026-2027',24,[26,28]),
 ('LifesTile',['60x120','120x120'],['Charme Green','Charme Blue','Clorofilla','Dalì','Flora Warm','Flora Cold','Foglie Panna','Foglie Caffè','Ventaglio Platino','Ventaglio Oro','Motive Cold','Motive Warm','Peonia','Jolie','Tropical Blue','Tropical Green','Garden Light','Bloom Gold','Spring Day','Track Nut','Spring Night','Pattern Dark'],'Décoration murale',[],'general-2026-2027',386,[388,390,392]),
 ('Prime Stone',['120x120'],['White','Bone','Beige','Taupe'],'Effet pierre',[],'collections-120x120',54,[56,58,60]),
]
# Local generated assets contain only embedded official imagery, never prices.
def extract_images(cat_id,name,pages):
 cat=cats[cat_id];f=PDFS/urllib.parse.unquote(cat['url'].rsplit('/',1)[-1]);out=[]
 if not f.exists():return out
 import fitz
 from PIL import Image
 import io
 doc=fitz.open(f);folder=ROOT/'assets/img/fenice-selection-20261101';folder.mkdir(parents=True,exist_ok=True)
 seen=set()
 for pg in pages:
  if pg>len(doc):continue
  ims=doc[pg-1].get_images(full=True)
  if not ims:continue
  # Largest embedded picture is the photographed room / collection texture.
  im=max(ims,key=lambda x:x[2]*x[3]);xref=im[0]
  if xref in seen:continue
  seen.add(xref)
  try:
   pic=Image.open(io.BytesIO(doc.extract_image(xref)['image'])).convert('RGB');pic.thumbnail((1600,1600))
   rel=f'assets/img/fenice-selection-20261101/{slug(name)}-{len(out)+1:02d}.webp';pic.save(ROOT/rel,'WEBP',quality=84,method=6);out.append(rel)
  except Exception:pass
 return out
for name,formats,colors,effect,finishes,cat_id,printed,pages in supp:
 if any(norm(c['name'])==norm(name) for c in data['collections']):continue
 cat=cats[cat_id]
 c={'id':'fenice-'+slug(name),'slug':slug(name),'name':name,'sourceUrl':cat['url'],'url':cat['url'],'formats':formats,'colors':colors,'swatches':[],'decors':[],'effect':effect,'effects':[effect],'finishes':finishes,'categories':['Mur'] if name in ['Bianchi','Cromie 2.0','Living Wall','LifesTile'] else ['Sol'],'images':extract_images(cat_id,name,pages),'pdf':cat['url'],'sources':[],'catalogueIds':[]}
 data['collections'].append(c)
# The current general index refers to Natural Terre as Natural.
general=[('Amazing',104),('Antique Aurea',22),('Apache',112),('Briccole',340),('Calcarea',118),('Circus',258),('Core',124),('Docks 25',132),('Dolmen',138),('Étoile',146),('Ever',154),('Fiordi',160),('Genesis',166),('Glowood',346),('Hollywood',352),('Il Travertino',172),('Lapis',38),('Le Doghe',360),('LifesTile',386),('Lime Evolution',182),('Lithos',192),('Lumiere',46),('Majestic',54),('Marble Velvet',74),('Meco',204),('Natural Terre',264),('Natural Resine',274),('Norbistone',224),('Paris',286),('Patagonia',212),('Pietra De’ Medici',216),('Polveri Vietresi',402),('Polveri Vietresi Wall',412),('Rovere',374),('Saturn',230),('Segesta',86),('Shabby Wood',376),('Shapes',238),('Slate',244),('Steel Art',288),('Stone',250),('Suveya – Reactive 3D Evo',96),('Tendance',380),('Touch',294),('Touch Evo',306),('Walk Materials',316),('Woodland',382),('X Beton',322),('X Metal',330)]
wall=[('Beton Wall',6),('Bianchi',10),('Cromie 2.0',12),('Easy',16),('Emotion',18),('Gate',20),('Jungle Wall',22),('Living Wall',24),('Metal Wall',28),('Shabby Wall',32),('Wall Rock',34),('Calacatta Gold',36),('Flash',38),('Imperial Grey',40),('Marfil Creme',42),('Royal',44),('Statuario',46),('Supreme',48),('Thasos',50)]
sizes=[('LifesTile',2),('Natural Terre',12),('Natural Resine',18),('Il Travertino',24),('Étoile',30),('Touch',36),('Lumiere',42),('Lime Evolution',48),('Prime Stone',54),('Walk Materials',60)]
indices={'general-2026-2027':general,'wall-2026-2027':wall,'collections-120x120':sizes,'cersaie-2026':[(x[0],x[6]) for x in supp if x[5]=='cersaie-2026'],'aspen':[('Aspen',1)]}
for cat_id,entries in indices.items():
 cat=cats[cat_id]
 for name,pp in entries:
  c=next((c for c in data['collections'] if norm(c['name'])==norm(name)),None)
  if c:
   page=pp if cat_id=='aspen' else pp+2
   c['sources'].append({'catalogueId':cat_id,'label':cat['label'],'url':cat['url'],'page':page,'printedPage':pp})
   c['catalogueIds'].append(cat_id)
# Map the retained specialist catalogues to exact collection-name headings.
for cat_id,cat in cats.items():
 if cat_id in indices or cat['kind']!='products':continue
 f=PDFS/urllib.parse.unquote(cat['url'].rsplit('/',1)[-1])
 if not f.exists():continue
 import fitz
 doc=fitz.open(f)
 text_pages=[[norm(t) for t in p.get_text().splitlines()] for p in doc]
 for c in data['collections']:
  target=norm(c['name']);best=None
  aliases=[target]
  if target=='suveyareactive3devo':aliases+=['suveya']
  if target=='lif estile'.replace(' ',''):aliases+=['lifestyle120']
  for i,lines in enumerate(text_pages):
   if i<2:continue
   if any(a in lines for a in aliases):best=i+1;break
  if best:
   c['sources'].append({'catalogueId':cat_id,'label':cat['label'],'url':cat['url'],'page':best})
   c['catalogueIds'].append(cat_id)
# Every collection links to its own official downloadable sheet as well.
for c in data['collections']:
 if not c['sources'] and c['pdf']:
  c['sources']=[{'catalogueId':'collection-'+c['slug'],'label':'Catalogue '+c['name'],'url':c['pdf'],'page':1}]
 c['catalogueIds']=uniq(c['catalogueIds'])
 c['colors']=uniq(c['colors']);c['formats']=uniq(c['formats']);c['images']=uniq(c['images'])
 # The PDF page source is preferred over the website when selecting collection data.
 c['source']=c['sourceUrl']
 c['priceSource']='authorized-professional-tariff'
data['collections'].sort(key=lambda c:slug(c['name']))
data['counts']={'collections':len(data['collections']),'catalogues':len(data['catalogues']),'images':sum(len(c['images']) for c in data['collections'])}
P.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(data['counts']))
