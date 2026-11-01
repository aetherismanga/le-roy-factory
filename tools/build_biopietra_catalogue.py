#!/usr/bin/env python3
"""Build the public Biopietra selection from official product pages.

Requires beautifulsoup4. Run with --cache-dir to reuse the downloaded HTML.
Only documented product facts and manufacturer images are extracted; no prices.
"""
from __future__ import annotations
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import date
import hashlib
import json
from pathlib import Path
import re
import unicodedata
import urllib.request
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://biopietra.com/'
CATEGORIES = [
 ('tipologia-prodotto/rivestimenti-tradizionali-pietra-ricostruita/', 'Pierre'),
 ('tipologia-prodotto/rivestimenti-innovativi-in-pietra/', 'Pierre'),
 ('tipologia-prodotto/rivestimenti-gres-porcellanato-interni-esterni/', 'Grès'),
 ('tipologia-prodotto/muretti-gres-porcellanato-interni-esterni/', 'Grès'),
 ('tipologia-prodotto/pavimenti-gres-porcellanato-interni-esterni/', 'Grès'),
 ('accessorio/', 'Produits de pose'),
]

def plain(value):
 return re.sub(r'\s+', ' ', str(value or '')).strip()

def slug(value):
 value=''.join(c for c in unicodedata.normalize('NFD', str(value)).lower() if not unicodedata.combining(c))
 return re.sub(r'[^a-z0-9]+','-',value).strip('-')

def get(url, cache):
 name=url.rstrip('/').split('/')[-1]+'.html'
 path=cache/name
 if path.exists(): return path.read_text()
 with urllib.request.urlopen(url,timeout=40) as response: text=response.read().decode()
 path.write_text(text)
 return text

def number(value):
 match=re.search(r'\d+(?:[,.]\d+)?',str(value))
 return float(match[0].replace(',','.')) if match else None

def table_grid(table):
 rows=[]
 for tr in table.select('tr'):
  cells=[]
  for td in tr.find_all(['td','th'],recursive=False):
   value=plain(td.get_text(' ',strip=True))
   cells += [value]*int(td.get('colspan',1))
  if cells: rows.append(cells)
 return rows

def variants_from_tables(product, url):
 variants=[]
 for table in product.select('table'):
  grid=table_grid(table)
  if not grid:continue
  headers=grid[0]
  if not any('CONFEZION' in x.upper() for x in headers):continue
  for row in grid[1:]:
   if not row or row[0].upper() in ['DESCRIZIONE','DESCRIPTION']:continue
   if not re.search(r'Fondo|Angol|Cornic|Inser|Fond|Plaqu',row[0],re.I):continue
   mapped={}
   for index,head in enumerate(headers):
    if index<len(row):mapped.setdefault(head.upper(),[]).append(row[index])
   pack=' '.join(v for k,values in mapped.items() if 'CONFEZION' in k for v in dict.fromkeys(values))
   dimension=' '.join(v for k,values in mapped.items() if 'FORMATO' in k for v in dict.fromkeys(values))
   thickness=' '.join(v for k,values in mapped.items() if 'SPESSORE' in k for v in dict.fromkeys(values))
   component='angle' if re.search(r'Angol',row[0],re.I) else 'piece' if re.search(r'Cornic|Inser',row[0],re.I) else 'fondo'
   unit='ml' if component=='angle' else 'pièce' if component=='piece' else 'm²'
   quantity=None
   qm=re.search(r'(\d+(?:[,.]\d+)?)\s*(?:m²|m2|mq|ml|lm|pz)',pack,re.I)
   if qm:quantity=float(qm[1].replace(',','.'))
   label={'fondo':'Plaques / fond','angle':'Angles','piece':'Pièces de finition'}[component]
   if thickness:label+=' · '+thickness
   ident=component+('-'+slug(thickness) if thickness else '')
   if any(v['id']==ident for v in variants):ident+='-'+str(len(variants)+1)
   value={'id':ident,'label':label,'component':component,'unit':unit,'packQuantity':quantity,
          'packLabel':'boîte',
          'dimensions':dimension.replace('Misti','Formats mixtes'),'thickness':thickness,
          'sourceUrl':url,'packagingSource':pack or 'Non indiqué par le fabricant'}
   pieces=re.search(r'(\d+)\s*(?:Pz|pz|pi[eè]ces)',pack)
   if pieces:value['piecesPerPack']=int(pieces[1])
   if quantity is None:value['packagingNote']='Conditionnement à confirmer par composant ; le fabricant renvoie aux produits de la composition.'
   variants.append(value)
 return variants


