# RANDAL · Plein écran interactif et formats 120 cm

Le 7 novembre 2026, Jérôme demande le retrait du rendu photo et de son bouton, la correction du passage à 120 cm avec les implantations de vasque réellement proposées, de nouveaux réglages initiaux et une salle de bains reflétée par le miroir. Ces changements concernent uniquement le compte client RANDAL vérifié LRF-00321 dans Studio One et Catalogue général.

## Interaction et références fabricant

Le plein écran conserve le rendu interactif physique, les éclairages, matériaux, ombres, miroirs et occlusion de contact du profil existant. Le bouton photo, sa capture, son badge et son moteur de chargement progressif ont été retirés du parcours. Aucun calcul photo ne démarre en arrière-plan. Les dépendances historiques du dépôt ne sont pas utilisées par cette présentation.

Le glissement à la souris ou au doigt déplace le mobilier ; le clic ouvre ses options. Les champs utilisent les modèles, finitions, formats, vasques et références commerciales natifs. Aucun bouton de déplacement par 5 cm n'est réintroduit.

Le passage de 100 à 120 cm conservait une implantation Sella centrée inexistante à 120 cm et masquait donc cette largeur. Une largeur compatible reste maintenant accessible : une implantation encore valable est conservée ; sinon une double vasque réellement proposée est choisie en priorité. Sella 120 cm double utilise la référence 2809. Les choix centrés, déportés ou doubles dépendent du modèle de vasque et de la collection, conformément au catalogue. Les vasques à poser conservent leurs possibilités gauche, centre, droite et double. L'élargissement peut déplacer légèrement le seul meuble sélectionné pour laisser le passage nécessaire devant une colonne ; il est refusé explicitement si le mur ne présente aucun emplacement valide. Les identifiants et les autres objets restent conservés.

## Réglages initiaux

La première ouverture de cette version applique Yosemite Honey nominal 20 × 120 en pose 2/3 et la peinture Gris perle sur les murs ; les cotes sont désactivées. La pose utilise le véritable motif `two-thirds`, avec décalages successifs de 0, 80 et 40 cm pour une longueur de 120 cm.

La migration `presentation.defaultsVersion: 2` s'applique aussi aux projets enregistrés avec les anciens réglages. Elle conserve le mobilier, la pièce, la luminosité et les autres préférences. Elle est enregistrée uniquement après le chargement réussi des deux revêtements. Les choix faits ensuite sont conservés à la réouverture. Le bouton Cotes permet toujours de les activer volontairement. Les autres sols et murs autorisés, les images de finitions et les couleurs restent disponibles.

## Reflet du miroir

Le décor arrière de la présentation réutilise une véritable fenêtre blanche et le fond extérieur déjà fournis par les configurateurs. La pièce possède un mur découpé autour de la fenêtre et un sol continu ; la peinture choisie est cohérente sur les surfaces reflétées. Le décor est construit en géométrie et reflété par le miroir, sans substituer une image artificielle au projet.

## Vérification

Régressions des vrais modèles et devis sur le passage 100 → 120, double vasque, changements d'implantation et collisions. Tests de migration et sauvegarde native, du motif de pose 2/3, des cotes masquées et de l'absence de commandes/moteur photo. Tests de fenêtre, des rayons de réflexion, du chargement tardif et du nettoyage des ressources. Contrôles du noyau, sécurité et PLAN & POSE, builds et contrôles complets des deux ateliers, build du site.

La qualité visuelle sur GPU ne peut pas être certifiée lorsque WebGL est indisponible dans le navigateur de contrôle ; les vérifications de géométrie et d'interface ne sont pas une preuve de rendu photographique. La demande actuelle conserve précisément la présentation interactive et retire le calcul photo défectueux.
