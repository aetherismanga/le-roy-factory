# LE ROY FACTORY — règles permanentes de modification

Ces règles s'appliquent à toute nouvelle page, tout nouveau module, tout correctif et toute refonte du site ou du CRM.

## Logo officiel LRF — instruction de Jérôme du 7 novembre 2026

- Conserver le logo rond officiel `assets/img/logo03lrf.png` uniquement en haut à gauche des pages du site, ainsi que pour les icônes. Ne pas ajouter de logo rond au centre de l’accueil ni dans les pieds de page ; conserver la présentation centrale existante.
- Son feuillage et sa fleur font partie du logo validé ; cette image précise est explicitement autorisée et ne doit pas être confondue avec les anciens décors floraux interdits ci-dessous.
- Ne jamais le remplacer par une signature texte « LE ROY factory », un wordmark SVG ou un logo recréé, y compris lors d'une optimisation ou d'une stabilisation du chargement.
- Les gabarits HTML, scripts d'hydratation et générateurs de pages doivent conserver la même image et ses proportions carrées dès le premier affichage.

## Interdiction absolue des motifs floraux

- Ne jamais utiliser de fleurs, motifs floraux, cadres fleuris, fonds fleuris ou illustrations florales dans l'interface LE ROY FACTORY.
- Ne jamais recréer, restaurer ou réintroduire les anciens assets `assets/img/bandeau01.png` et `assets/img/bandeau02.png`.
- Ne jamais utiliser un ancien décor floral comme fond de `header`, `footer`, `.crm-topbar`, carte, bannière ou écran de module.
- Pour les bandeaux et surfaces décoratives, privilégier un design LRF sobre et premium : crème, anthracite/noir, blanc, doré, avec dégradés ou textures non florales.
- Si une ancienne règle CSS ou une ancienne page référence encore un décor floral, la supprimer ou la remplacer par une solution non florale lors de sa prochaine modification.

Cette règle ne doit être contournée que si Jérôme demande explicitement, dans une nouvelle instruction, de réintroduire un élément floral précis.

## Sources actives de la suite de configurateurs

Depuis la livraison du 24 octobre 2026, les trois applications sont regroupées
sur `main` sans fusion de leurs interfaces :

- PLAN & POSE : `assets/js/lrf-plan-pose/`, page `lrf-plan-pose.html`.
- RANDAL Studio One : `studio-one/`.
- RANDAL Catalogue Général : `randal-general/`.
- Calculs, interactions et catalogues communs : `shared/lrf-3d/`.
- Services serveur des tarifs agents : `shared/lrf-server/`.

L'ancienne branche `feature/studio-one-beta-v2-commerce-accueil` et les dossiers
`review-studio-source` sont des références historiques, pas les sources à
publier. Les wrappers `src/` des ateliers gardent les anciens imports ; modifier
l'implémentation commune plutôt que recréer des copies divergentes. Les meubles,
façades et règles commerciales propres à chaque atelier restent spécifiques.

Les catalogues fabricants et commerciaux canoniques sont les deux JSON de
`shared/lrf-3d/`. Ne pas réintroduire des copies `src/*-surfaces.json`. Préserver
les SKU, formats, finitions, boîtages et originaux HD ; un profil léger ne doit
pas dégrader les exports HD. Ne pas remplacer un coloris inconnu par le premier.

Le domaine principal est servi par GitHub Pages avec les exclusions
`_config.yml`. Les deux ateliers sont sur Vercel, racines `studio-one` et
`randal-general`, avec accès aux sources du parent. Les clés restent des Secrets
Vercel. Aucune grille d'achat en clair dans le client, le dépôt ou un export.

Les publications Vercel Git automatiques sont désactivées. Suivre `RELEASE.md`,
construire les workspaces avant leurs QA, vérifier le noyau et PLAN & POSE, puis
publier uniquement les applications concernées par le lot testé. Les tests
Playwright 1.55 utilisent Ubuntu 24.04, pas `ubuntu-latest` devenu incompatible.

## Neobath Anima : variante privée de Studio One

Anima utilise les véritables entrées et gabarits de `studio-one/`, compilés par
`tools/build-neobath-anima.mjs` avec les adaptations de
`functions/neobath-anima/studio-adapter/`. Ne pas recréer une interface Anima
indépendante : conserver le parcours, les contrôles et le moteur de Studio One,
et adapter les références, dimensions, finitions, façades et visuels du fabricant.
Les anciens fichiers autonomes Anima sont historiques et ne servent plus l’application.

Depuis la correction premium du 2 novembre 2026, « Nouveau projet » ouvre
directement l’atelier ; ne pas rétablir le parcours préalable à six écrans.
Les plans se choisissent par famille, matière et vasque. Conserver leurs
références, prix et matériaux indépendants, ainsi que les longueurs de fabrication
et les caissons supports réels. Les palettes canoniques et leurs provenances sont
dans `studio-adapter/materials-data.js` et `assets/data/neobath-anima-materials.json`.

Les sorties privées sont dans `functions/neobath-anima/studio-dist/`. Les deux
bundles JavaScript sont conservés en gzip déterministe, décompressés et vérifiés
par SHA-256 côté serveur. Ne jamais publier ce dossier sur Pages. L’API livre l’application aux identités Firebase vérifiées de Jérôme et Coryne
ainsi qu’aux clients dont la session LRF et le partenaire Neobath sont vérifiés
côté serveur (demande de Jérôme du 10 novembre 2026). Les projets partagés de
l’équipe restent strictement réservés à Jérôme et Coryne. Les clients conservent
leurs projets dans un espace local distinct. Les références d’achat sont calculées
uniquement côté serveur à partir du projet canonique et effacées lors d’une modification. Les anciens projets restent conservés dans leur espace historique.
