# Contrôle des ateliers RANDAL — 21 octobre 2026

Les deux applications conservent leurs catalogues et leurs grilles tarifaires distincts. Le contrôleur de projets est commun à la sélection, à la composition 3D et aux plans maison. Les comptes et prix d’achat passent par la vérification serveur existante ; aucune remise du catalogue général n’est déduite de celle de STUDIO ONE.

## Tests

- `node --test functions/test/configurator-projects.test.cjs tests/randal-workspace/project-sync.test.mjs` : propriétaires, références de projet, révisions, suppression définitive, protection des commandes, envoi simulé et reprise d’un enregistrement au changement de page.
- `npm run check` dans chacun des deux configurateurs : géométrie, produits, tarifs, commandes et surfaces.
- `node qa/empty-templates-check.mjs`, `npm run check:workshop` et `npm run check:arrangement` dans la maison : quatre plans, surfaces, ouvertures, mobilier et conservation de la maison témoin originale.
- `browser.mjs` : sélection → sauvegarde client → 3D → récapitulatif → validation → duplication ; import nommé, suppression, connexion depuis le site, plans vides et édition d’une maison.
- `avatars-browser.mjs` : les deux personnages existants, les deux vues et les déplacements avec de véritables événements tactiles dans chaque configurateur.
- `STUDIO_PROJECT_ROOT=/chemin/studio-work node --test tests/randal-workspace/{account-presentation,identity-state,client-auth}.test.mjs` : référence d’achat vérifiée `LRF-00003-220-00`, codes postaux, réponses de connexion reçues dans le désordre et conservation du dernier compte authentifié.
- `account-projects-browser.mjs` : véritables scripts de session et passerelle du site, API commerciale réelle avec validation amont simulée et lente, cookies tiers absents, ancien marqueur de déconnexion, passage sélection → 3D, aperçus enregistrés et cartes de projets sur mobile. Une ancienne commande sans image affiche son propre plan sauvegardé.

Les scénarios navigateur servent les builds locaux sur leurs origines de production et simulent les réponses de compte/projet. Les matières et modèles sont les ressources réelles. Ils ne créent aucun dossier de client réel et n’envoient aucun e-mail réel. Le workflow Firebase vérifie séparément l’édition de la base existante et le refus des appels anonymes après déploiement.

Variables du lanceur navigateur : `WORKSPACE_ROOT`, ou chemins explicites `STUDIO_DIR`, `GENERAL_DIR`, `HOUSE_DIR`, `SITE_DIR`. `QA_OUTPUT` choisit le dossier des captures et résultats. Le moteur Chromium est lancé en mode logiciel pour le contrôle fonctionnel ; ces résultats ne sont pas une mesure des performances du PC client.

## Publication et retour arrière

STUDIO ONE conserve sa branche dédiée. Le site et le catalogue général restent sur `main`. Les plans maison utilisent la branche indépendante de la maison, avec un paramètre de contexte ; sans ce paramètre, la maison témoin meublée reste le comportement initial. Les ressources d’avatar sont partagées depuis cette application et ne sont pas dupliquées.

Un projet validé est immuable dans le service serveur. Un projet supprimé laisse seulement un identifiant de suppression, sans géométrie ni données de client : un ancien enregistrement automatique ne peut pas le recréer. Les copies importées ou dupliquées reçoivent toujours une nouvelle identité.