def color_range(product):
 result=[];seen=set()
 for heading in product.find_all(['h3','h4','h5']):
  if not re.search(r'Colou?r range|Gamme de couleurs|Colori',heading.get_text(' ',strip=True),re.I):continue
  section=heading.find_parent(class_='section-content') or heading.parent
  for li in section.select('ul.photo-gallery > li'):
   a=li.select_one('a[href]');im=li.select_one('img')
   name=plain((li.select_one('p') or im or a).get_text(' ',strip=True))
   if not name and a:name=plain(a.get('title') or a.get('alt'))
   if not name and im:name=plain(im.get('alt'))
   if not name or slug(name) in seen:continue
   url=a.get('href','') if a else im.get('src','') if im else ''
   if not url.startswith('https://biopietra.com/'):continue
   seen.add(slug(name));result.append({'id':slug(name),'name':name,'image':im.get('src') if im else url,'original':url,'sourceUrl':None})
 return result


def images_from_page(product, name):
 result=[];seen={}
 def add(url,label):
  if not url or not url.startswith('https://biopietra.com/wp-content/uploads/'):return
  if not re.search(r'\.(?:jpg|jpeg|png|webp)(?:\?|$)',url,re.I):return
  key=re.sub(r'-\d+x\d+(?=\.[^.]+$)','',url)
  image={'url':url,'thumbnail':url,'alt':plain(label) or name+' — Biopietra','caption':plain(label) or name}
  if key in seen:
   # The product's gallery often exposes the uncropped landscape derivative.
   # Keep one existing official URL per photograph, rather than both crops.
   result[seen[key]]=image
  else:
   seen[key]=len(result);result.append(image)
 for li in product.select('.flexslider ul.slides li'):
  im=li.select_one('img')
  if im:add(im.get('src'),im.get('alt') or li.get_text(' ',strip=True))
 for a in product.select('div.photo-gallery .gallery-item a[href]'):
  add(a.get('href'),a.get('title') or a.get('alt'))
 return result


def translated_notes(product):
 notes=[]
 for icon in product.select('.single-product-price a[title]'):
  t=plain(icon.get('title'))
  if re.search(r'Posa unita.*\+20%',t,re.I):text='Pose serrée sans joint : prévoir 20 % de matière supplémentaire selon le fabricant.'
  elif 'doppia spalmatura' in t:
   amount=re.findall(r'(\d+(?:[,.]\d+)?)\s*kg\s*/?\s*m[²2]',t,re.I);text='Double encollage obligatoire avec '+('Multikoll' if 'Multikoll' in t else 'Ecokoll')+(' ; consommation fabricant '+amount[-1]+' kg/m².' if amount else '.')
  elif 'Stuccatura obbligatoria' in t:
   amount=re.findall(r'(\d+(?:[,.]\d+)?)\s*kg\s*/?\s*m[²2]',t,re.I);text='Jointoiement obligatoire avec Biostucco'+(' ; consommation fabricant '+amount[-1]+' kg/m².' if amount else '.')
  elif 'Spessore' in t:text='Épaisseur des pierres : '+re.sub(r'^Spessore delle pietre\s*','',t)+'.'
  elif 'Formati misti' in t:text='Formats mixtes de dimensions différentes.'
  elif 'Angolari disponibili in tutti i colori' in t:text='Angles disponibles dans tous les coloris de la série selon le fabricant.'
  elif 'Adatto per applicazione in interno' in t:text='Application intérieure.'
  elif 'Adatto per applicazione in esterno' in t:text='Application extérieure.'
  elif 'Posa con giunto aperto' in t:text='Pose à joint ouvert : '+re.sub(r'^cm\s+','',re.sub(r'^.*?fuga di\s*','',t))+'.'
  else:continue
  if text not in notes:notes.append(text)
 return notes


