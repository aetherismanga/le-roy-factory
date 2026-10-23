Source RANDAL STUDIO ONE de vérification, issue de 671bf8ecbc51e9d6da3ba288aa1b3c258a6cc08b (branche feature/studio-one-beta-v2-commerce-accueil).

Modifications isolées : poses et transferts PLAN & POSE. Le dossier review-studio contient la version construite pour ce seul aperçu. Les sources sont conservées pour intégration après validation, sans modification de la branche ni du déploiement Studio de production.

Les modifications de structure utilisent la même topologie exacte que PLAN & POSE : unions de cloisons, zones fermées sans accès et plinthes. Le code de découpe et ses notices sont inclus dans `src/plan-topology.mjs` et `src/polygon-clipping*`.

Reconstruction locale : installer les dépendances dans ce dossier (`npm install`), copier `../review-studio` dans `dist`, puis exécuter `node build.mjs`. Replacer uniquement les résultats vérifiés dans `../review-studio`, sans publier sur le projet Studio public.
