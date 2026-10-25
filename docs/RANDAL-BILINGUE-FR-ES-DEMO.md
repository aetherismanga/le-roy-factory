# RANDAL — préparation bilingue FR/ES et démonstration Espagne

Statut : **spécification préparatoire, aucune traduction fonctionnelle encore livrée, aucun déploiement**.

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
