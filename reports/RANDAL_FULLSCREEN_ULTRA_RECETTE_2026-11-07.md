# RANDAL · Plein écran premium — recette du prototype

Version destinée à une prévisualisation avant validation par Jérôme. Ne pas fusionner sur main ni promouvoir en production avant cette validation, conformément au dossier LRF_RANDAL_FULLSCREEN_ULTRA_WORK.

## Fonctionnement livré

- Réservé au client vérifié LRF-00321, Studio One et Catalogue Général ; autres comptes et administrateurs conservent leur parcours.
- Plein écran natif quand disponible, sinon dialogue occupant l’écran ; fermeture et retour à la composition.
- Choix réels de meuble, largeur, finitions, colonne et miroir, validés par les catalogues et règles guidées existants. Les variantes incompatibles ne sont pas proposées ; une implantation en collision est refusée sans écraser le projet.
- Ouverture des tiroirs et portes, déplacement borné au mur, inversion des charnières compatibles, miroir LED selon le véritable modèle. Les choix modifiés sont conservés dans le projet et son devis.
- Trois sols : Yosemite Honey nominal 20 × 120 pose 1/3 ; Creta Caramello 60 × 120 ; Slate Gold/beige 60 × 60. Le module nominal Yosemite reste une présentation, sans référence commerciale inventée.
- Sept peintures, Stone Icon Leccese 60 × 90 et Allure (cinq unis, quatre décors). Le dossier fourni réintroduit ces collections après la demande antérieure de peinture seule.
- Raccords continus Allure et faces distinctes de Stone Icon Leccese 04S6903 ; vrais matériaux et textures du catalogue, dimensions métriques et joints de 2 mm.

## Rendu et maîtrise des ressources

Éclairage physique stable, environnement de studio, reflets planaires avec entourage architectural réel, ombres plus détaillées et occlusion de contact GTAO sur les PC compatibles. Textures dans leur meilleure variante disponible. Aucun détail fabricant inventé à partir d’une photo couleur.

Les appareils limités utilisent des budgets réduits ; les images coûteuses déclenchent une réduction des effets, des ombres et des réflexions. Pas de boucle de rendu au repos ; l’aperçu sous le plein écran est suspendu. Les ressources sont libérées à la fermeture ; la perte du contexte graphique est gérée.

## Vérifications

- Tests ciblés : véritables modèles et références commerciales, plus de 500 combinaisons de produits ; profils de rendu et réduction de charge ; succès/supersession/fermeture des mises à jour ; accès serveur ; glisser avec de vrais rayons caméra ; surfaces, raccords, libération des ressources et erreurs de texture.
- Noyau partagé, sécurité et PLAN & POSE, contrôles complets des deux workspaces, trois builds locaux.
- Navigateur : distinction du compte restreint et d’un compte ordinaire, ouverture/fermeture et commandes. Interface mobile à 390 × 844 vérifiée séparément avec un adaptateur de rendu explicitement identifié comme simulé.

## Limites restant à valider visuellement

Le navigateur de QA refuse la création de contexte WebGL. Le véritable rendu GPU et la fluidité sur les appareils de Jérôme ne sont donc pas certifiés. Les tests de géométrie et d’interface ne remplacent pas cette acceptation visuelle. Les originaux Slate (416 × 208) et certains panneaux Allure ont une définition limitée ; ils ne sont pas annoncés comme des textures natives HD.

Pour la recette utilisateur : ouvrir un lien de prévisualisation, se connecter au compte RANDAL, configurer un meuble avec colonne et miroir LED, puis ouvrir Plein écran. Vérifier les matériaux, les reflets, les sept peintures et les carrelages, ouvrir les portes, déplacer le mobilier, inverser une charnière, éteindre/rallumer le miroir et fermer/réouvrir. Refaire sur PC et smartphone avant publication définitive.
