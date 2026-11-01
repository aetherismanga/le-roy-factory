#!/usr/bin/env python3
"""Build public La Fenice discovery pages from the verified catalogue snapshot.

Only catalogue facts are published. Professional tariffs and credentials are never
read or embedded. Existing index files and the sitemap are left to release tooling.
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
INDEX = 'carrelage-la-fenice.html'

def esc(value):
    return html.escape(str(value or ''), quote=True)

def plain(value):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', str(value or ''))).strip()

def norm(value):
    return ''.join(c for c in unicodedata.normalize('NFD', str(value)).lower() if not unicodedata.combining(c))

def slug(value):
    return re.sub(r'[^a-z0-9]+', '-', norm(value)).strip('-')

def safe_url(value):
    value = str(value or '')
    if value.startswith('assets/') and '..' not in value.split('/'):
        return '/' + value
    return value if value.startswith('/') or urlsplit(value).scheme == 'https' else ''

def pic_url(image):
    return safe_url(image.get('url', '') if isinstance(image, dict) else image)

def images(product):
    seen = set()
    out = []
    for image in product.get('images', []):
        src = pic_url(image)
        if src and src not in seen:
            seen.add(src)
            out.append({'url': src, 'thumbnail': safe_url(image.get('thumbnail')) or src if isinstance(image, dict) else src,
                        'alt': plain(image.get('alt')) if isinstance(image, dict) else ''})
    return out

def swatches(product):
    seen = set()
    out = []
    for item in product.get('swatches', []):
        name = plain(item.get('name'))
        image = safe_url(item.get('image'))
        original = safe_url(item.get('original')) or image
        if name and image and norm(name) not in seen:
            seen.add(norm(name))
            out.append({'name':name,'image':image,'original':original,'alt':plain(item.get('alt')) or f"{product['name']} · {name} — La Fenice"})
    return out

def exact_format(value):
    value = norm(value).replace('×', 'x').replace(',', '.')
    m = re.fullmatch(r'\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(?:cm)?\s*', value)
    return 'x'.join(str(float(n)).removesuffix('.0') for n in m.groups()) if m else None

def fmt(value):
    value = str(value).replace('.', ',')
    return value.replace('x', ' × ').replace('×', ' × ').replace('  ', ' ').strip() + ('' if re.search(r'cm|mm|modul|opus|esag', value, re.I) else ' cm')

def list_text(values, limit=None):
    values = [plain(v) for v in values or [] if plain(v)]
    if limit:
        values = values[:limit]
    return ' · '.join(values)

def is_home(product):
    return product.get('unit') == 'pièce' or product.get('productType') == 'Mobilier et vasques'

def cover_image(product):
    photo = images(product)
    return safe_url(product.get('coverImage')) or (photo[0]['thumbnail'] if photo else '')

def product_path(product):
    return f"la-fenice-{product['slug']}.html"

def query_link(product, demand=False):
    s = quote(product['slug'], safe='')
    return f'/fenice-demande.html?collection={s}' if demand else f'/univers.html?partner=la-fenice&collection={s}'

def source_link(source):
    url = safe_url(source.get('url'))
    page = source.get('page')
    if url and isinstance(page, (int, float)) and page >= 1:
        url = url.split('#')[0] + '#page=' + str(int(page))
    return url

def source_label(source):
    label = plain(source.get('label') or 'Catalogue fabricant')
    printed = source.get('printedPage')
    page = source.get('page')
    if printed:
        label += f' · p. {printed}'
    elif page:
        label += f' · page PDF {page}'
    return label

CSS = '''
:root{--seo-ink:#29262a;--seo-muted:#6d6660;--seo-paper:#f7f4ee;--seo-white:#fffdf9;--seo-dark:#722d3a;--seo-gold:#876222}.seo-button:hover{background:#58222d}.seo-card>a:first-child{display:block;text-decoration:none}.seo-card>a:first-child img{display:block;width:100%;height:220px;object-fit:cover;border-radius:7px;margin-bottom:18px}.seo-card h3{color:#3c2c2e}
.fenice-swatches{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}.fenice-swatches figure{margin:0;min-width:0;padding:6px;border:1px solid #e0d7c7;border-radius:12px;background:#fffdf9}.fenice-swatches a{display:block}.fenice-swatches img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:7px}.fenice-swatches figcaption{padding:9px 5px 5px;font-weight:700;font-size:.87rem;line-height:1.4;overflow-wrap:anywhere}.fenice-swatches a:focus-visible{outline:3px solid #876222;outline-offset:3px}.fenice-materials-note{color:#6d6660;font-size:.88rem;line-height:1.6}.fenice-tools{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;margin:22px 0}.fenice-tools label{display:grid;gap:7px;font-weight:700}.fenice-tools input,.fenice-tools select{min-width:0;width:100%;padding:12px;border:1px solid #cbbf9f;border-radius:10px;font:inherit;background:#fff;color:#252529}.fenice-tags{display:flex;gap:8px;flex-wrap:wrap;padding:0;list-style:none}.fenice-tags li{padding:7px 11px;border:1px solid #d7cdbb;border-radius:8px;background:#fff}.fenice-jump{display:flex;gap:7px;flex-wrap:wrap;margin:18px 0}.fenice-jump a{padding:7px 11px;background:#fff;border:1px solid #d7cdbb;border-radius:6px;text-decoration:none}.fenice-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.fenice-gallery figure{margin:0}.fenice-gallery a{display:block;background:#f0ece4;border-radius:12px;overflow:hidden}.fenice-gallery img{display:block;width:100%;height:auto;max-height:550px;object-fit:contain}.fenice-gallery figcaption{padding:8px 0;color:#68615b;font-size:.87rem}.fenice-catalogues{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}.fenice-catalogues a{padding:14px;border:1px solid #d7cdbb;border-radius:10px;background:#fff;text-decoration:none}.fenice-catalogues strong{display:block}.fenice-count{color:#68615b}.fenice-source-list{padding-left:22px}.fenice-source-list li{margin:10px 0}.fenice-summary{max-width:900px}.seo-card[hidden]{display:none!important}.fenice-tools button{cursor:pointer}.fenice-no-image{display:grid;place-items:center;min-height:180px;background:#f0ece4;color:#68615b}.fenice-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}.fenice-facts div{padding:18px;background:#fff;border:1px solid #e5dfd4;border-radius:12px}.fenice-facts dt{font-weight:800;margin-bottom:8px}.fenice-facts dd{margin:0}.fenice-detail-header{display:grid;grid-template-columns:1.1fr 1fr;gap:28px;align-items:center}.fenice-detail-header img{width:100%;max-height:510px;object-fit:cover;border-radius:15px}.fenice-formats a{margin-right:8px}.fenice-collection-table{width:100%;border-collapse:collapse}.fenice-collection-table td,.fenice-collection-table th{padding:12px;border-bottom:1px solid #e0d7c7;text-align:left}.fenice-collection-table th{background:#f3eee4}.fenice-reset{padding:10px 15px;border:1px solid #cbbf9f;border-radius:8px;background:#fff;color:#382e30;font:inherit}.fenice-details{padding:18px;border:1px solid #d7cdbb;border-radius:12px}.fenice-details summary{font-weight:800;cursor:pointer}.fenice-letter{grid-column:1/-1;margin:26px 0 2px}.fenice-letter h3{font-size:1.5rem;margin:0;color:#722d3a}
@media(max-width:720px){.fenice-swatches{grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.fenice-tools,.fenice-detail-header{grid-template-columns:1fr}.fenice-tools{gap:15px}.fenice-gallery,.fenice-catalogues,.fenice-facts{grid-template-columns:1fr}.fenice-detail-header{gap:20px}.fenice-detail-header img{max-height:380px}.seo-nav{flex-wrap:wrap}.fenice-collection-table{font-size:.92rem}.fenice-collection-table td,.fenice-collection-table th{padding:9px}}
'''

def breadcrumb(items):
    return '<nav class="seo-breadcrumb" aria-label="Fil d’Ariane">' + ' / '.join(f'<a href="/{esc(path)}">{esc(name)}</a>' for name, path in items) + '</nav>'

def page(title, description, path, content, image, crumbs, schema_extra=None):
    url = ORIGIN + path
    schema = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'CollectionPage', '@id': url + '#webpage', 'url': url,
         'name': title, 'description': description, 'inLanguage': 'fr-FR',
         'isPartOf': {'@id': ORIGIN + '#website'}, 'about': {'@type': 'Brand', 'name': 'La Fenice Ceramiche'}},
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': i + 1, 'name': name, 'item': ORIGIN + p}
            for i, (name, p) in enumerate(crumbs)]}
    ]}
    if schema_extra:
        schema['@graph'].append(schema_extra)
    schema_json = json.dumps(schema, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    return f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)} | LE ROY FACTORY</title><meta name="description" content="{esc(description)}"><meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="{esc(url)}"><meta property="og:type" content="website"><meta property="og:locale" content="fr_FR"><meta property="og:site_name" content="LE ROY FACTORY"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{esc(url)}"><meta property="og:image" content="{esc(image if image.startswith('https:') else ORIGIN.rstrip('/') + image)}"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="{BRAND}"><link rel="stylesheet" href="/assets/css/seo-editorial.css?v=20261101-fenice1"><style>{CSS}</style><script type="application/ld+json">{schema_json}</script></head>
<body class="seo-page"><a class="skip-link" href="#contenu">Aller au contenu</a><header class="seo-header"><div class="seo-shell seo-header-inner"><a class="seo-brand" href="/"><img src="{BRAND}" alt="LE ROY FACTORY" width="150" height="52"></a><nav class="seo-nav" aria-label="Navigation principale"><a href="/univers.html?partner=la-fenice">Sélection La Fenice</a><a href="/{INDEX}">Collections et formats</a><a href="/catalogues.html">Catalogues</a><a href="/contact.html">Contact</a></nav></div></header>
<main id="contenu" class="seo-shell">{breadcrumb(crumbs)}{content}</main>
<footer class="seo-footer"><div class="seo-shell"><nav aria-label="Pour poursuivre"><a href="/{INDEX}">Collections La Fenice</a><a href="/carrelage-elios.html">Elios</a><a href="/carrelage-view.html">VIEW</a><a href="/agence-carrelage-languedoc-paca.html">Notre agence</a><a href="/mentions-legales.html">Mentions légales</a></nav><p>© 2026 LE ROY FACTORY · Visuels et caractéristiques La Fenice Ceramiche. Les ambiances fabricant illustrent les collections.</p></div></footer></body></html>'''

def card(product):
    name, path = product['name'], product_path(product)
    photo = images(product)
    effect = plain(product.get('effect') or 'Carrelage et revêtements')
    formats = list_text([fmt(f) for f in product.get('formats', [])])
    colors = list_text(product.get('colors', []))
    keyword = ' '.join([name, effect, formats, colors, plain(product.get('description')), list_text(product.get('finishes', []))])
    cover = cover_image(product)
    illustration = f'<img src="{esc(cover)}" alt="{esc(name)} — La Fenice — {esc(effect)}" width="640" height="450" loading="lazy" decoding="async">' if cover else '<div class="fenice-no-image">Visuels dans le catalogue fabricant</div>'
    return f'<article class="seo-card fenice-search-card" data-keywords="{esc(keyword)}" data-format="{esc("|".join(exact_format(f) or str(f) for f in product.get("formats", [])))}" data-effect="{esc(effect)}"><a href="/{esc(path)}">{illustration}<h3>{esc(name)}</h3></a><p>{esc(effect)}</p><p class="small">{esc(formats or ("Dimensions et options dans le catalogue fabricant" if is_home(product) else "Formats détaillés dans le catalogue de la collection"))}</p><a href="/{esc(path)}">Photos, formats et catalogues</a></article>'

def project_block(product=None):
    home = product is not None and is_home(product)
    heading = 'Un projet avec La Fenice Home ?' if home else 'Un projet de carrelage avec La Fenice ?'
    target = query_link(product, True) if product else '/fenice-demande.html'
    return f'''<section class="seo-section"><h2>{heading}</h2><p>LE ROY FACTORY accompagne les négoces et les professionnels en Languedoc et en PACA, notamment autour de Montpellier et de Vendargues. Un particulier peut demander un renseignement et être orienté vers un partenaire adapté à son projet.</p><div class="seo-actions"><a class="seo-button" href="{esc(target)}">Commande ou renseignement</a><a class="seo-button secondary" href="/agence-carrelage-languedoc-paca.html">Découvrir notre accompagnement</a></div></section>'''

def build_collection(product, products):
    name = product['name']
    home = is_home(product)
    title = f'{name} La Fenice — photos et dimensions' if home else f'{name} La Fenice — carrelage, photos et formats'
    effect = plain(product.get('effect') or 'Carrelage et revêtements')
    formats = product.get('formats', [])
    colors = product.get('colors', [])
    finishes = product.get('finishes', [])
    description = (f'{name} de La Fenice Home : mobilier et vasques en grès cérame, photos, dimensions et options fabricant. Consultez le catalogue et préparez votre demande.' if home else f'{name} de La Fenice : {effect.lower()}, photos fabricant, formats et coloris. Consultez les catalogues et préparez votre demande auprès de LE ROY FACTORY.')
    photo = images(product)
    summary = plain(product.get('description')) if home else f'La collection {name} de La Fenice se découvre ici à travers ses visuels et les caractéristiques publiées par le fabricant.'
    if formats and not home:
        summary += f' Ses formats comprennent {", ".join(fmt(f) for f in formats[:4])}{" et d’autres dimensions détaillées ci-dessous" if len(formats) > 4 else ""}.'
    if colors:
        summary += f' La palette réunit {", ".join(plain(c) for c in colors[:5])}{" et d’autres coloris" if len(colors) > 5 else ""}.'
    cover = cover_image(product)
    dimensions_heading = 'Dimensions et personnalisation' if home else 'Formats de la collection'
    hero_heading = f'{name} : photos et dimensions' if home else f'{name} : photos, formats et coloris'
    head_image = f'<img src="{esc(cover)}" alt="{esc(name)} — La Fenice — {esc(effect)}" width="900" height="650" fetchpriority="high" decoding="async">' if cover else ''
    hero = f'''<section class="seo-hero fenice-detail-header"><div><p class="seo-eyebrow">LA FENICE CERAMICHE · {esc(effect)}</p><h1>{esc(hero_heading)}</h1><p class="seo-lead">{esc(summary)}</p><div class="seo-actions"><a class="seo-button" href="{esc(query_link(product))}">Voir la fiche dans la sélection</a><a class="seo-button secondary" href="{esc(query_link(product, True))}">Commande ou renseignement</a></div></div>{head_image}</section>'''
    facts = f'''<section class="seo-section"><h2>Caractéristiques de {esc(name)}</h2><dl class="fenice-facts"><div><dt>{'Type de produit' if home else 'Aspect'}</dt><dd>{esc(effect)}</dd></div><div><dt>Coloris fabricant</dt><dd>{esc(list_text(colors) or 'À consulter dans le catalogue de la collection')}</dd></div><div><dt>Finitions renseignées</dt><dd>{esc(list_text(finishes) or 'À confirmer selon la référence choisie')}</dd></div></dl><h3>{dimensions_heading}</h3>'''
    if formats:
        facts += '<ul class="fenice-tags">' + ''.join(f'<li>{esc(fmt(f))}</li>' for f in formats) + '</ul>'
    else:
        facts += '<p>Les dimensions et les options de personnalisation se consultent dans le catalogue fabricant.</p>' if home else '<p>Les dimensions et pièces spéciales sont à consulter dans le catalogue fabricant.</p>'
    facts += '<p class="seo-note">Les dimensions, coloris et finitions se vérifient ensemble pour la référence retenue. Les caractéristiques de la collection ne signifient pas que chaque combinaison existe.</p></section>'
    gallery = ''
    if photo:
        gallery = f'<section class="seo-section"><h2>Visuels {esc(name)}</h2><p>Ouvrez une image pour la consulter en grand format, ou retrouvez la galerie interactive dans la sélection.</p><div class="fenice-gallery">' + ''.join(f'<figure><a href="{esc(p["url"])}" target="_blank" rel="noopener" aria-label="Agrandir {esc(name)}, visuel {i+1}"><img src="{esc(p["thumbnail"])}" alt="{esc(p["alt"] or name + " — La Fenice — " + effect + " — visuel " + str(i+1))}" loading="lazy" decoding="async"></a><figcaption>{esc(p["alt"] or name + " · visuel fabricant " + str(i+1))}</figcaption></figure>' for i, p in enumerate(photo)) + '</div></section>'
    palette = swatches(product)
    color_gallery = ''
    if palette:
        material_note = f'<p class="fenice-materials-note">{esc(product["materialsNote"])}</p>' if product.get('materialsNote') else ''
        color_gallery = f'<section class="seo-section"><h2>Coloris et matières {esc(name)}</h2><p>Ouvrez chaque visuel pour le consulter en grand format.</p>{material_note}<div class="fenice-swatches">' + ''.join(f'<figure><a href="{esc(item["original"])}" target="_blank" rel="noopener" aria-label="Agrandir {esc(name)} · {esc(item["name"])}"><img src="{esc(item["image"])}" alt="{esc(item["alt"])}" loading="lazy" decoding="async" width="300" height="300"></a><figcaption>{esc(item["name"])}</figcaption></figure>' for item in palette) + '</div></section>'
    pricing = f'<section class="seo-section"><h2>Tarifs professionnels {esc(name)}</h2><p>Connectez-vous avec votre compte autorisé, ouvrez cette collection dans la sélection puis appuyez sur « Voir » pour afficher les montants par format.</p><div class="seo-actions"><a class="seo-button" href="{esc(query_link(product))}">Voir mes tarifs professionnels</a><a class="seo-button secondary" href="/tarifs-pro.html">Mon accès PRO</a></div></section>'
    source_items = []
    primary = product.get('primaryCatalogueSource')
    sources = [primary] if primary and source_link(primary) else [s for s in product.get('sources', []) if source_link(s)][:1]
    if not sources and safe_url(product.get('pdf')):
        sources = [{'url': product['pdf'], 'label': f'Catalogue {name}'}]
    for s in sources:
        url, label = source_link(s), source_label(s)
        if url:
            source_items.append(f'<li><a href="{esc(url)}" target="_blank" rel="noopener">{esc(label)}</a></li>')
    documents = '<section class="seo-section"><h2>Catalogue de la collection</h2><ul class="fenice-source-list">' + ''.join(source_items) + '</ul><p class="seo-note">Consultez la série dans le catalogue le plus récent. Les tarifs professionnels sont accessibles dans la sélection aux comptes autorisés.</p></section>'
    related = [p for p in products if p['slug'] != product['slug'] and p.get('effect') == product.get('effect')][:3]
    related_html = '<section class="seo-section"><h2>Autres collections à découvrir</h2><div class="seo-grid">' + ''.join(card(p) for p in related) + '</div></section>' if related else ''
    crumbs = [('Accueil', ''), ('La Fenice', INDEX), (name, product_path(product))]
    schema_product = {'@type': 'Product', '@id': ORIGIN + product_path(product) + '#collection', 'name': name,
                      'brand': {'@type': 'Brand', 'name': 'La Fenice Ceramiche'}, 'category': effect, 'url': ORIGIN + product_path(product)}
    if photo or palette:
        schema_product['image'] = list(dict.fromkeys([p['url'] for p in photo]+[item['original'] for item in palette]))
    if formats:
        schema_product['additionalProperty'] = [{'@type': 'PropertyValue', 'name': 'Dimensions proposées' if home else 'Formats de la collection', 'value': list_text([fmt(f) for f in formats])}]
    if colors:
        schema_product['color'] = ', '.join(colors)
    return page(title, description, product_path(product), hero + facts + gallery + color_gallery + pricing + documents + project_block(product) + related_html, cover or BRAND, crumbs, schema_product)

FILTER_JS = '''
<script>
(()=>{const form=document.getElementById('fenice-search');if(!form)return;const q=document.getElementById('fenice-query'),format=document.getElementById('fenice-format'),effect=document.getElementById('fenice-effect'),cards=[...document.querySelectorAll('.fenice-search-card')],count=document.getElementById('fenice-count'),empty=document.getElementById('fenice-empty');const norm=v=>String(v).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/×/g,'x').replace(/,/g,'.');function render(){const terms=norm(q.value).trim().split(/\\s+/).filter(Boolean);let total=0;for(const c of cards){const hay=norm(c.dataset.keywords).replace(/\\s*x\\s*/g,'x');const matches=terms.every(t=>hay.includes(t)||hay.replace(/x/g,'').includes(t))&&(!format.value||c.dataset.format.split('|').includes(format.value))&&(!effect.value||c.dataset.effect===effect.value);c.hidden=!matches;if(matches)total++;}count.textContent=total+' collection'+(total>1?'s':'');empty.hidden=!!total;}form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('input',render);form.addEventListener('change',render);form.addEventListener('reset',()=>setTimeout(render,0));render();})();
</script>'''

def build_index(products, catalogues, format_pages):
    photo = next((cover_image(p) for p in products if cover_image(p)), BRAND)
    title = 'La Fenice — carrelage, mobilier, catalogues et formats'
    description = 'Découvrez les carrelages, meubles et vasques La Fenice : photos, formats, dimensions et catalogues. Tarifs réservés aux comptes PRO autorisés dans la sélection.'
    effects = sorted({plain(p.get('effect')) for p in products if p.get('effect')}, key=norm)
    format_options = {}
    for p in products:
        for f in p.get('formats', []):
            if exact_format(f):
                format_options[exact_format(f)] = fmt(f)
    formats = sorted(format_options, key=lambda s: tuple(float(n) for n in s.split('x')))
    hero = f'''<section class="seo-hero"><p class="seo-eyebrow">LE ROY FACTORY · LA FENICE CERAMICHE</p><h1>La Fenice : carrelage, mobilier et vasques</h1><p class="seo-lead">Parcourez {len(products)} collections classées par ordre alphabétique. Les catalogues général, muraux, nouveautés et La Fenice Home sont réunis dans une sélection commune : une collection possède une seule fiche, avec ses photos, ses formats et un lien vers le catalogue le plus récent à la page de la série.</p><div class="seo-actions"><a class="seo-button" href="/univers.html?partner=la-fenice">Ouvrir la sélection interactive</a><a class="seo-button secondary" href="/fenice-demande.html">Commande ou renseignement</a></div></section>'''
    search = '<section class="seo-section"><h2>Rechercher par produit, aspect ou format</h2><form id="fenice-search"><div class="fenice-tools"><label for="fenice-query">Collection, coloris ou format<input id="fenice-query" type="search" placeholder="Ex. Aspen, travertin, 60x60…" autocomplete="off"></label><label for="fenice-format">Format<select id="fenice-format"><option value="">Tous les formats</option>' + ''.join(f'<option value="{esc(f)}">{esc(format_options[f])}</option>' for f in formats) + '</select></label><label for="fenice-effect">Aspect<select id="fenice-effect"><option value="">Tous les aspects</option>' + ''.join(f'<option>{esc(e)}</option>' for e in effects) + '</select></label></div><button class="fenice-reset" type="reset">Réinitialiser</button></form>'
    if format_pages:
        search += '<h3>Explorer un format</h3><nav class="fenice-jump" aria-label="Carrelage La Fenice par format">' + ''.join(f'<a href="/{path}">{esc(fmt(f))}</a>' for f, path in format_pages.items()) + '</nav>'
    search += f'<p id="fenice-count" class="fenice-count" role="status">{len(products)} collections</p><p id="fenice-empty" hidden>Aucune collection ne correspond à cette recherche. Essayez un autre nom, aspect ou format.</p><div class="seo-grid">' + ''.join(card(p) for p in products) + '</div></section>'
    catalogue_html = '<section class="seo-section"><h2>Les catalogues La Fenice</h2><p>Retrouvez les éditions et collections proposées par le fabricant. Les collections communes à plusieurs documents restent regroupées dans une seule fiche.</p><details class="fenice-details"><summary>Consulter les catalogues et brochures</summary><div class="fenice-catalogues">' + ''.join(f'<a href="{esc(safe_url(c.get("url")))}" target="_blank" rel="noopener"><strong>{esc(c.get("label") or c.get("name"))}</strong><span>Ouvrir le catalogue PDF ↗</span></a>' for c in catalogues if safe_url(c.get('url'))) + '</div></details></section>'
    pricing = '<section class="seo-section"><h2>Tarifs professionnels et demandes des particuliers</h2><p>Les comptes professionnels autorisés retrouvent leur accès tarif La Fenice dans la sélection. Pour préparer une commande, indiquez la collection, le format, le coloris et la quantité recherchés. Les particuliers disposent d’une demande de renseignement pour préciser leur projet et être accompagnés.</p><div class="seo-actions"><a class="seo-button" href="/univers.html?partner=la-fenice">Accéder à ma sélection La Fenice</a><a class="seo-button secondary" href="/fenice-demande.html">Décrire mon projet</a></div></section>'
    item_list = {'@type': 'ItemList', 'name': 'Collections La Fenice', 'numberOfItems': len(products), 'itemListElement': [{'@type': 'ListItem', 'position': i+1, 'name': p['name'], 'url': ORIGIN+product_path(p)} for i,p in enumerate(products)]}
    return page(title, description, INDEX, hero+search+catalogue_html+pricing+project_block()+FILTER_JS, photo, [('Accueil',''),('La Fenice',INDEX)], item_list)

def build_format(format_name, path, products):
    label = fmt(format_name)
    title = f'Carrelage La Fenice {label} — collections et photos'
    description = f'Comparez les collections La Fenice au format {label} : visuels, couleurs, caractéristiques et catalogues fabricant avec LE ROY FACTORY.'
    content = f'<section class="seo-hero"><p class="seo-eyebrow">LA FENICE · RECHERCHE PAR FORMAT</p><h1>Carrelage La Fenice {esc(label)}</h1><p class="seo-lead">Ces {len(products)} collections mentionnent le format {esc(label)} dans leurs caractéristiques fabricant. Comparez les aspects et les palettes, puis consultez la fiche de chaque série pour vérifier la référence adaptée à votre projet.</p><div class="seo-actions"><a class="seo-button" href="/{INDEX}">Tous les formats La Fenice</a><a class="seo-button secondary" href="/fenice-demande.html">Demander un renseignement</a></div></section><section class="seo-section"><h2>Collections disponibles dans ce format de catalogue</h2><div class="seo-grid">' + ''.join(card(p) for p in products) + '</div><p class="seo-note">Cette sélection indique un format de collection ; elle ne constitue pas une information de stock. Les finitions, coloris et conditionnements se confirment pour la référence retenue.</p></section>'+project_block()
    photo = next((cover_image(p) for p in products if cover_image(p)), BRAND)
    return page(title, description, path, content, photo, [('Accueil',''),('La Fenice',INDEX),(label,path)])

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', type=Path, default=ROOT / 'assets/data/fenice-catalogue.json')
    args = parser.parse_args()
    data = json.loads(args.data.read_text())
    raw = data if isinstance(data, list) else data.get('collections', data.get('products', []))
    products = sorted(raw, key=lambda p: norm(p['name']))
    if not products:
        raise SystemExit('Refusing to generate an empty catalogue')
    seen = set()
    for p in products:
        if not p.get('slug') or p['slug'] in seen or slug(p['slug']) != p['slug']:
            raise SystemExit('Missing, unsafe or duplicate collection slug: '+str(p.get('slug')))
        seen.add(p['slug'])
    catalogues = data.get('catalogues', []) if isinstance(data, dict) else []
    common_formats = {}
    for p in products:
        for f in set(exact_format(f) for f in p.get('formats', [])) - {None}:
            if not is_home(p):
                common_formats.setdefault(f, []).append(p)
    format_pages = {f:f'la-fenice-format-{f}.html' for f, ps in sorted(common_formats.items()) if len(ps)>=5}
    entries = []
    for p in products:
        path = product_path(p)
        (ROOT/path).write_text(build_collection(p, products))
        entries.append({'path':path,'url':ORIGIN+path,'type':'collection','slug':p['slug'],'name':p['name'],'images':list(dict.fromkeys([cover_image(p)]+[im['url'] for im in images(p)]+[item['original'] for item in swatches(p)]))})
    (ROOT/INDEX).write_text(build_index(products, catalogues, format_pages))
    entries.insert(0, {'path':INDEX,'url':ORIGIN+INDEX,'type':'index'})
    for f,path in format_pages.items():
        (ROOT/path).write_text(build_format(f,path,common_formats[f]))
        entries.append({'path':path,'url':ORIGIN+path,'type':'format','format':f})
    manifest = {'source':'assets/data/fenice-catalogue.json','updated':data.get('updated','2026-11-01') if isinstance(data,dict) else '2026-11-01','collectionCount':len(products),'pages':entries}
    (ROOT/'assets/data/fenice-seo-pages.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'collections':len(products),'formatPages':len(format_pages),'totalPages':len(entries)},ensure_ascii=False))

if __name__ == '__main__':
    main()
