# Allure : raccords des décors — 23 octobre 2026

Le rendu utilisait un échantillon agrandi à la place du panneau complet. La géométrie retournait aussi un carreau sur deux à 180°, rompant le dessin.

Les quatre décors (Fenix Juniper, Fenix Blueberry, Safari et Eden) utilisent maintenant le panneau complet du schéma de pose ELIOS. Les cadres, marges blanches et pictogrammes sont exclus de la texture. Le panneau est posé dans un sens constant. Le format physique reste 60 × 120 cm et le dessin peut être posé horizontalement ou verticalement. Le décalage à moitié est retiré pour ces décors afin de conserver les raccords ; les anciens projets décalés sont rétablis en pose droite avec leur sens et leur origine conservés.

Sources officielles : [collection Allure](https://eliosceramica.com/collezione/allure/) et [catalogue Allure](https://eliosceramica.com/wp-content/uploads/2023/05/Elios_catalogo_ALLURE.pdf). Les URL des quatre schémas, zones extraites, dimensions et empreintes des textures sont dans `../allure-panels-sources-20261023.json`. La définition reste celle du document fabricant, sans ajout de détail artificiel.

Validation :

- `npm run build` : réussi.
- `npm run check` : les 26 suites ont réussi.
- `qa/allure-repeat-check.mjs` : 34 074 sommets contrôlés sur les quatre décors, dans les deux sens, avec décalages d’origine positifs et négatifs, ouvertures découpées, réindexation et changement de matériau. Les surfaces et quantités physiques sont conservées.
- `qa/allure-repeat-browser.cjs` : les quatre décors chargés par les vrais matériaux WebGL, contrôlés dans les deux sens. Trois qualités de texture, restauration d’un projet ancien et largeurs mobiles 320/390/430 px vérifiées. Rapport détaillé : `local-browser.json`.
- Inspection visuelle des captures : continuité des feuilles et sens de pose cohérents avec les panneaux officiels.

Le navigateur de test utilise un GPU logiciel et une émulation tactile. Les résultats ne constituent pas une mesure de fluidité sur un téléphone physique.
