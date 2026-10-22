# Lecture des cotes et reconstruction du plan

L’import d’une image ou d’une page PDF lance un lecteur de nombres. Les nombres sans unité sont proposés en centimètres. Le contour à angles droits est reconstruit par contraintes de longueurs, sans demander de calibration ni de retracé quand les informations sont suffisantes.

La photo est normalisée pour faire ressortir le crayon. Le lecteur local Tesseract.js 7.0.0 essaie quatre orientations, isole des groupes de chiffres et rapproche les nombres des murs. Les lectures restent des propositions. Les cotes non lues sont calculées seulement si les autres déterminent exactement le contour ; une contradiction est affichée avec sa lecture initiale et la déduction proposée. L’utilisateur doit vérifier les cotes et cocher la vérification avant de créer le plan. Les pièces créées restent à contrôler pour les ouvertures et la hauteur avant export natif.

La conservation du fond privilégie PNG afin de préserver les chiffres manuscrits fins. Les fonds dépassant 11 millions de caractères utilisent JPEG qualité 98 %. Les anciens fonds JPEG restent lisibles ; réimporter l’original permet de bénéficier de cette préservation.

## Contrôles réalisés

- 31 tests Node passent : anciens calculs et formats natifs, unités, reconstruction malgré un dessin déformé, manque de cotes, contradictions, rejet des coordonnées inversées, distinction entre une cote de mur et une largeur de porte, maintien des métrés après remise sur la photo, annulation pendant le chargement du lecteur.
- Dessin manuscrit fourni : la portion photographiée est testée localement, avec les mêmes modules et le même modèle livrés, sans publier la photo. Proposition : 249 / 455 / 344 / 218 cm lus ; 95 et 237 cm déduits ; 13,4005 m². La petite cote est mal lue par le lecteur (86) et reste explicitement signalée à vérifier. Aucun prix ni hauteur n’est déduit de la photo.
- Plan synthétique imprimé 450 × 300 cm : contour et deux cotes reconnus ; opposés déduits ; 13,50 m². Environ 2,3 secondes sur l’environnement de contrôle, sans garantie de durée sur un téléphone.
- Test DOM du véritable écran de vérification : création désactivée avant vérification ; texte invalide et cote contradictoire bloqués ; correction puis création avec 13,4005 m².
- L’application mise à jour charge dans le navigateur de contrôle et reprend le projet existant ; affichage mobile contrôlé. Aucun nouvel import de fichier n’a été tenté dans ce navigateur après le refus précédent. Le parcours navigateur complet d’import et de conversion reste donc à confirmer sur l’appareil utilisateur.

## Limites

Les contours automatiques doivent être à angles droits et suffisamment fermés/visibles. Les portes ouvertes, les formes obliques, les photos très inclinées et les grandes maisons complexes peuvent nécessiter une correction. La lecture d’un nombre manuscrit n’est jamais une garantie de sa valeur : tous les nombres et les déductions doivent être vérifiés. Les ouvertures et leur emplacement ne sont pas automatiquement validés. Le lecteur s’arrête après un délai maximal de 150 secondes et l’annulation conserve le fond importé.

Le moteur et les données sont servis depuis le site, chargés à la demande. Les images restent dans le navigateur ; aucun service d’IA externe, clé API, abonnement ou modification des moteurs RANDAL n’est ajouté.
