#!/usr/bin/env python3
"""Build public Biopietra discovery pages from the verified manufacturer snapshot.

The generator reads catalogue facts only. It never reads private tariffs or client
information. Release tooling owns the sitemap and shared site navigation.
"""
from __future__ import annotations

import argparse
import html
import json
from pathlib import Path
import re
import unicodedata
from urllib.parse import quote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://leroyfactory.fr/'
BRAND = '/assets/img/performance-20261027/brand-wordmark-wine.svg'
INDEX = 'biopietra.html'
VERSION = '20261101-biopietra1'
RESERVED = {'commande', 'disponibilite'}


def plain(value):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', str(value or ''))).strip()


def esc(value):
    return html.escape(str(value or ''), quote=True)


def norm(value):
    return ''.join(c for c in unicodedata.normalize('NFD', str(value)).lower() if not unicodedata.combining(c))


def sort_key(value):
    return [int(part) if part.isdigit() else part for part in re.split(r'(\d+)', norm(value))]


def safe_url(value):
    value = str(value or '').strip()
    if value.startswith('assets/') and '..' not in value.split('/'):
        return '/' + value
    if value.startswith('/') and not value.startswith('//') and '..' not in value.split('/'):
        return value
    parsed = urlsplit(value)
    return value if parsed.scheme == 'https' and parsed.hostname else ''


def text_value(value):
    if isinstance(value, (str, int, float)):
        return plain(value)
    if isinstance(value, list):
        return ' × '.join(text_value(item) for item in value if isinstance(item, (str, int, float)))
    return ''


def media(product):
    found, seen = [], set()
    for raw in product.get('images', []):
        item = raw if isinstance(raw, dict) else {'url': raw}
        url = safe_url(item.get('original') or item.get('fullUrl') or item.get('url'))
        if not url or url in seen:
            continue
        seen.add(url)
        found.append({'url': url, 'thumbnail': safe_url(item.get('thumbnail') or item.get('url')) or url,
                      'alt': plain(item.get('alt')) or f"{product['name']} — Biopietra",
                      'caption': plain(item.get('caption') or item.get('alt'))})
    return found


def palette(product):
    found, seen = [], set()
    for item in product.get('swatches', []):
        name = plain(item.get('name'))
        url = safe_url(item.get('original') or item.get('image'))
        if not name or norm(name) in seen:
            continue
        seen.add(norm(name))
        found.append({'name': name, 'url': url, 'thumbnail': safe_url(item.get('image')) or url,
                      'alt': plain(item.get('alt')) or f"{product['name']} · {name} — Biopietra"})
    return found


def cover(product):
    images = media(product)
    return safe_url(product.get('coverImage')) or (images[0]['thumbnail'] if images else '')


def group(product):
    return plain(product.get('group') or product.get('productType') or product.get('family')) or 'Collections Biopietra'


def product_path(product):
    slug = product['slug']
    if slug in RESERVED or not re.fullmatch(r'[a-z0-9][a-z0-9-]*', slug):
        raise ValueError(f'Unsafe or reserved product slug: {slug}')
    return f'biopietra-{slug}.html'


def selection_link(product=None):
    return '/univers.html?partner=biopietra' + (f"&collection={quote(product['slug'], safe='')}" if product else '')


def order_link(product=None):
    return '/biopietra-commande.html' + (f"?collection={quote(product['slug'], safe='')}" if product else '')


def source(product):
    item = product.get('primaryCatalogueSource') or {}
    url = safe_url(item.get('url'))
    if url:
        label = plain(item.get('label')) or 'Catalogue de la collection'
        page = item.get('page')
        if isinstance(page, int) and page > 0:
            url = url.split('#', 1)[0] + '#page=' + str(page)
            label += ' · p. ' + str(item.get('printedPage') or page)
        return url, label
    return safe_url(product.get('sourceUrl')), 'Fiche officielle de la collection'


def breadcrumb(items):
    return '<nav class="seo-breadcrumb" aria-label="Fil d’Ariane">' + ' / '.join(
        f'<a href="/{esc(path)}">{esc(name)}</a>' for name, path in items) + '</nav>'


