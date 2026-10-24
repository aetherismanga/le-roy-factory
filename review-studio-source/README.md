Sources RANDAL STUDIO ONE consolidées le 24 octobre 2026 à partir de la production `671bf8e` et de la revue PLAN & POSE.

Les correctifs de tarifs France, miniatures miroirs, confidentialité et transferts sont partagés avec la branche `release/studio-one-20261024` (PR #128). Les textures HD et les raccords Allure sont conservés. Le dossier `review-studio` contient un build reproductible destiné aux tests de compatibilité. Les liens de transfert utilisent les deux configurateurs de production.

Reconstruction : installer les dépendances dans ce dossier, copier `../review-studio` vers `dist`, puis exécuter `node build.mjs`. Les résultats vérifiés peuvent être replacés dans `../review-studio`. Le projet Studio Vercel utilise la branche standalone et son API privée ; ce dossier ne remplace pas son déploiement.
