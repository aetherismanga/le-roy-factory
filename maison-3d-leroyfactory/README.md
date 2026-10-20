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

Les pièces d'eau conservent leur revêtement minéral. Les modifications de
peinture et d'ambiance restent en mémoire dans cette démonstration ; elle ne
crée pas de devis ou de projet client persistant.

## Construction et vérification

Depuis ce dossier, dans une copie complète du dépôt :

```sh
npm ci
npm run check
npm run build
npx playwright install chromium
HOUSE_URL=https://URL-DE-PREVISUALISATION npm run check:browser
```

`qa/house-check.mjs` contrôle le programme, les surfaces, les ouvertures et la
continuité de l'escalier. `qa/browser-check.mjs` vérifie les ressources réelles,
les points de visite libres, l'accès à chaque pièce, la montée et la descente
de l'escalier, le blocage par une porte fermée, le pavé de déplacement et la
position des commandes aux formats 390×844, 360×640 et 844×390. Il produit aussi
des captures des ambiances dorée et nocturne. Les résultats sont ignorés par Git.

Le niveau équilibré évite le post-traitement GTAO sur les appareils mobiles.
Le niveau haute qualité l'active avec des ombres de contact. Les lumières locales
sont limitées aux six plus pertinentes pour la zone visitée ; les éléments
statiques sont regroupés par matériau, les objets articulés restent indépendants.
Les objets et variantes masqués ne sont jamais rendus visibles par ce regroupement.

## Aperçu Vercel exclusivement

Projet distinct : `maison-3d-leroyfactory`.

- Racine : `maison-3d-leroyfactory` ; commande : `npm run build` ; sortie : `dist`.
- `sourceFilesOutsideRootDirectory: true` est requis pour les imports du moteur.
- Déployer un SHA de la branche de prévisualisation avec `target: preview`.
- Ne pas promouvoir vers la production et ne pas modifier les domaines officiels.
- En-tête `X-Robots-Tag: noindex, nofollow, noarchive` et `robots.txt` restrictif.
  L'URL de prévisualisation est partageable, sans authentification client.

La validation navigateur utilise Chromium avec un rendu WebGL logiciel et des
formats mobiles émulés ; elle ne constitue pas une mesure de performances sur
un téléphone physique.
