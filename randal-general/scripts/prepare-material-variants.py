"""Resolution variants of existing documented RANDAL wood samples; no recolouring."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'dist/assets/materials'
out=root/'quality';out.mkdir(exist_ok=True)
strips=[(184,275),(302,346),(375,416),(443,485),(510,552),(576,615),(639,677),(701,737),(760,797),(820,855),(878,911),(934,951)]
for name,source in [('aruba-roble','aruba-roble-detail.jpg'),('aruba-nogal','aruba-nogal-detail.jpg'),('aruba-nogal-front','aruba-nogal-front.jpg')]:
    image=Image.open(root/source).convert('RGB')
    if name=='aruba-nogal-front':
        sample=image.crop((785,1412,1735,1692)).resize((1024,1024),Image.Resampling.LANCZOS)
    else:
        total=sum(b-a for a,b in strips)
        joined=Image.new('RGB',(total,350));x=0
        for a,b in strips:
            joined.paste(image.crop((a,410,b,760)),(x,0));x+=b-a
        sample=joined.resize((1024,1024),Image.Resampling.LANCZOS)
    for quality,size in [('fluid',256),('balanced',512),('max',1024)]:
        sample.resize((size,size),Image.Resampling.LANCZOS).save(out/f'{name}-{quality}.webp',quality=95,method=6)
