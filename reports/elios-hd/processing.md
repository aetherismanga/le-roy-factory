# Préparation des faces officielles ELIOS — 23 octobre 2026

Les originaux proviennent de la photothèque professionnelle officielle et sont
conservés hors Git. Les outils de préparation ne se connectent pas au portail
et ne publient aucun fichier. Aucun identifiant, cookie, lien de session ou
chemin privé d'original n'est enregistré dans les inventaires versionnés.

## Ressources préparées et hébergées

| Collection | Faces récupérées | Variantes WebP | Haute qualité réelle | Octets des variantes |
|---|---:|---:|---|---:|
| Quercia | 118 | 354 | Définition native, grand côté de 906 ou 1 200 pixels | 15 280 432 |
| Creta | 3 | 9 | Grand côté de 4 096 pixels | 5 856 594 |
| Total | 121 | 363 | Selon la source de chaque collection | 21 137 026 |

Les 118 originaux Quercia pèsent 19 376 910 octets et les trois originaux Creta
387 872 271 octets. Ils sont conservés. Quatre photos d'ambiance Quercia,
2 416 573 octets au total, ont aussi été récupérées ; elles restent distinctes
des faces de carreaux et ne sont pas utilisées comme matériaux de pose.

Quercia couvre quatre coloris, huit références exactes et deux formats natifs.
Les 118 noms présents dans les dossiers de textures du portail sont tous
couverts. La liste Amber 24 × 120 contient 13 fichiers : les indices `@1` et
`@10` n'y figurent pas. Le catalogue annonce 15 motifs pour chacun des deux
formats ; cette indication n'est pas une déclaration explicite de 15 fichiers
pour chaque SKU ni d'un total de 120 fichiers. Aucun fichier manquant n'a été
recréé ou dupliqué.
Creta reste un pilote incomplet de trois faces 60 × 120 cm.

## Outils et contrôles des sources

`prepare_elios_hd.py` prépare une face. `ingest_elios_queue.py` traite une
photographie de la file privée des téléchargements, avec `--collection creta`
par défaut ou `--collection quercia`. Seuls les noms et correspondances relus
dans `reference-mapping.json` sont acceptés. Quercia utilise son inventaire
séparé `quercia-inventory.json` ; le pilote Creta reste dans `inventory.json`.

Avant d'accepter un fichier Quercia, l'outil vérifie son nom exact, sa référence,
sa présence dans la liste officielle et sa taille contre l'observation du
portail, à cinq octets près pour l'arrondi des Ko décimaux. Une empreinte connue
est aussi contrôlée lorsqu'une observation antérieure en fournit une. Une
source tronquée, un changement d'octets d'une face déjà vérifiée ou un fichier
substitué au fichier témoin connu sont refusés. Les empreintes consignées sont
calculées sur les téléchargements ; elles ne sont pas présentées comme des
sommes de contrôle publiées par le fabricant.

Les 118 sources Quercia ont été relues indépendamment : JPEG RGB avec ICC
embarqué, dimensions natives, taille officielle, SHA-256 et absence de doublons
par contenu. Les tests de refus d'une source tronquée et d'un fichier de même
taille dont l'empreinte connue diffère ont réussi.

## Conversion et niveaux de qualité

- SHA-256 de l'original calculé par blocs de 1 Mo.
- Décodage JPEG réduit par libjpeg avant chargement complet des grands
  originaux Creta. Le premier original de 7 795 × 15 591 pixels est décodé en
  3 898 × 7 796 pixels avant la réduction finale.
- Rotation horaire explicite de 90° des faces portrait vérifiées. Les références
  sources restent 60 × 120, 24 × 120 et 20,3 × 90,6 cm ; les dimensions de rendu
  sont transposées. `textureRotation: 0` décrit les variantes déjà orientées.
- Conversion du profil ICC embarqué, CMYK pour les témoins Creta et RGB pour
  Quercia, vers sRGB par LittleCMS, avec intention colorimétrique relative et
  compensation du point noir. Aucune modification créative de teinte ou motif.
