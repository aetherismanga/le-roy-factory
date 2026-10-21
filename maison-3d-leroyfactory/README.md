# Maison 3D LeroyFactory

Maison témoin interactive indépendante : 140 m² habitables sur deux niveaux,
hauteur sous plafond de 2,60 m. Ce dossier appartient exclusivement à la branche
`preview/maison-3d-leroyfactory`. Aucun lien, remplacement de configurateur,
changement de tarif ou déploiement du site officiel n'est nécessaire.

## Programme

| Niveau | Espaces |
| --- | --- |
| Rez-de-chaussée — 70,4 m² | Salon, cuisine avec îlot et électroménager, salle à manger, bureau/chambre d'amis, entrée avec escalier, salle d'eau avec douche, WC séparé avec lave-mains, cellier/buanderie |
| Étage — 69,6 m² | Suite parentale, deux chambres, salle de bains avec baignoire, WC séparé avec lave-mains, dressing, palier/bibliothèque |
| Extérieur, hors surface habitable | Terrasse, pergola, salon de jardin, bassin, transats, oliviers et jardin modélisé |

Les surfaces proviennent des polygones de `src/plan.js`, après déduction des
cloisons et de la trémie. Le plan SVG, les volumes, les points de visite et les
collisions utilisent cette même source.

## Réutilisation du moteur existant

Base Git : `f88e610210b3bae4ab8ca26ed48f3f04f11e67d7`.

- Three.js **0.180.0**, rendu physique, gestion des couleurs, navigation orbitale
  et post-traitement GTAO réutilisés depuis `../randal-general/src/`.
- Véritables modèles paramétriques des meubles ARUBA, plans-vasques TAMPA,
  miroirs, baignoire, douche, sanitaires, lave-mains, robinetteries et accessoires
  importés des modules existants. Les tiroirs et les portes restent articulés.
- Textures déjà hébergées sur Studio One et photographies de matière RANDAL
  réutilisées par URL. La réécriture `/shared/materials/` ne crée aucune copie.
- Mobilier domestique, volumes de maison, escalier à 16 contremarches,
  balustrades, végétation et extérieur construits en géométrie 3D.
- Aucune image de pièce ou de jardin n'est utilisée à la place des volumes.

Les modules des configurateurs et leurs branches de production ne sont pas
modifiés. Le projet importe leur code, sans copier leur application ni leurs
comptes clients, sauvegardes ou conditions commerciales.

## Atelier magasin

Le bouton **Atelier magasin** ouvre un éditeur par pièce, en conservant le même
moteur 3D et la visite de la maison. Il est également utilisable sur smartphone.

- **Aménager** : 111 éléments intérieurs indépendants, dont chaque chaise et
  tabouret. Sélection dans la 3D ou la liste, déplacement à la souris / au toucher
  avec pas de 5 cm, coordonnées au millimètre, rotation, dimensions du mobilier
  illustratif et teinte individuelle. Retrait réversible, réinstallation,
  annuler / rétablir et restauration de la position initiale. Les produits RANDAL
  conservent leurs dimensions et finitions fabricant via leur propre onglet.
  Les empreintes proviennent des maillages visibles, y compris les instances
  décoratives. Les murs, ouvertures, débattements de porte, fenêtres, trémie et
  paliers sont contrôlés avant chaque déplacement. Les feuilles de porte sont
  également des obstacles de navigation. La porte du bureau dessert maintenant
  la pièce de vie, à l’écart de l’escalier. Les modifications font partie du JSON
  et des dossiers locaux. L’extérieur et les éléments structurels restent fixes.
- **Sols et pose** : les échantillons HD des catalogues ELIOS et VIEW déjà présents
  dans le dépôt sont réutilisés sans copie des images. Seuls les coloris publiés
  avec des formats vérifiés et un usage au sol sont proposés. Le catalogue partagé
  contient 73 coloris ELIOS et six VIEW ; les deux collections uniquement murales
  ne sont pas proposées au sol. Les chambres peuvent conserver leur parquet.
