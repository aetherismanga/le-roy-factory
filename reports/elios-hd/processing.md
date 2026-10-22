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

Le 23 octobre 2026, Jérôme a confirmé être agent d'usine Elios et détenir
l'autorisation d'utiliser ces visuels dans les configurateurs LE ROY FACTORY.
L'option `--reuse-authorized` peut donc être utilisée pour cette mission.
L'inventaire enregistre `reuseAuthorization: confirmed-by-user` ; une face
devient `readyForIntegration: true` uniquement si son identité, son format et
son profil ICC ont également été vérifiés. Ce statut indique qu'elle est prête
pour l'étape d'intégration, pas qu'elle est hébergée, activée ou publiée.

La preuve enregistrée est cette confirmation de l'utilisateur. Aucun contrat
signé du fabricant ni nouvelle licence publique n'est prétendu reçu. Le simple
rapprochement référence/couleur/format ne remplace pas cette confirmation.

Le pipeline ne lit pas d'identifiants de stockage. Le code existant
`tools/configurator-materials/publish.py` utilise Cloud Storage et un préfixe
distinct avec vérification des empreintes et `if_generation_match=0`. Il traite
d'autres ressources fabricant et ne doit pas être lancé tel quel pour Elios HD.
Les neuf variantes du pilote ont été envoyées via la console Firebase connectée.
Cette opération préserve les ressources des autres fabricants ; le script
`check_elios_publication.py` réalise uniquement des lectures des URL publiques
exactes observées dans le DOM, sans les reconstruire ni réécrire leurs jetons.

Lors du contrôle local : Pillow/ImageCms 12.3 disponible ; bibliothèque
`google-cloud-storage`, exécutables gcloud/firebase/gsutil et configuration ADC
absents, et les CLI/ADC restent non connectés. L'écriture est toutefois
confirmée par la console Firebase : neuf variantes du pilote envoyées.
Les lectures publiques des neuf variantes ont ensuite été contrôlées pour
LE ROY FACTORY, STUDIO ONE et RANDAL Général : 27 GET avec vérification
du type WebP, de CORS, des octets et du SHA-256. Le détail est dans
`publication-checks.json` ; les URL publiques exactes sont séparées dans
`published-assets.json`, gardé inactif pour éviter toute activation
d'une collection incomplète ou d'un format non compatible. Aucun jeton
d'authentification de compte n'a été lu ou exporté.

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
