# LRF Photo Studio — prévisualisation et publication

Branche dédiée : `feature/lrf-photo-studio-20261106`, depuis `1588feb544be112b57612151e704824c52c95d71`. Ne pas fusionner ni publier en production sans l’accord explicite de Jérôme après réception de la prévisualisation. Le domaine principal utilise GitHub Pages ; le projet Vercel du site sert ici exclusivement de prévisualisation.

## Reproduire

```sh
node scripts/build-photo-studio-catalogue.mjs
node --test tests/photo-studio*.test.mjs tests/photo-studio/*.test.mjs
node scripts/build-photo-studio-site.mjs
```

Le catalogue et les 329 fichiers de textures sont dérivés et versionnés, sans aucun prix. Pour actualiser leurs sources, voir `PHOTO_STUDIO_CATALOGUE.md`. Les poids ONNX et le binaire WASM (66 Mo) sont des dépendances de build, téléchargées aux URL verrouillées dans `assets/vendor/lrf-photo-studio/manifest.json` et vérifiées en taille et SHA-256. Ils ne sont pas poussés dans Git ; les fichiers JavaScript, configurations, licences et manifeste sont versionnés. La commande dédiée les prépare avant d’appeler le build public existant. Aucun téléchargement de photo vers un serveur, aucune nouvelle infrastructure.

La commande de prévisualisation Vercel doit remplacer le build pour ce seul déploiement par `node scripts/build-photo-studio-site.mjs`, avec sortie `public-site`. Ne pas modifier les paramètres persistants du projet, son domaine ni sa branche de production. Le navigateur reçoit ensuite modèle, runtime et textures depuis la même origine. Le modèle est chargé seulement après l’import d’une photo.

## Porte de réception

La couverture exhaustive des sources est documentée ; elle ne signifie pas que toutes les références sont simulables. La Fenice, les familles Elios autres que Quercia et les autres fournisseurs exclus restent un travail d’enrichissement des données et/ou de leurs faces. Ne pas déclarer le cahier de réception totalement satisfait tant que ces limites et les tests physiques manquants subsistent. Lire le rapport de vérification de la version avant toute décision.

## Production, uniquement après accord

1. Relire le HEAD de `main` et rapprocher les changements concurrents, sans écrasement.
2. Rejouer les tests ciblés et la construction dédiée ci-dessus sur le lot exact.
3. Vérifier qu’un artefact GitHub Pages inclut réellement les poids et WASM générés, ainsi que tous les fichiers `assets/js/lrf-photo-studio/` et les textures. Une simple fusion des sources sans ces dépendances est insuffisante : ne pas l’effectuer.
4. Choisir avec l’autorisation de publication le mécanisme Pages qui publie cet artefact vérifié, ou préparer les dépendances statiques depuis un checkout disposant de l’authentification Git de publication. Aucun workflow Pages global n’a été changé dans ce lot.
5. Publier uniquement le lot validé, vérifier import → segmentation → correction → référence exacte → export → reprise sur le domaine réel et les téléphones disponibles.

Le retour arrière consiste à retirer le seul ajout de carte et les nouveaux fichiers Photo Studio par un commit de réversion du lot, puis republier la version précédente. Ne pas réinitialiser les catalogues, les comptes, les configurateurs, le CRM ou leurs données ; aucune migration n’a été faite. Les projets Photo Studio restent locaux sur les appareils.
