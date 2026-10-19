"""Publish six original VIEW samples. No texture payload is stored in GitHub."""
import hashlib, io, json, os, tempfile, urllib.parse, urllib.request, urllib.error
from pathlib import Path
import fitz
from PIL import Image
import google.auth
from google.auth.transport.requests import Request
ROOT=Path(__file__).resolve().parents[1]
BUCKET='le-roy-factory.firebasestorage.app'
PREFIX='public-site-assets/le-roy-factory/studio-view-20261019/'
def get(url,headers=None):
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers or {}),timeout=90) as r:return r.read()
def main():
    samples=json.loads((ROOT/'tools/studio-view-selection.json').read_text());assert len(samples)==6
    credentials,_=google.auth.default(scopes=['https://www.googleapis.com/auth/devstorage.read_write']);credentials.refresh(Request())
    headers={'Authorization':'Bearer '+credentials.token};pdfs={};report=[]
    for s in samples:
        assert s['collection'] in ['CORSO','GOLDEN STONE']
        if s['pdf'] not in pdfs:
            raw=get(s['pdf']);assert hashlib.sha256(raw).hexdigest()==s['pdfSha256'],'Source PDF changed';pdfs[s['pdf']]=raw
        with fitz.open(stream=pdfs[s['pdf']],filetype='pdf') as pdf:
            pix=fitz.Pixmap(pdf,s['xref'])
            if pix.colorspace.n!=3:pix=fitz.Pixmap(fitz.csRGB,pix)
            im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
        assert im.size==(s['width'],s['height'])
        assert hashlib.sha256(im.tobytes()).hexdigest()==s['pixelSha256'],'Source pixels changed'
        buffer=io.BytesIO();im.save(buffer,'WEBP',lossless=True,method=6);payload=buffer.getvalue()
        assert hashlib.sha256(payload).hexdigest()==s['sha256'],'File differs from recovered backup'
        name=PREFIX+s['path'];public='https://storage.googleapis.com/'+BUCKET+'/'+name
        try:existing=get(public)
        except urllib.error.HTTPError as e:
            if e.code not in [403,404]:raise
            existing=None
        if existing is not None:assert hashlib.sha256(existing).hexdigest()==s['sha256'],'Existing asset differs; no overwrite'
        else:
            query=urllib.parse.urlencode({'uploadType':'media','name':name,'predefinedAcl':'publicRead','ifGenerationMatch':'0'})
            req=urllib.request.Request('https://storage.googleapis.com/upload/storage/v1/b/'+BUCKET+'/o?'+query,data=payload,headers={**headers,'Content-Type':'image/webp'},method='POST')
            with urllib.request.urlopen(req,timeout=90) as r:result=json.load(r)
            assert result['name']==name
        verified=get(public,{'Origin':'https://leroyfactory.fr'});assert hashlib.sha256(verified).hexdigest()==s['sha256']
        report.append({'path':s['path'],'url':public,'sha256':s['sha256'],'verified':True});print('Verified',s['collection'],s['color'],len(verified),'bytes')
    dest=Path(os.environ.get('RUNNER_TEMP',tempfile.gettempdir()))/'studio-view-upload.json';dest.write_text(json.dumps(report,indent=2)+'\n')
    print('Six original files published and verified; ELIOS and bucket permissions unchanged.')
if __name__=='__main__':main()
