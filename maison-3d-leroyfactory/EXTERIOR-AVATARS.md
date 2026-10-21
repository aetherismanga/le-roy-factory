# Maison 3D LE ROY FACTORY · jardin et habitants

Cette mise à jour reste dans le projet d’aperçu indépendant `maison-3d-leroyfactory`, branche `preview/maison-3d-leroyfactory`. Elle ne modifie ni le site officiel, ni les configurateurs STUDIO ONE / RANDAL.

## Produits et dimensions

Le muret utilise les photographies officielles BIOPIETRA, avec relief géométrique et bump, sur ses deux faces. L’entrée reste ouverte. Trois collections et neuf couleurs sont disponibles :

| Collection | Couleurs | Source |
| --- | --- | --- |
| Ortisei | B80, B82, M96 | https://biopietra.com/prodotto/ortisei-new/ |
| Scaglia Carsica | Arena, Grigio, Antracite | https://biopietra.com/prodotto/scaglia-carsica/ |
| Scaglia Montebello | Quarzo, C58, G86 | https://biopietra.com/prodotto/scaglia-montebello/ |

Le bassin mesure 8 × 4 m, profondeur 1,40 m, garde d’eau de 10 cm. Les deux terrains comportent une véritable excavation. La collision empêche de marcher dans le bassin, plein ou vide. Le niveau d’eau est animé et enregistré dans le projet. La capacité utile est 41,6 m³ ; le revêtement géométrique du bassin couvre 65,6 m². Ces métrés sont hors chutes et pièces spéciales.

| Fabricant | Série / couleur | Référence | Format |
| --- | --- | --- | --- |
| ELIOS | Acqua Deep | 04A1520 | 15 × 15 cm |
| ELIOS | Acqua River | 04A1530 | 15 × 15 cm |
| ELIOS | Acqua Light | 04A1510 | 15 × 15 cm |
| ELIOS | Acqua Cobalt | 04A1540 | 15 × 15 cm |
| Reviglass | PS-52 Niebla | PS-52 | 2,5 × 2,5 cm |
| Reviglass | PS Mix Iris Urola | PS-MIX IRIS UROLA | 2,5 × 2,5 cm |

Sources : [ELIOS Piscine 2026, pages imprimées 20–21](https://eliosceramica.com/wp-content/uploads/2019/01/ELIOS_CATALOGO-PISCINE_2026.pdf), [Reviglass PS-52](https://reviglass.es/producto/ps-52/), [Reviglass Urola](https://reviglass.es/producto/ps-mix-iris-urola/).

Les échantillons ELIOS ont leur résolution native de catalogue. Les mosaïques utilisent une tesselle extraite du véritable visuel fabricant, appliquée sur chaque petit carreau avec joints géométriques. Les joints de 3 mm ELIOS / 2 mm Reviglass peuvent changer de couleur. La plage en bois est constituée de lames de 140 mm avec joints de 5 mm. Les margelles de 55 mm proposent travertin beige, travertin noce et pierre calcaire claire : matières de visualisation sans référence commerciale ni tarif inventé. Aucun prix fabricant n’est ajouté par cette extension.

## Habitants

Deux modèles Microsoft Rocketbox sous licence MIT, chacun avec 80 articulations et quatre expressions faciales, partagent le même système de navigation et les mêmes collisions. Les visages et vêtements ont des cartes de couleur propres, inspirées des deux photos fournies. Les boucles d’oreilles sont des objets 3D attachés à la tête. Il s’agit de ressemblances interprétées, pas de scans photogrammétriques. La coupe des vêtements et le volume des cheveux restent ceux du modèle de départ.

Commandes : déplacement au clavier / pavé tactile, `Maj` ou « Courir », `Espace` ou « Sauter », clic sur une assise ou « S’asseoir », puis « Se lever ». Une chaise rentrée sous la table peut être tirée si l’aménagement et les dégagements l’autorisent. Le personnage rejoint l’assise avant la transition. Les jambes utilisent une cinématique inverse à deux segments, avec respiration, clignements et gestes. Le saut tient compte des plafonds et passages de portes. La vue « Voir le visage » et « Recentrer » permettent de contrôler le personnage.

Les quatre assets de couleur ont été créés avec l’outil ImageGen intégré, puis optimisés en WebP 2048² :

- `assets/avatar/male-reference-head-v2.webp` : transférer le visage, yeux gris-verts et cheveux bruns courts de la photo sur l’atlas UV original, conserver les îlots et produire une couleur diffuse neutre.
- `assets/avatar/female-reference-head-v2.webp` : transférer le visage, yeux bleu-gris, cheveux blonds attachés et détails du front sur l’atlas UV original, conserver les îlots, retirer la dominante rouge de l’éclairage photographique.
- `assets/avatar/male-reference-body-v2.webp` : coton vert olive, inscription orange MARCA-MAU, conserver les îlots UV, la peau et les vêtements inférieurs du modèle source.
- `assets/avatar/female-reference-body-v2.webp` : haut noir / anthracite, conserver les îlots UV, la peau, le jean et les chaussures du modèle source.

Les photographies originales ne sont pas distribuées. Les normales et masques d’opacité d’origine restent distincts des nouvelles cartes de couleur.

## Qualité et compatibilité

Trois réglages restent disponibles. Éco réduit végétation, ombres et reflets ; Équilibré active le reflet plan de piscine à 256 px et intervalle de 420 ms ; Haute qualité passe à 512 px / 180 ms et conserve l’occlusion ambiante existante. Les feuilles sont texturées avec nervures ; les troncs ont un relief d’écorce ; les nuages sont procéduraux. Les reflets capturent l’architecture complète malgré les coupes de la maquette.

Les choix extérieurs et l’avatar sont validés et sauvegardés dans le projet existant. Les anciens projets reçoivent les valeurs par défaut. L’interface extérieure et les commandes d’avatar adaptent leur taille aux écrans de téléphone.

## Vérification

`npm run check`, `npm run check:workshop`, `npm run check:arrangement`, `node qa/room-configurator-check.mjs`, `npm run check:exterior`, `npm run build`, puis `npm run check:exterior-browser`. Le test navigateur accepte `HOUSE_DIST` pour vérifier le build local et `HOUSE_URL` pour l’aperçu déployé. Il couvre matières, eau, sauvegarde, avatars, sauts, course, assises, retour du configurateur de pièce, trois tailles mobiles et trois qualités graphiques. Les captures et résultats détaillés sont produits dans le dossier ignoré `qa-results/exterior`.

Après publication de l’aperçu : `HOUSE_URL=https://... npm run check:exterior-live`. Ce contrôle charge réellement les fichiers Vercel, compare le hash du bundle au build local, puis vérifie eau, parement, avatar, assise et véritable déplacement tactile. Les boutons sont contrôlés avec `elementFromPoint` pour détecter les éléments qui pourraient les recouvrir. L’ouverture d’une pièce choisit l’onglet d’aménagement avant le premier rendu du panneau, pour ne pas télécharger les vignettes d’un onglet caché.
