# LE ROY FACTORY — consolidation du 24 octobre 2026

## Périmètre

Consolidation sélective de la PR #126 sur le dernier `main`, sans fusion globale de ses 422 fichiers. Les branches ELIOS, VIEW et les sauvegardes antérieures restent conservées. Deux sauvegardes supplémentaires figent les productions initiales : `safety/release-main-20261024-3dfd5c3` et `safety/release-studio-20261024-671bf8e`.

## Modifications validées

- PLAN & POSE : fusion géométrique avec traitement des portes intérieures et conservation des ouvertures extérieures ; édition numérique et gestuelle des cotes ; placement des annotations ; duplication, suppression, annulation/rétablissement ; transferts des poses, du client et des exclusions de plinthes.
- Devis : arrondi des cartons après regroupement des références et absence de double facturation des carreaux réservés aux plinthes. Plinthes fabricant ou bois blanc de 2,20 m, murs exclus et zones faïencées conservés.
- Studio One : 264 références France contrôlées (256 meubles et huit colonnes), colonne à 413 €. Les références miroirs, vasques et accessoires conservent leurs autres tarifs.
- Référence `14214 100@` : les sources officielles divergent (765/766 €). Le configurateur affiche un prix sur demande et signale la confirmation nécessaire. Le PDF France original reste accompagné de cet avertissement dans la rubrique tarifs.
- RANDAL Général : aucune référence commerciale du nouveau tarif Studio One ne correspond à ses onze collections ; leurs tarifs restent donc inchangés.
- Miroirs : six visuels de sélection et l'entrée Miroir utilisent une représentation neutre. Les formes, références, LED et reflets des modèles 3D restent préservés.
- Confidentialité : achats retirés des catalogues publics et des exports JSON/PDF clients ; chargement à la demande par un endpoint réservé aux comptes agents Firebase vérifiés. Les anciens montants restent sauvegardés dans un stockage privé ; aucune réécriture destructive de l'historique Git n'est réalisée.
- Hébergement : `leroyfactory.fr` est effectivement servi par GitHub Pages. Les deux iframes 3D sont des projets Vercel indépendants. Le proxy d'images de PLAN & POSE est donc hébergé sur le projet Général et limité aux URL fabricants explicitement autorisées.

## Validation

- PLAN & POSE : 248 tests Node, 228 contrôles navigateur PC/mobile et 32 contrôles de transfert/rendu natif réussis. PDF A4 générés et inspectés sans achats.
- Studio One : compilation, QA complète, 264 références, parcours commerce et contrôles PC/mobile réussis. Trois niveaux de qualité et atelier WebGL vérifiés.
- Général : compilation, QA complète, 127 tests de géométrie/poses, tests API/confidentialité et parcours miroirs/atelier PC/mobile réussis.
- Service privé : 15 tests serveur/projets et workflow de migration/déploiement réussis. Vérification de refus des accès anonymes et des simples sessions clients.
- ELIOS : 363/363 variantes Firebase relues en HTTP et comparées aux SHA-256 attendus ; aucune mutation d'image. Voir `texture-integrity.json`.
- Les catalogues fabricants HD de production sont conservés. Quercia, Creta, Mysterium, Deco, Azuli Mood, Allure, COCO, Corso et Golden Stone restent présents. Le correctif Allure de la PR #124 est conservé. Les collections ELIOS incomplètement récupérées ne sont pas présentées comme terminées.

## Limites des essais

Les gestes et rendus utilisent Chromium avec WebGL logiciel, à des dimensions PC et smartphone ; ils ne constituent pas un essai sur tous les téléphones physiques. Les tests de gestes interceptent les images réseau ; l'intégrité réseau des 363 variantes HD fait l'objet d'un contrôle séparé. L'accès connecté d'un compte agent réel n'a pas été exercé ; un compte doit être autorisé et son adresse Firebase vérifiée. Les limites natives préexistantes des contours à trous et des dimensions/angles restent signalées dans le parcours de transfert.

## Traçabilité

- PR #127 : service privé des achats, fusionnée ; commit de fusion `cc5a5027cafb39bf8af4c6cac3bb52830d5d16af`.
- PR #128 : Studio One, tarifs France, miroirs et transferts.
- La PR #126 reste conservée comme historique de la revue ; son contenu utile est repris sélectivement.

## Versions effectivement publiées et contrôlées

| Application | Source publiée | Déploiement de production |
|---|---|---|
| Site et PLAN & POSE sur le domaine officiel | `main` : `2fa8bc1fe483b7fee890bb01728a8556d426b232` | GitHub Pages : workflow `40043123793`, succès ; HTML du domaine identique à la version testée |
| Copie Vercel du site | même commit `2fa8bc1f` | `dpl_3mvhyaXdYnLeRq2oTogTzvGtjbNe`, READY |
| RANDAL STUDIO ONE | branche standalone : `90c879755bed6e04cacdcad33190faf3853dba0d` | `dpl_7RqjFZzYeLpSgBzN9bdD8kNPrTdW`, READY |
| RANDAL Général | `main` : `2fa8bc1f` | `dpl_2aczmPPcz34ETygiU3La2HvwGZ2S`, READY |

Liens publics :

- https://leroyfactory.fr/lrf-plan-pose.html
- https://leroyfactory.fr/studio-one-configurateur.html
- https://leroyfactory.fr/randal-configurateur.html
- https://leroyfactory.fr/tarifs-pro.html

Les bundles effectivement servis par les deux alias de production ont été relus et comparés aux empreintes des builds testés : identité exacte, HTTP 200. Les passerelles achats renvoient 401 aux invités. Le proxy d'images renvoie 200 avec CORS pour une image autorisée et 400 pour une URL arbitraire. Le backend privé est issu de la PR #127 ; son workflow `40042388176` a terminé avec succès et les refus d'accès anonymes ont aussi été vérifiés directement.

Les PR #128 et #129 sont fusionnées. Les déploiements de production utilisent les mêmes arbres Git que les aperçus validés. L'API Vercel a refusé la promotion directe des aperçus ; les builds de production ont donc été créés depuis les commits fusionnés, puis comparés aux versions testées.

Le contrôle historique « Client virtuel » `40043125121` échouait à l'installation, avant tout test : son Playwright 1.55 ne supporte pas le nouveau runner Ubuntu 26.04. Le workflow est épinglé à Ubuntu 24.04 pour restaurer cet environnement. Les échecs des workflows Android et export Creta, hors de cette livraison, ne sont pas présentés comme des tests applicatifs réussis.
