# Ciel du salon LRF

Le panorama photographique `partly-cloudy-sky-4k.webp` est un dérivé 4096 × 2048
du JPG tonemappé original 8192 × 4096 **Kloofendal 48d Partly Cloudy (Pure Sky)**,
par Greg Zaal (photographie) et Jarod Guest (édition du ciel), Poly Haven.

- Source : https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky
- Original : https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/kloofendal_48d_partly_cloudy_puresky.jpg
- Licence : CC0-1.0 — https://polyhaven.com/license
- Adaptation : réduction de résolution et conversion WebP, sans modification du ciel.

Seul ce dérivé léger est livré aux deux ateliers ; le fichier original n'est pas
requis au démarrage du configurateur.

## Planches Yosemite originales

Les huit fichiers JPEG `yosemite-{honey,natural}-03h2d{40,60}-*.jpg` sont les
photographies natives de quatre planches de chaque coloris, publiées pour les
références Elios **03H2D40** (Honey) et **03H2D60** (Natural), format **23,4 ×
119,5 cm**, sur les fiches Elios de Tilelook. Ils sont conservés à leur taille
native **1000 × 200 px**, sans agrandissement, génération ou reconstitution.

- Honey : https://www.tilelook.com/elios/yosemite-751fdf5d-e9bf-44c5-99d8-9fa87beda70f/tiles/yosemite-yosemite-honey-23-4x119-5cm-rett-03h2d40
- Natural : https://www.tilelook.com/elios/yosemite-751fdf5d-e9bf-44c5-99d8-9fa87beda70f/tiles/yosemite-yosemite-natural-23-4x119-5cm-rett-03h2d60
- Format fabricant : https://eliosceramica.com/collezione/yosemite/

Le manifeste `yosemite-native-sources.json` conserve les URL originales, les
références, dimensions et SHA-256 de chaque photographie. Ces planches
remplacent, uniquement dans le salon, les anciennes reconstitutions graphiques
et l'échantillon fabricant 416 × 208 px. La géométrie de pose applique un vrai
décalage d'un tiers (39,83 cm), avec joints et coupes physiques.

### Sélection pour les petits îlots bois

Le salon utilise désormais seulement les faces **Honey 02 et 05**, ou **Natural
04 et 12**, photographies natives non retouchées. Les huit originaux restent
dans la galerie HD. Le manifeste conserve également les moyennes RVB calculées
sur les pixels originaux : l'écart maximal entre les deux faces sélectionnées
est de **7,1 / 255** pour Honey et **4,3 / 255** pour Natural, contre jusqu'à
40 points environ avec l'ancien mélange Honey de quatre faces.

La sélection réduit le damier clair/foncé sans recolorer les carreaux. La
répartition des faces et leurs rotations de 180° sont déterministes et
irrégulières ; aucune rotation de 90°, aucun miroir du veinage. Le grain reste
aligné sur les 119,5 cm de longueur, avec le vrai décalage d'un tiers. Les
matériaux sont mats, filtrés par mipmaps et anisotropie ; la légère différence
entre l'aspect photographique 5:1 et le format réel est recadrée plutôt
qu'étirée. Le coloris Natural est prévu pour des îlots limités, le sol minéral
Creta restant la surface principale.

## Revêtements des stands fabricants

Les trois matières **VIEW** proviennent des faces natives du catalogue de
surfaces existant : Corso Beige (catalogue Corso 2024, page 18), Golden Stone
Carbon (catalogue Golden Stone 2026, page 10) et I Marmi di View Sahara Noir
(échantillon photographique original de 700 × 700 px). Elles conservent leurs
liens et couleurs VIEW, et ne sont pas attribuées à Elios.

Les JPEG suivants sont des photographies de produit de face, inspectées pour
écarter les photos d'ambiance, et copiées à leur définition originale :

| Fichier | Fabricant et collection | Format posé | Pixels natifs |
| --- | --- | --- | --- |
| `fenice-travertino-almond.jpg` | La Fenice · Il Travertino · Almond | 60 × 120 cm | 1201 × 601 |
| `fenice-xmetal-bronzo.jpg` | La Fenice · X Metal · Bronzo | 60 × 60 cm | 1024 × 1024 |
| `bulbo-chevron.jpg` | Bulbo · Chevron · 083 / 106 | panneau 120 × 279 cm | 893 × 2000 |
| `pecchioli-specchi-oro-native.jpg` | Pecchioli Firenze · Specchi Oro · NOR 71 | module de quatre carreaux de 20 × 20 cm, soit 40 × 40 cm | 1614 × 1604 |

`manufacturer-photo-sources.json` et `pecchioli-native-sources.json` consignent
les URL fabricant originales, fiches produit, dimensions et SHA-256. Les formats
Fenice et Bulbo correspondent aux fiches publiques déjà conservées dans
`assets/data/`. Le module Pecchioli conserve sa composition photographique de
quatre carreaux ; l'image entière n'est pas présentée comme un seul carreau de
20 cm. Aucun de ces fichiers n'est agrandi ou généré. Les murs ouvrent la
collection de leur propre fabricant et les photos HD originales.

## Dalles Slate du jardin et du bassin

Les six JPEG `slate-{gold,river,dark}-03f6a{10,60,90}-*.jpg` sont les faces
originales publiées pour les produits Elios Slate **60 × 120 cm** sur Tilelook :
Gold **03F6A10**, River **03F6A60**, Dark **03F6A90**. Définition native :
**500 × 1000 px**, sans génération, agrandissement ou rééchantillonnage. Le
manifeste `slate-native-sources.json` conserve chaque URL, fiche produit,
dimension et SHA-256. Ils remplacent dans le salon les petits échantillons de
catalogue d'environ 297 × 594 px.

Les photos représentent les dalles en portrait. Le matériau tourne les UV de
90° autour du centre pour les placer sur la géométrie 120 × 60 cm ; il conserve
l'image entière au lieu de recadrer son quart central. Deux faces sont partagées
par le fond et les quatre parois du bassin, soit deux textures résidentes.

Sources de gamme contrôlées le 9 novembre 2026 :

- Slate : https://eliosceramica.com/collezione/slate/ — gamme outdoor R11 ; le
  catalogue https://eliosceramica.com/wp-content/uploads/2023/05/Elios_SLATE_web.pdf
  présente la variante outdoor 60 × 120 cm en 20 mm et une piscine River.
- Roma : https://eliosceramica.com/collezione/roma/ — formats outdoor R11,
  notamment 40,6 × 40,6, 20,3 × 40,6 et 20,3 × 20,3 cm.
- Creta : https://eliosceramica.com/collezione/creta/ — R9/R10 observés ; ne pas
  présenter les recettes Creta du salon comme une variante R11.
- Yosemite : le format 23,4 × 119,5 cm du catalogue canonique est Naturel R10 B ;
  la recette ne porte pas d'étiquette R11.

Les références photographiques Slate ci-dessus identifient les faces de la
gamme naturelle. La disponibilité d'une finition outdoor est documentée
séparément ; aucune photo n'est présentée comme une certification d'une autre
référence commerciale.
