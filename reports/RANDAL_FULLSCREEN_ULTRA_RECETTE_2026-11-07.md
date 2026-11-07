# RANDAL · Test du rendu photo progressif et des commandes directes

## Version livrée le 7 novembre 2026

Prototype réservé au compte client vérifié LRF-00321 dans Studio One et Catalogue Général. La branche de prévisualisation et la demande de fusion restent distinctes de main ; aucune promotion définitive avant validation visuelle de Jérôme. La capture utilisateur montrait l’ancienne interface publiée (boutons5cm, aucun choix contextuel), et non la version de prévisualisation.

## Commandes

Les boutons de déplacement par5cm, le mode de déplacement et la liste de sélection ont été supprimés. Un glissement sur un objet le déplace sur son mur ; un clic/toucher ouvre ses réglages : meuble, vasque/plan, colonne ou miroir. Le glissement sur le fond tourne la vue, le pincement zoome. La passation tactile est testée avec les véritables OrbitControls. Le déplacement respecte les limites du mur et refuse les collisions ; annuler un geste restaure la position sans enregistrer.

Les options utilisent les catalogues et les validateurs existants, sans référence ni prix inventé. La vasque propose ses modèles, couleurs, implantations et plans compatibles. L’identifiant réellement cliqué est modifié, y compris pour un second meuble et un accessoire isolé. Les autres éléments restent conservés. LED, charnières et ouverture des compositions restent disponibles selon le modèle.

Trois sols : Yosemite Honey nominal20×120 pose1/3, Creta Caramello60×120, Slate Gold/beige60×60. Murs : sept peintures, Stone Icon Leccese60×90, Allure unis et décors. Les raccords continus et les faces fabricant sont conservés. Le nominal Yosemite est une présentation sans création de référence commerciale.

## Véritable calcul photo

Le moteur three-gpu-pathtracer0.0.24, compatible avec le Three0.180.0 déjà installé, calcule une image progressive de la véritable scène à l’arrêt. Il utilise les matériaux physiques, les réflexions de miroir, la lumière indirecte multirebond et l’environnement HDR studio déjà présent dans le dépôt. Les éléments cachés et les approximations de halo par shader sont exclus du calcul photo. Les LED sont des surfaces émissives physiques. Des sources surfaciques éclairent la scène et ses ouvertures lumineuses.

Sur un PC adapté : jusqu’à1,4million de pixels,8rebonds et192échantillons. Le profil réduit borne pixels, atlas de textures et échantillons. La BVH est calculée dans un worker séparé, distribué localement. L’aperçu interactif apparaît pendant les mouvements ; l’accumulation reprend après arrêt et se réinitialise après changement réel de scène ou caméra. Elle s’arrête au budget fixé, évitant un calcul permanent au repos.

L’interface affiche l’état réel : aperçu fluide, calcul de la lumière, rendu photo en affinage, rendu prêt ou aperçu de qualité adaptée. Un échec ne peut pas annoncer un rendu photo réussi. Les erreurs, changements concurrents, perte de contexte, fermetures et ressources tardives sont gérés. Le rendu progressif est chargé uniquement pour la présentation du compte RANDAL ; aucun mode normal ou réglage d’administrateur n’est remplacé.

## Vérifications effectuées

Tests des véritables modèles, géométries et références commerciales ; plus de500combinaisons compatibles ; gestes souris/tactiles et caméra OrbitControls ; sélections contextuelles et vasques ; choix de surface et raccords Allure ; construction de scène physique et propriété des ressources ; budgets, annulations, accumulation, erreurs et états du moteur progressif.

Le worker réellement compilé des deux distributions a été exécuté dans un worker Node avec un rayon sur une boîte : distance1,5m vérifiée, groupes conservés et tableaux sources non détachés. Les sources et la distribution du worker sont séparées des commandes de l’interface.

Noyau partagé, tests de sécurité et PLAN & POSE, contrôles complets des deux workspaces et trois builds locaux. Les dépendances sont verrouillées et les notices MIT complètes sont incluses dans chaque distribution. L’interface est contrôlée dans le navigateur avec un adaptateur explicitement simulé ; cela ne constitue pas une preuve du rendu GPU.

## Limite de validation

WebGL est indisponible dans le navigateur de QA. La compilation et l’apparence sur GPU, le bruit résiduel et la fluidité réelle doivent encore être jugés sur un appareil compatible. Ne pas annoncer un rendu visuellement certifié « hyperréaliste » avant cette recette. Les originaux Slate416×208 et certains panneaux Allure ont une définition limitée ; aucun détail fabricant n’a été inventé pour les transformer en HD.

## Recette utilisateur

Ouvrir la nouvelle prévisualisation, se connecter au compte RANDAL et lancer Plein écran. Le bandeau porte « version de test ». Après l’arrêt des manipulations, attendre l’indication d’affinage puis le rendu prêt. Comparer lumière, ombres, miroir et matériaux. Glisser un meuble à la souris/au doigt, toucher la vasque et changer son modèle/couleur, changer les dimensions du meuble, sélectionner la colonne et inverser son ouverture. Vérifier les revêtements et les LED, fermer puis rouvrir. Le mode adapté doit être annoncé clairement si l’appareil ne permet pas le calcul photo.
