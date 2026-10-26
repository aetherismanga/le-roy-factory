# Correction des tarifs professionnels — 26 octobre 2026

## Cause exacte

Le commit `2fb73c5723251f029ae621f3dff429208cef0727` du 24 octobre a chiffré les grilles ELIOS/VIEW et introduit un chargement réservé aux seuls agents Firebase. Les sessions professionnelles LRF, déjà créées et validées par les fonctions Firebase, n'étaient pas prises en charge par cette API. Les consommateurs avaient également remplacé les droits par fabricant par un indicateur global d'accès agent.

## Correction

- L'API conserve la vérification Firebase des agents et accepte aussi les jetons opaques LRF existants, validés côté serveur auprès de `validateProSession`.
- Firebase revérifie le jeton, l'expiration/révocation et la fiche client actuelle. Les rôles et autorisations envoyés par le navigateur ne donnent aucun droit.
- La réponse contient uniquement les grilles des fabricants autorisés. Les documents agents restent exclus des réponses clients.
- Les composants ELIOS/VIEW utilisent une autorisation distincte par fabricant. Le cache privé reste en mémoire, expire et se renouvelle sans boucle et sans fermer une fiche VIEW lors d'un renouvellement normal.
- Une déconnexion efface immédiatement les grilles et les deux copies de session; les réponses tardives d'une ancienne session sont ignorées. Le retrait du jeton mémorisé dans un autre onglet efface aussi les prix.
- Les formats et les tarifs sources existants restent inchangés. Un tarif absent demeure « Sur demande ».

## Périmètre fabricants

| Fabricant | Parcours contrôlé | Résultat attendu validé localement |
|---|---|---|
| ELIOS | Fiche Azuli Mood 5×15 et 10×10 | Deux tarifs distincts selon le format; accès limité aux comptes autorisés |
| VIEW | Fiche produit et variante | Tarif correspondant; aucun enrichissement pour un compte seulement ELIOS |
| LA FENICE | PDF professionnel existant | PDF autorisé selon la fiche client; refus pour les autres comptes |

LA FENICE ne possède actuellement aucune grille de prix par produit dans la sélection; son parcours tarifaire passe par le PDF sécurisé. Aucun tarif ni catalogue supplémentaire n'a été inventé. L'audit des autres fabricants ne trouve pas de consommateur de la grille ELIOS/VIEW à réparer.

## Validation

Les comptes utilisés sont des comptes locaux synthétiques. Les véritables fonctions de création, hachage, validation et révocation des sessions s'exécutent sur un stockage de test. Le serveur tarifaire valide ces jetons à travers cette autorité; aucun authentifiant de production n'est utilisé ni contourné. Les montants des tests sont synthétiques.

- Tests serveur : identité client et agent, fabricants autorisés/interdits, rôles forgés, expiration, révocation, compte désactivé, modification des droits, reconnexion, documents agents, CORS et absence de cache public.
- Tests consommateurs/cache : formats Azuli indépendants, droits ELIOS/VIEW distincts, déconnexion immédiate, réponses tardives, renouvellement, changement de compte et déconnexion entre onglets.
- Tests navigateur : PC Chromium, Android Chromium (Pixel 5), iPhone WebKit (iPhone 13), avec les véritables scripts de catalogue et de prix et une autorité de sessions locale. Images/SDK agent et aperçu PDF remplacés uniquement par des doublures média dans ce banc d'essai.
- Construction du site et du Général; contrôles Général, noyau commun, PLAN & POSE et contrats de surfaces.
- Avant publication : API anonyme et document agent refusés avec 401; session inconnue refusée par Firebase avec 401; PDF ELIOS/VIEW/LA FENICE anonymes refusés avec 403.
- Le contrôle `scripts/check-professional-tariff-source.mjs`, exécuté dans l'environnement Vercel de construction, vérifie la disponibilité de la source chiffrée réelle et les deux clés Azuli sans afficher de montant ni de secret. Son échec doit bloquer la construction.

Un test navigateur préexistant de récupération legacy échoue dans son propre serveur local : chemin racine terminé par `/` entraînant des réponses 403, puis lecture d'un élément dans un `<details>` fermé. Les fichiers produit concernés sont identiques au baseline. Une copie temporaire du test avec son chemin normalisé et un clic utilisateur ouvrant le détail donne 12/12 réussis. Cette copie a été supprimée et le module de récupération n'est pas modifié.

Les vérifications positives authentifiées concernent les comptes de test locaux; aucune consultation d'un véritable compte client ou agent en production n'est prétendue. Les contrôles post-publication à effectuer sont la version des scripts publics, le nouvel endpoint et ses refus d'accès, ainsi que la disponibilité de la page.

## Publication

`leroyfactory.fr` est servi par GitHub Pages, avec les exclusions `_config.yml`; l'API est servie par le projet Vercel `randal-catalogue-general-3d` de l'équipe HUGOL TRADING. La mise à jour utilise un commit cohérent sur `main` et un seul déploiement Vercel du service Général. Aucun déploiement Studio One ni du projet Vercel de secours du site n'est nécessaire.

Aucune modification des fonctions Firebase, du CRM, des modèles/contrats 3D, des textures, des photographies, des catalogues de produits, des grilles chiffrées, des prix publics, des codes LRF ou des projets enregistrés.

## Fichiers

| Rôle | Fichiers |
|---|---|
| Serveur | `shared/lrf-server/agent-tariffs.mjs` |
| Cache et session | `assets/js/agent-tariffs.js`, `assets/js/pro-session-bridge.js`, `assets/js/tarifs-pro-client-access.js` |
| Affichage | `assets/js/inspirations-v2.js`, `assets/js/inspirations-elios-pricing.js`, `assets/js/inspirations-elios-thickness-overrides.js`, `assets/js/inspirations-view-mobile-safe.js`, `assets/js/inspirations-view-v1.js` |
| Versions de chargement | `assets/js/app.js`, `assets/js/selections-lazy-enhancements.js`, `scripts/public-agent-tariffs.mjs`, `univers.html`, `univers-ios.html`, `univers-elios-preview.html`, `tarifs-pro.html` |
| Contrôle de source | `scripts/check-professional-tariff-source.mjs`, `tests/pro-client-tariff-source.test.mjs` |
| Tests | `tests/secure-agent-tariffs.test.mjs`, `tests/pro-client-tariff-consumers.test.mjs`, `tests/pro-client-tariffs-browser.test.mjs`, `tests/pro-client-tariffs-server.test.mjs`, `tests/pro-client-tariffs-session.test.mjs`, `tests/pro-client-tariffs-ui.test.mjs`, `tests/fixtures/pro-client-session.mjs` |
| Rapport | `reports/tarifs-pro/correction-20261026.md` |