- **Calepinage** : format physique du carreau, joints séparés de 1 à 3 mm, pose
  droite ou décalée à moitié, orientation 0/45/90°, origine X/Y, centrage de la
  pose orthogonale et marge de commande de 0 à 30 %. Le même maillage découpé sert
  au rendu 3D, au comptage des modules et au dessin coté.
- **Dimensions** : cotes intérieures au millimètre. Les déplacements de cloisons
  modifient leurs pièces voisines, portes, plafonds, sols et surfaces. Le salon
  règle l’enveloppe extérieure, commune aux deux niveaux ; le jardin suit ses
  dimensions. L’escalier et sa trémie restent fixes. Les contraintes des passages
  et ouvertures refusent les dimensions incompatibles. Les meubles gardent leurs
  dimensions réelles. Une modification qui crée un conflit avec l’aménagement
  est refusée : déplacer d’abord le mobilier concerné dans « Aménager ».
- **Mobilier** : modèles paramétriques, largeurs, finitions, poignées et colonnes
  du catalogue général RANDAL. Les plans, vasques, implantations et couleurs de
  céramique sont filtrés par compatibilité fabricant. Les plans à vasque posée
  ont leur propre finition référencée. Miroirs Cápsula / Ilse ou sans miroir.
- **Métrés** : surface de sol réellement couverte, surface du programme,
  murs bruts et nets après déduction des portes et fenêtres, plinthes sans les
  portes, plafond, carreaux entiers et coupés. Le revêtement sous l’escalier est
  inclus dans le sol du RDC, la trémie est retirée à l’étage. La géométrie des
  murs extérieurs est placée hors de l’enveloppe intérieure mesurée.
- **Commande** : chaque module coupé consomme un carreau, sans réemploi supposé
  des chutes. La marge s’ajoute au nombre de modules utilisés. Les conditionnements
  Shell/Creta 60×120 et certains formats Corso / Golden Stone proviennent du
  catalogue partagé ; ailleurs, « à renseigner ». Les produits identiques sont
  regroupés avant l’arrondi aux boîtes. Aucun prix n’est ajouté ou inventé.
- **Dossier client** : sauvegarde automatique locale, dossiers nommés, suppression
  confirmée avec avertissement d’irréversibilité, export/import JSON, métrés CSV,
  commande regroupée CSV, fiche imprimable avec les 13 plans de pose cotés.
  Ces sauvegardes restent sur le navigateur, sans connexion au CRM ni au compte LRF.

Le rendu utilise les matériaux HD, l’anisotropie, les mipmaps, des ombres filtrées,
les reflets réels des miroirs et l’occlusion de contact en haute qualité. Les
textiles ont un reflet diffus de fibre ; l’environnement de réflexion neutre
remplace l’ancienne photographie HDR de bureau. L’heure du soleil modifie les
vraies ombres des fenêtres. Les valeurs de rugosité sont des réglages de rendu,
pas des mesures de laboratoire. Il s’agit toujours du rendu raster Three.js.

## Visite

- Souris ou geste tactile : orienter le regard. ZQSD, WASD, flèches du clavier
  ou pavé de déplacement : marcher. Clic au sol : trajet avec évitement des
  obstacles sur le niveau courant. L'escalier se parcourt au clavier/pavé.
- Les pièces et le plan cliquable permettent de rejoindre directement une zone.
- Portes, baies coulissantes et tiroirs de salle de bains s'ouvrent au toucher.
- Visite guidée, maquette par niveau, plan, extérieur, trois ambiances lumineuses,
  quatre peintures par pièce et export PNG.
- Sur mobile, l'application utilise `100dvh` et les zones de sécurité du
  navigateur. Les commandes ne dépendent pas d'une hauteur d'écran mise en cache.

Les sols, peintures, dimensions et compositions RANDAL font partie du dossier
client. Les ambiances lumineuses et la qualité sont des réglages de consultation.
La fiche reste une étude du modèle à confronter au relevé du chantier avant commande.

