# RANDAL — préparation bilingue FR/ES et démonstration Espagne

Statut : **implémentation FR/ES effectuée sur la branche dédiée ; validation locale et prévisualisations consignées ci-dessous. Aucune publication en production.**

## Périmètre
- Applications actives : `studio-one/` et `randal-general/`.
- Code mutualisé : `shared/lrf-3d/`. Ne pas dupliquer les moteurs.
- Conserver les données, textures HD, modèles 3D, prix publics, code LRF, authentification, sauvegardes, transferts PLAN & POSE et performances mobiles.

## Contrat fonctionnel
1. Sélecteur discret `🇫🇷 Français / 🇪🇸 Español` accessible sur les deux ateliers, desktop et mobile, sans masquer les outils.
2. Locale `fr` par défaut ; `es` disponible. Changement instantané sans réinitialiser l'état 3D ; persistance locale par appareil.
3. Dictionnaires versionnés communs pour menus, aides, erreurs, calepinage, objets, outils, devis, export PDF et écran d'accueil ; clés propres aux ateliers dans leurs espaces respectifs.
4. Ne jamais traduire ni modifier les identifiants persistés, SKU, noms officiels de collections, codes de finitions, valeurs numériques, URLs de textures, paramètres de calcul, règles de prix ou format LRF.
5. Libellés métier espagnols validables par Juan Carlos ; fallback explicite vers le français pour clés absentes et rapport de couverture.
6. Prix publics et montants en EUR inchangés ; aucune fuite d'achat HT dans la démo ni dans les traductions.
7. Entrée de démonstration via URL avec `?lang=es&demo=randal` (chemin réel à déterminer après inspection du routeur), sans dupliquer les ateliers ; ne pas confondre le paramètre de démo avec une autorisation d'accès. Si démo publique, isoler les données client et masquer tout élément privé. Protéger l'accès selon le besoin validé.
8. Conserver la marque LE ROY FACTORY et l'attribution existante ; ne pas prétendre que RANDAL possède le logiciel.
9. Tester PC, Android et iPhone, rafraîchissement, changement de langue pendant un projet, chargement de projet ancien, sauvegarde, exports, calepinage, devis et régression du rendu.
10. Aucune publication ni merge automatique. Exécuter tests/builds et produire URL de prévisualisation vérifiée avant validation explicite.

## Plan d'implémentation
- Auditer les points d'entrée des deux ateliers et les composants partagés.
- Centraliser le service i18n, dictionnaires FR/ES, persistance et paramètres d'URL.
- Remplacer progressivement les chaînes visibles, sans toucher aux données métier.
- Intégrer le sélecteur dans les deux interfaces.
- Mettre en place l'entrée de démonstration espagnole et vérifier les protections.
- Faire les tests de non-régression et demander validation avant publication.

## Critères d'acceptation
- Les deux configurateurs fonctionnent dans les deux langues.
- Un projet créé en français s'ouvre identiquement en espagnol, et inversement.
- Un changement de langue ne modifie ni la géométrie, ni les prix, ni les références.
- Le lien espagnol ouvre les deux ateliers dans la langue souhaitée.
- Aucun changement en production sans accord.


## Implémentation réalisée

- Service commun `shared/lrf-3d/i18n/index.js`, dictionnaires français (textes sources) et espagnols centralisés : 2 327 entrées et 199 règles de libellés dynamiques.
- Sélecteur accessible sur les accueils et ateliers, adapté aux écrans de 320 px. Choix enregistré sous `lrf-ui-language-v1`, priorité à `lang=fr` ou `lang=es`, conservation dans les parcours entre ateliers.
- Traduction du texte et des attributs accessibles, sans recharger le canvas, recréer les objets Three.js ou modifier les états métier. Les valeurs implicites des options sont figées avant traduction. Le titre par défaut est choisi dans la langue courante uniquement à la création ; les titres des projets repris restent inchangés. Les favoris et accordéons utilisent une identité indépendante de la langue.
- Références, SKU, collections, données saisies et fichiers de projet conservent leurs valeurs. La langue seule ne déclenche pas d'autosauvegarde. Les anciens projets restent compatibles.
- Devis imprimables/PDF, libellés des relevés CSV et consignes photoréalistes localisés. Les exports JSON gardent leur schéma et leurs identifiants techniques pour la reprise et les échanges PLAN & POSE.
- Page commune `demo.html` en espagnol, avec identité LE ROY FACTORY et deux accès aux applications réelles. Les deux prévisualisations vérifiées sont reliées par les paramètres `studio` et `general`.
- Démonstration anonyme : stockage distinct préfixé `lrf-demo-randal-v1:`, aucune reprise de session client, aucun accès aux services commerciaux ou aux projets du compte, aucun code LRF privé affiché. Les autorisations serveur existantes restent inchangées.
- Les paramètres de démonstration ne sont jamais utilisés comme autorisation. L'application Maison externe ne s'ouvre pas depuis la démonstration pour ne pas quitter son contexte isolé ; les fonctions habituelles restent présentes hors démonstration.
- Un pont de préférence sur le site conserve la langue lors du retour à l’accueil ou au choix des configurateurs, puis de l’ouverture de l’autre atelier. Le message ne contient que `fr` ou `es` et exige l’origine et la fenêtre exactes de l’atelier ; aucun transfert de projet ou d’authentification. Un repli fonctionne si ce helper ne charge pas. Le CRM et PLAN & POSE ne sont pas modifiés.

