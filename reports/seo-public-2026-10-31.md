# SEO public LE ROY FACTORY — 31 octobre 2026

Le lot ajoute cinq présentations HTML indépendantes des moteurs 3D : agence et secteurs Languedoc/PACA, fabricants, ateliers RANDAL, PLAN & POSE/calepinage et guide de préparation carrelage. Les captures des deux démonstrations sont authentiques et présentées comme des projets numériques. Aucune agence locale, réalisation ni évaluation fictive n'est ajoutée.

L'accueil, Partenaires, Configurateurs et Contact relient ces contenus. Les titres et descriptions de l'accueil et des deux hubs sont actualisés. Le sélecteur RANDAL contient un lien vers le guide comparatif. Les liens canoniques manquants sont complétés sur Cersaie et Talox Kit ; la redirection historique Studio One conserve ses paramètres et son fragment, avec une canonical vers le wrapper actif.

Le sitemap utilise une liste explicite de 21 URL publiques, sans tarifs, CRM, comptes, commandes ni tests. Les dates de modification sont renseignées uniquement pour les pages réellement modifiées ; les anciennes dates non vérifiées sont omises. Les deux captures sont référencées dans le sitemap d'images. `scripts/update-seo-sitemap.py` permet de régénérer le fichier ; ne pas dater artificiellement toutes les pages au jour d'exécution.

Douze pages hors CRM reçoivent une directive noindex. Les exclusions robots internes sont complétées ; AGENTS.md est exclu de GitHub Pages. Une page 404 utile est ajoutée. Les radios invisibles du formulaire Contact sont limitées à 1 px pour éliminer leur débordement horizontal sans modifier les contrôles, le formulaire ou son envoi.

## Validation

- `npm ci --ignore-scripts --include=dev`.
- `npm run check:core` réussi.
- Tests PLAN & POSE, sécurité et accès aux tarifs : 331 réussis, 1 ignoré, 0 échec.
- `npm run build:site` réussi ; aucun workspace 3D concerné.
- `python3 scripts/check-public-seo.py` : 21 canonical publiques, cinq pages éditoriales, 152 liens/images locaux, code exécutable des 20 pages HTML existantes modifiées conservé.
- Revue indépendante : JSON-LD valide, H1 unique sur les nouvelles pages, liens et ancres résolus, aucune donnée privée introduite.
- Navigateur Chrome : cinq nouvelles pages et cinq pages existantes aux largeurs de cadre 1280, 390 et 360 px ; aucun débordement horizontal après correction Contact. FAQ native ouverte. Ce contrôle de largeur sous Chromium ne remplace ni Safari/iOS ni les appareils physiques.
- L'API PageSpeed a refusé la mesure publique pour quota dépassé ; aucun score inventé.

## Limites et séparation des accès

Robots.txt et les directives noindex ne sécurisent pas les fichiers et ne garantissent pas un retrait immédiat des moteurs. L'API des tarifs refuse bien un appel sans jeton ; des sources serveur testées sont exclues de l'hébergement public. Des statistiques historiques demeurent cependant dans des scripts statiques publics : leur migration authentifiée et le traitement des anciens commits doivent faire l'objet d'un lot distinct approuvé, en préservant le CRM. Aucun contenu ni mécanisme CRM n'est modifié ici.

Les présentations sont françaises. Les paramètres de langue des ateliers sont préservés ; aucune équivalence hreflang espagnole n'est déclarée pour une page dont le HTML reste français. Aucun traqueur, compte Analytics, fiche d'établissement, publication sociale ni tâche récurrente n'est créé.

## Publication

Branche dédiée, puis PR vers main. Suivre RELEASE.md : site via GitHub Pages, vérifier `suite-version.json` et les pages réellement servies après fusion. Le script release-impact doit sélectionner seulement `site`. Ne déclencher aucun déploiement Vercel pour ce lot. Le rapport de résultats et les données analytiques restent privés hors dépôt public.
