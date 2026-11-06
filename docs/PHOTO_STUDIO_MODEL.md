# Photo Studio — analyse locale du sol

État au 6 novembre 2026. La détection propose une zone à vérifier et corriger ;
elle ne constitue ni une mesure de chantier ni une garantie de détourage parfait.

## Modèle, compression et conditions

- Architecture : Meta DETR ResNet-50, segmentation panoptique COCO 2017.
- Source officielle : `Xenova/detr-resnet-50-panoptic`, révision immuable
  `ea24b2d4e0bfae31f0a1299ba3fb892a2df064de`, fichier `onnx/model.onnx`.
- Source FP32 : **172 282 717 octets**, SHA-256
  `f41a80cd659d1ae2e4981f2423955d983d28657d747e965ddc980b7768042de1`.
  Ce fichier n'est téléchargé que pour préparer le build ; le navigateur ne le charge pas.
- Actif livré : **44 270 443 octets**, SHA-256
  `f37d9a5f5c9a3e3b98024ca8617d8435551afd8b7ab4ede935b525547d8f43f4`.
- Transformation déterministe `weight-only-q8-v1` : les 165 tenseurs de poids
  statiques Conv/MatMul/Gemm sont compressés en int8 symétrique par canal de sortie.
  Des nœuds constants DequantizeLinear/Mul reconstruisent les poids pour les
  opérateurs originaux. Les activations et calculs restent flottants. Aucun
  réentraînement ni photo de calibration n'est utilisé.
- Le compresseur Node sans dépendance `scripts/compress-photo-studio-model.mjs`
  reproduit exactement les octets du prototype Python vérifiés par ONNX checker.
  Le build vérifie le hash source puis le hash du résultat. Les actifs sont dans
  `assets/vendor/lrf-photo-studio/models/detr-resnet-50-panoptic-ea24b2d-woq8-v1/`.
- Le dépôt original et la fiche du modèle Meta annoncent Apache-2.0. La conversion
  Xenova est dérivée du modèle Meta ; elle n'annonce pas de licence différente.
  La licence originale est conservée dans `docs/licenses/PHOTO_STUDIO_DETR_APACHE-2.0.txt`.
- Runtime : `@huggingface/transformers@3.8.1`, Apache-2.0 ; ONNX Runtime Web inclus,
  MIT. Runtime, configurations, WASM et modèle sont servis depuis le même domaine.
- À froid : JS 888 173 octets, adaptateur WASM 44 484 octets, binaire WASM
  21 596 019 octets ; total manifeste **66 835 192 octets**, licences et JSON compris.
  Le modèle est chargé après import d'une photo, jamais depuis Configurateurs.

Le q8 officiel précédent quantifiait aussi les activations. Les comparaisons natives
ont montré des débordements sur les murs et une reconnaissance dégradée. La
compression des seuls poids retrouve des propositions proches du modèle FP32,
pour un téléchargement navigateur comparable. Cela ne prouve pas une précision
universelle ni une vitesse sur téléphone physique.

Aucun service d'inférence, compte, abonnement ou coût d'API. Les sources externes
servent au build et ne reçoivent aucune photo. Les photos restent sur l'appareil.
SegFormer NVIDIA et MaskFormer examinés ont été écartés pour leurs conditions non commerciales.

Sources primaires :

