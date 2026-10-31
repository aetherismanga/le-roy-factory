# Sélections VIEW — livraison du 31 octobre 2026

Les 19 collections existantes reçoivent 94 visuels officiels : ambiances et
déclinaisons identifiées, dont les images COCO extraites du catalogue fabricant.
La fiche propose miniatures, précédent/suivant, filtres couleur, plein écran,
zoom et navigation clavier/tactile. Les aperçus et miniatures sont légers ; le
plein écran utilise une variante aux dimensions de la source.

Le lexique A–Z répertorie les 19 fiches indépendamment des filtres de la grille.
La recherche couvre collections, coloris, formats, finitions et références.
Les écritures 60x120 et 60×120 sont acceptées. Un guide explique les principales
finitions. Une ouverture par le lexique synchronise aussi la collection de la
commande ; la notice de commande ne provoque plus de boucle de mutations.

Chaque fiche donne accès au catalogue sous forme de pages rendues sur place,
avec numéro de page, zoom et lien explicite vers le document original. Le
lecteur et PDF.js sont chargés à la demande. Les catalogues réutilisés depuis
Firebase sont servis en segments locaux dont l'assemblage est identique au PDF
source : cela évite le refus de fetch distant observé dans le navigateur de QA.
Corso utilise un dérivé de consultation de 11 779 060 octets, 20 pages et textes
vectoriels conservés, images limitées à 1550 px / JPEG 90 ; l'original reste lié.
BIGSIZE ne contient que les pages/visuels vérifiés sans grille commerciale.

Le fichier `reports/view-selection-media-20261031.json` conserve provenance,
dimensions, empreintes et transformations. Le script
`tools/build_view_selection_media.py` reconstruit les dérivés et contrôle les
extraits revus. Les 308 fichiers binaires ont été décodés/contrôlés et leur SHA
Git vérifié avant création de l'arbre de publication.

## Validation

- Installation reproductible avec npm ci.
- `npm run check:core` réussi.
- Suites PLAN & POSE, suite partagée, sécurité, tarifs agents et impacts :
  485 réussites, zéro échec, un ancien test navigateur ignoré.
- 15 tests publics/recherche/ordonnancement/autorisations réussis.
- Syntaxe des scripts modifiés, diff et construction publique réussis.
- Navigateur Chromium réel : lexique vers fiche, recherche par format et SKU,
  plein écran/zoom/Escape, retour Elios et commande après changement de fiche
  par le lexique (COCO bien sélectionné après ARDENNE).
- Catalogue BAAR STONE : rendu réel de 23 pages, page 2 et zoom 125 %, retour
  à la fiche conservé. Catalogue ARDENNE sur affichage mobile 390 px : rendu
  réel de la première des 17 pages après assemblage des segments locaux.
- Affichage mobile via iframe 390×844 : largeur 390 sans débordement horizontal,
  galerie plein écran, contrôles et ressources accessibles. Cadrage du texte
  d'introduction corrigé. Identité vectorielle existante utilisée sans motif floral.

Les suites navigateur locales WebKit/Chromium ne pouvaient pas démarrer leurs
exécutables dans cet environnement ; les parcours ci-dessus ont été effectués
dans le navigateur interactif. Safari et appareils physiques ne sont pas couverts.
Le coloris I MARMI DI VIEW « Travertino Bianco » reste sans photo officiellement
identifiable ; aucune autre teinte ne lui est attribuée.

## Publication

Lot limité au site public GitHub Pages, `univers.html` et `univers-ios.html`.
Marqueur `publicSite.releaseId = 20261031-view-selection-1`.
Les catalogues commerciaux, droits, références, prix et conditionnements restent
inchangés. Aucune application Vercel ni donnée CRM n'est publiée par ce lot.
Contrôle après publication : marqueur, empreintes des nouveaux scripts, images,
segments PDF, puis ouverture d'une fiche et du lecteur sur le domaine public.
