# Configurateurs : recherche métier et secteurs locaux

Demande de Jérôme : relier les recherches de configurateur de salle de bains 3D à Montpellier, Castelnau et Vendargues, et mieux représenter les secteurs commerciaux. Base : `0a116a66e4fb03522876be09d417f853bb3b2ed9`. Branche : `seo/configurateurs-local-20261031`.

## Constat et modifications

La présentation des configurateurs décrivait les fonctionnalités, avec un titre principal général. Les villes étaient citées uniquement dans la page régionale ; Castelnau-le-Lez n’y figurait pas.

Trois pages existantes sont enrichies :

- `configurateur-salle-de-bain-3d.html` : titre et H1 explicites, métadonnées synchronisées, simulation du carrelage et meuble sur mesure mieux nommés ; section Montpellier, Castelnau-le-Lez et Vendargues avec deux parcours utiles (préparation d’un projet / présentation aux clients), accès aux secteurs et contact pour une démonstration. Deux réponses de FAQ précisent l’usage depuis les autres départements et la validation professionnelle du projet.
- `agence-carrelage-languedoc-paca.html` : ajout de Castelnau-le-Lez et des numéros des sept départements déjà couverts ; section reliant ces secteurs à la conception 3D et au calepinage.
- `logiciel-calepinage-carrelage.html` : H1 descriptif et explication du passage du plan et des métrés à la salle de bains 3D, avec liens vers l’accompagnement et les secteurs.

Les outils sont accessibles en ligne depuis les autres régions. Les possibilités d’accompagnement commercial et de rendez-vous doivent être vérifiées selon la commune, le fabricant et l’équipe. Aucun showroom ni établissement local supplémentaire n’est annoncé.

## Expressions et intentions retenues

| Intention | Expressions travaillées | Page principale |
| --- | --- | --- |
| Concevoir une pièce | Configurateur salle de bain 3D ; conception salle de bains en ligne | Présentation 3D |
| Choisir le mobilier | Configurateur meuble de salle de bains sur mesure ; RANDAL Studio One | Présentation 3D |
| Comparer les matières | Simulation carrelage 3D ; visualisation salle de bains | Présentation 3D |
| Préparer les quantités | Logiciel calepinage carrelage ; calcul des métrés carrelage ; plan de salle de bains | Présentation PLAN & POSE |
| Obtenir un accompagnement | Conception de salle de bains 3D à Montpellier, Castelnau-le-Lez et Vendargues ; démonstration des configurateurs dans le secteur | Présentation 3D et page régionale |

Ce sont des intentions liées aux fonctionnalités réelles, pas un classement de volumes de recherche. Les formulations sont intégrées à des textes utiles ; toutes les variantes exactes ne sont pas répétées.

## Couverture commerciale décrite

| Département | Communes citées |
| --- | --- |
| Hérault (34) | Montpellier, Castelnau-le-Lez, Vendargues, Baillargues, Lunel, Béziers |
| Gard (30) | Nîmes |
| Aude (11) | Narbonne, Carcassonne |
| Pyrénées-Orientales (66) | Perpignan |
| Bouches-du-Rhône (13) | Marseille, Aix-en-Provence, Aubagne |
| Var (83) | Toulon, Hyères, Fréjus |
| Alpes-Maritimes (06) | Cannes, Antibes, Nice |

Soit 19 communes dans 7 départements. La mention existante des demandes en Corse est conservée. Cette liste ne constitue ni une implantation physique dans ces communes ni une promesse de rendez-vous ou de livraison partout en France. Elle n’est pas étendue automatiquement à tous les villages de tous les départements.

## Données et suivi

Source consultée : Search Console via Windsor.ai, propriété `sc-domain:leroyfactory.fr`. Période demandée : du 3 août au 30 octobre 2026 ; lignes de requêtes visibles retournées du 4 août au 29 octobre. Aucune requête de configurateur, salle de bains, calepinage ou des trois communes prioritaires ne figure dans cet extrait. Ce constat ne mesure pas les volumes du marché et ne démontre pas l’absence d’indexation. Les données détaillées du compte ne sont pas publiées dans ce rapport.

À suivre dans les rapports mensuels : impressions et clics des deux pages outils, requêtes contenant configurateur / salle de bain / 3D / calepinage, puis expressions géographiques observées. Conserver les données avant/après sur 28 et 90 jours et éviter de conclure à partir d’une seule recherche personnelle.

Références éditoriales : [Google Search Essentials](https://developers.google.com/search/docs/essentials), [guide SEO](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [règles sur les pages satellites et l’accumulation de mots-clés](https://developers.google.com/search/docs/essentials/spam-policies?hl=fr). Aucune position ni échéance de classement n’est garantie.

## Validation et publication

- Instructions AGENTS.md et RELEASE.md relues ; HEAD et PR ouvertes vérifiés avant le travail.
- `npm ci --ignore-scripts --include=dev`, `npm run check:core` : réussis.
- Tests PLAN & POSE, suite, sécurité, tarifs, impact, surfaces et identité RANDAL : 485 réussis, 1 ignoré, aucun échec.
- `npm run build:site` : réussi, 1 872 fichiers publics, périmètres privés exclus.
- `python3 scripts/check-public-seo.py` : réussi ; 133 URL canoniques, 163 références locales vérifiées, code exécutable des 3 pages conservé.
- Toutes les destinations de liens précédentes sont conservées ; JSON-LD valide, un H1 par page, canoniques inchangées et aucun script applicatif modifié.
- Contrôle visuel Chrome sur PC et dans des cadres de 768, 390, 360 et 320 pixels ; largeur de défilement égale à la largeur utile, sans débordement horizontal. Contrôle des trois sections ajoutées sur mobile et de l’ouverture de la FAQ.
- Ces contrôles responsive ne constituent pas un test sur un iPhone physique ou dans Safari.
- Aucun changement de l’accueil, du CRM, des moteurs 3D, des calculs, des catalogues ou des tarifs. Publication GitHub Pages uniquement, version `20261031-configurateurs-local-1` ; aucun déploiement Vercel nécessaire.
