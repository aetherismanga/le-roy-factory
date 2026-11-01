"""Regenerate the sitemap from an explicit public editorial allowlist.

Dates are supplied only for pages actually edited in the SEO release. Do not
replace them with the execution date during routine regeneration.
"""
from pathlib import Path
import json
from xml.etree.ElementTree import Element, SubElement, ElementTree, register_namespace, indent

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://leroyfactory.fr/'
PAGES = [
    ('', '2026-10-31'),
    ('partenaires.html', '2026-10-31'),
    ('univers.html', '2026-10-31'),
    ('realisations.html', None),
    ('catalogues.html', None),
    ('configurateurs.html', '2026-10-31'),
    ('configurateurs-randal.html', '2026-10-31'),
    ('configurateur-croisillons.html', None),
    ('configurateur-joints.html', None),
    ('configurateur-plots.html', None),
    ('configurateur-elios-pose.html', None),
    ('contact.html', '2026-10-31'),
    ('agence-carrelage-languedoc-paca.html', '2026-10-31'),
    ('fabricants-carrelage-salle-de-bain.html', '2026-10-31'),
    ('configurateur-salle-de-bain-3d.html', '2026-10-31'),
    ('logiciel-calepinage-carrelage.html', '2026-10-31'),
    ('guide-projet-carrelage.html', '2026-10-31'),
    ('bilt-talox-kit.html', '2026-10-31'),
    ('actualite-cersaie.html', '2026-10-31'),
    ('mentions-legales.html', None),
    ('politique-confidentialite.html', None),
]
NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'
IMAGE = 'http://www.google.com/schemas/sitemap-image/1.1'
register_namespace('', NS)
register_namespace('image', IMAGE)
tree = Element(f'{{{NS}}}urlset')
for page, modified in PAGES:
    assert (ROOT / (page or 'index.html')).is_file(), page
    url = SubElement(tree, f'{{{NS}}}url')
    SubElement(url, f'{{{NS}}}loc').text = BASE + page
    if modified:
        SubElement(url, f'{{{NS}}}lastmod').text = modified
    if page == 'configurateur-salle-de-bain-3d.html':
        for image in ['lrf-expo-studio-one.webp', 'lrf-expo-general.webp']:
            entry = SubElement(url, f'{{{IMAGE}}}image')
            SubElement(entry, f'{{{IMAGE}}}loc').text = BASE + 'shared/lrf-3d/media/public-compositions/' + image
# Explicit public discovery manifests, never CRM, tariffs or private routes.
for brand in ['elios','view','fenice','biopietra']:
    manifest = ROOT / f'assets/data/{brand}-seo-pages.json'
    if not manifest.exists():
        continue
    data = json.loads(manifest.read_text())
    for item in data['pages']:
        page = item.get('file') or item['path']
        assert page.endswith('.html') and '/' not in page and (ROOT / page).is_file()
        assert page.startswith((brand+'-', 'carrelage-'+brand, 'la-fenice-' if brand=='fenice' else brand+'.html', 'carrelage-la-fenice' if brand=='fenice' else brand+'.html')), page
        assert page not in ['biopietra-commande.html','biopietra-disponibilite.html'], page
        url = SubElement(tree, f'{{{NS}}}url')
        SubElement(url, f'{{{NS}}}loc').text = BASE + page
        SubElement(url, f'{{{NS}}}lastmod').text = item.get('updated') or data.get('updated') or '2026-11-01'
        for src in item.get('images', []):
            image = SubElement(url, f'{{{IMAGE}}}image')
            SubElement(image, f'{{{IMAGE}}}loc').text = src
indent(tree, space='  ')
ElementTree(tree).write(ROOT / 'sitemap.xml', encoding='utf-8', xml_declaration=True)
print(f'{len(tree)} public canonical URLs; private pages excluded')
