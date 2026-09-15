from pathlib import Path
from PIL import Image
import json
import re

VERSION = '20260915-brand-final6'
ROOT = Path('.')
OFFICIAL_REL = f'assets/brand-v2/assetlogorond.png?v={VERSION}'
OFFICIAL_ABS = f'/assets/brand-v2/assetlogorond.png?v={VERSION}'

# 1) Generate browser/PWA icons from the official round LRF asset.
src = ROOT / 'assets/brand-v2/assetlogorond.png'
if not src.exists():
    raise SystemExit('Official LRF source logo missing')
im = Image.open(src).convert('RGBA')
icons = ROOT / 'assets/icons'
icons.mkdir(parents=True, exist_ok=True)
im.resize((192, 192), Image.Resampling.LANCZOS).save(icons / 'lrf-192.png', optimize=True)
im.resize((512, 512), Image.Resampling.LANCZOS).save(icons / 'lrf-512.png', optimize=True)
im.resize((180, 180), Image.Resampling.LANCZOS).save(ROOT / 'apple-touch-icon.png', optimize=True)
im.save(ROOT / 'favicon.ico', sizes=[(16,16),(32,32),(48,48)])

# 2) Premium public theme: force fresh CSS + official logo everywhere it controls.
p = ROOT / 'assets/js/premium-public-theme.js'
s = p.read_text(encoding='utf-8')
s = re.sub(r"assets/css/lrf-logo-scale-v9\.css\?v=[^'\"]+", f"assets/css/lrf-logo-scale-v9.css?v={VERSION}", s)
s = re.sub(r"assets/brand-v2/logoLRF\.png\?v=[^'\"]+", OFFICIAL_REL, s)
s = re.sub(r"assets/brand-v2/assetlogorond\.png\?v=[^'\"]+", OFFICIAL_REL, s)
p.write_text(s, encoding='utf-8')

# 3) App loader: force fresh premium and PWA scripts.
p = ROOT / 'assets/js/app.js'
s = p.read_text(encoding='utf-8')
s = re.sub(r"assets/js/premium-public-theme\.js\?v=[^'\"]+", f"assets/js/premium-public-theme.js?v={VERSION}", s)
s = re.sub(r"assets/js/pwa-install\.js\?v=[^'\"]+", f"assets/js/pwa-install.js?v={VERSION}", s)
p.write_text(s, encoding='utf-8')

# 4) PWA bootstrap: fresh manifest/icon/service-worker references.
p = ROOT / 'assets/js/pwa-install.js'
s = p.read_text(encoding='utf-8')
s = re.sub(r"const VERSION='[^']+';", f"const VERSION='{VERSION}';", s, count=1)
s = re.sub(r"/manifest\.webmanifest\?v=[^'\"+]+", f"/manifest.webmanifest?v={VERSION}", s)
s = re.sub(r"/sw\.js\?v=[^'\"+]+", f"/sw.js?v={VERSION}", s)
p.write_text(s, encoding='utf-8')

# 5) Phone + tablet sizing: 58x58, no transform, including iPad landscape and coarse-pointer tablets.
p = ROOT / 'assets/css/lrf-logo-scale-v9.css'
s = p.read_text(encoding='utf-8')
mobile = '''@media (max-width:1180px), (hover:none) and (pointer:coarse){
  body.lrf-premium-v2 header,
  body.lrf-premium-v2 header .nav-container{
    height:84px!important;
    min-height:84px!important;
  }
  body.lrf-premium-v2 header .logo,
  body.lrf-premium-v2 header a.logo{
    width:58px!important;
    min-width:58px!important;
    max-width:58px!important;
    height:58px!important;
    min-height:58px!important;
    max-height:58px!important;
    padding:0!important;
    margin-left:10px!important;
    overflow:hidden!important;
    transform:none!important;
  }
  body.lrf-premium-v2 .lrf-monogram-header,
  body.lrf-premium-v2 header .logo>img,
  body.lrf-premium-v2 header a.logo>img{
    width:58px!important;
    min-width:58px!important;
    max-width:58px!important;
    height:58px!important;
    min-height:58px!important;
    max-height:58px!important;
    transform:none!important;
    scale:1!important;
    object-fit:contain!important;
    border-radius:50%!important;
    filter:drop-shadow(0 3px 6px rgba(0,0,0,.24))!important;
  }
  body.lrf-page-index .hero-video-section{height:calc(100svh - 84px)!important;}
  body.lrf-page-index .hero-logo{width:min(390px,90vw)!important;max-width:90vw!important;max-height:none!important;}
}

@media(max-width:430px){
  body.lrf-premium-v2 header .logo,
  body.lrf-premium-v2 header a.logo,
  body.lrf-premium-v2 .lrf-monogram-header,
  body.lrf-premium-v2 header .logo>img,
  body.lrf-premium-v2 header a.logo>img{
    width:58px!important;
    min-width:58px!important;
    max-width:58px!important;
    height:58px!important;
    min-height:58px!important;
    max-height:58px!important;
    transform:none!important;
    scale:1!important;
  }
  body.lrf-page-index .hero-logo{width:92vw!important;max-width:92vw!important;}
}
'''
s = re.sub(r"@media\s*\(max-width:1180px\),\s*\(hover:none\)\s*and\s*\(pointer:coarse\)\{.*\Z", mobile, s, flags=re.S)
if s == p.read_text(encoding='utf-8'):
    s = re.sub(r"@media\(max-width:900px\)\{.*\Z", mobile, s, flags=re.S)
