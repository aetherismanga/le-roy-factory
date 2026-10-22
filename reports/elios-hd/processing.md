# Préparation locale des faces officielles ELIOS

Les outils ne se connectent pas au portail et ne publient aucun fichier. Les
originaux sont téléchargés séparément dans la photothèque professionnelle par
le navigateur. Aucun identifiant, cookie, URL de session ou chemin original
local n'est enregistré dans l'inventaire versionné.

`tools/configurator-materials/prepare_elios_hd.py` prépare une face ;
`tools/configurator-materials/ingest_elios_queue.py` traite séquentiellement une
photographie de la file locale des téléchargements. Ce second outil utilise
uniquement les références de `reference-mapping.json` explicitement relues et
les noms de faces réellement présents dans le portail.

## Traitement

- SHA-256 de l'original calculé par blocs de 1 Mo, sans dupliquer le fichier.
- Décodage JPEG réduit par libjpeg avant chargement complet des pixels. Pour
  le premier original de 7 795 × 15 591 pixels : 3 898 × 7 796 pixels décodés.
- Rotation horaire de 90° explicitement retenue pour les fichiers Creta
  portrait : les moteurs RANDAL disposent les carreaux en 120 × 60 cm.
  La référence source reste un 60 × 120 cm ; aucune nouvelle référence n'est
  créée. `textureRotation: 0` décrit les variantes déjà orientées.
- Conversion du profil ICC embarqué CMYK vers sRGB par LittleCMS, intention
  colorimétrique relative avec compensation du point noir. Aucune correction
  créative de teinte, balance des blancs, saturation ou motif.
- Pas de recadrage, miroir ou agrandissement. Les proportions de la face sont
  conservées. La source ne doit pas être étirée sur les formats carrés.
- Trois variantes WebP : Léger, grand côté 256 pixels ; Standard, 1 024 ;
  HD, 4 096. Qualité WebP 90 / 90 / 94, profil sRGB embarqué.
- Relecture et décodage de chaque variante, vérification des dimensions et du
  profil ICC, SHA-256 et nombre d'octets consignés dans `inventory.json`.
- Nom immuable dérivé de l'original et de la recette de conversion ; refus
  d'écraser un fichier existant dont les octets diffèrent.

La réduction du JPEG et l'encodage WebP sont des traitements avec perte. Les
variantes ne sont pas présentées comme des copies sans perte de l'original.
Les originaux téléchargés sont conservés en place par ces outils ; ils ne sont
jamais supprimés automatiquement et les images restent hors du dépôt Git.

Une source CMYK sans profil ICC est refusée. Une source RGB sans profil est
signalée « sRGB présumé » et ne devient pas intégrable automatiquement.

## État des droits et de la publication

Le rapprochement référence/couleur/format ne prouve pas un droit de
redistribution des photographies. L'inventaire reste `reuseAuthorization:
pending` et `readyForIntegration: false` tant que ce point n'est pas établi.
L'option `--reuse-authorized` est réservée à une autorisation effectivement
confirmée ; elle ne doit pas être utilisée pour contourner cette vérification.

Le pipeline ne lit pas d'identifiants de stockage. Le code existant
`tools/configurator-materials/publish.py` utilise Cloud Storage et un préfixe
distinct avec vérification des empreintes et `if_generation_match=0`. Il traite
d'autres ressources fabricant et ne doit pas être lancé tel quel pour Elios HD.
Une publication ultérieure peut reprendre cette méthode, en ne publiant que
les variantes et en préservant les ressources des autres fabricants.

Lors du contrôle local : Pillow/ImageCms 12.3 disponible ; bibliothèque
`google-cloud-storage`, exécutables gcloud/firebase/gsutil et configuration ADC
absents. Aucune écriture distante n'a été tentée. Une lecture HEAD d'une URL de
face Domus réellement présente dans le catalogue existant a répondu HTTP 200,
avec `Access-Control-Allow-Origin: https://leroyfactory.fr`. Cela confirme la
lecture publique/CORS de cet objet, pas un droit d'écriture sur le bucket.

## Validation initiale

La face `03V6A00@1.jpg` a été traitée et retraitée : empreintes WebP identiques
entre deux processus Python. Avant rotation, temps mesuré 6,29 secondes et pic
mémoire 380 684 Kio sur ce poste de travail. Ces chiffres décrivent la
préparation serveur locale, pas les performances des configurateurs sur mobile.
Les refus d'une image CMYK sans ICC et d'une sortie image dans le dépôt Git ont
également été vérifiés.

Les tailles exactes des variantes définitives, les coloris préparés et leur
statut sont fournis par `inventory.json`. Aucune intégration ou publication ne
se déduit de la seule présence de cet inventaire.