def composition_from_details(details):
 for p in details.find_all('p') if details else []:
  text=plain(p.get_text(' ',strip=True))
  if re.match(r'Composizione\s*:',text,re.I):return re.sub(r'^Composizione\s*:\s*','',text,flags=re.I)
 return ''


def build_one(record, cache):
 html=get(record['url'],cache);soup=BeautifulSoup(html,'html.parser')
 product=soup.select_one('section.product') or (soup if record['family']=='Produits de pose' else None)
 if not product:raise ValueError('No product section: '+record['url'])
 name=plain(record['name']).replace(' (NEW)','')
 if record['family']=='Produits de pose':
  name={'multikoll':'Multikoll','eco-koll':'Ecokoll','biostucco':'Biostucco','biofin':'Biofin'}.get(record['url'].rstrip('/').split('/')[-1],name)
 ident=slug(name);detail=product.select_one('.mt-25')
 composition=composition_from_details(detail)
 family=record['family']
 if family=='Pierre':
  if composition or re.search(r'\bMix\b',name,re.I):family='Mix & compositions'
  elif 'Listello' in name or 'Brick' in name:family='Brique'
 images=images_from_page(product,name);colors=color_range(product)
 if record['family']=='Produits de pose' and detail:
  for image in detail.select('img[src]'):
   source=image['src']
   if not re.search(r'\.(jpg|jpeg|png|webp)$',source,re.I) or '/icons/' in source:continue
   candidates=[(int(w),u) for u,w in re.findall(r'(https://[^\s,]+)\s+(\d+)w',image.get('srcset',''))]
   full=max(candidates)[1] if candidates else source
   if full not in [im['url'] for im in images]:images.append({'url':full,'thumbnail':source,'alt':'Document visuel fabricant · '+name,'caption':('Nuancier fabricant · ' if 'stucchi-2026' in source else 'Accessoires et documentation · ')+name})
 for color in colors:color['sourceUrl']=record['url']
 if not images and record['cover']:images=[{'url':record['cover'],'thumbnail':record['cover'],'alt':name+' — Biopietra','caption':name}]
 variants=variants_from_tables(product,record['url'])
 notes=translated_notes(product)
 if detail:
  for p in detail.find_all('p'):
   text=plain(p.get_text(' ',strip=True))
   if re.match(r'Colore stucco\s*:',text,re.I):notes.append('Coloris de joint présenté : '+re.sub(r'^Colore stucco\s*:\s*','',text,flags=re.I))
   elif re.match(r'Posa(?: con fuga)?\s*:',text,re.I):notes.append('Pose présentée par le fabricant : '+re.sub(r'^Posa(?: con fuga)?\s*:\s*','',text,flags=re.I))
 base=''
 if re.match(r'^MIX\s+(ACR|BER|CIO|CRE|ORT|ROC|SIE|SPC|SPA|STE)\b',name,re.I):
  code=re.match(r'^MIX\s+(\w+)',name,re.I)[1].upper()
  base={'ACR':'Acropoli','BER':'Bergamo','CIO':'Ciottolo River','CRE':'Credaro','ORT':'Ortisei','ROC':'Roccia','SIE':'Sierra Nevada','SPC':'Spaccatello','SPA':'Spaccatello','STE':'Stelvio'}.get(code,'')
 desc={'Pierre':'Parement en pierre naturelle régénérée.','Brique':'Parement effet brique et listels en pierre naturelle régénérée.','Mix & compositions':'Composition de parements Biopietra présentée par le fabricant.','Grès':'Revêtement en grès cérame.','Produits de pose':'Produit de pose et de finition Biopietra.'}[family]
 if composition:desc+=' Retrouvez ci-dessous la composition exacte et les options de pose.'
 elif colors:desc+=f' {len(colors)} visuels de coloris et de poses à comparer.'
 result={'id':'biopietra-'+ident,'slug':ident,'name':name,'family':family,'group':family,'description':desc,
  'coverImage':record['cover'],'images':images,'swatches':colors,'variants':variants,'sourceUrl':record['url'],
  'primaryCatalogueSource':{'label':'Fiche et variantes '+name+' · Biopietra','url':record['url']},
  'technicalNotes':notes,'baseSeries':base}
 if composition:result['composition']=composition
 if family=='Mix & compositions':
  result['technicalNotes']=[n for n in result['technicalNotes'] if n!='Angles disponibles dans tous les coloris de la série selon le fabricant.']
  result['technicalNotes'].append('Les angles se choisissent parmi les produits de la composition ; leur couleur et leur compatibilité sont à vérifier séparément.')
 if any(v['packQuantity'] is None for v in variants):result['technicalNotes'].append('Cette composition se prépare à partir des conditionnements de chaque produit ; aucun boîtage global n’est indiqué.')
 if not variants:result['variants']=[{'id':'reference-a-confirmer','label':'Référence à confirmer','component':'accessory' if family=='Produits de pose' else 'fondo','unit':'pièce' if family=='Produits de pose' else 'm²','packQuantity':None,'packLabel':'boîte','dimensions':'','thickness':'','sourceUrl':record['url'],'packagingNote':'Conditionnement à confirmer sur la référence choisie.'}]
 if ident=='bergamo':
  result['technicalNotes'].append('Pour les angles, le fabricant demande les angles Acropoli. Les dimensions des angles sont des dimensions intérieures.')
  for v in result['variants']:
   if v['component']=='angle':v.update(label='Angles Acropoli compatibles',relatedCollectionSlug='acropoli')
 if ident=='listello-toscana':result['legacyAliases']=['Listello Toscana · 1,5 cm','Listello Toscana · 3 cm']
 return result


