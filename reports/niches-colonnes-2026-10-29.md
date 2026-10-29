# Niches et colonnes carrelées — vérification du 29 octobre 2026

## Périmètre et état initial

Base de main contrôlée : `1325bb52df8a559655864aabd127d1e7b4515213`.
Branche de finalisation : `fix/niches-colonnes-finalisation-20261029`.
Demande de fusion : https://github.com/aetherismanga/le-roy-factory/pull/155.

Au début de l'intervention, l'alias Studio One servait le commit
`ad988a4af7f62206d4bb23397325f13bdbf4a0d0`, déploiement
`dpl_8R6AxNRSnxzKrx7kbu7oLbvMDzMS`. L'alias Général servait
`bdaab9987c054aac0f48cb30b324538d9563a8ff`, déploiement
`dpl_6xHDQ66TruR8nZHVr4aRBYjywxgP`. Ces identifiants ont été relus
directement sur les alias Vercel, sans assimiler les prévisualisations à la production.

La géométrie encastrée, les cinq faces de revêtement, l'éditeur, le déplacement
des niches et la conservation des matières lors des découpes d'ouvertures
existaient dans le noyau. La branche préparée
`fix/niche-visual-placement-20261029`, tête
`51b606aa3db063a2996192f52ee8144f3f6c3230`, contenait la nouvelle pose visuelle
et les profils Argent par défaut des colonnes. Elle n'était pas dans main et
aucun déploiement Vercel de cette branche n'a été trouvé. Ses corrections valides
ont été reprises, plutôt que réécrites.

## Corrections finales

- Même contrôleur de pose pour les deux ateliers et leurs trois entrées : menu
  Ajouter, panneau du mur, panneau de cloison. Aperçu orienté sur la face visée,
  profondeur compatible avec la validation réelle de la paroi, clic/appui ou
  glissement depuis le dessin, annulation et Échap.
- Arrêt du mouvement programmé de caméra et de l'inertie pendant la pose.
  Capture du pointeur conservée sur le dessin lorsque le geste y commence : le
  garde-fou commun des panneaux ne peut plus absorber ses mouvements et son
  relâchement. La protection des autres panneaux reste active.
- Repères en vrais pointillés 3D, clairs et foncés, avec test de profondeur.
  Ils suivent la niche, sont masquables, et sont exclus des images HD,
  vignettes et reflets par une transaction qui restaure leur visibilité.
  Leur bouton reste au-dessus des commandes de caméra sur mobile.
- Erreurs des dimensions/profondeurs visibles près d'Appliquer ; refus explicite
  sur les portes, fenêtres, niches voisines et zones de carrelage.
- Deux profils verticaux Argent à la création d'une colonne carrelée. Retrait
  indépendant ou complet conservé à la sauvegarde. Aucun défaut réappliqué aux
  anciennes colonnes ; pas de commandes de profil haut/bas pour les colonnes.
- Scénarios de tests anciens actualisés pour le menu Ajouter, l'inspecteur actuel
  et la reprise explicite, conformément à l'ouverture sur une pièce neuve.

Le CRM, les droits, les services de tarifs, les catalogues et les données
utilisateurs n'ont pas été modifiés. Le repère de version `suite-version.json`
est actualisé pour identifier cette publication ; les pages publiques restent inchangées. Les projets des essais sont des fixtures
locales dans des contextes de navigateur isolés.

## Vérifications et preuves

Installation : `npm ci --ignore-scripts --include=dev`.
Noyau : `npm run check:core`.
Suites de chaque workspace : scripts `check` de Studio One et Général.
Constructions : `build:site`, `build:studio`, `build:general`.
Impact : `scripts/release-impact.mjs` sélectionne site et les deux ateliers pour
les sources partagées ; le site passe par Pages, pas par un projet Vercel de secours.