## Vérifications reproductibles

```bash
npm ci --ignore-scripts --include=dev
npm run build:studio
npm run build:general
npm run check:core
npm run check --workspace=studio-one-atelier-3d
npm run check --workspace=randal-general-3d
node --test tests/security/*.test.mjs tests/secure-agent-tariffs.test.mjs tests/lrf-plan-pose/*.test.mjs tests/lrf-suite/i18n-runtime.test.mjs tests/lrf-suite/opening-scene.test.mjs
node shared/lrf-3d/qa/demo-isolation-check.mjs
node shared/lrf-3d/qa/i18n-navigation-check.mjs
node shared/lrf-3d/qa/i18n-coverage-check.mjs
node shared/lrf-3d/qa/i18n-browser-check.mjs
node shared/lrf-3d/qa/i18n-csv-browser-check.mjs
```

Le contrôle de couverture examine les quatre pages HTML actives, leurs attributs d'accessibilité et les fragments d'interface des sources JS. Les noms officiels et données de projet sont intentionnellement exclus de la traduction. Le repli reste le français pour une future clé absente.

Les scénarios navigateur utilisent Chromium sur ordinateur, un profil Android Pixel 5 et Safari WebKit avec profil iPhone 13. Ils ne constituent pas un essai sur des téléphones physiques. Les comptes et références LRF des tests sont des données synthétiques ; aucun compte client réel n'est utilisé.

Aucune traduction manquante connue dans les parcours contrôlés. La terminologie sectorielle peut être relue par Juan Carlos avant sa présentation, notamment «despiece», «casco», «hornacina» et «bastidor».

## Livraison

Les deux prévisualisations finales sont vérifiées. La branche reste indépendante de `main` ; aucune fusion ni publication en production n’a été effectuée.


### Résultats locaux du lot

- Builds Studio One et Catalogue Général : réussis.
- Noyau mutualisé, batterie Studio One et batterie Catalogue Général : réussis ; géométries, HD, options, références et tarifs publics conservés.
- Sécurité, références LRF, transferts et invariants PLAN & POSE, tests i18n : 329 réussis, aucun échec, 1 ancien scénario navigateur de récupération ignoré par sa propre détection du navigateur local. Les nouveaux scénarios Playwright ont bien été exécutés séparément.
- Parcours réels des deux ateliers sur les trois profils navigateur : 48 blocs réussis, aucune erreur JavaScript. Composition complète, changement FR/ES en cours, même renderer, quantités et données exactes, sauvegarde et reprise dans l'autre langue, tous les inspecteurs, calepinage, plan, devis imprimable, exports JSON et isolation démo contrôlés.
- Audit de couverture approfondi : 2 327 traductions, 199 règles dynamiques, 4 HTML et 1 028 nœuds ; Acorn 8.15.0 inspecte 259 sources et 316 842 nœuds AST. DOMParser examine 463 fragments HTML générés et leurs 1 834 textes/attributs, parmi 2 957 candidats UI. Aucune omission ni erreur de parsing détectée. 58 cas dynamiques et 12 invariants vérifiés. Le retrait volontaire d'une traduction HTML fait bien échouer cet audit.
- Scénarios séparés d'isolation démo et de navigation inter-ateliers : réussis.

- Exports CSV réels : 2/2 réussis (français/espagnol sur les deux ateliers), libellés localisés et chiffres, fabricants, collections, formats et références identiques. Total des nouveaux blocs navigateur : 50 réussis.


### Contrôle distant du lot bilingue initial

