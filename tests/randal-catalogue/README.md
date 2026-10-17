# Tests RANDAL Catalogue général

Ne modifient aucun produit ou compte en ligne. Les envois commerciaux sont interceptés et aucun message n’est envoyé.

```sh
npm ci
npx playwright install chromium
node tests/randal-catalogue/core.test.cjs
node tests/randal-catalogue/playwright.cjs
node tests/randal-catalogue/studio-smoke.cjs
```

Le serveur local démarre dans le même processus Node que le navigateur. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` permet de choisir un Chromium déjà installé. `RANDAL_TEST_URL` permet de tester le site publié ; `RANDAL_TEST_RESULTS` choisit un dossier de résultats. `RANDAL_TEST_FILTER='Smartphone|Tablette'` limite l’essai à ces deux scénarios autonomes.

La comparaison tarifaire produit `reports/randal-catalogue/price-comparison.json` : 431 valeurs avant/après, égalité stricte. Les données intégrales, les dimensions imposées, les compatibilités, les identifiants, les collisions, les projets et les empreintes STUDIO ONE sont contrôlés par le test du modèle. Le relevé initial reste conservé ; la base protégée à utiliser pour l’intégration tient compte de la mise à jour externe f90a260.

Le test navigateur contrôle 12 parcours, dont les 22 types de meubles, les miroirs multiples, la pose des carrelages mesurée à partir des paramètres de la texture réellement affichée, les projets, le dossier PDF sur ordinateur et téléphone, les formulaires et les panneaux sur tablette. Chromium utilise WebGL/SwiftShader dans cet environnement ; ce n’est pas une mesure de performance sur un téléphone physique.

Le contrôle STUDIO ONE vérifie la version conservée sur ordinateur et téléphone. Il ne change ni ses tarifs ni sa suite historique. Celle-ci comporte des attentes tarifaires antérieures à l’affichage déjà présent dans editor.js et n’est pas déclarée réussie par cette mission.

Pour une prévisualisation protégée, un fichier temporaire `RANDAL_PREVIEW_AUTH_FILE` peut contenir une URL d’accès Vercel autorisée. Il doit rester hors du dépôt. Le test exige le même domaine et commence directement sur le configurateur ; aucune clé d’accès n’est inscrite dans les résultats.