Le lot Node PLAN & POSE / suite / sécurité a obtenu 485 réussites, zéro échec,
un test ignoré sur 486. Le test ignoré est une ancienne interface de récupération
qui demande un Chromium local indisponible dans cet environnement ; il est
signalé explicitement dans les résultats.

Les scènes et les gestes ne sont pas déduits des builds : ils sont exécutés
dans Chromium avec WebGL logiciel, avec événements souris/tactiles natifs.
Les captures CI ont été ouvertes pour contrôle visuel.

Preuve intermédiaire sur les mêmes sources applicatives :
https://github.com/aetherismanga/le-roy-factory/actions/runs/40836209538.
Les rapports de l'artefact `12880699728` donnent 29 groupes de pose, quatre
parcours de panneaux/profils et douze parcours de revêtements de niche réussis,
avec zéro erreur JavaScript dans ces parcours. Cette exécution a également
révélé deux scénarios de QA anciens, ensuite corrigés ; elle n'est donc pas
présentée comme une validation complète du workflow.

Le contrôle raster des pointillés mesure une différence visible sur fond blanc
et foncé (1482 et 2748 composantes de pixel différentes). Derrière une paroi
opaque, et pendant le rendu de présentation, la différence est exactement zéro.
La visibilité de configuration est ensuite restaurée.

La régression des niches couvre les trois modes de fond/contours, l'ajout
successif d'une porte et d'une fenêtre, le verrouillage individuel, la sélection,
le déplacement et la reprise, dans chacun des deux ateliers et aux deux tailles
d'écran.

## Publication et contrôles en ligne

Commit intégré et publié : `f17ce0a82309769c64a11fa67df93f2990c51240`.
L'arbre de la fusion a été comparé à l'arbre validé : identique.
Les derniers commits de branche ne changent que les tests et leur orchestration ;
les sources applicatives n'ont pas changé après les contrôles WebGL du lot.

| Application | Déploiement | Alias relu après publication | État |
| --- | --- | --- | --- |
| Studio One | `dpl_C9N9muJTtR4q6eHMYTTd5Z4kkj2F` | https://studio-one-beta-test-v2.vercel.app | READY, commit publié confirmé |
| Catalogue Général | `dpl_8c84HVatzcvw7KQwrsUpNrFyojqW` | https://randal-catalogue-general-3d.vercel.app | READY, commit publié confirmé |

Une création de déploiement par atelier, sans publication de prévisualisation.
Les deux alias ont été interrogés après leur affectation : ils servent bien les
identifiants et le commit ci-dessus. Les anciens déploiements restent conservés.

Empreintes SHA-256 des fichiers `app.js` réellement téléchargés sur les alias :

- Studio One : `9878c4110b9be89b5409eff716ae9858ca67e32029a7a9cd51def94b49b7f55b`.
- Général : `9573c44e5dd2717cc58bf2a5532fee19257cabca422486b540f42c40c27745d4`.

Les deux empreintes sont identiques aux constructions du code validé. Les HTML
servent les URL versionnées `app.js?v=9878c4110b9b` et
`app.js?v=9573c44e5dd2`. La vérification utilise des requêtes sans cache ; aucune
suppression du stockage des projets n'est nécessaire.

**Contrôle en production réussi : 37 groupes, zéro erreur JavaScript bloquante.**
Les deux ateliers sont exécutés sur leurs vraies URL, sans interception de leurs
ressources, en PC et en tactile. Ce contrôle refait le glissement depuis le dessin,
la pose sur un autre mur, le clic/appui réel pour changer la hauteur, le refus de
superposition, la pose en cloison, la profondeur invalide, le verrouillage et la
lecture seule. Il vérifie les deux profils Argent, leur retrait, puis la vraie
navigation de reprise : les deux côtés restent Sans profil et la hauteur modifiée
de la niche est conservée.