def apply_accessories(products):
 by={p['slug']:p for p in products}
 for source_slug,name,colors in [('multikoll','Multikoll',['Grigia','Ardesia','Quarzo']),('eco-koll','Ecokoll',['Grigia']),('biostucco','Biostucco',['Bianco','Grigio Chiaro','Grigio Medio','Grigio Scuro','Grigio Cemento','Perla','Terra','Fango','Coccio Pesto','Ardesia'])]:
  p=next((p for p in products if p['sourceUrl'].rstrip('/').endswith('/'+source_slug)),None)
  if not p:continue
  p['variants']=[{'id':'sac-25-kg','label':'Sac de 25 kg','component':'accessory','unit':'kg','packQuantity':25,'packLabel':'sac','dimensions':'Sac 25 kg','thickness':'','sourceUrl':p['sourceUrl']}]
  p['technicalNotes']=[n for n in p['technicalNotes'] if not n.startswith(('Double encollage obligatoire','Jointoiement obligatoire'))]
  # Preserve documented swatch images, do not substitute photos between colours.
  existing={slug(x['name']):x for x in p['swatches']}
  p['swatches']=[existing.get(slug(c),{'id':slug(c),'name':c,'image':'','original':'','sourceUrl':p['sourceUrl']}) for c in colors]
  p['technicalNotes'].append('La consommation dépend du parement et de la pose ; aucun taux universel n’est appliqué.')
 p=next((p for p in products if p['sourceUrl'].rstrip('/').endswith('/biofin')),None)
 if p:
  p['variants']=[{'id':'bidon-'+str(q)+'-l','label':'Bidon '+str(q)+' L','component':'accessory','unit':'L','packQuantity':q,'packLabel':'bidon','dimensions':str(q)+' L','thickness':'','sourceUrl':p['sourceUrl']} for q in [1,5,10]]
  p['technicalNotes'].append('Consommation indicative du fabricant : 1 L pour 4 à 5 m².')


