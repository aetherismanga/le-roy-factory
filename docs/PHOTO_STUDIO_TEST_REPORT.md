# LRF PHOTO STUDIO — vérification de la reprise

6 novembre 2026. Branche : `feature/lrf-photo-studio-20261106`. Version de prévisualisation uniquement. La réception complète et la publication du domaine principal restent soumises à l'accord de Jérôme. La branche reprend aussi les modifications de `main` au commit `2d671e7d752d3ebc9db2108b97560a78a57a415a`, sans modifier leur contenu.

## Corrections livrées

Le cache applicatif n'est plus nécessaire au démarrage de l'analyse. Runtime, configurations, WASM et poids sont servis par l'origine de l'application et contrôlés en SHA-256 au build. Le modèle d'origine quantifié sur les activations produisait des débordements sur les murs. Il est remplacé par une compression déterministe des seuls poids, proche du calcul FP32 dans les scènes comparées, pour un modèle de 44 270 443 octets. Le navigateur ne télécharge pas la source FP32 de 172 Mo.

Le post-traitement protège les pixels de tapis reconnus avec confiance, supprime les prédictions minuscules et conserve les régions de sol séparées par des meubles. Aucun polygone automatique de sol n'est inventé. L'utilisateur vérifie et confirme toujours le masque ; le pinceau, le contour, l'annulation et les réglages restent accessibles.

Sur écran étroit, les panneaux défilent avec la page. Des outils de correction compacts restent au-dessus de la photo : aucun panneau fixe ne la recouvre. Les imports/reprises et traitements concurrents sont isolés par révision. Le catalogue se régénère au build et une texture éligible sans miroir vérifié bloque la construction. L'export conserve un aperçu décodé et un lien utilisable pour l'enregistrement manuel sur téléphone.

## Vérifications exécutées

| Vérification | Résultat et portée |
|---|---|
| Tests Photo Studio | 50 tests Node réussis : identité catalogue, provenance, géométrie, pixels protégés, poses, échelle, annulation, temporisation, entrée Configurateurs, génération du catalogue, compresseur ONNX et masque sémantique. |
| Construction dédiée | Réussie ; 7 200 fichiers publics, dossiers privés exclus. |
| Modèle et dépendances | Neuf actifs vérifiés, 66 835 192 octets au total. Conversion Node du modèle FP32 reconstruite dans un dossier temporaire et empreinte du résultat vérifiée. |
| Noyau partagé | `npm run check:core` réussi. Aucun changement au noyau partagé dans ce lot. |
| PLAN & POSE et sécurité | 308 tests réussis, un test préexistant ignoré, aucun échec. |
| Import réel dans Chrome distant | JPEG importé par le sélecteur de fichiers ; calcul WASM réel, sans WebGPU ni cache applicatif. Scène meublée affichée avec un sol modifié et les canapés/murs conservés. |
| Catalogue et rendu | Sélection effective d'Elios Quercia Honey 24 × 120, réf. 00Y2C40, et de View Blois Beige 60 × 60 ; chargement réel des textures et rendu. |
| Sauvegarde/reprise | Enregistrement IndexedDB, rechargement puis reprise explicite avec la référence exacte et les réglages. |
| Export navigateur | Image JPEG générée et redécodée dans l'aperçu à 1 600 × 1 131, sans agrandissement de la source. La récupération du téléchargement Blob par l'outil de navigateur distant a échoué ; le fichier téléchargé n'est donc pas annoncé comme vérifié sur disque. Aperçu et lien d'enregistrement restent disponibles. |
| Erreur d'import | Un JPEG corrompu affiche un message utile et laisse l'application utilisable. |
| Largeur mobile | Vérification dans un cadre de 390 × 844 sur Chrome distant : outils au-dessus de la photo, panneaux dans le flux de la page, logo et commandes visibles. Il s'agit d'un contrôle de mise en page, pas d'un téléphone physique. |
| Six scènes et cas négatif | Le même module d'analyse a été exécuté dans le navigateur sur six photos réelles autorisées et un recadrage sans sol. Résultats détaillés dans `reports/photo-studio/browser-results.json`. Les erreurs de reconnaissance ou absences de sol restent documentées. |
| QA native complémentaire | 16 scènes avec le modèle livré et le module JavaScript exact de post-traitement. `reports/photo-studio/model-native-conservative-results.json`. Ces temps ne sont pas des mesures WASM ou téléphone. |

