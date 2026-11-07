# LRF PHOTO STUDIO — réception du 7 novembre 2026

Version du produit contrôlée : `ec094145f04d39e5b4cd24cbff30e1d1405d2937`, branche `feature/lrf-photo-studio-20261106`. La prévisualisation de réception `23e1d298cb7807b4314b8e87f860c963d8aa094c` reprend cette version sans changer son moteur ni son interface ; elle ajoute seulement un banc de contrôle et deux photos sous licence, sur `test/lrf-photo-studio-reception-20261107`.

**Statut : application développée, prévisualisation accessible, réception complète non acquise. Aucune publication en production.** La Fenice et les autres variantes dépourvues de faces fiables restent bloquées ; les essais physiques et le téléchargement final restent à valider. Les travaux supplémentaires présents dans le checkout principal ont été conservés séparément ; ils ne sont pas inclus dans cette prévisualisation contrôlée.

## Réalisé et vérifié

- Les 55 tests Photo Studio de la version exacte `ec094145` passent : import borné, homographie, unités, masques et meubles protégés, poses, annulation, segmentation, catalogue, provenance, couverture, compression et préparation du build.
- Commande exécutée dans un worktree isolé : `node --test tests/photo-studio*.test.mjs tests/photo-studio/*.test.mjs`. Résultat : 55 réussis, aucun échec, aucun ignoré.
- Déploiement Vercel de réception `dpl_FxqWmegqkWBMvDMexJjT7esC7Een` : `READY`, environnement Preview (`target: null`), commit `23e1d298`. Le domaine public et la branche de production n'ont pas été modifiés.
- L'accueil et le vrai logo sont visibles dans Chrome distant. L'import par le champ réel via le banc de contrôle a affiché une photo JPEG de 1 920 × 1 440 et lancé le panneau d'analyse locale. Aucun masque, état interne ou rendu factice n'a été injecté.
- Les fichiers, la photo et les dépendances sont servis par la même origine. Les prix ne font pas partie du manifeste Photo Studio. Le banc de contrôle et ses photos ne sont copiés que si `VERCEL_ENV=preview` ; ils restent exclus d'un build de production.

## Limite constatée pendant cette nouvelle session

Après le lancement réel de l'analyse dans l'iframe de contrôle, l'onglet est devenu inaccessible aux commandes CDP : `Emulation.setFocusEmulationEnabled timed out`. La cause n'est pas déterminée. Un nouvel onglet affichant l'accueil reste accessible. Cette exécution ne prouve donc **ni un rendu final réussi, ni une régression certaine du moteur** ; elle ne doit pas être comptée comme un parcours complet réussi. Le transfert de fichiers par l'outil distant avait également bloqué auparavant.

L'export, sa récupération sur disque, la reprise complète et le cas négatif n'ont pas pu être revalidés de bout en bout dans cette nouvelle session. Le rapport de la version précédente, conservé dans [PHOTO_STUDIO_TEST_REPORT.md](PHOTO_STUDIO_TEST_REPORT.md), contient ses propres essais Chrome/WASM, l'aperçu JPEG redécodé et la reprise IndexedDB, avec leur portée. Les six scènes navigateur et le cas sans sol sont détaillés dans `reports/photo-studio/browser-results.json`. Ne pas confondre ces preuves antérieures avec les essais interrompus de cette session.

## Catalogue de cette prévisualisation

| Fabricant | Enregistrements recensés | Variantes applicables vérifiées |
|---|---:|---:|
| Elios | 916 SKU canoniques | 18 : 8 Quercia, 10 Slate 60 × 120 |
| View | 390 SKU canoniques | 106 |
| La Fenice | 483 coloris/collections, pas des SKU exacts | 0 |

Les 1 306 identités Elios/View sont consultables. Les 124 variantes applicables disposent de visuels rapprochés à leur identité ; les autres restent bloquées avec leur motif. Slate signale sa définition native limitée. Les sources des autres fabricants, motifs, usages et images insuffisantes sont inventoriées dans `reports/photo-studio/coverage.json` ; aucun produit ou format n'a été inventé. Voir [PHOTO_STUDIO_CATALOGUE.md](PHOTO_STUDIO_CATALOGUE.md) et [PHOTO_STUDIO_FENICE_AUDIT.md](PHOTO_STUDIO_FENICE_AUDIT.md).

## Modèle et méthode

DETR panoptique, source et poids sous Apache-2.0, conversion déterministe des seuls poids (44 270 443 octets), runtime Transformers.js 3.8.1/ONNX Runtime WASM mono-thread. Empreintes contrôlées au build ; aucun WebGPU requis. La photo est traitée localement. Le modèle peut manquer des sols, tapis ou détails fins : confirmation et correction manuelle restent nécessaires. Voir [PHOTO_STUDIO_MODEL.md](PHOTO_STUDIO_MODEL.md) pour les références exactes, licences, empreintes et limites ; [PHOTO_STUDIO_RENDERING.md](PHOTO_STUDIO_RENDERING.md) pour le rendu et ses unités.

## Fichiers ajoutés pour cette réception

- `tests/photo-studio/browser-qa.html` : contrôle DOM du vrai import, observation du vrai résultat et vérification des octets du JPEG réellement exporté ; pas de substitution du moteur.
- `tests/fixtures/photo-studio/room.jpg`, `no-floor.jpg`, `NOTICE.md` : crédits aismallard / CC BY-SA 3.0 et Shixart1985 / CC BY 2.0, sources et transformations documentées.
- `scripts/build-photo-studio-site.mjs` : copie conditionnelle du seul banc de contrôle en Preview.
- `reports/photo-studio/reception-preview.jpg` : capture de l'accueil effectivement visible ; ce n'est pas une preuve de simulation achevée.

## Lancement et publication

```sh
node scripts/fetch-photo-studio-model.mjs
node --test tests/photo-studio*.test.mjs tests/photo-studio/*.test.mjs
node scripts/build-photo-studio-site.mjs
```

Le dossier généré est `public-site`. Le catalogue se régénère au build ; les poids sont téléchargés puis vérifiés, pas chargés sur la page Configurateurs. Pour le banc de contrôle uniquement : construire avec `VERCEL_ENV=preview`, puis ouvrir `/__photo-studio-qa/index.html`.

Les essais physiques Android/Chrome et iPhone/Safari restent non exécutés. La caméra, le partage natif, le HEIC, le stockage limité et le téléchargement du JPEG doivent être contrôlés sur ces appareils avant de déclarer la réception complète. La production attend l'accord explicite de Jérôme et une vérification de l'artefact Pages avec les dépendances générées. Voir [PHOTO_STUDIO_RELEASE.md](PHOTO_STUDIO_RELEASE.md) pour la publication et le retour arrière, sans réinitialiser les autres outils ou données.