Le SHA du lot bilingue initial vérifié et déployé est `1e9c3184401f16103e1161d79e08f820f38ddbf7`. Les deux builds Vercel sont `READY`, cible prévisualisation (`target: null`).

- Contrôles réels finaux : 12/12 réussis, sans mocks, sur PC et iPhone WebKit simulé.
- Photos, textures Stone Icon et finitions des meubles réellement chargées ; rendu contrôlé après stabilisation.
- Changement FR/ES, ajout de meuble, reprise du projet de démonstration et absence d’accès aux API privées vérifiés.
- Aucune erreur JavaScript, aucune réponse HTTP ≥ 400, aucune erreur CORS des médias actifs. Les annulations de vignettes pendant les changements de page ne concernent pas les matériaux utilisés dans la scène.
- Notices Sol/Mur et aides générées entièrement en espagnol dans les contextes contrôlés ; aucune traduction restante identifiée.
- Barre Vercel absente des deux prévisualisations. La variable `VERCEL_PREVIEW_FEEDBACK_ENABLED=0` est limitée aux prévisualisations Studio One et à la branche de démonstration en prévisualisation du Catalogue Général. Aucun paramètre de production, aucune protection d’accès et aucun secret ne sont modifiés.

Le pont de préférence côté site est préparé dans cette branche et testé ; son déploiement sur le site principal attend l’autorisation de publication du lot. Les liens de démonstration fonctionnent directement entre les deux prévisualisations.

### Présentation photoréaliste — 26 octobre 2026

À la demande de Jérôme, la page commune de présentation a été retravaillée :
visuels photoréalistes bois et blanc à partir des deux compositions publiques,
images plus grandes, hiérarchie typographique plus lisible, crème/anthracite/doré,
accès aux deux logiciels et pied de page LE ROY FACTORY conservés. Les images
sont identifiées comme visuels d'inspiration ; elles ne remplacent aucun média
fabricant ni aucun rendu de scène. Les WebP adaptatifs pèsent ensemble environ
65 Ko en petit format, 246 Ko en grand format. Leur provenance et la direction
des prompts sont décrites dans `shared/lrf-3d/demo/ASSETS.md`.

SHA de code testé : `91bf54f6c0a0e5b8c8f3744fdb157a928caaa69b`.
Deux prévisualisations Vercel créées pour ce lot, toutes deux `READY`,
`target: null` : Studio One `dpl_6FFKKwKtKKgJczxCAiRNx512oWAc`, Catalogue Général
`dpl_Gccwv3sJBUCMTr8U7Yx1eeYU2Kfj`. Aucune publication de production.

- Builds des deux applications, noyau partagé et deux batteries de contrôles : réussis.
- Sécurité, PLAN & POSE et tests i18n existants relancés : 329 réussis, zéro échec,
  un ancien scénario navigateur ignoré par sa détection locale.
- Isolation et navigation de démonstration : contrôles réussis.
- Page locale : 10/10 profils réussis, les deux variantes à 1440, 768, 390,
  320 px et iPhone WebKit simulé ; captures visuellement contrôlées.
- Contraste des petits textes au moins 4,79:1 ; boutons de 49 px ; aucun débordement.
- Vérifications distantes sans mocks : 8/8 réussies. Six pages/profils PC,
  Android Pixel 5 simulé et iPhone WebKit simulé, plus les deux accès réels
  aux accueils anonymes en espagnol. HTML servi identique aux fichiers testés,
  12 images téléchargées HTTP 200 avec empreintes exactes des quatre variantes.
- Aucune erreur JavaScript, réponse HTTP ≥ 400, barre Vercel ou requête API privée.
- Le script de navigation de la page est inchangé. Les 17 bundles JS/CSS des
  configurateurs sont strictement identiques au lot bilingue précédent ; aucune
  donnée, texture 3D, géométrie, option, référence, règle tarifaire ou sauvegarde modifiée.

Les liens ci-dessous remplacent ceux de la première présentation.

### Export photoréaliste en un seul fichier — 26 octobre 2026

Correctif demandé après la présentation : le téléchargement principal fournit
maintenant un seul PNG contenant la capture HD d'origine, suivie des consignes
complètes lisibles dans l'image. Le texte est dessiné sous la scène, sans
recouvrement ni redimensionnement de la capture et sans dépendre de métadonnées
PNG. Seuls les espaces de présentation JSON sont compactés ; toutes les valeurs
techniques et les descriptions fabricant restent dans les instructions.

