"""Small, idempotent editorial additions. Never edits executable application scripts."""
from pathlib import Path
from html import escape
import json, re

ROOT=Path(__file__).resolve().parent.parent
BASE='https://leroyfactory.fr/'
def change(name, fn):
    p=ROOT/name;before=p.read_text();after=fn(before)
    executable=lambda s:[(a,b) for a,b in re.findall(r'<script\b([^>]*)>(.*?)</script\s*>',s,re.I|re.S) if 'application/ld+json' not in a]
    assert executable(before)==executable(after), name+' application scripts changed'
    p.write_text(after)

def home(s):
    old='Agence commerciale carrelage et salle de bains en Languedoc et PACA. Fabricants italiens et espagnols, configurateurs RANDAL 3D et LRF PLAN &amp; POSE.'
    new='Carrelage, pierre et salle de bains en PACA, Occitanie et Corse. Collections, conseil et configurateurs 3D pour particuliers, professionnels et architectes.'
    s=s.replace(old,new)
    s=s.replace('Un accompagnement en Languedoc et PACA','Un accompagnement en Occitanie, PACA et Corse')
    s=s.replace('href="agence-carrelage-languedoc-paca.html">Découvrir nos secteurs','href="carrelage-paca-occitanie-corse.html">Découvrir nos secteurs')
    s=s.replace('sélectionnés pour accompagner les professionnels.','sélectionnés pour accompagner les particuliers, professionnels et architectes.')
    marker='<nav class="reach-home-links"'
    if marker not in s:
        links=[('carrelage-paca-occitanie-corse.html','PACA, Occitanie et Corse'),('carrelage-montpellier.html','Carrelage à Montpellier'),('carrelage-toulon.html','Carrelage à Toulon'),('carrelage-marseille.html','Carrelage à Marseille'),('carrelage-particuliers.html','Projet particulier'),('carrelage-professionnels.html','Négoces et artisans'),('carrelage-architectes.html','Architectes et décorateurs'),('bilt-talox-kit.html','Outillage de pose BILT')]
        nav='<nav class="reach-home-links" aria-label="Projets et secteurs"><p>'+ ' · '.join(f'<a href="{u}">{t}</a>' for u,t in links)+'</p></nav>'
        needle='</details>\n</div></section>'
        assert needle in s
        s=s.replace(needle,nav+'</details>\n</div></section>',1)
    # Keep the existing Organization identity, update its actual service territory.
    def ld(m):
        d=json.loads(m.group(2))
        for item in d.get('@graph',[]):
            if item.get('@type')=='Organization':
                item['areaServed']=[{'@type':'AdministrativeArea','name':n} for n in ['Provence-Alpes-Côte d’Azur','Occitanie','Corse']]
        return m.group(1)+json.dumps(d,ensure_ascii=False)+m.group(3)
    s=re.sub(r'(<script\b[^>]*type="application/ld\+json"[^>]*>)(.*?)(</script>)',ld,s,flags=re.S)
    return s
change('index.html',home)

preview='''<section class="config-preview-strip" aria-labelledby="apercus-configurateurs"><h2 id="apercus-configurateurs">Votre projet, déjà en images.</h2><div class="config-preview-grid"><article><figure><img src="shared/lrf-3d/demo/media/randal-studio-one-photoreal-v1-small.webp" alt="Rendu de la salle de bains de démonstration RANDAL Studio One" width="768" height="512" loading="lazy" decoding="async"><figcaption>Rendu du configurateur · projet de démonstration</figcaption></figure><h3>Composer sa salle de bains</h3><p>Comparez le meuble, la vasque, le miroir et les revêtements dans une pièce en 3D.</p><a href="configurateur-salle-de-bain-3d.html">Découvrir les ateliers RANDAL →</a></article><article><figure><img src="shared/lrf-3d/media/public-compositions/lrf-expo-general.webp" alt="Composition de démonstration dans le Catalogue Général RANDAL" width="960" height="610" loading="lazy" decoding="async"><figcaption>Composition LRF · Catalogue Général RANDAL</figcaption></figure><h3>Comparer les collections RANDAL</h3><p>Composez le mobilier, les finitions, les plans et les miroirs du Catalogue Général en 3D.</p><a href="randal-configurateur.html">Ouvrir le Catalogue Général 3D →</a></article><article><figure><img src="assets/img/view-selection-20261031/coco/01-ambiance-preview.webp" alt="Ambiance fabricant VIEW COCO : terrasse et piscine pour comparer les matières" width="1000" height="667" loading="lazy" decoding="async"><figcaption>Ambiance fabricant · VIEW COCO</figcaption></figure><h3>Comparer intérieur, terrasse et piscine</h3><p>Retrouvez les outils de visualisation, de mosaïque piscine et les calculateurs de pose.</p><a href="#outils-reperes">Choisir un outil →</a></article></div></section>'''
def configurators(s):
    if 'id="apercus-configurateurs"' not in s:
        s=s.replace('</head>','<link rel="stylesheet" href="assets/css/seo-reach.css?v=20261114-1"></head>',1)
        needle='<section class="seo-overview" aria-labelledby="outils-reperes">'
        assert needle in s
        s=s.replace(needle,preview+needle,1)
    return s.replace('Réservé aux professionnels.','Particuliers, professionnels et architectes.')