- Aucun recadrage, miroir ou agrandissement. La géométrie conserve les dimensions
  commerciales vérifiées ; une source rectangulaire ne devient pas une face
  native d'un format carré, rectifié ou d'une autre référence.
- Trois profils WebP : `fluid`, grand côté limité à 256 pixels ; `balanced`,
  limité à 1 024 ; `max`, limité à 4 096 et à la définition native de la source.
  Quercia reste donc à 906 ou 1 200 pixels au maximum et n'est pas présenté
  comme un master 4K. Qualités WebP 90 / 90 / 94, avec profil sRGB embarqué.
- Relecture et décodage de chaque variante, contrôle des dimensions, du profil
  ICC, des octets et du SHA-256. Les variantes maximales Quercia conservent
  exactement les dimensions des sources tournées.
- Noms immuables dérivés des octets et de la recette ; refus d'écraser un fichier
  existant dont les octets diffèrent. Les images volumineuses restent hors Git.

Le décodage réduit et WebP sont des traitements avec perte. Les variantes ne
sont pas présentées comme des copies sans perte. Une source CMYK sans ICC est
refusée ; une source RGB sans ICC reste à vérifier et n'est pas rendue prête
pour intégration automatiquement. Aucun original n'est supprimé par ces outils.

## Droits et publication des fichiers

Le 23 octobre 2026, l'utilisateur a confirmé être agent d'usine Elios et détenir
l'autorisation d'utiliser ces visuels dans les configurateurs LE ROY FACTORY.
`--reuse-authorized` enregistre `reuseAuthorization: confirmed-by-user`.
`readyForIntegration` exige aussi l'identité, le format et le profil ICC vérifiés.
Ce statut est distinct de l'hébergement, de l'activation et du déploiement.
La preuve retenue est la confirmation utilisateur, sans prétendre avoir reçu
un contrat signé du fabricant ou trouvé une nouvelle licence publique.

Les 363 variantes ont été envoyées dans le stockage Firebase existant par la
console connectée. L'accès d'écriture est confirmé et ne constitue pas un
blocage. Aucun identifiant de stockage ou jeton d'authentification de compte
n'a été lu ou exporté par les outils de préparation et de contrôle.

`check_elios_publication.py` a contrôlé les neuf variantes Creta : 27 GET.
`check_quercia_publication.py` a contrôlé les 354 variantes Quercia : 1 062 GET.
Chaque fichier a été lu depuis les trois origines LE ROY FACTORY, STUDIO ONE et
RANDAL Général. Les 1 089 contrôles ont réussi : HTTP 200, WebP, CORS lisible,
nombre d'octets et SHA-256 identiques aux variantes locales.

Les détails sont dans `publication-checks.json` et
`quercia-publication-checks.json`. Les URL publiques exactes observées dans la
console sont conservées dans `published-assets.json` et
`quercia-published-assets.json`, sans reconstruction de chemin ou de jeton.
Ces manifestes de provenance restent `enabled: false` ; l'application aux
catalogues des configurateurs est une opération distincte contrôlée par son
outil d'intégration. Le pilote Creta incomplet n'est pas activé.

## Portée des vérifications

La face Creta initiale a été retraitée dans deux processus Python : les
empreintes WebP sont identiques. Avant rotation, la mesure initiale était de
6,29 secondes et 380 684 Kio de mémoire maximale. Il s'agit de préparation
locale, pas d'une mesure des performances des configurateurs sur smartphone.
Le refus d'une sortie image dans le dépôt Git a aussi été contrôlé.

Les contrôles des fichiers, les tests logiques et les builds ne constituent
pas une validation visuelle GPU ou un essai sur matériel réel. Le navigateur
cloud de contrôle a montré WebGL2 désactivé, y compris sur RANDAL Général avant
ces changements. L'accès interactif à la prévisualisation Plan & Pose reste
également limité par la protection Vercel. Aucun test visuel GPU ni contrôle
interactif 2D de cette prévisualisation n'est donc annoncé comme réussi ici.
Les essais sols, murs, cloisons, calepinages, captures et rendus sur matériel
compatible restent à effectuer avant de conclure à leur validation visuelle.
