# RANDAL · Rendu photo à la demande, débruitage, capture et aperçus

## Version livrée le 7 novembre 2026

Version destinée au compte client vérifié LRF-00321 dans Studio One et Catalogue Général. La demande actuelle de Jérôme est d’activer les changements sur son compte depuis le site habituel. Le lot est destiné à la mise en service après les contrôles techniques ; les autres comptes et les administrateurs conservent leur parcours. La qualité visuelle sur GPU reste à apprécier sur appareil compatible.

## Commandes

Les boutons de déplacement par 5 cm, le mode de déplacement et la liste de sélection ont été supprimés. Un glissement sur un objet le déplace sur son mur ; un clic/toucher ouvre ses réglages : meuble, vasque/plan, colonne ou miroir. Le glissement sur le fond tourne la vue, le pincement zoome. La passation tactile est testée avec les véritables OrbitControls. Le déplacement respecte les limites du mur et refuse les collisions ; annuler un geste restaure la position sans enregistrer.

Les options utilisent les catalogues et les validateurs existants, sans référence ni prix inventé. La vasque propose ses modèles, couleurs, implantations et plans compatibles. L’identifiant réellement cliqué est modifié, y compris pour un second meuble et un accessoire isolé. Les autres éléments restent conservés. LED, charnières et ouverture des compositions restent disponibles selon le modèle.

Trois sols : Yosemite Honey nominal20×120 pose1/3, Creta Caramello60×120, Slate Gold/beige60×60. Murs : sept peintures, Stone Icon Leccese60×90, Allure unis et décors. Les raccords continus et les faces fabricant sont conservés. Le nominal Yosemite est une présentation sans création de référence commerciale.

## Cotes, luminosité et ouverture

Les cotes L × H × P des meubles et colonnes proviennent des dimensions natives des modèles. Une surcouche SVG reste visible au-dessus de l’image interactive ou photo et suit la caméra et les déplacements. Le bouton Cotes permet de les masquer ; elles sont actives par défaut. Les dimensions de caisson ne changent pas quand un tiroir est ouvert.

Le curseur de luminosité agit immédiatement entre 25 et 150 %, avec 100 % par défaut. Il ajuste la même exposition pour le rendu interactif et le calcul photo ; sa valeur et l’affichage des cotes sont conservés dans le projet.

Les tiroirs reprennent la course des deux configurateurs : 20 cm en haut, 26 cm au milieu et 31,5 cm en bas (selon le nombre de tiroirs et la profondeur disponible). L’ouverture et la fermeture durent 900 ms avec une accélération et un ralentissement doux. Une inversion en cours de mouvement repart de la position réelle. Les charnières et portes doubles restent respectées.

## Rendu photo exclusivement à la demande

Le moteur three-gpu-pathtracer 0.0.24, compatible avec le Three 0.180.0 déjà installé, calcule une image progressive de la véritable scène après un clic sur « Créer le rendu photo ». Il utilise les matériaux physiques, les réflexions de miroir, la lumière indirecte multirebond et l’environnement HDR studio déjà présent dans le dépôt. Les éléments cachés et les approximations de halo par shader sont exclus du calcul photo. Les LED sont des surfaces émissives physiques. Des sources surfaciques éclairent la scène et ses ouvertures lumineuses.

Aucun import du moteur photo, chargement HDR, worker, ni calcul progressif n’est lancé à l’ouverture ou après une période d’inactivité. Sur un PC adapté : jusqu’à 1,4 million de pixels, 8 rebonds et 512 échantillons ; sur appareil limité : 450 000 pixels, 5 rebonds et 128 échantillons. La BVH est calculée dans un worker local séparé. Toute interaction ou modification annule le calcul et restaure l’aperçu interactif, sans reprise automatique. Une expiration du budget est un rendu incomplet, jamais une réussite : l’ancien raccourci de 90 secondes et 8 échantillons a été supprimé.

