#!/usr/bin/env python3
"""Refresh La Fenice public product metadata from official, public catalogues.

No professional prices are extracted or stored. HTML downloads are cached outside
tracked source. Gallery originals remain manufacturer URLs; UI may lazy-load them.
"""
import concurrent.futures, hashlib, html, json, re, pathlib, urllib.request, urllib.parse, sys, time
ROOT=pathlib.Path(__file__).resolve().parents[1]
CACHE=pathlib.Path('/tmp/lrf-fenice-official')
BASE='https://lafenicegc.com/'
CACHE.mkdir(exist_ok=True)
def clean(s): return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',s))).strip()
def slug(s):
 import unicodedata
 return re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip('-')
def get(url):
 p=CACHE/(hashlib.sha256(url.encode()).hexdigest()+'.html')
 if p.exists(): return p.read_text()
 for attempt in range(3):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'LE-ROY-FACTORY-catalogue-sync/1.0'})
   s=urllib.request.urlopen(req,timeout=35).read().decode('utf-8')
   p.write_text(s);return s
  except Exception:
   if attempt==2: raise
   time.sleep(1)
def attrs(tag): return {k:html.unescape(v) for k,v in re.findall(r'([\w-]+)=["\'](.*?)["\']',tag)}
def unique(items): return list(dict.fromkeys(items))
def figures(s):
 # Inner image figures have no nested figure; outer galleries are ignored.
 out=[]
 for m in re.finditer(r'<figure\b([^>]*)>((?:(?!<figure\b).)*?)</figure>',s,re.S):
  body=m.group(2);im=re.search(r'<img\b[^>]*>',body)
  if not im: continue
  a=attrs(im.group());link=re.search(r'<a\b[^>]*href=["\']([^"\']+)',body)
  cap=re.search(r'<figcaption[^>]*>(.*?)</figcaption>',body,re.S)
  out.append({'name':clean(cap.group(1)) if cap else a.get('alt',''),'image':urllib.parse.urljoin(BASE,a.get('src','')),'original':urllib.parse.urljoin(BASE,link.group(1)) if link else a.get('data-original-link',a.get('src',''))})
 return out
def parse(url):
 s=get(url); name=clean(re.search(r'<h1[^>]*>(.*?)</h1>',s,re.S).group(1))
 s=s[s.index('<h1'):];s=s.split('<footer',1)[0]
 pc=s.find('et_pb_post_content'); c=s[pc:] if pc>=0 else s
 titleblock=s[:pc] if pc>=0 else s[:2000]
 categories=unique(clean(t) for t in re.findall(r'<a[^>]+href="https://lafenicegc.com/categoria/[^>]+>(.*?)</a>',titleblock,re.S))
 effects=unique(clean(t) for t in re.findall(r'<a[^>]+href="https://lafenicegc.com/effetto/[^>]+>(.*?)</a>',titleblock,re.S))
 formats=unique(clean(t).replace('×','x') for t in re.findall(r'<a[^>]+href="https://lafenicegc.com/formato/[^>]+>(.*?)</a>',c,re.S))
 colors=figures(c.split('id="colori"',1)[1].split('<h2',1)[0]) if 'id="colori"' in c else []
 decors=figures(c.split('id="decori"',1)[1].split('<h2',1)[0]) if 'id="decori"' in c else []
 amb=c.split('id="colori"',1)[0]
 images=[]
 for tag in re.findall(r'<img\b[^>]*>',amb):
  a=attrs(tag)
  if 'wp-block-getwid-images-slider__image' in a.get('class','') or 'wp-image-' in a.get('class',''):
   images.append(a.get('data-original-link') or a.get('src'))
 images=unique(x for x in images if x and '/uploads/' in x)
 pdfs=[]
 for u,label in re.findall(r'<a[^>]+href=["\']([^"\']+\.pdf)["\'][^>]*>(.*?)</a>',c,re.S):
  if 'Merchandising' not in clean(label): pdfs.append(urllib.parse.urljoin(BASE,html.unescape(u)))
 return {'id':slug(name),'name':name,'url':url,'formats':formats,'colors':colors,'decors':decors,'effects':effects,'categories':categories,'images':images,'pdf':pdfs[0] if pdfs else ''}
def main():
 cats=[]
 for f in figures(get(BASE+'cataloghi/')):
  if not f['original'].lower().endswith('.pdf'):continue
  name=f['name']; cats.append({'id':slug(name),'name':name,'url':f['original'],'cover':f['image'],'kind':'company' if 'Company' in name else 'merchandising' if 'Merchandising' in name else 'products'})
 urls={}
 for u in [BASE+'collezioni/',BASE+'collezioni/?_page=2']:
  for url,n in re.findall(r'<h3 class="[^"]*pt-cv-title[^"]*">\s*<a href="([^"]+)"[^>]*>(.*?)</a>',get(u),re.S):urls[url]=clean(n)
 items=[];errors=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  future={pool.submit(parse,u):u for u in urls}
  for f in concurrent.futures.as_completed(future):
   try:
    p=f.result();items.append(p); print(p['name'],len(p['images']),len(p['colors']),len(p['formats']),flush=True)
   except Exception as e: errors.append({'url':future[f],'error':str(e)}); print('ERROR',errors[-1],flush=True)
 items.sort(key=lambda x:slug(x['name']))
 data={'source':'https://lafenicegc.com/cataloghi/','updated':'2026-11-01','catalogues':cats,'collections':items,'errors':errors}
 (ROOT/'assets/data/fenice-catalogue.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 print('TOTAL',len(items),'CATALOGUES',len(cats),'ERRORS',len(errors),flush=True)
if __name__=='__main__':main()
