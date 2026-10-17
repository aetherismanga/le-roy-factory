# RANDAL Catalogue général — livraison du 17 octobre 2026

La refonte du Catalogue général est publiée sur [leroyfactory.fr/randal-configurateur.html](https://leroyfactory.fr/randal-configurateur.html). La révision applicative vérifiée est [`24749025`](https://github.com/aetherismanga/le-roy-factory/commit/24749025caf9cd2736e63f0dad53b3dc996c22bc). Le domaine existant est servi par **GitHub Pages**, dont le déploiement de cette révision a réussi. Son HTML et les 16 fichiers de code, style et textures contrôlés sont identiques aux fichiers du dépôt : [vérification publique](public-verification.json).

**La mission ne peut pas être déclarée entièrement validée : le déploiement final Vercel reste bloqué.** Vercel a refusé la création avec HTTP 402, `api-deployments-free-per-day`, plus de 100 déploiements dans la journée et délai annoncé de 24 heures. Aucun forfait, DNS, réglage de protection ou compte n'a été modifié pour contourner cette limite. Le domaine public fonctionnel et ce déploiement Vercel manquant sont deux constats distincts. [État et réponse Vercel](vercel-status.json).

## Conservation et protection

- 11 collections et 22 types de produits conservés : Harmony, Luce, Brent, Aruba rainuré, Aruba, Aras, Boreal, Brunei, Amat, Less et Sima.
- 431 entrées tarifaires comparées avant/après, **431 identiques, 0 modification**. [Comparaison complète](price-comparison.json), [relevé initial](baseline-prices.json). La formule d'affichage déjà présente avant intervention reste inchangée ; aucune nouvelle conversion n'a été ajoutée, aucun tarif du PDF n'a remplacé un montant existant. Les prix affichés portent le symbole € sans mention HT/TTC.
- Données intégrales initiales archivées dans [baseline-data.json](baseline-data.json) ; script initial dans [original-configurator.js](original-configurator.js). Les tableaux conservés sont comparés automatiquement aux données d'origine, hormis la réaffectation documentée des noms Neris/Torne à leurs références officielles.
- Sauvegarde Git : [backup/randal-catalogue-before-20261017](https://github.com/aetherismanga/le-roy-factory/tree/backup/randal-catalogue-before-20261017), base `b23f1344b90e8358dce386d42f462a6023bb5341`. Travail isolé sur [refactor/randal-catalogue-general-20261017](https://github.com/aetherismanga/le-roy-factory/tree/refactor/randal-catalogue-general-20261017), puis intégré à main.
- Aucun fichier STUDIO ONE ni fichier partagé n'a été modifié par la refonte Catalogue. Les 16 empreintes protégées sont vérifiées. Pendant l'intervention, main a reçu le commit externe [`f90a260`](https://github.com/aetherismanga/le-roy-factory/commit/f90a260ac29cd53720efdd4733521da5216c235a) sur le placement STUDIO ONE ; il a été conservé intégralement. Le contrôle d'intégration utilise cette base amont, tout en gardant le relevé initial : [manifest initial](protected-files.json), [manifest amont](protected-upstream.json).

## Audit du catalogue et décisions

Le PDF RANDAL V04 fourni contient 43 pages. Les 431 entrées tarifaires existantes renvoient à des références retrouvées dans le texte du document. Le [tableau de correspondance](catalogue-correspondence.csv) précise, par entrée, les pages retrouvées et le statut de conservation. Cette présence textuelle ne remplace pas une certification fabricant de toutes les associations commerciales. L'[audit détaillé](AUDIT.md) conserve l'inventaire des collections, formats, finitions, vasques, plateaux, miroirs et dépendances.

| Bug ou incohérence | Cause | Correction et contrôle |
|---|---|---|
| Déplacement perturbé après ajout d'une colonne | Objets reconstruits et sélection dépendante de groupes/types globaux | Identifiants permanents, positions dans le modèle de composition, sélection et déplacement indépendants ; essai réel du pointeur avec meuble et colonne |
| Superpositions et quantités différentes entre scène et devis | Placement sans validation d'encombrement ; nombre de clones 3D limité | Volumes par élément, ajout atomique avec recherche de place, contrôle des voisins après changement de format ; une instance par exemplaire |
| Finitions et accessoires modifiant d'autres éléments | Configuration globale utilisée pour plusieurs objets | Source par meuble et miroir, duplication indépendante, accessoires rattachés au bon meuble |
| Retour aux premières étapes et perte de choix compatibles | Réinitialisation forcée du brouillon | Précédent/suivant et étapes accessibles, conservation des sélections encore valides |
| Neris/Torne interverties | Tables des deux noms inversées | Dessin p.41 : Neris ovale 46 × 33 × 14, réf. 9567/11371 ; Torne ronde Ø37 × 12, réf. 9559/10444 ; tarifs existants par référence conservés |
| Colonne Luce mal proportionnée | Largeur/profondeur inversées | 25 × 165 × 30 cm, p.9 |
| Harmony 120 dessiné comme un caisson 120 | Largeur commerciale appliquée à la géométrie | Caisson réel 119 cm, vasque/plateau 120 séparément, p.4–5 ; identité tarifaire historique conservée |
| Boreal 79 sans vasque compatible | Recherche sur la largeur caisson au lieu du plan 80 | Caisson 79 avec vasque 80 confirmée ; aucun plateau 79 inventé |
| Less sans lavabo dans la scène | Choix technique « sans vasque séparée » interprété comme suppression du lavabo inclus | Lavabo intégré restitué sans ligne facturée supplémentaire |
| Tampa 140 à une cuve | Même géométrie employée pour toute largeur | Deux cuves pour la référence 6236 conservée |
| Portes/tiroirs statiques ou génériques | Caissons pleins et façades non articulées | Caisses creuses, tiroirs en groupes, pivots de porte, détails propres aux modèles ; 22 types vérifiés |
| Brent et Amat insuffisamment différenciés | Particularités des dessins absentes | Brent I : quatre portes et rangement bas/pieds, J : deux portes ; Amat : façades asymétriques, p.14 et 29–30 |
| Carrelage étiré en pose verticale | Répétitions UV non croisées après rotation de 90° | Échelle calculée d'après les dimensions physiques, contrôlée sur le matériau réellement affiché |
| PDF mobile sans cotes lisibles | Scène masquée par le panneau Composition, surface de capture de taille nulle | Capture indépendante 1200 × 850 avec étiquettes adaptées ; dossier mobile rendu et inspecté |

Les références 13990/13993/13996/13999 apparaissent pour Sima et Amat dans le PDF lui-même. Les identités collection + modèle + référence sont conservées ; cette ambiguïté doit être confirmée par le fabricant, sans référence de remplacement inventée.

## Résultat fonctionnel et architecture

Le parcours conserve les sept étapes Collection, Modèle, Dimensions, Finition, Vasque/plateau, Miroir/compléments et Récapitulatif. Les formats sont des listes fermées du catalogue ; une largeur libre de 84 cm est rejetée. Les options sont filtrées selon le modèle et la largeur. Les choix incompatibles sont normalisés avec explication, sans créer de nouvelle référence.

L'atelier présente trois zones sur ordinateur : modifications à gauche, scène centrale, composition et prix à droite. Sur téléphone, les panneaux Configurer, Vue 3D et Composition sont accessibles séparément. Les commandes restent accessibles en plein écran. Chaque modification passe par un modèle de composition commun à la scène, aux lignes de prix, aux projets et aux exports.

La 3D permet sélection, déplacement horizontal/vertical, rotation sur le fond, zoom, pincement tactile, face, côté, centrage, plein écran, inversion du sens de rotation et ouverture/fermeture de la composition. Le bouton Cotes conserve son état ; la sélection limite les cotes à l'élément concerné. Les vasques suivent leur support ; les miroirs ont leurs propres identifiants et peuvent être déplacés et supprimés indépendamment.

Les projets sont locaux, nommés, modifiables, duplicables et supprimables après confirmation. L'espace visiteur et les espaces de comptes professionnels sont distincts. Un message indique l'absence de récupération automatique sur un autre appareil ; aucune synchronisation cloud n'a été ajoutée. Le bouton est « 📁 Mes projets » et l'enregistrement ouvre une interface normale.

Le dossier PDF A4 contient un récapitulatif commercial et quatre captures actuelles : face/côté, avec/sans cotes. Les grandes listes peuvent produire des pages de récapitulatif supplémentaires au lieu d'être tronquées. La commande Imprimer prépare ce même PDF dans une interface avec aperçu et lien Blob ; aucun about:blank vide. Les échantillons testés comportent deux pages A4.

Les visiteurs remplissent les coordonnées demandées ; le message préparé contient la composition et les destinataires Coryne/Jérôme. Le professionnel dispose d'une référence client, d'observations et d'une confirmation, puis du mécanisme de messagerie déjà utilisé par le site. **Le site prépare l'envoi dans le client de messagerie ; il n'a pas été transformé en service d'envoi serveur.** Aucune vraie commande ni aucun message n'ont été envoyés pendant les tests.

Le catalogue interactif et le PDF original sont conservés, avec accès aux pages des collections dont la correspondance est renseignée. Le parcours ChatGPT facultatif prépare la capture et un prompt détaillé, propose de copier le texte et d'ouvrir ChatGPT. Le client joint lui-même l'image ; aucune API payante et aucune intégration Gemini. La génération finale dans le compte personnel du client n'est pas automatisée ni annoncée comme vérifiée.

## Textures : provenance, résolution et limites

| Revêtement conservé | Ressource réellement disponible | Rendu et limites |
|---|---|---|
| ELIOS Creta : Avena, Biscotto, Caramello, Matcha, Zucchero, Malto, Pepe, Ginepro | Échantillons matière de la [page officielle ELIOS](https://eliosceramica.com/collezione/creta/) ; six JPEG 1400 × 700, Malto/Pepe 1200 × 700 ; une face par coloris | Recadrage carré central natif 700 px sur ordinateur, réduit à 512 sur mobile ; aucun étirement ni variante artificielle. Fichiers d'origine 66–205 Ko. Anciens fichiers partagés conservés en secours |
| VIEW Coco Beige | Photo utilisateur existante 240 × 295 ; face identifiable 101 × 67 | Carreaux physiques 60 × 40 cm, joints 2 mm, pose horizontale/verticale ; résolution limitée, pas de texture fabricant HD trouvée |
| Finitions RANDAL | 46 échantillons existants 188 × 188 | Matière existante utilisée sans agrandissement artificiel ni veinage inventé ; échantillons fabricant plus grands et cartes de relief non disponibles |

Les neuf choix de carrelage existants restent présents. Les textures ELIOS améliorent la définition par rapport aux anciennes pastilles 558 × 558, elles-mêmes agrandies depuis environ 117 px dans le PDF. Une seule face officielle est disponible par teinte : aucune variation de motif fabricant supplémentaire n'est revendiquée. Aucun rendu photographique ni texture « HD » n'est annoncé. [Inventaire initial](texture-inventory.json), [URLs, résolutions et empreintes des originaux](manufacturer-textures.json).

Le rendu utilise des matériaux physiques, une lumière douce, des ombres et un environnement de réflexion pour les miroirs ; les modèles LED disposent d'un effet lumineux. Les revêtements d'ambiance ne changent jamais les références ou prix des meubles.

Les images et textures sont mises en cache ; le rendu se fait à la demande et pendant les animations/interactions. Les ressources partagées sont réutilisées, les ressources GPU libérées à la fermeture ; définition plafonnée à 1,5 sur téléphone, ombres 1024 contre 2048 sur ordinateur, environnement miroir 128/256. La charge réelle et les FPS sur téléphones physiques n'ont pas été mesurés.

## Tests et preuves

Commandes reproductibles : [tests/randal-catalogue/README.md](../../tests/randal-catalogue/README.md). Navigateur : Chromium 134, WebGL/SwiftShader. Écrans : ordinateur 1440 × 1000, téléphone tactile émulé 390 × 844 et tablette tactile émulée 1024 × 900. Ces essais ne constituent pas une validation sur iPhone/Safari ou sur matériel mobile physique.

Le test du modèle réussit : 431 prix strictement identiques, tableaux conservés, formats fermés, compatibilités, identifiants, collisions, finitions indépendantes, sommes et aller-retour des projets. [Résultat](core-tests.json).

Les douze groupes navigateur réussissent en local : [résultats détaillés](browser-tests.json). Les douze groupes réussissent également sur le site public, avec zéro erreur JavaScript de page détectée. Les résultats séparés de la version publique sont dans [live/browser-tests.json](live/browser-tests.json), avec les captures et PDF issus de cette exécution.

| Configuration représentative | Statut | Contrôles réellement exécutés |
|---|---|---|
| Harmony simple, 60 puis 80 cm, deux tiroirs, Sella | RÉUSSI | Prix initial 338,40 € pour le meuble 60, navigation, finition conservée puis modifiée, géométrie 80 × 53 × 45, ouverture et fermeture |
| Formats catalogue et vasque à poser | RÉUSSI | 84 cm refusé, Harmony commercial 120 / caisson 119, Boreal 79 / vasque 80, Torne noire réf.10444 et plateau, cotes réelles |
| Composition multiple | RÉUSSI | Duplication avec nouvel identifiant, finition indépendante, déplacement au pointeur et vertical, miroirs multiples, suppression ciblée, total exact, aucune collision détectée |
| Meuble 120 commercial avec colonne | RÉUSSI | Déplacement du meuble sans entraîner la colonne ni la caméra, portes/tiroirs ouverts et refermés ensemble, cotes persistantes face/côté, plein écran, devis synchronisé |

La colonne de ce dernier scénario est celle du Catalogue général, avec le nombre de portes confirmé pour ce modèle ; il ne s'agit pas de la colonne une porte de l'ancienne mission STUDIO ONE. Sur tablette, Brent I à quatre portes et Amat à deux tiroirs/une porte sont vérifiés ensemble.

| N° demandés | Contrôles | Résultat et portée |
|---|---|---|
| 1–8 | Ouverture, 11 collections, modèles, formats, finitions, vasques, miroirs, navigation | RÉUSSI ; parcours UI et vérification des 22 types |
| 9–18 | Vue 3D, rotation, zoom, face/côté, tiroirs/portes, cotes affichées/masquées, sélection | RÉUSSI ; WebGL réel dans Chromium, pointeur et tactile émulé |
| 19–24 | Ajout/suppression/modification, récapitulatif, prix et totaux | RÉUSSI ; tests navigateur et comparaison exhaustive des 431 entrées tarifaires |
| 25–26 | Projets enregistrés et rouverts | RÉUSSI ; duplication, suppression confirmée, rechargement, espaces de comptes simulés séparés |
| 27–28 | Impression et PDF | RÉUSSI pour préparation/aperçu PDF et fichiers téléchargés, A4 et quatre vues inspectés ; aucune imprimante physique testée |
| 29–30 | Demande visiteur et parcours professionnel | RÉUSSI pour formulaires, composition préparée, destinataires, référence et confirmation ; comptes simulés, messages interceptés, réception réelle et authentification réelle non testées |
| 31–34 | Textures, joints, formats, orientation | RÉUSSI pour chargement, inspection visuelle et calcul de l'échelle à partir des UV réels ; aucune multiplication artificielle des faces |
| 35 | Smartphone | RÉUSSI pour interface, toucher/pincement, cotes, projets, export et absence de débordement en émulation ; performances sur matériel physique non mesurées |
| 36 | Préparation ChatGPT | RÉUSSI pour prompt personnalisé, instructions de pièce jointe manuelle et téléchargement PNG ; génération dans ChatGPT non exécutée |

STUDIO ONE : essais de fumée réussis sur ordinateur et téléphone, deux objets, 3432 triangles, ouverture/fermeture, références et total 1 508,40 € conservés. [Résultat](studio-integrity.json). Sa suite historique comporte des attentes tarifaires antérieures au comportement déjà présent dans sa base ; elle n'est pas déclarée réussie et ses tests/prix n'ont pas été modifiés.

### Captures et dossiers

| Avant | Après |
|---|---|
| [Interface ordinateur](before-desktop.png) | [Collections](live/desktop-collections.png) |
| [Scène 3D](before-3d.png) | [Meuble et colonne ouverts](live/desktop-column-open.png) |
| [Interface mobile](before-mobile.png) | [Scène mobile](live/mobile-scene.png), [édition mobile](live/mobile-edit.png) |
| — | [Carrelages](live/desktop-tiles.png), [plein écran](live/desktop-fullscreen.png), [tablette](live/tablet-brent-amat.png) |

Les captures « avant » proviennent de la base sauvegardée, rendue localement avec sa dépendance Three.js d'origine. [Dossier PDF ordinateur](live/test-dossier.pdf), [dossier PDF téléphone](live/test-mobile-dossier.pdf), [capture préparée pour ChatGPT](live/test-chatgpt-image.png).

## Fichiers modifiés ou ajoutés

| Fichiers | Rôle |
|---|---|
| `randal-configurateur.html` | Page existante préservée et modernisée, chargement des modules Catalogue seuls, révision de cache `20261017-3` |
| `assets/css/randal-catalogue.css` | Interface, trois zones, panneaux mobiles, plein écran, dialogues |
| `assets/js/randal-catalogue/data.js` | Données intégrales structurées et figées |
| `assets/js/randal-catalogue/configurator.js` | Parcours existant extrait, résolution des références et compatibilités |
| `assets/js/randal-catalogue/store.js` | Composition canonique, instances, positions, quantités, collisions, devis |
| `assets/js/randal-catalogue/geometry.js` | Géométries et articulations propres aux produits |
| `assets/js/randal-catalogue/workspace.js` | Atelier, projets, PDF, formulaires et préparation ChatGPT |
| `assets/js/randal-catalogue/account.js` | Adaptateur isolé des contrats de session PRO existants |
| `assets/js/randal-composition-3d.js` | Moteur Catalogue, interactions, matériaux, cotes et captures |
| `assets/vendor/randal-catalogue/` | Copies isolées Three.js/jsPDF et licences ; aucun vendor STUDIO ONE modifié |
| `assets/img/randal/catalogue-tiles/creta-*.jpg` | Huit échantillons originaux ELIOS |
| `tests/randal-catalogue/` | Modèle, non-régression tarifaire, navigateur et contrôle STUDIO ONE |
| `reports/randal-catalogue/` | Audit, relevés, correspondances, résultats, captures et ce rapport |

## Commits GitHub et publication

| Commit | Contenu |
|---|---|
| [`bce9ce48`](https://github.com/aetherismanga/le-roy-factory/commit/bce9ce48f56805a3410c0461e8cb818e12732df7) | Audit, conservation des données et gel des 431 prix |
| [`6ebd589d`](https://github.com/aetherismanga/le-roy-factory/commit/6ebd589df1f205f2a24e192db42b1514c3429441) | Atelier, modèle de composition, moteur 3D, projets et PDF |
| [`bcb815c1`](https://github.com/aetherismanga/le-roy-factory/commit/bcb815c1cc3c0eaa086732d12d3310d9388562c3) | Textures fabricant, sessions isolées et particularités des modèles |
| [`75b59761`](https://github.com/aetherismanga/le-roy-factory/commit/75b597616784263a53d6afc9a7e631ca1526f4c4) | PDF mobile et intégration conservant la mise à jour externe STUDIO ONE |
| [`24749025`](https://github.com/aetherismanga/le-roy-factory/commit/24749025caf9cd2736e63f0dad53b3dc996c22bc) | Échelle UV réelle en pose verticale, tests et documentation reproductibles |

La dernière prévisualisation Vercel construite avec succès, [le-roy-factory-haxl8agy3-hugol-trading.vercel.app](https://le-roy-factory-haxl8agy3-hugol-trading.vercel.app), correspond à `6ebd589d` et peut être protégée par l'authentification Vercel. **Elle ne représente pas la révision finale et n'est pas présentée comme la livraison.** La révision finale est servie par le domaine existant GitHub Pages ; le déploiement Vercel final reste à relancer après rétablissement du quota.

## Points restant à résoudre ou à confirmer

1. Déploiement final Vercel refusé par quota : nécessaire pour satisfaire le critère Vercel de la mission.
2. Confirmation fabricant des références communes Sima/Amat et validation commerciale finale des associations ; aucun remplacement inventé.
3. Texture fabricant plus définie pour VIEW Coco Beige, plusieurs faces officielles Creta et textures meubles plus grandes non disponibles. Les limites réelles sont conservées et signalées.
4. Les meubles sont des représentations paramétriques respectant les dimensions renseignées et les particularités vérifiées ; aucun modèle industriel natif fourni, aucune promesse de fidélité photographique.
5. Essais sur appareils physiques, Safari, imprimante et connexion PRO réelle non exécutés. Les commandes et demandes ont été testées sans envoi ; la réception réelle reste à valider dans un essai commercial autorisé.
6. Une erreur de syntaxe préexistante de la page d'accueil, `assets/js/global-search-router.js` ligne 42, a été observée lors d'un passage d'authentification Vercel. Ce fichier partagé est hors périmètre et reste intact. Les tests du configurateur lui-même distinguent cette erreur de leur propre page.
7. Les anciennes attentes tarifaires de la suite de tests STUDIO ONE restent à rapprocher de son fonctionnement existant dans une mission séparée ; aucune modification de ses prix ou tests ici.

La publication publique est vérifiée, les preuves sont versionnées et les limites ci-dessus restent ouvertes ; elles ne sont pas masquées par un statut de réussite globale.