def special_products(products, cache):
 url=ORIGIN+'angoli-pietra-ricostruita-cornici-lampade/'
 html=get(url,cache) if not (cache/'angles.html').exists() else (cache/'angles.html').read_text()
 soup=BeautifulSoup(html,'html.parser');pictures=[];seen=set()
 for im in soup.select('img[src]'):
  if 'cornic' not in im['src'].lower():continue
  candidates=[(int(w),u) for u,w in re.findall(r'(https://[^\s,]+)\s+(\d+)w',im.get('srcset',''))]
  source=max(candidates)[1] if candidates else im['src']
  if source in seen:continue
  seen.add(source);pictures.append({'url':source,'thumbnail':im['src'],'alt':'Cornici di finitura — visuel fabricant Biopietra','caption':'Cornici di finitura · visuel fabricant'})
 names=['650 Bianco','Zolfo','C58 Cromite','Granito','700 Grigio','C54 Beige']
 products.append({'id':'biopietra-cornici-di-finitura','slug':'cornici-di-finitura','name':'Cornici di finitura','family':'Pièces de finition','group':'Pièces de finition','description':'Cadres et pièces de finition pour les ouvertures et détails architecturaux. Deux épaisseurs à choisir.','coverImage':pictures[0]['thumbnail'],'images':pictures,'swatches':[{'id':slug(n),'name':n,'image':'','original':'','sourceUrl':url} for n in names],'variants':[{'id':'cornice-'+slug(t),'label':'Cornice · '+t,'component':'piece','unit':'pièce','packQuantity':50,'packLabel':'boîte','dimensions':'±30 × 3,5 cm','thickness':t,'sourceUrl':url} for t in ['2,5 cm','3,5 cm']],'sourceUrl':url,'primaryCatalogueSource':{'label':'Cornici et pièces spéciales · Biopietra','url':url},'technicalNotes':['50 pièces par boîte.','Les coloris sont nommés par le fabricant ; les visuels généraux ne sont pas attribués individuellement à ces six coloris.'], 'baseSeries':''})
 ortisei=next((p for p in products if p['slug']=='ortisei'),None)
 if ortisei:
  pictures=[i for i in ortisei['images'] if 'insert' in (i['caption']+' '+i['url']).lower()]
  if pictures:
   source=ORIGIN+'biopietra-ortisei-e-inserti/'
   products.append({'id':'biopietra-inserti','slug':'inserti','name':'Inserti décoratifs','family':'Pièces de finition','group':'Pièces de finition','description':'Inserts décoratifs présentés avec Ortisei. Leur couleur, leur compatibilité et leur conditionnement sont à confirmer pour le projet.','coverImage':pictures[0]['thumbnail'],'images':pictures,'swatches':[],'variants':[{'id':'inserti-a-confirmer','label':'Inserts · référence à confirmer','component':'piece','unit':'pièce','packQuantity':None,'packLabel':'boîte','dimensions':'','thickness':'','sourceUrl':source,'packagingNote':'Boîtage à confirmer ; aucun conditionnement chiffré n’est documenté sur la page officielle consultée.'}],'sourceUrl':source,'primaryCatalogueSource':{'label':'Ortisei et inserts · Biopietra','url':source},'technicalNotes':['La photo présente une combinaison Ortisei et inserts ; elle ne décrit pas une boîte de composition prédéfinie.'],'baseSeries':'Ortisei'})


