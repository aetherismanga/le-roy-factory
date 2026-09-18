#!/usr/bin/env python3
from __future__ import annotations
import argparse, re, sys
from pathlib import Path
import requests
import fitz

COLLECTIONS = [
    "Azuli Mood","Brooklyn","Clay","Creta","D_esign Evo","Deco","Domus","Glow",
    "Golden Hour","Hexagon","Marechiaro","Shell","Terre Etrusche","Bavaria Stone",
    "Dolomiti","Dynasty","Grand Place","Harmony","Millennium Quartz","Roma",
    "Sedimenti","Slate","Quercia","Yosemite","Allure","Dust","Love & Decors",
    "Segmento","Tropical","Twist","Venere","Lithos","Manhattan","Mysterium"
]

SOURCE_CANDIDATES = [
    "https://eliosceramica.com/wp-content/uploads/2018/02/ELIOS_CATALOGO-GENERALE-2026-1.pdf",
    "https://eliosceramica.com/wp-content/uploads/2026/02/ELIOS_CATALOGO-GENERALE-2026-1.pdf",
    "https://eliosceramica.com/wp-content/uploads/2026/02/ELIOS_CATALOGO-GENERALE-2026.pdf",
]

def norm(s:str)->str:
    import unicodedata
    s=unicodedata.normalize("NFD", str(s or ""))
    s="".join(c for c in s if unicodedata.category(c)!="Mn")
    s=s.lower().replace("&"," and ").replace("_"," ")
    s=re.sub(r"[^a-z0-9]+"," ",s)
    return re.sub(r"\s+"," ",s).strip()

def download_pdf(dest:Path)->str:
    sess=requests.Session()
    sess.headers.update({"User-Agent":"Mozilla/5.0","Referer":"https://eliosceramica.com/"})
    candidates=list(SOURCE_CANDIDATES)
    try:
        r=sess.get("https://eliosceramica.com/download/",timeout=30)
        if r.ok:
            for href in re.findall(r'https?://[^"\'<> ]+\.pdf', r.text, flags=re.I):
                if "2026" in href and ("generale" in href.lower() or "general" in href.lower()):
                    candidates.insert(0, href.replace("&amp;","&"))
    except Exception as e:
        print("Download page scan warning:",e)
    seen=set()
    for url in candidates:
        if url in seen: continue
        seen.add(url)
        try:
            print("Trying",url)
            r=sess.get(url,timeout=90,allow_redirects=True)
            ctype=(r.headers.get("content-type") or "").lower()
            if r.ok and len(r.content)>1_000_000 and (r.content[:4]==b"%PDF" or "pdf" in ctype):
                dest.parent.mkdir(parents=True,exist_ok=True)
                dest.write_bytes(r.content)
                print("Downloaded",len(r.content),"bytes from",url)
                return url
        except Exception as e:
            print("Failed",url,e)
    raise SystemExit("Unable to download the ELIOS 2026 general catalogue PDF")

def page_score(page:fitz.Page, target:str)->float:
    n_target=norm(target)
    best=-1.0
    data=page.get_text("dict")
    for block in data.get("blocks",[]):
        if "lines" not in block: continue
        spans=[sp for ln in block["lines"] for sp in ln.get("spans",[])]
        text=" ".join(sp.get("text","") for sp in spans)
        nt=norm(text)
        if not nt: continue
        if n_target in nt:
            max_size=max((float(sp.get("size",0)) for sp in spans),default=0)
            score=max_size*4
            if nt==n_target: score+=50
            elif nt.startswith(n_target) or nt.endswith(n_target): score+=25
            if len(nt) < len(n_target)+25: score+=12
            best=max(best,score)
    return best

def find_collection_pages(doc:fitz.Document)->dict[str,int]:
    mapping={}
    for name in COLLECTIONS:
        candidates=[]
        for i in range(doc.page_count):
            p=doc[i]
            score=page_score(p,name)
            if score>=0:
                # Avoid front matter/index unless no better candidate exists.
                if i < 8: score-=35
                candidates.append((score,i))
        if candidates:
            candidates.sort(reverse=True)
            mapping[name]=candidates[0][1]
            print(f"{name}: source page {mapping[name]+1}, score {candidates[0][0]:.1f}")
        else:
            print(f"WARNING: {name} not found")
    return mapping

