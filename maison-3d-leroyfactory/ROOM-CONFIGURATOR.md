# Maison 3D LE ROY FACTORY — atelier par pièce & habitant

Cette évolution concerne exclusivement le projet indépendant `maison-3d-leroyfactory`, sur la branche `preview/maison-3d-leroyfactory`. Aucune modification des configurateurs STUDIO ONE / RANDAL publiés ni de leurs tarifs.

- **Les pièces** : cliquer sur une pièce dans la liste ou le plan ouvre son configurateur. Le bouton **Visiter** conserve l’accès direct à la promenade. **Personnaliser cette pièce** ouvre l’atelier depuis la position courante.
- **Configurateur** : pièce cadrée seule, cloisons proches masquées, mobilier sélectionnable et déplaçable, dimensions, revêtements ELIOS / VIEW, calepinage réel, peinture, mobilier RANDAL compatible et métrés. **Revenir à la maison** restitue la visite et conserve le travail.
- **Mobilier & décors** : 18 objets supplémentaires — quatre végétaux distincts, quatre tableaux originaux, mobilier, luminaires et objets décoratifs. Les ajouts recherchent un emplacement qui respecte les réservations de portes, fenêtres et escalier. Les transformations et retraits sont enregistrés dans le dossier JSON.
- **Personnage** : mode à la troisième personne avec caméra orbitale et coupe des murs proches. Cliquer / toucher le sol pour marcher ; ZQSD, WASD, flèches ou commandes tactiles pour se déplacer. Glisser pour tourner ; molette / pincement pour zoomer ; Saluer / Regarder autour pour les gestes. La visite à la première personne reste accessible.
- **Moteur** : moteur et produits existants réutilisés. Navigation progressive, trajectoires lissées avec contrôle d’obstacles, pas de simulation subdivisés ; trois profils graphiques conservés. Les murs masqués n’altèrent pas les collisions. Le personnage est chargé à la demande.

## Avatar & ressources

Personnage Microsoft Rocketbox `Male_Adult_01_facial`, sous licence MIT (notice fournie dans `assets/avatar/LICENSE.txt`). Squelette à 80 articulations, cheveux et yeux texturés, cinq cartes 2048 px, quatre expressions conservées pour le clignement et le sourire. Animation procédurale des membres, marche et gestes ; ce n’est pas une capture vidéo. Il s’agit d’un habitant de démonstration, pas d’un portrait d’une personne réelle.

Source : https://github.com/microsoft/Microsoft-Rocketbox/tree/master/Assets/Avatars/Adults/Male_Adult_01

Conversion reproductible : `node tools/build-avatar.mjs /chemin/Male_Adult_01_facial.fbx`. Les fichiers TGA d’origine sont redimensionnés à 2048 px puis convertis en WebP qualité 92. Les images des tableaux sont créées en code, sans ressource artistique externe.

## Vérifications

`npm run check`, `npm run check:workshop`, `npm run check:arrangement`, `node qa/room-configurator-check.mjs`, `npm run check:rooms-browser`.

Les essais navigateur couvrent les 13 pièces, les revêtements muraux autour des ouvertures, les ajouts et retraits, la reconstruction du projet, le squelette et les gestes, la marche avec collisions, le retour entre les deux visites et l’accès aux commandes en 390 × 844, 360 × 640 et 844 × 390.

La fluidité dépend du matériel : sélectionner Éco sur un appareil peu puissant, Équilibré au quotidien, Haute qualité pour l’occlusion ambiante et les ombres / reflets plus détaillés. Le réglage ne promet pas une fréquence d’images fixe. Les métrés sont ceux du modèle et doivent être confrontés au relevé du chantier avant commande.