p.write_text(s, encoding='utf-8')

p = ROOT / 'assets/css/mobile-enhancements.css'
s = p.read_text(encoding='utf-8')
s = re.sub(r"body:not\(\.crm-body\) header \.logo>div\{width:\d+px!important;height:\d+px!important\}",
           "body:not(.crm-body) header .logo>div{width:58px!important;height:58px!important}", s)
p.write_text(s, encoding='utf-8')

# 6) Every root HTML page: fresh controlling JS + Apple/PWA metadata.
for p in ROOT.glob('*.html'):
    s = p.read_text(encoding='utf-8')
    s = re.sub(r"assets/js/premium-public-theme\.js\?v=[^\"']+", f"assets/js/premium-public-theme.js?v={VERSION}", s)
    s = re.sub(r"assets/js/app\.js\?v=[^\"']+", f"assets/js/app.js?v={VERSION}", s)
    s = re.sub(r"assets/brand-v2/logoLRF\.png\?v=[^\"']+", OFFICIAL_REL, s)
    s = re.sub(r"assets/brand-v2/assetlogorond\.png\?v=[^\"']+", OFFICIAL_REL, s)
    s = re.sub(r'(<link[^>]*rel=["\']icon["\'][^>]*href=["\'])[^"\']+(["\'][^>]*>)',
               rf'\1/assets/icons/lrf-192.png?v={VERSION}\2', s, flags=re.I)
    s = re.sub(r'(<link[^>]*href=["\'])[^"\']+(["\'][^>]*rel=["\']icon["\'][^>]*>)',
               rf'\1/assets/icons/lrf-192.png?v={VERSION}\2', s, flags=re.I)
    extras = []
    if 'rel="apple-touch-icon"' not in s and "rel='apple-touch-icon'" not in s:
        extras.append(f'<link rel="apple-touch-icon" href="/apple-touch-icon.png?v={VERSION}">')
    if 'rel="manifest"' not in s and "rel='manifest'" not in s:
        extras.append(f'<link rel="manifest" href="/manifest.webmanifest?v={VERSION}">')
    if 'apple-mobile-web-app-capable' not in s:
        extras.append('<meta name="apple-mobile-web-app-capable" content="yes">')
    if 'apple-mobile-web-app-status-bar-style' not in s:
        extras.append('<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">')
    if 'apple-mobile-web-app-title' not in s:
        extras.append('<meta name="apple-mobile-web-app-title" content="LE ROY FACTORY">')
    if extras and '</head>' in s:
        s = s.replace('</head>', '  ' + '\n  '.join(extras) + '\n</head>', 1)
    p.write_text(s, encoding='utf-8')

# 7) Manifest for phone + tablet, portrait or landscape.
manifest = {
    'name': 'LE ROY FACTORY',
    'short_name': 'LRF',
    'description': "L'application LE ROY FACTORY pour accéder au site, aux partenaires, aux tarifs PRO et à l'espace agent.",
    'start_url': f'/index.html?source=pwa&v={VERSION}',
    'scope': '/',
    'display': 'standalone',
    'display_override': ['standalone', 'minimal-ui'],
    'background_color': '#0b0b0b',
    'theme_color': '#0b0b0b',
    'orientation': 'any',
    'lang': 'fr-FR',
    'icons': [
        {'src': f'/assets/icons/lrf-192.png?v={VERSION}', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
        {'src': f'/assets/icons/lrf-512.png?v={VERSION}', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
        {'src': f'/assets/icons/lrf-512.png?v={VERSION}', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}
    ]
}
(ROOT / 'manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# 8) Service worker: only update cache version/references; keep the simplified network-first logic.
p = ROOT / 'sw.js'
s = p.read_text(encoding='utf-8')
s = re.sub(r"const CACHE='[^']+';", f"const CACHE='lrf-pwa-{VERSION}';", s, count=1)
s = re.sub(r"'/assets/icons/lrf-192\.png\?v=[^']+'", f"'/assets/icons/lrf-192.png?v={VERSION}'", s)
s = re.sub(r"'/assets/icons/lrf-512\.png\?v=[^']+'", f"'/assets/icons/lrf-512.png?v={VERSION}'", s)
s = re.sub(r"'/apple-touch-icon\.png\?v=[^']+'", f"'/apple-touch-icon.png?v={VERSION}'", s)
p.write_text(s, encoding='utf-8')

print('LRF final phone/tablet/iOS brand applied')