def add_index_pages(doc:fitz.Document, mapping:dict[str,int])->int:
    cover=doc[0]
    width,height=cover.rect.width,cover.rect.height
    index_pages=2
    for j in range(index_pages):
        doc.new_page(pno=1+j,width=width,height=height)
    # Existing pages after cover shift by 2.
    shift=index_pages
    for j in range(index_pages):
        page=doc[1+j]
        page.draw_rect(page.rect,color=(0.86,0.84,0.78),fill=(0.985,0.978,0.955),width=0)
        page.insert_text((44,58),"ELIOS CERAMICA",fontsize=20,fontname="helv",color=(0.05,0.20,0.31))
        page.insert_text((44,86),"CATALOGUE GENERAL 2026 - LEXIQUE INTERACTIF",fontsize=13,fontname="helv",color=(0.16,0.20,0.22))
        page.insert_text((44,108),"Cliquez sur une collection pour aller directement a sa premiere page.",fontsize=9.5,fontname="helv",color=(0.35,0.35,0.35))
        page.insert_text((width-95,58),f"{j+1}/{index_pages}",fontsize=9,fontname="helv",color=(0.42,0.42,0.42))
    per_page=18
    cols=2
    rows=9
    left=44
    col_gap=22
    col_w=(width-left*2-col_gap)/2
    y0=145
    row_h=58
    for idx,name in enumerate(COLLECTIONS):
        page_no=idx//per_page
        within=idx%per_page
        col=within//rows
        row=within%rows
        page=doc[1+page_no]
        x=left+col*(col_w+col_gap)
        y=y0+row*row_h
        rect=fitz.Rect(x,y,x+col_w,y+42)
        page.draw_rect(rect,color=(0.82,0.78,0.67),fill=(1,1,1),width=0.8)
        page.insert_text((x+12,y+17),name,fontsize=10.5,fontname="helv",color=(0.08,0.14,0.17))
        src=mapping.get(name)
        if src is not None:
            target=src + shift if src>=1 else src
            ptxt=f"p. {target+1}"
            page.insert_text((rect.x1-42,y+17),ptxt,fontsize=7.5,fontname="helv",color=(0.45,0.45,0.45))
            page.insert_link({"kind":fitz.LINK_GOTO,"from":rect,"page":target})
        else:
            page.insert_text((rect.x1-58,y+17),"non trouve",fontsize=6.5,fontname="helv",color=(0.65,0.25,0.20))
    return shift

def add_bookmarks(doc:fitz.Document,mapping:dict[str,int],shift:int)->None:
    toc=[[1,"ELIOS - Lexique interactif",2]]
    for name in COLLECTIONS:
        src=mapping.get(name)
        if src is None: continue
        target=src+shift if src>=1 else src
        toc.append([2,name,target+1])
    doc.set_toc(toc)

def build(source:Path,output:Path)->None:
    doc=fitz.open(source)
    if doc.page_count < 20:
        raise SystemExit(f"Suspicious PDF: only {doc.page_count} pages")
    mapping=find_collection_pages(doc)
    found=len(mapping)
    print(f"Collections automatically located: {found}/{len(COLLECTIONS)}")
    shift=add_index_pages(doc,mapping)
    add_bookmarks(doc,mapping,shift)
    meta=doc.metadata or {}
    meta["title"]="ELIOS Catalogue General 2026 - Lexique interactif LE ROY FACTORY"
    meta["subject"]="Catalogue interactif avec lexique cliquable des collections"
    doc.set_metadata(meta)
    output.parent.mkdir(parents=True,exist_ok=True)
    doc.save(output,garbage=4,deflate=True,clean=True)
    print("Saved",output,output.stat().st_size,"bytes",doc.page_count,"pages")
    doc.close()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--source",type=Path)
    ap.add_argument("--output",type=Path,required=True)
    ap.add_argument("--download-to",type=Path,default=Path("/tmp/elios-general-2026.pdf"))
    args=ap.parse_args()
    source=args.source
    if not source:
        url=download_pdf(args.download_to)
        print("Source URL:",url)
        source=args.download_to
    build(source,args.output)

if __name__=="__main__":
    main()
