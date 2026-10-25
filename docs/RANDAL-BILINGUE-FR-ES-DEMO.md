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

- Service commun `shared/lrf-3d/i18n/index.js`, dictionnaires français (textes sources) et espagnols centralisés : 2 281 entrées et 153 règles de libellés dynamiques.
- Sélecteur accessible sur les accueils et ateliers, adapté aux écrans de 320 px. Choix enregistré sous `lrf-ui-language-v1`, priorité à `lang=fr` ou `lang=es`, conservation dans les parcours entre ateliers.
- Traduction du texte et des attributs accessibles, sans recharger le canvas, recréer les objets Three.js ou modifier les états métier. Les valeurs implicites des options sont figées avant traduction. Les favoris et accordéons utilisent une identité indépendante de la langue.
- Références, SKU, collections, données saisies et fichiers de projet conservent leurs valeurs. La langue seule ne déclenche pas d'autosauvegarde. Les anciens projets restent compatibles.
- Devis imprimables/PDF, libellés des relevés CSV et consignes photoréalistes localisés. Les exports JSON gardent leur schéma et leurs identifiants techniques pour la reprise et les échanges PLAN & POSE.
- Page commune `demo.html` en espagnol, avec identité LE ROY FACTORY et deux accès aux applications réelles. Les deux prévisualisations vérifiées sont reliées par les paramètres `studio` et `general`.
- Démonstration anonyme : stockage distinct préfixé `lrf-demo-randal-v1:`, aucune reprise de session client, aucun accès aux services commerciaux ou aux projets du compte, aucun code LRF privé affiché. Les autorisations serveur existantes restent inchangées.
- Les paramètres de démonstration ne sont jamais utilisés comme autorisation. L'application Maison externe ne s'ouvre pas depuis la démonstration pour ne pas quitter son contexte isolé ; les fonctions habituelles restent présentes hors démonstration.
- Les wrappers du site ne transmettent que les valeurs `fr` et `es`. Le CRM et PLAN & POSE ne sont pas modifiés.

## Vérifications reproductibles

```bash
npm ci --ignore-scripts --include=dev
npm run build:studio
npm run build:general
npm run check:core
npm run check --workspace=studio-one-atelier-3d
npm run check --workspace=randal-general-3d
node --test tests/security/*.test.mjs tests/secure-agent-tariffs.test.mjs tests/lrf-plan-pose/*.test.mjs tests/lrf-suite/i18n-runtime.test.mjs
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

Les résultats définitifs et les URL vérifiées sont ajoutés après validation des deux prévisualisations. La branche reste indépendante de `main` et aucune fusion ni publication en production n'est autorisée par cette mission.


### Résultats locaux du lot

- Builds Studio One et Catalogue Général : réussis.
- Noyau mutualisé, batterie Studio One et batterie Catalogue Général : réussis ; géométries, HD, options, références et tarifs publics conservés.
- Sécurité, références LRF, transferts et invariants PLAN & POSE, tests i18n : 323 réussis, aucun échec, 1 ancien scénario navigateur de récupération ignoré par sa propre détection du navigateur local. Les nouveaux scénarios Playwright ont bien été exécutés séparément.
- Parcours réels des deux ateliers sur les trois profils navigateur : 48 blocs réussis, aucune erreur JavaScript. Composition complète, changement FR/ES en cours, même renderer, quantités et données exactes, sauvegarde et reprise dans l'autre langue, tous les inspecteurs, despiece, plan, devis imprimable, exports JSON et isolation démo contrôlés.
- Audit de couverture : 2 281 traductions, 153 règles dynamiques, 4 HTML, 1 028 nœuds, 259 sources JS, 1 853 fragments d'interface examinés ; aucune omission détectée dans ce périmètre.
- Scénarios séparés d'isolation démo et de navigation inter-ateliers : réussis.

- Exports CSV réels : 2/2 réussis (français/espagnol sur les deux ateliers), libellés localisés et chiffres, fabricants, collections, formats et références identiques. Total des nouveaux blocs navigateur : 50 réussis.