Après la cible d’échantillons, le filtre bilatéral du moteur réduit le bruit de la radiance linéaire tout en préservant les contours. L’exposition choisie et la conversion de couleur sont appliquées une seule fois. La capture PNG de cette image est déclenchée dans la même image graphique, avant une éventuelle nouvelle interaction. Le statut prêt n’arrive qu’après création d’un PNG non vide. La miniature et le lien de téléchargement s’affichent dans le panneau ; une capture antérieure reste identifiée comme telle après modification. Annulation, échec et fermeture ne peuvent pas livrer une capture périmée.

Les fenêtres simulées ne cumulent plus un panneau émissif et la source surfacique dans le calcul photo. Les sources restent parallèles et entièrement à l’intérieur du mur, afin d’éviter de gaspiller leur éclairage derrière une paroi opaque.

L’interface affiche l’état réel : aperçu fluide, calcul de la lumière, rendu photo en affinage, rendu prêt ou aperçu de qualité adaptée. Un échec ne peut pas annoncer un rendu photo réussi. Les erreurs, changements concurrents, perte de contexte, fermetures et ressources tardives sont gérés. Le rendu progressif est chargé uniquement pour la présentation du compte RANDAL ; aucun mode normal ou réglage d’administrateur n’est remplacé.

## Visuels de sélection

Chaque finition et couleur sélectionnée affiche son échantillon dans le panneau de droite : les huit échantillons officiels Studio One, les finitions exactes des collections du Catalogue général, les teintes de vasques et cadres, et les revêtements correspondants. Une peinture est représentée par son vrai aplat de couleur. Une référence inconnue n’emprunte jamais le visuel d’une autre ; un échec de chargement est annoncé sans image trompeuse.

## Vérifications effectuées

Tests des véritables modèles, géométries et références commerciales ; plus de 500 combinaisons compatibles ; gestes souris/tactiles et caméra OrbitControls ; sélections contextuelles et vasques ; choix de surface et raccords Allure ; construction de scène physique et propriété des ressources ; budgets, annulations, accumulation, erreurs et états du moteur progressif.

Le worker réellement compilé des deux distributions a été exécuté dans un worker Node avec un rayon sur une boîte : distance 1,5 m vérifiée, groupes conservés et tableaux sources non détachés. Les sources et la distribution du worker sont séparées des commandes de l’interface.

Noyau partagé, tests de sécurité et PLAN & POSE, contrôles complets des deux workspaces et trois builds locaux. Les dépendances sont verrouillées et les notices MIT et BSD 2-Clause complètes sont incluses dans chaque distribution. L’interface est contrôlée dans le navigateur avec un adaptateur explicitement simulé ; cela ne constitue pas une preuve du rendu GPU.

## Limite de validation

WebGL est indisponible dans le navigateur de QA. La compilation et l’apparence sur GPU, le bruit résiduel et la fluidité réelle doivent encore être jugés sur un appareil compatible. Ne pas annoncer un rendu visuellement certifié « hyperréaliste » avant cette recette. Les originaux Slate 416 × 208 et certains panneaux Allure ont une définition limitée ; aucun détail fabricant n’a été inventé pour les transformer en HD.

## Recette utilisateur

Ouvrir le configurateur depuis le site habituel après actualisation, se connecter au compte RANDAL et lancer Plein écran. Vérifier qu’aucun affinage ne démarre seul. Cliquer sur « Créer le rendu photo », attendre les étapes de calcul, de nettoyage et de capture puis la miniature et le lien PNG. Annuler puis modifier la scène : aucun redémarrage automatique ne doit avoir lieu. Comparer lumière, ombres, miroir et matériaux. Glisser un meuble à la souris/au doigt, toucher la vasque et changer son modèle/couleur, changer les dimensions du meuble, sélectionner la colonne et inverser son ouverture. Vérifier les cotes, changer la luminosité, ouvrir/fermer les tiroirs et constater la course progressive et la vitesse. Vérifier les revêtements et les LED, fermer puis rouvrir pour retrouver les préférences. Le mode adapté doit être annoncé clairement si l’appareil ne permet pas le calcul photo.
