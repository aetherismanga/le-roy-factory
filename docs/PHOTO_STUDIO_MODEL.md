# Photo Studio — analyse locale du sol

État au 6 novembre 2026. Le masque est une proposition à confirmer et corriger,
pas une mesure de chantier ni une garantie de détourage parfait.

## Modèle et conditions

- Architecture : Meta DETR ResNet-50, segmentation panoptique COCO 2017.
- Poids ONNX quantifiés : `Xenova/detr-resnet-50-panoptic`, révision immuable
  `ea24b2d4e0bfae31f0a1299ba3fb892a2df064de`, fichier `onnx/model_quantized.onnx`.
- Taille effectivement téléchargée : **44 483 407 octets** (42,42 Mio).
- SHA-256 vérifié lors de la QA native :
  `93abfec8b8abd77329f203726b231ee5e5d4c2d52c881a74ab1c1134d888c41d`.
- Le dépôt original et la fiche du modèle Meta annoncent Apache-2.0. La conversion
  Xenova est dérivée du modèle Meta ; elle ne publie pas de licence différente.
  La licence originale est conservée dans
  `docs/licenses/PHOTO_STUDIO_DETR_APACHE-2.0.txt`.
- Runtime navigateur : `@huggingface/transformers@3.8.1`, Apache-2.0 ; ONNX
  Runtime Web inclus, licence MIT. **Runtime, WASM, configurations et poids sont
  hébergés sur le même domaine que l'application**, sous
  `assets/vendor/lrf-photo-studio/`, dans des dossiers versionnés.
  Le navigateur n'appelle aucun CDN ni fournisseur de modèle.
- Fichiers de runtime mesurés : bundle JS 888 173 octets, adaptateur WASM
  44 484 octets, binaire WASM 21 596 019 octets. Avec les poids, environ
  **67 Mo non compressés** à froid, plus les petits JSON. Le téléchargement
  n'est lancé qu'après l'import d'une photo, jamais depuis Configurateurs.
- Aucun service d'inférence, compte, abonnement ou coût d'API. Les sources externes
  ne servent qu'à préparer les actifs pendant le développement/build ; elles ne
  reçoivent **aucune photo**, et ne sont pas contactées par le navigateur.

Sources primaires :

