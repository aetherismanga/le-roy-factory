# PLAN & POSE — vérification des cotes, matières et poses

Cette version est destinée à un aperçu séparé. Aucun déploiement de production ni modification des branches de production des configurateurs.

## Cotes et précision

- Cotes sombres, grasses, dans un cartouche clair. Taille de 16 pixels à l'écran sur ordinateur et smartphone, quelle que soit la marge créée par le SVG.
- Le cadrage réserve de la place autour du plan pour conserver toutes les cotes visibles sur smartphone et dans le PDF.
- Cliquer une cote ouvre le panneau de correction à droite, sans recouvrir le plan. Saisie en centimètres avec un pas de 0,1 cm (un millimètre), maintien des angles droits. La géométrie et les ouvertures sont contrôlées avant application. Les contours obliques doivent être corrigés par leur tracé ou leur échelle.
- Le dessin manuel utilise un repère au centimètre, au lieu de cinq centimètres. La saisie numérique reste exacte, sans arrondi à ce repère.
- Toute modification géométrique annule la validation de la pièce. La validation des cotes est conservée avant la pose et les transferts.
- Les scans restent soumis aux limites de leur document d'origine : aucune précision absolue n'est promise sur une image sans cote lisible, déformée ou photographiée en perspective.

## Poses et reprise dans RANDAL

Les deux moteurs de vérification reprennent les poses droite, décalée 1/2, 1/3, 2/3, aléatoire déterministe pour les effets bois, et le module Opus fabricant Roma / Sedimenti. Les orientations horizontale et verticale, l'origine, les joints, les découpes et les surfaces ont été comparés numériquement. Les coordonnées du sol 3D sont correctement réfléchies par rapport au plan, sans déplacement de phase des rangées.

Le module Opus documenté comporte six pièces réparties sur quatre formats, pour un carton fabricant de 0,75 m². Les anciens projets Opus conservent leur motif enregistré. Le changement de pose ou de format ne transforme pas un module en un grand carreau fictif.

L'alignement des plinthes utilise les limites nominales des carreaux, et non leurs fragments découpés. Les quantités et les coupes concordent entre les moteurs. Les portes restent déduites.

La fiche client, l'adresse, la référence du chantier, le commentaire et les métadonnées du transfert sont conservés lors de l'import et d'une nouvelle sauvegarde RANDAL. Une pièce transférée s'ouvre sur la vue globale de la pièce.

L'aperçu héberge les deux moteurs modifiés sous `randal-general/dist/` et `review-studio/`. Leurs sites de production restent inchangés. Les sources Studio sont conservées dans `review-studio-source/`, issues de la version Studio 671bf8ecbc51e9d6da3ba288aa1b3c258a6cc08b.

## Visuels

Plus de 300 références supplémentaires disposent d'un visuel officiel récupéré sur les pages fabricant ou extrait de leurs catalogues. Le relevé exact des sources, pages, images et dimensions se trouve dans `recovered-visuals-20261024.json` et les correspondances par référence dans `catalogue-review.json`.

Les échantillons de catalogue sont identifiés comme tels, avec leur définition réelle. Ils n'ont pas été agrandis pour simuler des fichiers HD. Les faces Sedimenti Tumbled sont extraites d'un carreau du module photographié ; une miniature de sol complet n'est pas répétée à l'intérieur de chaque carreau.

33 références restent sans visuel fiable, notamment certains décors, Abyss / Greek Isles, Coccio et des lignes tarifaires « Outdoor » sans coloris identifié. Aucun visuel d'une autre référence ne leur est attribué. L'espace professionnel Elios a répondu 403 à la consultation publique ; les accès professionnels proposés par le client permettront de poursuivre la recherche des fichiers matière et des développements HD.

## Vérification

- 199 tests Node : géométrie, unités, import, cotes, scan, textures, export, quantités, compatibilité et non-régression Opus.
- Comparaisons de géométrie sur quatre contours, six poses, deux orientations et deux modes de centrage. Comparaisons supplémentaires des plinthes alignées.
- 48 contrôles navigateur PLAN & POSE sur ordinateur et smartphone : cotes de 16 pixels, absence de rognage, saisie au millimètre, sauvegarde, avertissements, ouvertures, textures, Opus, prix et PDF.
- 26 contrôles dans les deux configurateurs construits : import des six poses dans les deux orientations, nombre de carreaux, conservation de la fiche client, du commentaire et du motif.
- Les contrôles navigateur 3D utilisent des images externes de test pour isoler les comportements. Les fichiers matière récupérés sont vérifiés séparément sur leur source réelle. Le service commercial est indisponible sur le serveur statique local ; son fonctionnement n'est pas revendiqué par ces tests.
- PDF généré au format A4 vertical, vérifié visuellement. Tests de production indépendants non exécutés : aucun changement de production demandé.
