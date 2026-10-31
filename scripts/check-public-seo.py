"""Check public sitemap, metadata, editorial links and indexing boundaries."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
from urllib.robotparser import RobotFileParser
import json
import re
import subprocess
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://leroyfactory.fr/'
NEW = ['agence-carrelage-languedoc-paca.html', 'fabricants-carrelage-salle-de-bain.html',
       'configurateur-salle-de-bain-3d.html', 'logiciel-calepinage-carrelage.html', 'guide-projet-carrelage.html']

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.h1 = 0
        self.links, self.images, self.canonicals, self.robots = [], [], [], []
        self.description = None
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'h1': self.h1 += 1
        if tag == 'link' and a.get('rel') == 'canonical': self.canonicals.append(a['href'])
        if tag == 'meta' and a.get('name') == 'robots': self.robots.append(a['content'])
        if tag == 'meta' and a.get('name') == 'description': self.description = a.get('content')
        if tag == 'a' and 'href' in a: self.links.append(a['href'])
        if tag == 'img': self.images.append(a)

def local_page(path):
    return ROOT / (unquote(path).lstrip('/') or 'index.html')

def executable_scripts(source):
    return [body for attrs, body in re.findall(r'<script\b([^>]*)>(.*?)</script\s*>', source, re.I | re.S)
            if 'application/ld+json' not in attrs and body.strip()]

robot = RobotFileParser()
robot.parse((ROOT / 'robots.txt').read_text().splitlines())
urls = [x.text for x in ElementTree.parse(ROOT / 'sitemap.xml').findall('{*}url/{*}loc')]
assert len(urls) == len(set(urls)) and len(urls) >= 20
for url in urls:
    assert url.startswith(BASE), url
    path = local_page(urlsplit(url).path)
    source = path.read_text()
    page = Page(source)
    assert page.h1 == 1, f'{path.name}: expected one H1'
    assert page.canonicals == [url], f'{path.name}: canonical mismatch'
    assert page.description, f'{path.name}: description missing'
    assert all('noindex' not in r for r in page.robots), f'{path.name}: noindex in sitemap'
    assert robot.can_fetch('*', url), f'{path.name}: blocked sitemap URL'
    assert not re.search(r'/(?:agent|dashboard|clients|tarifs-pro|statistiques|.*-test)\.html$', url)
    for block in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', source, re.S | re.I):
        json.loads(block)

links_checked = 0
for name in NEW:
    page = Page((ROOT / name).read_text())
    for img in page.images:
        assert img.get('alt') is not None and img.get('width') and img.get('height'), name
    for href in page.links + [i.get('src', '') for i in page.images]:
        url = urlsplit(href)
        if url.scheme or url.netloc: continue
        target = local_page(url.path) if url.path else ROOT / name
        assert target.is_file(), f'{name}: missing {href}'
        if url.fragment and target.suffix == '.html':
            assert re.search(r'\bid=["\']' + re.escape(unquote(url.fragment)) + r'["\']', target.read_text()), href
        links_checked += 1

# SEO edits must never alter executable code in an existing page.
paths = subprocess.check_output(['git', 'diff', '--name-only', 'HEAD'], cwd=ROOT, text=True).splitlines()
preserved = 0
for name in paths:
    if not name.endswith('.html'): continue
    before = subprocess.check_output(['git', 'show', 'HEAD:' + name], cwd=ROOT, text=True)
    assert executable_scripts(before) == executable_scripts((ROOT / name).read_text()), f'{name}: executable script changed'
    preserved += 1
assert 'AGENTS.md' in (ROOT / '_config.yml').read_text()
assert 'noindex' in (ROOT / '404.html').read_text()
print(json.dumps({'passed': True, 'publicCanonicalUrls': len(urls), 'editorialPages': len(NEW),
                  'localLinksAndImagesChecked': links_checked, 'existingExecutablePagesPreserved': preserved,
                  'note': 'Robots and noindex are not authentication or removal guarantees.'}))