def page(title, description, path, body, image, crumbs, extra):
    canonical = ORIGIN + path
    graph = [
        {'@type': 'CollectionPage' if path == INDEX else 'WebPage', '@id': canonical + '#webpage',
         'url': canonical, 'name': title, 'description': description, 'inLanguage': 'fr-FR',
         'isPartOf': {'@id': ORIGIN + '#website'}, 'about': {'@type': 'Brand', 'name': 'Biopietra'}},
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': i + 1, 'name': name, 'item': ORIGIN + target}
            for i, (name, target) in enumerate(crumbs)]}, extra]
    schema = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    og_image = image if image.startswith('https:') else ORIGIN.rstrip('/') + image
    return f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)} | LE ROY FACTORY</title><meta name="description" content="{esc(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{esc(canonical)}">
<meta property="og:type" content="website"><meta property="og:locale" content="fr_FR"><meta property="og:site_name" content="LE ROY FACTORY"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{esc(canonical)}"><meta property="og:image" content="{esc(og_image)}"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="{BRAND}"><link rel="stylesheet" href="/assets/css/seo-editorial.css?v={VERSION}"><link rel="stylesheet" href="/assets/css/biopietra-seo.css?v={VERSION}"><script type="application/ld+json">{schema}</script></head>
<body class="seo-page bio-seo"><a class="skip-link" href="#contenu">Aller au contenu</a><header class="seo-header"><div class="seo-shell seo-header-inner"><a class="seo-brand" href="/"><img src="{BRAND}" alt="LE ROY FACTORY" width="150" height="52"></a><nav class="seo-nav" aria-label="Navigation principale"><a href="{selection_link()}">Sélection Biopietra</a><a href="/{INDEX}">Collections et coloris</a><a href="{order_link()}">Préparer mon projet</a><a href="/contact.html">Contact</a></nav></div></header>
<main id="contenu" class="seo-shell">{breadcrumb(crumbs)}{body}</main><footer class="seo-footer"><div class="seo-shell"><nav aria-label="Pour poursuivre"><a href="/{INDEX}">Collections Biopietra</a><a href="/agence-carrelage-languedoc-paca.html">Notre agence</a><a href="/mentions-legales.html">Mentions légales</a></nav><p>© 2026 LE ROY FACTORY · Visuels et caractéristiques fabricant Biopietra. Les ambiances illustrent les réalisations du fabricant.</p></div></footer></body></html>'''


def buttons(product=None):
    return f'<div class="seo-actions"><a class="seo-button" href="{esc(selection_link(product))}">Choisir dans la sélection</a><a class="seo-button secondary" href="{esc(order_link(product))}">Préparer ma demande</a></div>'


def pack_text(variant):
    packaging = plain(variant.get('packLabel'))
    quantity = variant.get('packQuantity')
    unit = plain(variant.get('unit'))
    if isinstance(quantity, (int, float)) and not isinstance(quantity, bool) and quantity > 0 and unit:
        amount = f'{quantity:g}'.replace('.', ',')
        return f'{amount} {unit} / {packaging or "boîte"}'
    return 'À confirmer pour cette référence'


def variant_table(product):
    variants = product.get('variants') or []
    if not variants:
        return '<p>Les éléments et leur conditionnement sont à confirmer pour cette référence lors de la préparation du projet.</p>'
    labels = {'fondo': 'Plaque de parement', 'angle': 'Angle', 'piece': 'Pièce spéciale', 'accessory': 'Produit de pose'}
    color_names = {item.get('id'): plain(item.get('name')) for item in product.get('swatches', [])}
    rows = []
    for item in variants:
        name = plain(item.get('label')) or labels.get(item.get('component'), 'Élément')
        dims = text_value(item.get('dimensions')) or 'Selon la référence'
        thickness = text_value(item.get('thickness'))
        if not thickness and item.get('thicknessMm'):
            thickness = text_value(item.get('thicknessMm')) + ' mm'
        colors = [color_names[c] for c in item.get('colorIds', []) if c in color_names]
        detail = (f'<small>Coloris : {esc(", ".join(colors))}</small>' if colors else '')
        rows.append(f'<tr><th scope="row">{esc(name)}{detail}</th><td>{esc(dims)}</td><td>{esc(thickness or "Selon la référence")}</td><td>{esc(pack_text(item))}</td></tr>')
    return '<div class="bio-table-scroll"><table class="bio-variant-table"><thead><tr><th scope="col">Élément</th><th scope="col">Dimensions fabricant</th><th scope="col">Épaisseur</th><th scope="col">Conditionnement</th></tr></thead><tbody>' + ''.join(rows) + '</tbody></table></div>'


def notes(product):
    values = product.get('technicalNotes') or []
    if isinstance(values, str):
        values = [values]
    values = [plain(v) for v in values if isinstance(v, (str, int, float)) and plain(v)]
    if not values:
        return ''
    return '<section class="seo-section"><h2>À savoir pour votre projet</h2><ul class="bio-technical-notes">' + ''.join(f'<li>{esc(value)}</li>' for value in values) + '</ul></section>'


def product_page(product):
    name = plain(product['name'])
    path = product_path(product)
    title = f'{name} Biopietra — visuels, coloris et éléments'
    description = f'{name} de Biopietra : photos fabricant, coloris, éléments et conditionnements renseignés. Retrouvez la référence précise et préparez votre projet avec LE ROY FACTORY.'
    photo, colors, illustration = media(product), palette(product), cover(product)
    summary = f'Découvrez {name} à travers les visuels et les caractéristiques publiés par Biopietra. Choisissez le coloris puis l’élément adapté à votre projet dans la sélection.'
    hero_original = next((item['url'] for item in photo if illustration in (item['url'], item['thumbnail'])), illustration)
    hero_image = f'<a class="bio-hero-image" href="{esc(hero_original)}" target="_blank" rel="noopener" aria-label="Agrandir {esc(name)}"><img src="{esc(illustration)}" alt="{esc(name)} — Biopietra" fetchpriority="high" decoding="async" width="900" height="650"></a>' if illustration else ''
    body = f'<section class="seo-hero bio-detail-hero"><div><p class="seo-eyebrow">BIOPIETRA · {esc(group(product))}</p><h1>{esc(name)}</h1><p class="seo-lead">{esc(summary)}</p>{buttons(product)}</div>{hero_image}</section>'
    if isinstance(product.get('composition'), str) and plain(product['composition']):
        body += f'<section class="seo-section"><h2>Composition du mélange</h2><p>{esc(plain(product["composition"]))}</p></section>'
    if photo:
        figures = []
        for item in photo:
            caption = item['caption'] or item['alt']
            figures.append(f'<figure><a href="{esc(item["url"])}" target="_blank" rel="noopener" aria-label="Agrandir {esc(caption)}"><img src="{esc(item["thumbnail"])}" alt="{esc(item["alt"])}" width="800" height="650" loading="lazy" decoding="async"></a><figcaption>{esc(caption)}</figcaption></figure>')
        body += '<section class="seo-section"><h2>Les visuels de la collection</h2><p>Ouvrez chaque photo pour la consulter en grand format.</p><div class="bio-photo-grid">' + ''.join(figures) + '</div></section>'
    if colors:
        figures = []
        for item in colors:
            image = f'<a href="{esc(item["url"])}" target="_blank" rel="noopener" aria-label="Agrandir {esc(name)} · {esc(item["name"])}"><img src="{esc(item["thumbnail"])}" alt="{esc(item["alt"])}" width="300" height="300" loading="lazy" decoding="async"></a>' if item['url'] else '<span class="bio-swatch-unavailable">Visuel à confirmer</span>'
            figures.append(f'<figure>{image}<figcaption>{esc(item["name"])}</figcaption></figure>')
        body += '<section class="seo-section"><h2>Coloris et variantes visuelles</h2><p>Les noms et codes reprennent ceux du fabricant. Un visuel d’ambiance ne remplace pas un échantillon du coloris choisi.</p><div class="bio-color-grid">' + ''.join(figures) + '</div></section>'
    body += f'<section class="seo-section"><h2>Éléments et conditionnements</h2>{variant_table(product)}<p class="bio-fact-note">Les éléments, épaisseurs et coloris se vérifient ensemble pour la référence retenue. Les plaques et les angles se commandent séparément, dans l’unité indiquée pour chaque élément.</p></section>'
    body += notes(product)
    url, label = source(product)
    if url:
        body += f'<section class="seo-section bio-document"><h2>Document de la collection</h2><a class="bio-document-link" href="{esc(url)}" target="_blank" rel="noopener">{esc(label)} <span aria-hidden="true">↗</span></a></section>'
    body += f'<section class="seo-section"><h2>Préparer un projet précis</h2><p>Retrouvez cette collection dans la sélection pour choisir votre coloris et vos éléments. Les quantités sont converties en boîtes lorsque le conditionnement fabricant est renseigné. Jérôme confirme les références et les conditions avant toute validation de commande.</p><p>Les professionnels disposent de leur accès tarifaire dans l’espace PRO. Les particuliers peuvent préciser leur secteur pour être orientés vers un magasin revendeur.</p>{buttons(product)}</section>'
    schema = {'@type': 'Product', '@id': ORIGIN + path + '#collection', 'name': name,
              'brand': {'@type': 'Brand', 'name': 'Biopietra'}, 'category': group(product), 'url': ORIGIN + path}
    if photo or colors:
        schema['image'] = list(dict.fromkeys([item['url'] for item in photo] + [item['url'] for item in colors if item['url']]))
    if colors:
        schema['color'] = ', '.join(item['name'] for item in colors)
    return page(title, description, path, body, illustration or BRAND, [('Accueil', ''), ('Biopietra', INDEX), (name, path)], schema)


def card(product):
    name, path, family = plain(product['name']), product_path(product), group(product)
    colors = palette(product)
    color_names = [item['name'] for item in colors]
    image = cover(product)
    keywords = ' '.join([name, family, plain(product.get('baseSeries')), plain(product.get('description')), *color_names, *[plain(item.get('label')) for item in product.get('variants', [])]])
    visual = f'<img src="{esc(image)}" alt="{esc(name)} — Biopietra" width="640" height="450" loading="lazy" decoding="async">' if image else '<div class="bio-no-image">Visuels sur la fiche fabricant</div>'
    detail = f'{len(colors)} coloris / variante' + ('s' if len(colors) != 1 else '') if colors else 'Éléments et visuels fabricant'
    return f'<article class="bio-search-card" data-keywords="{esc(keywords)}" data-family="{esc(family)}" data-colors="{esc("|".join(norm(name) for name in color_names))}"><a href="/{esc(path)}">{visual}<div class="bio-card-copy"><p class="bio-card-family">{esc(family)}</p><h3>{esc(name)}</h3><p>{esc(detail)}</p><span>Voir les visuels et les éléments →</span></div></a></article>'


FILTER_JS = '''<script>
(()=>{const form=document.getElementById('bio-search');if(!form)return;const query=document.getElementById('bio-query'),family=document.getElementById('bio-family'),color=document.getElementById('bio-color'),cards=[...document.querySelectorAll('.bio-search-card')],count=document.getElementById('bio-count'),empty=document.getElementById('bio-empty');const norm=v=>String(v).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();function render(){const terms=norm(query.value).split(/\\s+/).filter(Boolean);let total=0;for(const card of cards){const hay=norm(card.dataset.keywords),compact=hay.replace(/ /g,'');const match=terms.every(term=>hay.includes(term)||compact.includes(term))&&(!family.value||card.dataset.family===family.value)&&(!color.value||card.dataset.colors.split('|').includes(color.value));card.hidden=!match;if(match)total++;}count.textContent=total+' collection'+(total>1?'s':'');empty.hidden=!!total;}form.addEventListener('submit',event=>event.preventDefault());form.addEventListener('input',render);form.addEventListener('change',render);form.addEventListener('reset',()=>setTimeout(render,0));render();})();
</script>'''


def index_page(products):
    families = sorted({group(product) for product in products}, key=sort_key)
    colors = sorted({item['name'] for product in products for item in palette(product)}, key=sort_key)
    body = f'<section class="seo-hero"><p class="seo-eyebrow">LE ROY FACTORY · BIOPIETRA</p><h1>Trouvez le parement de votre projet.</h1><p class="seo-lead">Séries, briques, mélanges et produits de pose : retrouvez {len(products)} collections Biopietra avec leurs noms précis, leurs visuels et leurs éléments.</p>{buttons()}</section>'
    body += '<section class="seo-section"><h2>Choisir une collection</h2><form id="bio-search" class="bio-search"><label for="bio-query">Série, code Mix ou coloris<input id="bio-query" type="search" placeholder="Ex. Stelvio, Mix STE 34, Beige…" autocomplete="off"></label><label for="bio-family">Famille<select id="bio-family"><option value="">Toutes les familles</option>' + ''.join(f'<option>{esc(family)}</option>' for family in families) + '</select></label><label for="bio-color">Coloris / variante<select id="bio-color"><option value="">Tous les coloris</option>' + ''.join(f'<option value="{esc(norm(color))}">{esc(color)}</option>' for color in colors) + '</select></label><button type="reset">Réinitialiser</button></form>'
    body += f'<p id="bio-count" class="bio-count" role="status">{len(products)} collections</p><p id="bio-empty" hidden>Aucune collection ne correspond. Modifiez votre recherche ou réinitialisez les filtres.</p><div class="bio-collection-grid">' + ''.join(card(product) for product in products) + '</div></section>'
    body += f'<section class="seo-section"><h2>Du choix à la demande</h2><ol class="bio-steps"><li><strong>Trouvez votre série.</strong> Recherchez un nom, un coloris ou le code exact d’un mélange.</li><li><strong>Vérifiez les éléments.</strong> Consultez les visuels, les plaques, les angles et les épaisseurs renseignées pour cette référence.</li><li><strong>Préparez votre projet.</strong> Renseignez les quantités et transmettez votre demande pour confirmation.</li></ol>{buttons()}</section>{FILTER_JS}'
    description = 'Explorez les collections et mélanges Biopietra : visuels fabricant, coloris, plaques, angles et conditionnements. Trouvez la référence précise et préparez votre projet.'
    schema = {'@type': 'ItemList', 'name': 'Collections Biopietra', 'numberOfItems': len(products), 'itemListElement': [
        {'@type': 'ListItem', 'position': index + 1, 'name': product['name'], 'url': ORIGIN + product_path(product)}
        for index, product in enumerate(products)]}
    image = next((cover(product) for product in products if cover(product)), BRAND)
    return page('Biopietra — collections, visuels et préparation de projet', description, INDEX, body, image, [('Accueil', ''), ('Biopietra', INDEX)], schema)


def assert_public(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if re.fullmatch(r'proPrice|purchasePrice|purchaseHT|prixAchat|amount|price|tarifHT', key, re.I):
                raise ValueError(f'Unexpected private tariff field: {key}')
            assert_public(item)
    elif isinstance(value, list):
        for item in value:
            assert_public(item)


def discovery_records(products):
    return [{
        'slug': product['slug'], 'name': plain(product['name']),
        'family': plain(product.get('family')), 'group': plain(product.get('group')),
        'colors': [item['name'] for item in palette(product)],
        'composition': plain(product.get('composition')),
        'baseSeries': plain(product.get('baseSeries')),
        'page': product_path(product),
    } for product in products]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, default=ROOT / 'assets/data/biopietra-catalogue.json')
    parser.add_argument('--output', type=Path, default=ROOT)
    args = parser.parse_args()
    data = json.loads(args.data.read_text())
    assert_public(data)
    products = sorted(data['collections'], key=lambda product: sort_key(product['name']))
    if len({product['slug'] for product in products}) != len(products):
        raise ValueError('Duplicate collection slugs')
    args.output.mkdir(parents=True, exist_ok=True)
    pages = []
    for product in products:
        path = product_path(product)
        text = product_page(product)
        (args.output / path).write_text(text)
        pages.append({'path': path, 'slug': product['slug'], 'name': product['name'], 'type': 'collection'})
    (args.output / INDEX).write_text(index_page(products))
    pages.insert(0, {'path': INDEX, 'name': 'Collections Biopietra', 'type': 'index'})
    manifest = {'version': VERSION, 'brand': 'Biopietra', 'collections': len(products), 'pages': pages}
    target = args.output / 'assets/data/biopietra-seo-pages.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    discovery = args.output / 'assets/js/biopietra-discovery-data.js'
    discovery.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(discovery_records(products), ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    discovery.write_text('// Public Biopietra search facts; regenerated from the verified catalogue.\nwindow.LRF_BIOPIETRA_SEARCH_META=' + payload + ';\n')
    print(json.dumps({'collections': len(products), 'totalPages': len(pages), 'searchIndexBytes': discovery.stat().st_size}, ensure_ascii=False))


if __name__ == '__main__':
    main()