## Construction et vérification

Depuis ce dossier, dans une copie complète du dépôt :

```sh
npm ci
npm run check
npm run check:workshop
npm run check:arrangement
npm run build
npx playwright install chromium
HOUSE_URL=https://URL-DE-PREVISUALISATION npm run check:browser
HOUSE_URL=https://URL-DE-PREVISUALISATION npm run check:workshop-browser
HOUSE_URL=https://URL-DE-PREVISUALISATION npm run check:arrangement-browser
```

`qa/house-check.mjs` contrôle le programme, les surfaces, les ouvertures et la
continuité de l'escalier. `qa/browser-check.mjs` vérifie les ressources réelles,
les points de visite libres, l'accès à chaque pièce, la montée et la descente
de l'escalier, le blocage par une porte fermée, le pavé de déplacement et la
position des commandes aux formats 390×844, 360×640 et 844×390. Il produit aussi
des captures des ambiances dorée et nocturne. Les résultats sont ignorés par Git.

`qa/workshop-cases.mjs` vérifie les 13 redimensionnements, les portes et la trémie
fixes, les formats fabricant, les joints ajoutés au format réel, les carreaux entiers,
les coupes, la pose diagonale et la trémie du palier en L. Le test navigateur de
l’atelier effectue de vrais changements de sol et de mobilier, redimensionne la
maison, contrôle les exports, la suppression, l’import et les commandes mobiles.
`HOUSE_DIST` permet de servir uniquement les fichiers construits localement dans
la session Playwright ; les ressources externes restent leurs fichiers réels.
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` permet d’utiliser un Chromium déjà installé.

Trois réglages graphiques sont accessibles en permanence dans l’en-tête et
mémorisés sur le navigateur :

| Réglage | Pixels maximum | Ombres | Miroirs | Lumières locales | Végétation |
| --- | --- | --- | --- | --- | --- |
| Éco | 0,85 M | 1 024 px | 192 px, rafraîchissement limité | 2 | 2 000 brins, 550 feuilles/arbre |
| Équilibré | 1,8 M | 2 048 px | 384 px | 4 | 8 000 brins, 1 200 feuilles/arbre |
| Haute qualité | 3,5 M | 4 096 px et GTAO | 768 px | 6 | 18 000 brins, 2 200 feuilles/arbre |

Le nombre de meubles et les fonctions restent identiques. Les objets sont
regroupés par matériau à l’intérieur de chaque élément, pour garder leur
sélection indépendante. Les variantes masquées restent masquées. L’eau est
animée uniquement en haute qualité. Ces réglages réduisent la charge graphique ;
ils ne garantissent pas un nombre d’images par seconde sur tout matériel.

`check:arrangement` vérifie les empreintes orientées, les transformations,
les portes / paliers réservés, les couleurs indépendantes, le retrait / retour,
les instances et les trois profils. Le test navigateur ajoute les déplacements
réels à la souris et au toucher, les 13 parcours, l’escalier, les exports / imports,
la sauvegarde, la restauration et les commandes sur trois formats mobiles.

## Aperçu Vercel exclusivement

Projet distinct : `maison-3d-leroyfactory`.

- Racine : `maison-3d-leroyfactory` ; commande : `npm run build` ; sortie : `dist`.
- `sourceFilesOutsideRootDirectory: true` est requis pour les imports du moteur.
- Déployer un SHA de la branche de prévisualisation avec `target: staging` via l’API Vercel (ou le mode preview du CLI).
- Ne pas promouvoir vers la production et ne pas modifier les domaines officiels.
- En-tête `X-Robots-Tag: noindex, nofollow, noarchive` et `robots.txt` restrictif.
  L'URL de prévisualisation est partageable, sans authentification client.

La validation navigateur utilise Chromium avec un rendu WebGL logiciel et des
formats mobiles émulés ; elle ne constitue pas une mesure de performances sur
un téléphone physique.
