# Correctif d’application des carrelages — 7 novembre 2026

## Cause et correction

Les cartes sont créées depuis `browseProducts`, une liste volontairement abrégée sans `textureFaces`, dimensions ni poses. Le clic transmettait directement cette fiche à `loadFaces`, qui rejetait toutes les références éligibles avec « Aucune texture fabricant vérifiée ». La reprise d’un projet utilisait déjà la fiche complète et n’empruntait pas ce chemin.

La sélection résout maintenant l’identifiant exact dans `products` avant le chargement et le rendu. Aucune substitution de référence ou coloris n’est permise. Le message de réussite attend la fin effective du rendu. Le changement de produit ferme la comparaison pour éviter qu’un curseur resté sur « Avant » masque le nouveau sol.

L’affichage propose par défaut les variantes simulables. Les autres restent consultables en décochant le filtre. Un bouton permet de retrouver les références utilisables quand les critères ne donnent aucun résultat simulable. La couverture reste de 124 variantes, dont 18 Elios et 106 View ; ce correctif n’invente pas les textures manquantes.

## Vérifications

- `node --check assets/js/lrf-photo-studio/app.mjs` : réussi.
- `node --test tests/photo-studio*.test.mjs tests/photo-studio/*.test.mjs` : 57 tests réussis. Les deux nouveaux cas contrôlent le raccordement de toutes les cartes éligibles et le refus des identifiants périmés/incomplets.
- `node scripts/build-public-site.mjs` : 6 526 fichiers publics, périmètre privé exclu.
- `git diff --check` : réussi.
- Chrome distant, page réelle dans une vue de 390 px, puis vue ordinateur : reprise d’une photo de catalogue publique avec masque de contrôle préparé manuellement ; clic carte Quercia Honey 00Y2C40, puis Slate Gold 03F6A10, puis View Marais Beige VMS625R. Le sol change réellement, les boutons comparaison/export s’activent.
- Mesure sur ce masque de contrôle : 117 310 pixels du sol modifiés ; zéro pixel modifié hors masque, y compris les zones protégées.
- Comparaison à 100 % sur l’original puis choix de Slate : retour au rendu, comparaison fermée, masque conservé.
- Export Quercia : JPEG créé et décodé par l’aperçu du navigateur, 1 000 × 715 px, définition exacte de la photo test ; sauvegarde locale du projet View réussie.

Les vues mobiles sont simulées dans Chrome ; aucun téléphone Android physique ni iPhone/Safari n’a été utilisé pendant ce correctif. La détection automatique n’est pas modifiée ni requalifiée par ce test : le masque de contrôle est explicitement manuel. Aucun cliché utilisateur, fixture de contrôle ou fichier d’export n’est ajouté au dépôt ou à la publication.

## Livraison

Prévisualisation Vercel du projet existant `le-roy-factory`, équipe `hugol-trading`, depuis la branche `feature/lrf-photo-studio-20261106`. Le domaine principal GitHub Pages reste inchangé. Le commit parent est `811af0d4c4d3114593fd602728b8831d87585073` ; un retour à ce parent puis un redéploiement de la prévisualisation annule ce correctif.
