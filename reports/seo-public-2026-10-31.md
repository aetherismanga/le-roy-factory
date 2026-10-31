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
- L'API PageSpeed a refusé la mesure pour quota dépassé. L'interface Google a ensuite produit la mesure initiale : 64/100 performance mobile, LCP 3,9 s, CLS 0,534 et TBT 0 ms ; score SEO automatique 100/100. Il ne s'agit pas de données terrain ni d'une promesse de position.
- Cette mesure a identifié un menu mobile visible avant l'arrivée de ses styles (0,500 de CLS). L'accueil masque le menu inactif dès le rendu initial et stabilise les dimensions des logos et la graisse du texte. Les deux feuilles mobiles restent chargées par les loaders existants afin de ne pas ajouter deux requêtes bloquantes avant le premier rendu. Les fonds WebP sont prioritaires. Menu ouvert/fermé et bascules clair/sombre retestés dans Chrome : fonctionnels, aucun débordement à 390 px. Aucun JavaScript modifié.

## Limites et séparation des accès

Robots.txt et les directives noindex ne sécurisent pas les fichiers et ne garantissent pas un retrait immédiat des moteurs. L'API des tarifs refuse bien un appel sans jeton ; des sources serveur testées sont exclues de l'hébergement public. Des statistiques historiques demeurent cependant dans des scripts statiques publics : leur migration authentifiée et le traitement des anciens commits doivent faire l'objet d'un lot distinct approuvé, en préservant le CRM. Aucun contenu ni mécanisme CRM n'est modifié ici.

Les présentations sont françaises. Les paramètres de langue des ateliers sont préservés ; aucune équivalence hreflang espagnole n'est déclarée pour une page dont le HTML reste français. Aucun traqueur, compte Analytics, fiche d'établissement, publication sociale ni tâche récurrente n'est créé.

## Publication

Branche dédiée, puis PR vers main. Suivre RELEASE.md : site via GitHub Pages, vérifier `suite-version.json` et les pages réellement servies après fusion. Le script release-impact doit sélectionner seulement `site`. Ne déclencher aucun déploiement Vercel pour ce lot. Le rapport de résultats et les données analytiques restent privés hors dépôt public.

## Mesure et ajustement après publication

Le premier contrôle du lot publié a donné CLS 0 mais LCP 8,5 s et score performance 62/100 (mesure de laboratoire, 31/10 à 07:45). Cette variation ne permet pas d'attribuer tout le délai à une cause unique. Les deux liens CSS mobiles ajoutés dans le head ont donc été retirés ; seuls les gardes critiques sont conservés, et les loaders JavaScript restent inchangés. Cette correction ciblée est regroupée dans une publication Pages complémentaire ; aucun atelier Vercel n'est redéployé.
