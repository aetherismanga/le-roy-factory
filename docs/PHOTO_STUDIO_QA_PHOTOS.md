# LRF PHOTO STUDIO — photographies de contrôle

Jeu préparé le 6 novembre 2026. Ces fichiers sont destinés à la validation locale et ne sont pas ajoutés aux actifs publics ni au dépôt. Aucun cliché personnel de Jérôme ou d’un client n’est utilisé.

## Photographies réelles à licence explicite

Les pages sources et métadonnées Wikimedia ont été consultées. Elles désignent des photographies d’auteurs, parfois avec informations appareil/EXIF. La licence de chaque fichier autorise sa réutilisation avec les obligations d’attribution indiquées. La présence d’une image sur Wikimedia n’est pas, à elle seule, la preuve de cette licence: les champs `LicenseShortName`/`LicenseUrl` ont été récupérés pour chaque fichier. Le contrôle local n’est pas une publication. Si des captures ou exports sont distribués, conserver le crédit, le lien source, la licence et les modifications; pour les variantes SA, respecter la licence compatible applicable aux images dérivées.

Les originaux téléchargés étaient des dérivés Wikimedia de 1920 px. Préparation locale: conversion RGB et réencodage JPEG qualité 92, suppression des métadonnées EXIF. Pas de synthèse ni retouche de contenu, à l’exception du recadrage négatif identifié ci-dessous.

Emplacement de travail : `/workspace/scratch/a3a618c76ce6/qa-photos/`. Le manifeste `real-photos-manifest.json` conserve les dimensions exactes, URL et SHA-256 des bytes testés.

| Fichier local | Cas à contrôler | Crédit | Licence et source |
|---|---|---|---|
| `08-commons.jpg` (1920 × 1749) | Salon avec tapis à préserver et nombreux pieds de sièges | Kinna2 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) · [source](https://commons.wikimedia.org/wiki/File:Nice_living_Room_with_homemade_carpet.jpg) |
| `09-commons.jpg` (1920 × 1440) | Salon meublé, moquette et table basse | Adele Berenstein | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) · [source](https://commons.wikimedia.org/wiki/File:Living_room_area.jpg) |
| `10-commons.jpg` (1920 × 1453) | Salle à manger avec chaises, bois contrasté, perspective | Rick Harris | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) · [source](https://commons.wikimedia.org/wiki/File:Dinner_table_and_chairs.jpg) |
| `11-commons.jpg` (1920 × 1277) | Salon sombre et fenêtre surexposée, tapis | Shixart1985 | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) · [source](https://commons.wikimedia.org/wiki/File:Cozy_living_room_with_a_gray_sofa.jpg) |
| `12-commons.jpg` (1920 × 1277) | Salon très meublé, ancien carrelage à motif contrasté | PattayaPatrol | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) · [source](https://commons.wikimedia.org/wiki/File:DSC_8593_Cozy_sunlit_lounge_with_eclectic_seating_patterned_tile_floors_and_a_glass-top_coffee_table_beneath_a_thatched_roof_chandelier.jpg) |
| `13-commons.jpg` (1920 × 1440) | Intérieur historique, chaises et table; texte de musée présent en bas | Andrey Korzun | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) · [source](https://commons.wikimedia.org/wiki/File:Interior_of_living_room_01.JPG) |
| `14-commons.jpg` (1920 × 1440) | Pièce dégagée, moquette et angles de mur | aismallard | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) · [source](https://commons.wikimedia.org/wiki/File:Empty_room_in_apartment.jpg) |
| `15-commons.jpg` (1920 × 1440) | Pièce dégagée à parquet, perspective et câble au premier plan | aismallard | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) · [source](https://commons.wikimedia.org/wiki/File:Empty_apartment_room_with_extension_cord.jpg) |
| `16-no-floor-photo-crop.jpg` (1920 × 446) | Négatif: mur, fenêtre et haut de canapé, aucun sol visible | Shixart1985 | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) · [source](https://commons.wikimedia.org/wiki/File:Cozy_living_room_with_a_gray_sofa.jpg) |

Le fichier 16 est un recadrage du haut de 11 (35 % de sa hauteur) vérifié visuellement: mur, fenêtre et haut du canapé, sans sol. Le fichier 08 contient un tapis couvrant presque tout le sol visible: une couverture automatique très faible ou nulle peut être correcte, et ne doit pas être forcée par un masque artificiel. Les fichiers 09 et 14 présentent une moquette fixe; ils mettent en évidence la limite sémantique entre « tapis à conserver » et revêtement textile du sol. Le fichier 13 comporte le texte imprimé du musée dans l’original, ce n’est pas un texte ajouté par Photo Studio.

Ces images sont des entrées de test, pas des démonstrations au masque prédécoupé. Toute analyse utilise le même moteur et les mêmes seuils que l’import libre. Elles ne prouvent pas une validation physique Android ou iPhone. Leurs résultats de segmentation et les corrections nécessaires doivent être consignés dans le rapport de tests; cette liste n’est pas une déclaration de réussite.

## Scènes fabricant complémentaires

Sept premiers fichiers `01-*` à `07-*` ont été préparés à partir d’actifs existants du dépôt, sans modification des originaux. Ils servent uniquement aux contrôles complémentaires de géométrie/projection. Les actifs semblent être des ambiances de collections, mais leur caractère photographique (par opposition à rendu 3D) et la chaîne complète de licence ne sont pas certifiés indépendamment. Ils ne sont donc pas comptés comme six photos réelles pour la réception. Aucun droit nouveau de publication n’est affirmé. Le manifeste `manifest.json` garde leurs chemins d’origine.

| Fixture | Source du dépôt |
|---|---|
| `01-hard-perspective.jpg` | `assets/img/elios-seo/elios-yosemite-visuel-7614fa3be0854f4d.webp` |
| `02-living-seating.jpg` | `assets/img/elios-seo/elios-quercia-visuel-582253f0235a6aaf.webp` |
| `03-dining-chairs.jpg` | `assets/img/fenice-selection-20261101/oykos-ambiance.webp` |
| `04-dark-dining.jpg` | `assets/img/view-selection-20261031/oikos/01-ambiance-full.webp` |
| `05-contrast-pattern.jpg` | `assets/img/view-selection-20261031/i-marmi-di-view/01-ambiance-full.webp` |
| `06-bright-living.jpg` | `assets/img/view-selection-20261031/digione/01-ambiance-full.webp` |
| `07-no-floor-texture.jpg` | `assets/img/elios-seo/elios-yosemite-visuel-1b812c3204d849d0.webp` |

`01-hard-perspective.jpg` et `02-living-seating.jpg` dérivent de miniatures SEO de faible définition (146 × 190 et 260 × 187); ils ne peuvent pas valider un export HD. `07-no-floor-texture.jpg` est une simple vue de matériau, cas négatif complémentaire, et non une pièce photographiée.
