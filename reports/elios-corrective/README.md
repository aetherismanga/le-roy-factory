# Correctif ELIOS — couleurs et salle de bains métrique

Base : `5bf4073f1e88fdb11fea21c310ee8affa498d4ab`. Périmètre RANDAL et STUDIO ONE. VIEW 2B non commencé.

## Corrections

- Suppression du tone mapping ACES pour les deux scènes, exposition 1, sortie sRGB conservée. Lumières blanches neutres (ambiante 0,70 ; principale 0,35 ; appoint 0,12). Les échantillons et atlas ne sont pas retouchés. La rugosité, le relief des joints et le filtrage des textures sont conservés.
- Pièce de référence de 3 × 3 m, hauteur 2,50 m. Largeur, profondeur et hauteur réglables de 250 à 350 cm dans « Dimensions de la pièce ». Unités d'affichage en cm, géométrie en mètres.
- Mur de fond et deux murs latéraux ; sol fini aux dimensions renseignées ; positions des meubles et hauteur de pose existantes conservées (pas de transformation des projets enregistrés).
- Échelle des textures recalculée sur la géométrie réelle, y compris les revêtements antérieurs. Choix sol et mur indépendants. Les murs latéraux reprennent le revêtement du mur de fond.
- Bouton « Cotes pièce » : vue d'ensemble avec largeur, profondeur et hauteur, lignes de couleurs différentes, étiquettes lisibles sur mobile. Bouton « Cotes » des meubles inchangé.
- Recul du zoom courant limité à 1,35 × la profondeur de pièce (4,05 m par défaut), cadrage rapproché du meuble. La vue de cotes utilise un angle plus large pour montrer la pièce entière.
- Murs vus de l'extérieur à 8 % d'opacité ; retour opaque depuis l'intérieur. Les objets restent accessibles à la sélection.
- Dimensions enregistrées dans l'ambiance des projets STUDIO ONE et l'état pièce RANDAL. Les projets sans dimensions retrouvent la pièce par défaut.

## Vérifications effectuées

- `regression/browser-tests.json` : quatre scénarios Chromium (1440 × 900 et 390 × 900 dans chaque configurateur), dimensions 250 × 350 × 270 cm saisies via les champs, bouton cotes, choix et indépendance sol/mur, formats métriques, plein écran, captures, tiroirs, prix inchangés. Réouverture RANDAL et rechargement STUDIO ONE conservent les dimensions et revêtements. Aucune erreur JavaScript ni texture manquante.
- `colors-after.json` et `colors-randal-after.json` : 73 coloris / 127 usages autorisés (sol et/ou mur) contrôlés dans chaque moteur. Capture d'une zone du vrai matériau, avec les lumières et paramètres du moteur, comparée au même atlas rendu sans éclairage. Objets et ombres masquantes temporairement cachés pour isoler le traitement des couleurs. Le script injecte uniquement un accès de test au moteur ; cet accès n'est pas livré en production.
- STUDIO ONE : erreur absolue moyenne par canal de 13,68 avant à 3,35 après, sur 255 niveaux. RANDAL après : 1,57. Il s'agit d'un contrôle numérique de la chaîne de rendu, pas d'une mesure colorimétrique physique ni d'une garantie de teinte sur tous les écrans. L'éclairage et les ombres réels restent visibles dans la scène.
- `room-tests.json` : transparence à l'extérieur puis retour opaque, limite du zoom et mesures de temps de trame en rotation/rendu. Exécution sur GPU logiciel SwiftShader ; ces mesures ne représentent pas les performances d'un téléphone physique.
- `integrity.json` : les 73 textures, catalogue ELIOS, génération d'atlas, données tarifaires, modèles, géométrie des meubles et modules miroirs sont identiques à la base.

## Captures

`before-*` et `after-*` : même composition de 80 cm, sol Shell Grey et mur Creta Ginepro, mêmes formats d'écran. Le bouton de centrage utilise volontairement le cadrage corrigé après intervention. `room-*` montre les trois cotes de la pièce.

- [STUDIO ONE mobile avant](before-studio-390.png) / [après](after-studio-390.png) / [pièce](room-studio-390.png)
- [RANDAL mobile avant](before-randal-390.png) / [après](after-randal-390.png) / [pièce](room-randal-390.png)
- [STUDIO ONE ordinateur avant](before-studio-1440.png) / [après](after-studio-1440.png)
- [RANDAL ordinateur avant](before-randal-1440.png) / [après](after-randal-1440.png)

## Rejouer

Tests dans `tests/elios-corrective/` ; Playwright requis. `colors.cjs` accepte `BASELINE=1` pour l'ancien rendu STUDIO ONE, `GENERAL=1` pour RANDAL ; `regression.cjs` peut être exécuté avec `SKIP_SAMPLES=1` puisque le balayage exhaustif est dans `colors.cjs`. Le navigateur est indiqué par `CHROME_PATH` pour les tests couleurs/pièce ; ajuster le chemin si nécessaire pour les autres scripts. Tests mobiles simulés : une validation visuelle et de fluidité sur appareil physique reste nécessaire.