Preuve : job `production-niche-verification`, réussi, dans
https://github.com/aetherismanga/le-roy-factory/actions/runs/40843868771.
Artefact `lrf-niche-production-checks` : `12883833818`, rapport JSON et captures,
conservés par GitHub jusqu'au 12 novembre 2026.

Les suites de construction, de placements et de visites ont réussi dans
https://github.com/aetherismanga/le-roy-factory/actions/runs/40839771922.
Le seul échec de la suite générale concernait son ancienne attente d'un bandeau
de récupération retiré du wrapper avant cette intervention. Le scénario a été
actualisé pour l'entrée historique effective, en conservant les assertions
sur l'archive, sa conversion, le réimport et l'absence de modification du stockage.
Le job `legacy-recovery` est réussi dans
https://github.com/aetherismanga/le-roy-factory/actions/runs/40843349158,
puis de nouveau sur main dans l'exécution de production ci-dessus.

Pages a publié le commit intégré avec succès :
https://github.com/aetherismanga/le-roy-factory/actions/runs/40843866504.
Les accès depuis LRF ont été ouverts après publication : accueil du Général,
accès Atelier et chargement du nouveau bundle confirmés ; même contrôle pour
Studio One. Le repère de version de cette livraison est
`20261029-niches-colonnes-1`, avec les identifiants de déploiement et empreintes.

| Fonction | Studio One | Catalogue Général | Preuve / reste à faire |
| --- | --- | --- | --- |
| Aperçu, clic/appui et glissement sur le mur visé | Testé et publié | Testé et publié | Scènes WebGL, événements natifs, position finale égale à l'aperçu |
| Cloisons, profondeur adaptée, annulation et refus | Testé et publié | Testé et publié | Cloison 8 cm → niche 6 cm ; cloison 5 cm → niche 3 cm ; refus d'une profondeur 4 cm |
| Pointillés masquables et hors présentations | Testé et publié | Testé et publié | Raster réel : contraste, occlusion et exclusion du rendu ; capture/restauration |
| Clic pour modifier et déplacement existant | Testé et publié | Testé et publié | Clic/appui, changement de hauteur, finitions, verrouillage et déplacement natifs |
| Fond/contours après porte, fenêtre et reprise | Testé et publié | Testé et publié | 12 parcours sur les deux tailles d'écran, cinq faces conservées |
| Profils verticaux par défaut et retrait durable | Testé et publié | Testé et publié | Création Argent puis Sans profil, vraie fermeture/navigation de reprise en production |
| Anciennes colonnes et projets | Testé | Testé | Contrôles du noyau, identités, reprise et absence d'application rétroactive du défaut |

Liens d'accès :
https://leroyfactory.fr/studio-one-configurateur.html et
https://leroyfactory.fr/randal-configurateur.html.


## Limites et retour arrière

Le navigateur interactif de la session ne peut pas créer de contexte WebGL.
Les essais 3D utilisent donc la CI et ses captures, pas une simulation de build.
Les gestes tactiles sont émulés sous Chromium : aucun iPhone/Android physique
ni Safari physique n'a été utilisé. Les contrôles CPU et de rendu ne constituent
pas une mesure de FPS sur le petit PC du client.

Les deux déploiements précédents mentionnés plus haut sont conservés comme
cibles de retour arrière. Aucun changement de schéma ou migration de projet
n'est nécessaire. Ne pas restaurer un ancien déploiement historique qui exposait
des achats privés.

## Contrôles historiques hors du lot

Les workflows `LRF - Client virtuel` et `export-elios-creta-60x60.yml` ne sont pas
présentés comme validés par cette intervention. Le premier utilise encore
`studio-work/src/room.js`, chemin déjà absent du commit de départ
`1325bb52df8a559655864aabd127d1e7b4515213`, et signale aussi une ancienne fonction
`window.RandalRoomSize`. Leurs sources n'ont pas été modifiées dans ce lot.
Ces erreurs de harnais historiques sont distinctes des suites actives ci-dessus.