- [Modèle Meta et licence annoncée](https://huggingface.co/facebook/detr-resnet-50-panoptic)
- [Licence originale DETR](https://github.com/facebookresearch/detr/blob/main/LICENSE)
- [Conversion ONNX verrouillée](https://huggingface.co/Xenova/detr-resnet-50-panoptic/tree/ea24b2d4e0bfae31f0a1299ba3fb892a2df064de)
- [Catégories panoptiques COCO officielles](https://github.com/cocodataset/panopticapi/blob/master/panoptic_coco_categories.json)
- [Runtime Transformers.js 3.8.1](https://github.com/huggingface/transformers.js/tree/3.8.1)
- [Licence ONNX Runtime](https://github.com/microsoft/onnxruntime/blob/main/LICENSE)

SegFormer NVIDIA et MaskFormer ont été écartés : les modèles examinés comportent
des conditions non commerciales ; leur plus petit poids ne justifie pas leur
utilisation sur un catalogue commercial.

## Contrat et calcul

`analyze(imageData, { signal, onProgress, timeoutMs })` renvoie un masque alpha
de `width × height` octets, `confidence`, `coverage`, `warning`, `labels`,
`timings` et l'identité du modèle. `analyzeFloor` est un alias.
L'entrée RGBA est copiée avant transfert : la photo de l'éditeur reste intacte.

L'inférence s'exécute dans un Web Worker, par WASM monothread. Aucun en-tête
COOP/COEP ou service worker global n'est ajouté ; WebGPU n'est pas requis.
Le backend WASM est délibéré : les convolutions entières quantifiées de ce modèle
ne sont pas présumées compatibles WebGPU. Il faut un navigateur moderne avec
WebAssembly et les workers modules. Le runtime et un seul modèle sont réutilisés
pendant la session ; le navigateur peut garder les fichiers publics dans son
cache HTTP habituel. Le cache applicatif `CacheStorage` de Transformers.js est
désactivé : il empêchait le démarrage sur la prévisualisation HTTP et peut être
refusé en navigation privée. Une conservation hors ligne n'est donc pas garantie.
`allowRemoteModels=false` interdit tout repli silencieux vers Hugging Face.
La révision du modèle figure dans le chemin local, pour éviter la reprise d'un
ancien fichier en cache après une future mise à jour.

L'image d'analyse est réduite à 640 pixels sur le grand côté. Le processeur
conserve le ratio, vise 384 pixels sur le petit côté et limite le grand à 640.
Le prétraitement utilise RGB, bilinéaire, valeurs divisées par 255, moyenne
ImageNet `[0.485,0.456,0.406]`, écart-type `[0.229,0.224,0.225]`, tenseur NCHW.
L'entrée `pixel_mask` contient des entiers 64 bits à 1 sur `[1,64,64]`, conformément
au contrat de l'export et du processeur DETR Transformers.js.

Entrées vérifiées : `pixel_values` float dynamique `[B,3,H,W]`, `pixel_mask`
int64 `[B,64,64]`. Sorties : `logits [B,100,251]`, `pred_boxes [B,100,4]`,
`pred_masks [B,100,H/4,W/4]`. Le métadonnée de sortie indique encore 16×16 ;
l'exécution produit bien les dimensions dynamiques (vérifié nativement).
L'opset est ONNX 12 ; l'ouverture et l'inférence CPU ont réussi, y compris les
opérateurs `ConvInteger`, `MatMulInteger`, `Resize`, `Einsum`, `CumSum`.
La preuve navigateur reste distincte de la preuve CPU native.

## Préparer ou vérifier les fichiers du modèle

`assets/vendor/lrf-photo-studio/manifest.json` verrouille chaque source, taille et
SHA-256. Le dossier contient aussi les trois licences publiques et `NOTICE.txt`.
Les fichiers téléchargés sont présents pour la prévisualisation ; le script
suivant reconstitue exactement ces fichiers lors d'un checkout incomplet :

```sh
node scripts/fetch-photo-studio-model.mjs
node scripts/fetch-photo-studio-model.mjs --verify-only
```

La vérification a réussi pour les neuf fichiers verrouillés, environ 67 Mo.
Les fichiers corrects sont conservés sans requête réseau. Les fichiers absents
ou modifiés sont téléchargés à nouveau et vérifiés avant un renommage atomique.
Un écart de taille/SHA-256 bloque la préparation. Aucun script de build global
n'est modifié ici : exécuter cette commande avant le build public si les actifs
ne sont pas inclus dans le checkout. `--verify-only` échoue si un fichier manque.

Pour diagnostiquer uniquement en QA, `?ps-diagnostic` ajoute le message technique
du worker dans l'erreur affichée. Les erreurs ordinaires restent formulées pour
l'utilisateur. Les diagnostics console n'incluent ni image, ni masque, ni nom
de fichier importé.

La table `id2label` de la conversion est ancienne. Les vraies catégories du jeu
panoptique sont **118 `floor-wood` et 190 `floor-other-merged`**. Le code corrige
le libellé 190 (`LABEL_190` dans le fichier téléchargé), ainsi que 200 `rug-merged`.
Il n'utilise pas arbitrairement les anciennes classes 114–117 non entraînées ici.
Le post-traitement panoptique attribue chaque pixel à la proposition gagnante ;
les meubles, murs et tapis reconnus appartiennent à d'autres classes.

Les seuils sont 0,6 pour les objets, 0,5 pour les masques et leur recouvrement.
Les masques des sols retenus sont réunis puis ramenés aux coordonnées de la
photo de travail. Un résultat vide reste vide. Une couverture faible provoque
un message utile ; tous les résultats demandent une vérification des contours.
Le délai maximal par défaut est 120 secondes (téléchargement compris).
Annuler termine le worker et conserve le projet courant. Une nouvelle analyse
annule l'ancienne ; un message arrivé en retard ne peut pas la remplacer.

## Vérifications exécutées

1. `node --check assets/js/lrf-photo-studio/segmentation.mjs`
2. `node --check assets/js/lrf-photo-studio/segmentation-worker.mjs`
3. `node --test tests/photo-studio-segmentation.test.mjs` : **5/5 réussis**
   (entrée corrompue, conservation du tampon photo, masque vide, annulation et
   résultat périmé, erreur réseau, expiration réelle d'un worker muet).
4. Ouverture du modèle avec ONNX Runtime 1.22.0 CPU, opset/entrées/sorties vérifiés.
5. Inférences CPU natives monothread sur les 16 scènes ci-dessous. Les photos
   réelles Commons et leurs attributions sont documentées dans
   `docs/PHOTO_STUDIO_QA_PHOTOS.md`. Les fichiers de preuve restent dans l'espace
   QA ; aucune photo personnelle n'est intégrée au code.
   Résultats numériques : `reports/photo-studio/model-native-results.json`.

Les temps ci-dessous excluent le téléchargement et le navigateur : ils ne
constituent **pas** un benchmark Android, Safari ou WASM. Le pourcentage indique
la proportion de l'image reconnue comme sol, sans annotation de vérité terrain.

| Scène | Nature | Sol reconnu | Calcul CPU natif |
|---|---|---:|---:|
| 01 perspective | Ambiance fabricant | 16,4 % | 889 ms |
| 02 salon | Ambiance fabricant | 31,0 % | 790 ms |
| 03 cuisine et tabourets | Ambiance fabricant | 2,4 % | 729 ms |
| 04 salle à manger sombre | Ambiance fabricant | 20,9 % | 870 ms |
| 05 ancien motif contrasté | Ambiance fabricant | 43,4 % | 748 ms |
| 06 salon lumineux | Ambiance fabricant | 53,0 % | 732 ms |
| 07 texture sans pièce | Cas négatif | 0 % | 651 ms |
| 08 salon et tapis | Photo réelle Commons | 23,1 % | 654 ms |
| 09 salon avec moquette | Photo réelle Commons | 0 % | 744 ms |
| 10 chaises et parquet | Photo réelle Commons | 20,8 % | 752 ms |
| 11 canapé, tapis et contre-jour | Photo réelle Commons | 5,3 % | 857 ms |
| 12 carrelage à motif | Photo réelle Commons | 0 % | 1 064 ms |
| 13 parquet historique | Photo réelle Commons | 3,1 % | 805 ms |
| 14 pièce avec moquette | Photo réelle Commons | 0 % | 757 ms |
| 15 pièce vide et câble | Photo réelle Commons | 19,4 % | 818 ms |
| 16 mur/fenêtre sans sol | Photo réelle recadrée, négatif | 0 % | 330 ms |

Reproduction, avec Pillow, numpy et `onnxruntime==1.22.0` installés :

```sh
python scripts/qa-photo-studio-model.py \
  --model /chemin/model_quantized.onnx \
  --images /chemin/photos-qa \
  --output /chemin/preuves-qa
```

Le script vérifie le SHA-256, conserve les masques et les superpositions et
écrit `results.json`. Aucun envoi réseau n'est effectué par ce script.

## Limites observées

La segmentation est réelle mais imparfaite. La cuisine 03 est largement
sous-détectée. Les scènes réelles 09/14 avec moquette sont reconnues comme tapis ;
le carrelage à motif 12 est également manqué. Ces cas doivent utiliser les
corrections ou le contour manuel. Les tapis de 08/11 sont majoritairement
préservés et les pieds de chaises de 10 restent visibles, avec des bords à affiner.
Les câbles, petits pieds, reflets, seuils et meubles peu contrastés peuvent
nécessiter un retrait au pinceau. Une confiance élevée d'une classe n'est pas
une mesure de précision du contour.

L'analyse native ne remplace ni la vérification visuelle du rendu final, ni un
test complet de téléchargement/inférence WASM, ni les tests physiques Android,
iPhone et ordinateurs demandés. Ils doivent être consignés séparément dans le
rapport de réception. Un échec de téléchargement fournit le mode manuel,
sans faux résultat d'analyse.