def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--cache-dir',type=Path,default=Path('/tmp/biopietra-source'))
 parser.add_argument('--cover-map',type=Path,default=Path('/tmp/biopietra-cover-map.json'))
 args=parser.parse_args();args.cache_dir.mkdir(parents=True,exist_ok=True)
 manifest={}
 for path,family in CATEGORIES:
  soup=BeautifulSoup(get(ORIGIN+path,args.cache_dir),'html.parser')
  for card in soup.select('.shop-product'):
   a=card.select_one('.product-info a');im=card.select_one('img')
   if a and a.get('href','').startswith(ORIGIN):manifest[a['href']]={'url':a['href'],'name':plain(a.get_text(' ',strip=True)),'cover':im.get('src','') if im else '', 'family':family}
  if family=='Produits de pose':
   for card in soup.select('.work-item'):
    a=card.select_one('a[href]');im=card.select_one('img');heading=card.select_one('h3')
    if a and im and '/accessorio/' in a.get('href',''):manifest[a['href']]={'url':a['href'],'name':plain(heading.get_text(' ',strip=True) if heading else im.get('alt')).capitalize(),'cover':im.get('src',''),'family':family}
 products=list(ThreadPoolExecutor(max_workers=8).map(lambda r:build_one(r,args.cache_dir),manifest.values()))
 apply_accessories(products)
 special_products(products,args.cache_dir)
 cover_map=json.loads(args.cover_map.read_text()) if args.cover_map.exists() else {}
 for p in products:
  source=p['coverImage']
  local='assets/img/biopietra-20261101/'+hashlib.sha256(source.encode()).hexdigest()[:18]+'.webp'
  if (ROOT/local).is_file():cover_map[source]=local
  if p['coverImage'] in cover_map:p['coverImageOriginal']=p['coverImage'];p['coverImage']=cover_map[p['coverImage']]
 products.sort(key=lambda p:unicodedata.normalize('NFD',p['name']).lower())
 assert len(set(p['slug'] for p in products))==len(products),'Duplicate product slug'
 for p in products:
  assert p['coverImage'] and p['images'],p['slug']+' missing image'
  assert len(set(v['id'] for v in p['variants']))==len(p['variants']),p['slug']+' duplicate variant'
  assert len(set(c['id'] for c in p['swatches']))==len(p['swatches']),p['slug']+' duplicate swatch'
 data={'schema':'lrf-biopietra-catalogue','version':'20261101-biopietra1','updatedAt':'2026-11-01','source':'https://biopietra.com/prodotto/','collections':products}
 out=ROOT/'assets/data/biopietra-catalogue.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 report={'verifiedAt':'2026-11-01','collections':len(products),'families':dict(Counter(p['family'] for p in products)),'images':sum(len(p['images']) for p in products),'swatches':sum(len(p['swatches']) for p in products),'variants':sum(len(p['variants']) for p in products),'packagingConfirmed':sum(v['packQuantity'] is not None for p in products for v in p['variants']),'unconfirmedPackaging':[p['slug'] for p in products if any(v['packQuantity'] is None for v in p['variants'])],'missingSwatchImage':[{'collection':p['slug'],'color':c['name']} for p in products for c in p['swatches'] if not c['image']],'officialSourceUrls':[p['sourceUrl'] for p in products]}
 report['coverDerivatives']=[{'file':p['coverImage'],'bytes':(ROOT/p['coverImage']).stat().st_size,'sourceUrl':p['coverImageOriginal']} for p in products if p.get('coverImageOriginal') and (ROOT/p['coverImage']).is_file()]
 report['coverBytes']=sum(c['bytes'] for c in report['coverDerivatives'])
 report_path=ROOT/'reports/biopietra-catalogue-audit-2026-11-01.json';report_path.parent.mkdir(parents=True,exist_ok=True);report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:report[k] for k in ['collections','families','images','swatches','variants','packagingConfirmed']}))

if __name__=='__main__':main()
