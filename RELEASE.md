# Publication de la suite LE ROY FACTORY

Les trois interfaces restent distinctes. Les sources actives sont désormais dans
`main` : site/PLAN & POSE à la racine, `studio-one/`, `randal-general/`, et le
noyau `shared/`. L'ancienne branche Studio reste conservée pour l'historique.

Le domaine `leroyfactory.fr` est actuellement servi par GitHub Pages (source
`main`, exclusions `_config.yml`), tandis que les deux ateliers sont sur Vercel.
Ne pas créer un déploiement du projet Vercel du site pour annoncer une mise à jour
du domaine principal : contrôler la publication Pages et le fichier de version.

## Vérifier puis publier un lot

1. Relire le HEAD actuel et les travaux parallèles. Ne pas écraser une branche.
2. Exécuter `npm ci --ignore-scripts --include=dev`.
3. Exécuter `npm run check:core`, les tests PLAN & POSE/sécurité puis les deux
   scripts `check` des workspaces concernés.
4. Construire les applications concernées avec `npm run build:site`,
   `npm run build:studio` et/ou `npm run build:general`.
5. Utiliser `node scripts/release-impact.mjs SHA_PRECEDENT SHA_VALIDE` pour
   sélectionner les projets. Une modification partagée peut nécessiter les trois.
6. Publier une seule fois le SHA testé pour chaque atelier Vercel concerné, dans
   l'équipe HUGOL TRADING, et vérifier Pages après la mise à jour de main.
   Les déclenchements Vercel Git automatiques sont désactivés ; le workflow
   qualité ne publie rien. Ne pas ajouter une seconde autorité de publication.
7. Contrôler l'alias réellement servi, `suite-version.json` pour le site,
   les API, les textures, la reprise et les transferts avant d'annoncer le résultat.

L'objectif est quelques lots consolidés, sans prévisualisation par commit.
Un Ignored Build Step seul n'économise pas le quota de créations Vercel.

## Cibles et protection des médias/données

- Site : publication GitHub Pages de `main` avec exclusions explicites ; la sortie
  `public-site` à liste autorisée permet aussi de valider le périmètre et conserve
  la compatibilité du projet Vercel de secours.
- Studio : racine `studio-one`, sortie `dist`.
- Général : racine `randal-general`, sortie `dist`.
- Les deux racines 3D doivent inclure les sources du parent pour `shared/` et
  installer les dépendances depuis la racine du monorepo.
- Le service de tarifs agent du site est servi par l'API du Général, avec
  vérification Firebase serveur et origines autorisées explicites. GitHub Pages
  n'exécute pas d'API Node.
- Les clés privées sont uniquement des Secrets Vercel, jamais des variables
  publiques ni des fichiers commités. Les données chiffrées restent côté serveur.
- Les originaux médias sont conservés. Les dérivés légers servent à l'édition ;
  l'export demande les meilleures variantes disponibles et échoue explicitement
  lorsque la qualité requise ne peut pas être obtenue.

## Accès privé de PLAN & POSE

La page `lrf-plan-pose.html` présente le chantier au public. Le serveur
`planPoseApplication` ne livre l’interface et son entrée exécutable qu’après
vérification du jeton Firebase révoquable de Jérôme. Le gabarit canonique est
`functions/plan-pose/application.html`, l’entrée canonique reste
`assets/js/lrf-plan-pose/app.mjs`, exclue de Pages et du build public. Avant tout
déploiement Functions, `node functions/scripts/prepare-plan-pose.cjs` prépare
la copie privée de cette entrée. La publication publique ne doit jamais inclure
ce fichier, même via un ancien cache du service worker.

## Retour arrière

Conserver SHA, manifestes, grilles privées chiffrées et versions de médias d'un
lot compatible. Restaurer un ensemble cohérent. Un ancien site qui exposait des
achats ne constitue pas une cible de retour acceptable. La reprise de projets
utilise les formats hérités et ne remplace pas automatiquement l'original.

La suppression des prix du nouvel état ne retire pas leurs anciennes copies des
commits publics ou des anciens déploiements. Leur traitement doit être concerté
séparément, sans réécriture destructive automatique de l'historique.

## Variante Neobath Anima de Studio One

Construire avec `node tools/build-neobath-anima.mjs`. Le manifeste privé conserve
les empreintes des huit ressources et des sources originales de Studio One.
Publier les deux `.js.gz` et les ressources de `studio-dist/`, jamais les bundles
JavaScript bruts sur le site public. La fonction décompresse puis vérifie leurs
empreintes avant livraison authentifiée.

Exécuter les tests `tests/neobath-anima-studio-*.test.mjs`,
`tests/neobath-anima-continuous-ui.test.mjs`, ainsi que les tests Anima de
`functions/test/`. Vérifier la sauvegarde native du formulaire dans l’iframe,
la navigation accueil/atelier, les couleurs et les photos chargées. Si WebGL
est indisponible dans l’environnement de QA, consigner cette limite et ne pas
annoncer une validation visuelle du rendu 3D.

Une modification exclusivement Anima ne doit déployer que la fonction
`neobathAnimaApplication` et les médias publics de Pages. Les deux configurateurs
Randal ne sont pas modifiés ni redéployés pour cette adaptation.

## Porte des showrooms LRF

Le mot de passe de la porte est vérifié par `/api/showroom-access` dans chaque
atelier. Définir `LRF_SHOWROOM_PASSWORD` et `LRF_SHOWROOM_SESSION_SECRET` comme
secrets de production des deux projets Vercel avant publication. La clé de
signature comporte au moins 32 octets ; une même clé permet de valider les
sessions entre ateliers. Aucun mot de passe ne doit entrer dans les sources,
les URL ou les projets sauvegardés. Les sessions signées expirent après huit
heures et sont vérifiées à chaque réouverture. Une configuration absente refuse
l'entrée. Le logo physique de la porte est copié depuis le fichier officiel
`assets/img/logo03lrf.png` lors des deux constructions.