Parcours : « Télécharger l’image avec les consignes », puis joindre ce fichier
à ChatGPT. Aucune copie séparée du prompt n'est nécessaire. Le lien ChatGPT
ouvre le service ; la pièce jointe reste ajoutée par l'utilisateur. Les anciens
boutons de téléchargement HD seul et de copie des consignes sont conservés
sous les options avancées. Sur un projet dépassant les limites de taille du
canevas, un message explicite propose ces options, sans tronquer les consignes.

Le fichier suit la langue FR/ES. Un changement de langue dans le dialogue
régénère le PNG et révoque son ancienne URL locale sans refaire la capture,
modifier le projet ni appeler un service externe. Les filtres de confidentialité
préexistants sont conservés ; aucune information client ou tarif d'achat ajouté.

SHA de code : `c43d225f2f0f1e6f15845efebe4fa69aae0dcb53`.
Prévisualisations `READY`, cible `null` :
Studio One `dpl_F4NQPmdmDRPsAivvVdzy6fAocPkr`,
Catalogue Général `dpl_72BWKbk7NBqUcqbSibyezX9UtKDN`.

- Builds, contrôles du noyau et batteries des deux ateliers : réussis.
- Audit de traduction : aucune omission identifiée ; 12 nouveaux libellés ES.
- Sécurité, PLAN & POSE, i18n et consignes de construction : 326 tests réussis,
  aucun échec, un ancien scénario navigateur ignoré par sa détection locale.
- Exports photoréalistes métier Studio One/Général, isolation et navigation : réussis.
- Nouveau test permanent `shared/lrf-3d/qa/photoreal-handoff-browser-check.mjs` :
  12/12, deux ateliers en FR/ES sur PC, Android Pixel 5 et iPhone WebKit simulés.
  PNG effectivement téléchargés, image conservée, prompt visible dans la bonne
  langue, références inchangées, sentinelles privées exclues, projet identique,
  langue modifiable sans recapture. Aucune erreur JavaScript ni requête externe.
- Parcours distants réels sans mocks : 8/8, deux vrais ateliers en FR/ES sur
  ordinateur et iPhone WebKit simulé. Téléchargement du fichier unique réussi ;
  égalité exacte de tous les pixels de la partie scène avec l'original HD.
  Huit PNG de largeur 1920 pixels, consignes intégrées, environ 2,3 à 2,5 Mo.
  Projet inchangé ; aucune erreur JavaScript, HTTP ≥ 400 ou requête API privée.
- Pas d'essai sur téléphone physique et pas d'envoi automatique à ChatGPT.

Le correctif français pour le site principal est préparé dans la même source
commune, mais reste en attente d'autorisation explicite de publication.
La production et `main` ne sont pas modifiés.

### Liens vérifiés — présentation photoréaliste

- [Démonstration espagnole pour Juan Carlos — les deux ateliers](https://studio-one-beta-test-v2-a0vlbylwo-hugol-trading.vercel.app/demo.html?studio=https%3A%2F%2Fstudio-one-beta-test-v2-a0vlbylwo-hugol-trading.vercel.app&general=https%3A%2F%2Frandal-catalogue-general-3d-l7ueyrz8w-hugol-trading.vercel.app)
- [STUDIO ONE en espagnol](https://studio-one-beta-test-v2-a0vlbylwo-hugol-trading.vercel.app/index.html?lang=es&demo=randal&studio=https%3A%2F%2Fstudio-one-beta-test-v2-a0vlbylwo-hugol-trading.vercel.app&general=https%3A%2F%2Frandal-catalogue-general-3d-l7ueyrz8w-hugol-trading.vercel.app)
- [Catalogue Général en espagnol](https://randal-catalogue-general-3d-l7ueyrz8w-hugol-trading.vercel.app/index.html?lang=es&demo=randal&studio=https%3A%2F%2Fstudio-one-beta-test-v2-a0vlbylwo-hugol-trading.vercel.app&general=https%3A%2F%2Frandal-catalogue-general-3d-l7ueyrz8w-hugol-trading.vercel.app)

### Production préservée

Les alias publics des deux configurateurs continuent de servir le commit antérieur `d206ee4097ca94d4c5f5cc3ffcd7702065dee856` : `dpl_AcC6Rd1JV8BH2dXE71i1j4b8mgkZ` pour Studio One et `dpl_4SnyRuZKumvc8nARkRx84bQFeRQp` pour le Catalogue Général. Aucun commit n’est poussé sur `main`. Le CRM et PLAN & POSE sont inchangés.