change('configurateurs.html',configurators)

def bath(s):
    s=s.replace('Montpellier, Castelnau-le-Lez, Vendargues et en PACA.','Montpellier, Marseille, Toulon, en Occitanie, PACA et Corse.')
    s=s.replace('<p class="seo-meta">','<section class="seo-section"><h2>Un projet en Occitanie, PACA ou Corse ?</h2><p>Retrouvez les conseils adaptés aux <a href="carrelage-particuliers.html">particuliers</a>, aux <a href="carrelage-professionnels.html">professionnels</a> et aux <a href="carrelage-architectes.html">architectes</a>. Nos <a href="carrelage-paca-occitanie-corse.html">guides par secteur</a> aident à préparer les échanges et les références à faire confirmer.</p></section><p class="seo-meta">',1) if 'Un projet en Occitanie, PACA ou Corse ?' not in s else s
    return s
change('configurateur-salle-de-bain-3d.html',bath)

brand_links=[('pierre-naturelle-saxso.html','SAXSO · pierre naturelle'),('miroirs-opal.html','OPAL · miroirs'),('robinetterie-aquahome.html','AQUAHOME · robinetterie'),('meubles-salle-de-bain-neobath.html','Neobath · ANIMA et DNA'),('mosaique-piscine-reviglass.html','Reviglass · mosaïque piscine'),('decoration-ceramique-bulbo.html','BULBO · décors'),('ceramique-pecchioli-firenze.html','Pecchioli Firenze · céramique')]
def brands(s):
    if 'id="guides-fabricants"' not in s:
        block='<section class="seo-section" id="guides-fabricants"><h2>Préparer votre sélection par fabricant</h2><p>Découvrez les matières, les usages et les informations à préparer avant d’ouvrir le catalogue interactif.</p><ul>'+''.join(f'<li><a href="{u}">{t}</a></li>' for u,t in brand_links)+'</ul><p><a href="carrelage-paca-occitanie-corse.html">Accompagnement en PACA, Occitanie et Corse</a> · <a href="configurateurs.html">Configurateurs et visuels 3D</a></p></section>'
        assert '</main>' in s;s=s.replace('</main>',block+'</main>',1)
    return s
change('fabricants-carrelage-salle-de-bain.html',brands)

def catalogues(s):
    if 'id="catalogues-guides"' not in s:
        block='<section class="seo-overview" id="catalogues-guides"><h2>Du catalogue à votre projet</h2><p>'+ ' · '.join(f'<a href="{u}">{t}</a>' for u,t in brand_links[:5])+'.</p><p><a href="catalogue-exterieur-r11.html">Sélection de carrelage extérieur R11</a> · <a href="carrelage-paca-occitanie-corse.html">PACA, Occitanie et Corse</a> · <a href="carrelage-architectes.html">Préparer une prescription</a></p></section>'
        assert '</main>' in s;s=s.replace('</main>',block+'</main>',1)
    return s
change('catalogues.html',catalogues)

# Metadata-only corrections on application shells. Existing access policies stay intact.
for name in ['opal-catalogue-interactif.html','neobath-catalogues-interactifs.html']:
    def canonical(s,name=name):
        if not re.search(r'<link[^>]+rel=["\']canonical',s,re.I):s=s.replace('</head>',f'<link rel="canonical" href="{BASE+name}"></head>',1)
        return s
    change(name,canonical)
print('Public editorial links, configurator previews and catalogue metadata integrated; executable scripts preserved.')
