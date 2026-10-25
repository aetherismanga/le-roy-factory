# CRM V2 — prévisualisation isolée

La prévisualisation est générée par `node scripts/build-crm-preview.mjs` dans `crm-preview/`.
Seul ce dossier doit être déployé. Ne pas déployer la racine du dépôt pour ces tests.

Les pages métier existantes et leurs extensions sont conservées ; dans la sortie uniquement :

- les imports Firebase sont remplacés par `crm-preview-sdk.mjs` ; aucune connexion Firebase n'est initialisée ;
- les fiches, partenaires associés, historiques, agenda et tournée proviennent de fixtures explicites « DÉMO » ;
- les sauvegardes persistent dans le stockage local du navigateur avec une clé propre à cette prévisualisation ;
- les données commerciales embarquées et les contacts réels sont remplacés par des fixtures ;
- les appels réseau externes sont bloqués par la garde et par une CSP, les formulaires externes sont interdits ;
- les mails, appels téléphoniques et liens externes sont interceptés ; aucun jeton d'authentification réel n'est disponible ;
- seuls les scripts/styles des bibliothèques CDN autorisées, les images des tuiles OpenStreetMap et les flux audio des quatre origines radio existantes peuvent être chargés ;
- la radio reste déclenchée volontairement, sans démarrage automatique ; les flux audio n’ouvrent aucun accès externe pour les appels API ;
- les portraits locaux de Jérôme et Coryne correspondent à l’identité fictive sélectionnée ; un portrait manquant n’est pas remplacé par le logo LRF ;
- aucune fonction backend, aucun configurateur, catalogue ou tarif n'entre dans le paquet de test.

Le bandeau « VERSION TEST » propose deux comptes fictifs, Jérôme et Coryne. Il ne s'agit pas de l'authentification de production. La protection Vercel doit être conservée ; le partage doit employer un lien temporaire autorisé.

`node --test tests/crm-v2/*.test.mjs` vérifie notamment l'isolation du paquet, les relations d'une fiche, l'atomicité des opérations locales et l'identité des comptes de démonstration.

Les adaptateurs locaux permettent de tester les parcours d'interface ; ils ne certifient ni les permissions Firestore réellement déployées ni le fonctionnement de Google Calendar, des mails, téléversements, géocodages ou calculs d'itinéraires externes. Ces intégrations restent à valider dans un véritable environnement de recette séparé.

Retour arrière : retirer la prévisualisation ou revenir au commit précédent de la branche de test. Aucune restauration de données de production n'est nécessaire car cette version n'y a pas accès. Pour réinitialiser les seules données fictives d'un navigateur, effacer la clé `lrf:crm-v2:fictional-store:v1` de ce domaine de prévisualisation.

## Contrôles navigateur de la version visuelle

Le contrôle automatisé utilise Chromium avec Playwright 1.55, sur les pages ouvertes directement (sans iframe). Les largeurs 320, 360, 390, 430, 844 en paysage et 1366 pixels couvrent les vingt rubriques. Il s’agit d’une **émulation de dimensions**, pas de tests sur de véritables appareils Android/iPhone ni du moteur Safari.

```sh
npm install
npx playwright install chromium
npm run test:crm                 # 132 contrôles logiques au 25 octobre 2026
npm run build:crm:preview
node tests/crm-v2/browser-vivant.cjs
```

Le script démarre son propre serveur local temporaire et écrit `reports/crm-v2/vivant-browser-results.json` ainsi que les captures `captures/*-vivant.png`. Il contrôle les dimensions du logo et de l’en-tête, les débordements, la navigation, la lisibilité des titres, les portraits des deux comptes, les onglets clients, la carte, la radio sans lecture automatique et l’absence de requêtes vers Firestore ou les services d’envoi. Un clic volontaire sur BFM Business vérifie séparément le chargement demandé du flux ; si le réseau de test ne permet pas de confirmer sa lecture, le rapport l’indique.

Un environnement disposant déjà de Playwright peut fournir `LRF_PLAYWRIGHT_MODULE` (chemin du module) et `CHROMIUM_EXECUTABLE` (binaire). `LRF_CDN_CACHE` peut pointer vers un dossier contenant les fichiers officiels `leaflet.js`, `leaflet.css` (Leaflet 1.9.4) et `fullcalendar.js` (FullCalendar 6.1.10). Sans ce cache, seules ces bibliothèques peuvent être récupérées depuis leurs CDN autorisés ; les services commerciaux et tuiles distantes restent bloqués dans ce test contrôlé.

Le flux Fun Radio redirige vers `https://streaming-ice.audiomeans.fr` (réponse HEAD 200 vérifiée le 25/10/2026) : seule cette origine média supplémentaire est autorisée, les requêtes API restent limitées à la même origine.
