# PLAN & POSE — version de vérification du 23 octobre 2026

Version isolée. Aucune fusion dans `main` et aucune affectation des domaines de production.
La branche de vérification désactive ses déploiements Git automatiques pour permettre un seul aperçu manuel à la fin des contrôles.

## Parcours modifiés

- Démarrage sur un projet vierge ; ouverture des sauvegardes depuis Mes projets.
- Fiche d’enregistrement simple : projet, client/société, adresse, code postal, ville, téléphone, e-mail, référence.
- Quitter / Nouveau : avertissement uniquement si le contenu diffère de la dernière sauvegarde volontaire. Le brouillon de session ne remplace pas cette sauvegarde.
- Quitter sans conserver redirige vers `https://leroyfactory.fr/`. Enregistrer avant de continuer ouvre la fiche.
- Réglages dans une colonne latérale sur ordinateur et sous le plan sur téléphone ; aucun dialogue centré superposé au plan.
- Tracé rectangulaire par un geste ; contour par segments avec angles droits activés par défaut ; cotes affichées pendant le tracé des murs et cloisons.
- Suppression des coordonnées et zones déduites dans l’interface.
- Palette portes intérieures, entrée, coulissantes, fenêtres, baies et portes-fenêtres. Dépôt sur les murs, déplacement, formats, couleurs RAL 9016 / 7016 / 9005. Allège modifiable en vue de face.
- Image/PDF sur ordinateur ; image, photographie et capture pour numérisation sur mobile. Vérification obligatoire des lectures, unité et échelle. Découpe des enveloppes rectangulaires reconnues lorsqu’une cloison relie effectivement deux faces opposées. Proposition prudente d’interruptions de murs à contrôler comme ouvertures.
- Pièce choisie dans la liste ou sur le plan ; carrelage appliqué à la pièce ou aux pièces du même usage. Filtrage sol/faïence, intérieur/terrasse R11 et 20 mm. Prise en charge des visuels VIEW dans le plan.
- Poses droite, ½, ⅓, ⅔, aléatoire déterministe réservée aux séries bois identifiées ; Opus Roma et Sedimenti avec leurs modules documentés (6 pièces, quatre formats, 0,75 m²/carton).
- Plinthes fabricant proposées en priorité, bois blanc 2,20 m conservé. Retraits de parties de murs visibles en pointillés ; union avec les ouvertures au sol sans double déduction. Options avancées et sélection de faïence retirées.
- Bilan ouvert sur demande ; tarifs de vente, commentaire, fiche client et plan dans le PDF A4 portrait ; partage PDF selon les capacités de l’appareil.
- Les prix d’achat ne sont affichés qu’après validation serveur d’une session professionnelle LRF. Aucune simple valeur locale déclarant un client n’autorise cet affichage.
- Sélection de plusieurs pièces pour RANDAL, salle de bains présélectionnée, liens distincts par composition et historique de transfert ouvert. La fiche client est incluse dans le fichier natif, également sous `lrfPlanPose`.
- « Envoyer votre projet » fournit un fichier de reprise local entre postes ; message explicatif avant téléchargement/partage. Boutons JSON avancés, image HD, fichier RANDAL et duplication du projet retirés de Bilan & export.

## Vérification

- 88 tests Node réussis : géométrie, lectures de cotes contradictoires, métrés, plinthes, cartons, compatibilité des projets natifs, textures, règles du nouveau parcours et relais des images fabricant.
- 38 contrôles navigateur réussis sur ordinateur et smartphone émulé : fiche, sauvegarde, nouveau projet, conservation client, ouvertures, absence de superposition au plan, textures avec réseau simulé, Opus, bilan, masquage achat et création PDF.
- Contrôles gestuels supplémentaires : pièce rectangulaire en un geste, longueur d’une cloison en direct, retrait partiel de plinthe visible, redirection de sortie après sauvegarde.
- PDF généré : A4 portrait 595,28 × 841,89 points, texte client et commentaire retrouvés dans le fichier ; contrôle visuel du plan et de la mise en page.
- Les requêtes externes d’images ont été simulées pour les tests de parcours reproductibles. Leur disponibilité réelle doit également être vérifiée sur l’aperçu.

## Limites explicites de cette version

- La reconnaissance de toute photo ou tout plan de maison, des portes et fenêtres et des cotes n’est pas garantie. Les propositions restent à contrôler et les dimensions contradictoires ou manquantes bloquent la validation. Les séparations automatiques couvrent les enveloppes rectangulaires à cloisons traversantes ; les formes plus complexes restent corrigeables manuellement.
- Les références dont aucun visuel fabricant n’est fourni restent identifiées « Visuel fabricant à compléter ». Aucune texture approximative n’est fabriquée. Le relais d’images ELIOS permet de contourner l’absence d’en-têtes CORS du fabricant, uniquement pour les URLs exactes figurant dans le catalogue.
- Les Opus et nouvelles poses se calculent dans PLAN & POSE. Les ateliers RANDAL actuels ne reprennent que droite et ½ ; un transfert incompatible est explicitement bloqué. Il ne substitue pas une pose différente. Les pièces multiples ouvrent des compositions indépendantes, pas une maison unique dans les moteurs RANDAL.
- Les données client sont dans le payload transmis. L’affichage et la conservation complète de ces nouveaux champs par les écrans des deux ateliers nécessitent une évolution distincte de leurs formulaires ; cette version ne modifie pas les deux applications en production.
- Le partage natif dépend du navigateur. À défaut, l’application propose le téléchargement du fichier à transmettre.

## Sources fabricant pour les modules

- Roma : https://eliosceramica.com/wp-content/uploads/2025/06/Elios_catalogo_ROMA.pdf
- Sedimenti : https://eliosceramica.com/wp-content/uploads/2026/02/ELIOS_CATALOGO-SEDIMENTI-1.pdf

Les modules ajoutés conservent un achat non renseigné : aucun tarif n’a été repris d’un autre format.
