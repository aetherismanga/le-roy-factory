# ELIOS HD — état de la mission au 23 octobre 2026

## Ressources récupérées et hébergées

| Collection | Faces de carreaux récupérées | Références concernées | Variantes hébergées | Haute qualité réelle |
|---|---:|---:|---:|---|
| Quercia | 118 | 8, quatre coloris et deux formats | 354 | Définition native : 906 ou 1 200 pixels au grand côté |
| Creta | 3 | 3, format 60 × 120 cm | 9 | 4 096 pixels au grand côté |
| Total | 121 | 11 | 363 | Selon la définition de chaque source |

Les 363 variantes WebP sRGB pèsent 21 137 026 octets. Les 121 originaux de faces,
407 249 181 octets, restent hors Git et sont conservés. Quatre photos d'ambiance
Quercia ont aussi été récupérées, soit 2 416 573 octets supplémentaires. Elles
sont comptées séparément et ne sont pas utilisées comme faces de carreaux.

Quercia couvre tous les 118 fichiers de textures présents dans les dossiers
observés du portail. Les huit références vérifiées sont :

| Coloris | 24 × 120 cm | 20,3 × 90,6 cm |
|---|---|---|
| White | 00Y2C00 | 00Y2900 |
| Honey | 00Y2C40 | 00Y2940 |
| Amber | 00Y2C70 | 00Y2970 |
| Natural | 00Y2C60 | 00Y2960 |

Il s'agit des versions R10 B, non rectifiées, de 8,5 mm. Le dossier Amber
24 × 120 contient treize fichiers ; les indices `@1` et `@10` n'y sont pas
présents. Le catalogue annonce quinze motifs par format, sans déclarer
explicitement quinze fichiers pour chaque SKU ou un total de 120 fichiers.
Aucune face manquante n'a été inventée ou dupliquée.

Creta reste un pilote incomplet : `03V6A00@1.jpg` (Zucchero), `03V6A10@1.jpg`
(Avena) et `03V6A20@1.jpg` (Malto), en 60 × 120 cm. Ces trois faces ne sont pas
activées comme une collection complète.

## Configurateurs : activation locale et prévisualisations

Les huit références Quercia sont activées dans les catalogues locaux de
RANDAL Général, RANDAL Studio One et LRF Plan & Pose. Le contrôle natif des
huit SKU avec exigence d'activation a réussi. Les variantes sont associées à
la référence et au format exacts : les versions rectifiées, R11 et 40 × 120
conservent leurs ressources précédentes. Les références et ressources des
autres fabricants ne font pas partie de ce lot d'activation.

Les faces sont déjà tournées de 90° ; leur rotation de texture est donc zéro,
et la géométrie garde les dimensions commerciales vérifiées. Le travail en
qualité légère conserve la possibilité d'utiliser le profil maximal lors des
captures et rendus. Le profil maximal Quercia conserve sa définition native ;
il n'est pas présenté comme un master 4K. Les variantes Creta atteignent 4 096
pixels, mais restent hors de l'activation de ce lot.

Les manifestes de provenance `published-assets.json` et
`quercia-published-assets.json` restent `enabled: false`, conformément au
contrôle d'application. Cette valeur est distincte de l'activation des champs
précis dans les catalogues générés des applications.

Les trois prévisualisations restent à déployer, séparément de la production.
**Aucune mise en production de ces nouvelles textures n'est annoncée par ce
rapport.** Les builds et suites logiques finaux accompagnent cette préparation.

## Vérifications réalisées et limites

- Les 118 sources Quercia ont été vérifiées contre les noms exacts et les tailles
  du portail à cinq octets près. Les empreintes sont uniques, les JPEG sont RGB
  avec ICC embarqué et leurs dimensions natives sont conservées sans agrandissement.
- Les profils ICC des témoins Creta et des faces Quercia ont été convertis en
  sRGB. Dimensions, rotation, décodage WebP, octets et empreintes ont été vérifiés.
  Les tests de refus d'une source tronquée ou substituée, d'une source CMYK sans
  ICC et d'une écriture d'image dans Git ont réussi.
- Les 354 variantes Quercia ont passé 1 062 GET publics, depuis LE ROY FACTORY,
  STUDIO ONE et RANDAL Général. Les neuf variantes Creta ont passé 27 contrôles
  équivalents : 1 089 contrôles réussis au total, HTTP 200, type WebP, CORS lisible,
  nombre d'octets et SHA-256 identiques aux fichiers préparés.
- Les contrôles de sélection des huit références activées ont réussi. Les
  suites logiques et builds des trois applications sont contrôlés séparément
  des réponses HTTP et des fichiers publiés.

Les rapports détaillés sont `quercia-inventory.json`,
`quercia-publication-checks.json`, `inventory.json` et `publication-checks.json`.

Le navigateur cloud de contrôle a montré WebGL2 désactivé, y compris sur la
version de RANDAL Général antérieure à ces changements. Une validation visuelle
GPU des textures n'a donc pas pu être menée dans cet environnement. La
prévisualisation Plan & Pose est également protégée par l'authentification
Vercel dans le navigateur ; une réponse HTTP autorisée ne valide pas son usage
interactif. Aucun contrôle visuel GPU ni test interactif 2D de cette
prévisualisation n'est annoncé comme réussi.

Il reste à vérifier sur un navigateur et du matériel compatibles les sols,
murs, cloisons, poses, couleurs affichées et captures HD, ainsi que les
performances sur smartphone et ordinateur modeste. Ces essais précèdent une
conclusion de validation visuelle et de production.

## Droits et accès

Le 23 octobre 2026, l'utilisateur a confirmé être agent d'usine Elios et disposer
de l'autorisation d'utiliser ces visuels dans les configurateurs LE ROY FACTORY.
Cette confirmation lève le blocage des droits pour la mission. Elle est
consignée comme déclaration utilisateur, sans prétendre qu'un contrat signé du
fabricant a été reçu ou qu'une nouvelle licence publique a été trouvée.

L'accès d'écriture Firebase est confirmé : les 363 variantes ont été envoyées
par la console existante et leurs octets publics ont été contrôlés. Les droits
et la connexion Firebase ne sont pas des blocages actuels. Aucun identifiant,
mot de passe, cookie ou jeton d'authentification de compte n'est présent dans
les rapports ou le code. Seules les URL publiques des images sont versionnées.

## Périmètre restant

L'inventaire du portail comprend 32 dossiers de collections et 391 dossiers,
avec 6 555 fichiers listés : 5 969 images de textures, 475 ambiances, un PDF,
un fichier `.jps` à vérifier et 109 fichiers parasites exclus. Le poids affiché
est d'environ 90 Go. Ces nombres décrivent une liste de ressources et ne sont
pas un téléchargement complet ni un dédoublonnage par contenu.

Les autres collections restent à récupérer et à rapprocher de leurs références
exactes ; Creta doit être complétée. Les particularités observées comprennent
Skultura, avec 37 ambiances mais aucun dossier MINIMALI, Stone Icon avec un
seul dossier AMBIENTI vide, et 24 faces Mysterium avec treize ambiances rangées
sous Magnus. Le fichier Shell Ivory `.jps` doit être vérifié et la copie de
travail Allure doit être exclue ou comparée par empreinte.

Les inventaires privés détaillés avec liens du portail restent dans le dossier
de reprise, hors Git. Les futures activations doivent conserver les mêmes
contrôles de provenance, référence, format, contenu et profil, puis les essais
visuels et de performance avant déploiement de production.