- [Modèle Meta](https://huggingface.co/facebook/detr-resnet-50-panoptic)
- [Licence DETR](https://github.com/facebookresearch/detr/blob/main/LICENSE)
- [Conversion ONNX verrouillée](https://huggingface.co/Xenova/detr-resnet-50-panoptic/tree/ea24b2d4e0bfae31f0a1299ba3fb892a2df064de)
- [Catégories COCO officielles](https://github.com/cocodataset/panopticapi/blob/master/panoptic_coco_categories.json)
- [Transformers.js 3.8.1](https://github.com/huggingface/transformers.js/tree/3.8.1)
- [Licence ONNX Runtime](https://github.com/microsoft/onnxruntime/blob/main/LICENSE)

## Contrat et traitement

`analyze(imageData, { signal, onProgress, timeoutMs })` retourne un masque alpha
`width × height`, confiance, couverture, message, catégories, temps et paramètres
de post-traitement. L'entrée RGBA est copiée avant transfert ; la photo d'origine
reste disponible pour les corrections et l'export.

Le calcul s'exécute dans un worker WASM monothread, sans WebGPU ni isolation
COOP/COEP. Le runtime et le modèle sont réutilisés pendant la session. Le cache
applicatif CacheStorage est désactivé pour fonctionner en prévisualisation HTTP
et lorsque le stockage navigateur est refusé. Le cache HTTP habituel peut servir
les fichiers publics ; le fonctionnement hors ligne n'est pas garanti.
`allowRemoteModels=false` interdit le repli vers Hugging Face.

L'analyse limite le grand côté à 640 pixels. Le processeur conserve le ratio,
vise 384 pixels sur le petit côté et au plus 640 sur le grand. RGB, bilinéaire,
valeurs divisées par 255, moyenne ImageNet `[0.485,0.456,0.406]`, écart-type
`[0.229,0.224,0.225]`, NCHW. `pixel_mask` contient des entiers int64 à 1 sur
`[1,64,64]`, suivant le contrat du processeur et de l'export.

Les vraies classes panoptiques de sol sont 118 `floor-wood` et 190
`floor-other-merged`. Le libellé 190 du config hérité est corrigé ainsi que
200 `rug-merged`. Une seule inférence produit les logits et masques bruts.

`segmentation-mask.mjs` reproduit la compétition panoptique entre toutes les
classes : seuil objet 0,6, masque 0,5, recouvrement 0,5. Il rejette les pixels
sans probabilité propre au masque gagnant suffisante (0,05). Les composantes
connexes à quatre voisins couvrant au moins **0,1 %** de l'image sont conservées,
y compris les régions séparées par un meuble. Aucun pont, trou ou polygone de
sol n'est inventé. Un total inférieur à **0,5 %** laisse le masque vide pour le
tracé manuel. Les seuils et nombres de pixels/composantes sont retournés dans
`postprocess`. Une proposition de tapis (classe 200) de confiance au moins 0,8
protège explicitement ses pixels de probabilité au moins 0,5, même si un masque
de sol obtient un score panoptique légèrement supérieur. Cela protège les tapis
reconnus sans deuxième inférence ; les erreurs sémantiques restent possibles.
La couverture n'est pas une mesure de justesse du détourage.

La proposition exige toujours une confirmation. Les meubles mal reconnus,
tapis, petits pieds, câbles, reflets et seuils peuvent nécessiter le pinceau.
Une nouvelle analyse annule l'ancienne ; un résultat périmé ne peut remplacer le
projet courant. Annuler termine le worker. Délai maximal par défaut : 120 secondes.

## Build et QA reproductibles

```sh
node scripts/fetch-photo-studio-model.mjs
node scripts/fetch-photo-studio-model.mjs --verify-only
node scripts/build-photo-studio-site.mjs
node --test tests/photo-studio-segmentation.test.mjs tests/photo-studio/segmentation-mask.test.mjs
```

QA native facultative avec Node.js, Pillow, numpy et `onnxruntime==1.22.0` :

```sh
python scripts/qa-photo-studio-model.py \
  --model assets/vendor/lrf-photo-studio/models/detr-resnet-50-panoptic-ea24b2d-woq8-v1/onnx/model_quantized.onnx \
  --images /chemin/photos-qa \
  --output /chemin/preuves-qa
```

Le script exige le hash du modèle livré, effectue une inférence CPU puis appelle
le module JavaScript exact par Node.js. Il conserve masque, superposition et
`results.json`. Aucun envoi réseau. Les photos et attributions sont dans
`docs/PHOTO_STUDIO_QA_PHOTOS.md` ; aucune photo personnelle n'est ajoutée au dépôt.

Résultats actuels : `reports/photo-studio/model-native-conservative-results.json`.
Les temps ci-dessous sont CPU natif, hors téléchargement, navigateur et
post-traitement ; ils ne constituent pas un benchmark Android/Safari/WASM.

| Scène | Pixels proposés comme sol | Calcul CPU natif |
|---|---:|---:|
| 01-hard-perspective.jpg | 43.3 % | 1679 ms |
| 02-living-seating.jpg | 31.8 % | 1650 ms |
| 03-dining-chairs.jpg | 2.8 % | 1443 ms |
| 04-dark-dining.jpg | 20.8 % | 1627 ms |
| 05-contrast-pattern.jpg | 37.0 % | 1655 ms |
| 06-bright-living.jpg | 40.9 % | 1611 ms |
| 07-no-floor-texture.jpg | 0.0 % | 1331 ms |
| 08-commons.jpg | 22.4 % | 1424 ms |
| 09-commons.jpg | 0.0 % | 1600 ms |
| 10-commons.jpg | 22.1 % | 1571 ms |
| 11-commons.jpg | 5.3 % | 1894 ms |
| 12-commons.jpg | 0.0 % | 2296 ms |
| 13-commons.jpg | 0.7 % | 1824 ms |
| 14-commons.jpg | 0.0 % | 1782 ms |
| 15-commons.jpg | 21.4 % | 1646 ms |
| 16-no-floor-photo-crop.jpg | 0.0 % | 800 ms |

Les anciens résultats `model-native-results.json` concernent le précédent q8
avec activations quantifiées ; ils restent historiques.

## Limites observées

La protection explicite du tapis retire 9 445 pixels de sol proposés dans la
scène 08, mais une zone intérieure du tapis reste mal classée : elle doit encore
être retirée manuellement. Cette protection ne garantit pas le détourage de tout tapis. Les scènes 09 et 14 en moquette sont traitées
comme tapis et restent sans proposition. Le carrelage à motif de 12 n'est pas
reconnu. Les scènes 03/13 sont très partiellement reconnues. Les contrôles négatifs
07 et 16 restent vides. Les régions reconnues autour des chaises de 10 sont
préservées séparément sans remplir les meubles ; les bords fins restent à vérifier.

Les tests natifs et unitaires ne remplacent pas les tests du worker réel, de
l'export, du rechargement et du stockage. La validation navigateur et ses limites
matérielles sont consignées séparément dans le rapport de réception ; aucune
émulation ne constitue un test physique Android ou iPhone.
