# RANDAL — retour du rendu photoréaliste dans ChatGPT

Les deux configurateurs proposent de nouveau « Rendu photoréaliste · ChatGPT » à la fin du récapitulatif et dans la présentation de l’atelier. Le parcours historique a été retrouvé dans `assets/js/studio-one/editor.js` (capture et consignes) et `assets/js/randal-catalogue/workspace.js` (fenêtre de préparation en trois étapes). L’ancien lien pointait vers `https://chatgpt.com/` ; aucun GPT personnalisé ni abonnement au site n’était configuré.

Le bouton du récapitulatif transfère la composition courante vers l’atelier par le transfert existant, puis prépare la capture lorsque la scène est initialisée. Cela permet de photographier la salle de bain complète plutôt que la seule prévisualisation du meuble. Le paramètre de lancement est consommé pour éviter une réouverture à chaque actualisation.

La fenêtre permet de télécharger le PNG HD, copier les consignes préparées et ouvrir ChatGPT. L’utilisateur joint l’image et colle les consignes dans son compte ChatGPT. Aucune API d’image ni transmission automatique de l’image n’est ajoutée. Le lien est ouvert par une action explicite, dans un nouvel onglet, sans dépendre d’une fenêtre surgissante après une attente asynchrone.

La capture reprend le moteur HD existant : préparation des matières maximales disponibles, rendu, puis restauration du mode de travail, de la caméra et des contrôles. Un échec propose de réessayer. Les consignes décrivent la géométrie, les ouvertures, l’implantation, les équipements et les matériaux effectivement configurés. Elles demandent de conserver les proportions, le cadrage, le veinage, les formats et les raccords des décors. Les champs clients, chantier, commande, prix et commentaires ne font pas partie des consignes.

Les modifications de déplacement des colonnes de décor de la PR #135 (base main `f2384850`) sont conservées. Les tarifs, dont le deux tiroirs XL 100 cm avec plan à 765 €, les huit échantillons officiels et les ressources ELIOS/VIEW ne sont pas modifiés.

Les tests ciblés vérifient la préparation depuis les deux points d’entrée, le projet courant après passage par l’atelier, les captures HD sur ordinateur et smartphone, la copie avec repli manuel, le traitement d’un échec de capture et la conservation du projet. Les contrôles de confidentialité des consignes et de conservation des fonctions de colonnes complètent la revue indépendante. Les rapports de validation détaillés sont conservés avec les sources du configurateur concerné.

Validation finale : captures Studio 1 920 × 1 539 (ordinateur) et 1 920 × 3 407 (smartphone), Général 1 920 × 1 539 et 1 920 × 3 318. Les 115 tests de parité/confidentialité/catalogues du site passent. Une restauration rejetée ou invalide n’entraîne aucune capture automatique de la pièce par défaut ; les gardes sont testées sur le véritable code de reprise par VM. Les tests navigateur ont utilisé Chromium avec GPU logiciel. Aucun rendu ChatGPT n’a été commandé pendant ces essais.