Commandes réellement exécutées :

```sh
npm ci --ignore-scripts --include=dev
node --test tests/photo-studio*.test.mjs tests/photo-studio/*.test.mjs
node scripts/fetch-photo-studio-model.mjs --verify-only
node scripts/build-photo-studio-site.mjs
npm run check:core
node --test tests/lrf-plan-pose/*.test.mjs tests/security/*.test.mjs
```

Le contrôle navigateur complémentaire utilise des photos de test locales, chargées dans une page de QA temporaire avec le véritable `analyze()`. Cette page et les photos ne sont pas ajoutées à la publication. Le parcours d'import, confirmation, choix, rendu et reprise a également été parcouru dans la véritable interface. Les sources et licences des photos sont détaillées dans `PHOTO_STUDIO_QA_PHOTOS.md`.

## Couverture et limites de réception

124 références simulables : 18 Elios (Quercia et Slate vérifiées), 106 View ; 359 actifs de textures contrôlés. Les autres références restent recensées dans le rapport de couverture avec leur motif d'exclusion. La Fenice est recensé mais ses références exactes, formats, finitions et faces complètes ne sont pas suffisamment rapprochés pour activer une simulation fidèle ; voir `PHOTO_STUDIO_FENICE_AUDIT.md`. Aucun produit fictif ni croisement arbitraire de formats/coloris n'a été ajouté.

La segmentation reste une proposition. Certains tapis ou petits objets exigent une correction ; des scènes très chargées ou avec moquette peuvent ne produire aucun sol. Le cas réel de tapis de la QA native contient encore une zone mal classée malgré la protection explicite. Les pixels retirés manuellement sont préservés lors du rendu et des changements de carrelage. L'échelle est indicative sans calibration et aucun métré n'est calculé.

Tests physiques Android/Chrome, iPhone/Safari et Mac/Safari non exécutés. Caméra physique, orientation EXIF de plusieurs appareils, permission refusée, réseau réellement interrompu, quota local réel et partage système restent à vérifier. Les tests automatiques de panne/annulation du worker sont des simulations et ne prouvent pas ces situations physiques. Les objectifs de vitesse et de mémoire sur téléphone ne sont pas encore validés.

L'application peut être essayée en prévisualisation ; le cahier de réception complet n'est pas déclaré satisfait.

## Fichiers et publication

Entrée et présentation : `lrf-photo-studio.html`, `assets/css/lrf-photo-studio.css`, ajout limité dans `configurateurs.html`. Moteur : `assets/js/lrf-photo-studio/`. Dépendances : `assets/vendor/lrf-photo-studio/manifest.json`. Construction et transformation : `scripts/build-photo-studio-site.mjs`, `scripts/fetch-photo-studio-model.mjs`, `scripts/compress-photo-studio-model.mjs`. Tests : `tests/photo-studio*.test.mjs`, `tests/photo-studio/`. Rapports et documentation : `reports/photo-studio/`, `docs/PHOTO_STUDIO_*`.

Modèle, licence et empreintes : `PHOTO_STUDIO_MODEL.md`. Sources catalogue : `PHOTO_STUDIO_CATALOGUE.md`. Lancement, préparation de l'artefact GitHub Pages, publication après accord et retour arrière : `PHOTO_STUDIO_RELEASE.md`. Aucune migration de données ni changement d'autorisation n'est requis par Photo Studio.
