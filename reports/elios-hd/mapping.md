# Correspondances vérifiées des ressources ELIOS

Ce relevé décrit des correspondances factuelles. Il n’active aucune texture et ne remplace pas le manifeste de production.

## Creta

Source : catalogue fabricant `ELIOS_CATALOGO-CRETA_2026.pdf`, page PDF 28, pages imprimées 52–53. Le tableau a été extrait puis revu visuellement.

| Référence du fichier maître | Coloris | Format de la référence | Finition |
|---|---|---|---|
| 03V6A00 | Zucchero | 60 × 120 cm | R9, rectifié, 8,5 mm |
| 03V6A10 | Avena | 60 × 120 cm | R9, rectifié, 8,5 mm |
| 03V6A20 | Malto | 60 × 120 cm | R9, rectifié, 8,5 mm |
| 03V6A30 | Biscotto | 60 × 120 cm | R9, rectifié, 8,5 mm |
| 03V6A50 | Ginepro | 60 × 120 cm | R9, rectifié, 8,5 mm |
| 03V6A60 | Matcha | 60 × 120 cm | R9, rectifié, 8,5 mm |
| 03V6A80 | Caramello | 60 × 120 cm | R9, rectifié, 8,5 mm |
| 03V6A90 | Pepe | 60 × 120 cm | R9, rectifié, 8,5 mm |

Les suffixes `@1`, `@2`, etc. désignent les faces de la référence. Les 57 noms inventoriés dans MINIMALI ont été rapprochés de ces huit coloris et des quatre décors disponibles dans cet inventaire. Les 57 noms inventoriés ne signifient pas que 57 fichiers ont été téléchargés.

`03V6ADC` est le décor Coccio ; `03V6ADF`, le décor Pintura ; `03V6AD1`, Cloé Avena ; `03V6AD0`, Cloé Zucchero. Ils doivent rester distincts des teintes de base. Le coloris « Coccio » présent dans l’ancien manifeste ne constitue pas une neuvième couleur unie.

Les décors Spiga `03V6AD4` et `03V6AD5` sont aussi référencés au catalogue, mais absents de l’inventaire Creta reçu lors de ce contrôle. Le fabricant impose un sens de pose : toutes les flèches suivent la même direction. Le sens doit être conservé dans les calepinages.

Les autres formats commerciaux du même coloris figurent dans le JSON à titre de correspondance catalogue. Une face 60 × 120 ne doit pas être étirée pour produire un carré. Une adaptation par recadrage doit conserver l’échelle de la matière et ne doit pas être présentée comme une face native d’un autre format.

Source officielle : https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_CATALOGO-CRETA_2026.pdf

## Quercia

Source : catalogue général officiel `ELIOS_CATALOGO-GENERALE-2026.pdf`, page PDF 43, pages imprimées 82–83. Le tableau des références et l'encadré de développement graphique ont été revus visuellement.

| Coloris | Référence 24 × 120 cm | Référence 20,3 × 90,6 cm |
|---|---|---|
| White | 00Y2C00 | 00Y2900 |
| Honey | 00Y2C40 | 00Y2940 |
| Amber | 00Y2C70 | 00Y2970 |
| Natural | 00Y2C60 | 00Y2960 |

Ces huit références correspondent aux versions R10 B, non rectifiées, de 8,5 mm. Les fichiers ne sont pas attribués aux formats rectifiés 23,4 × 119,5 ou 19,7 × 90,3 cm, aux versions R11 C, aux dalles 40 × 120 cm ni à une référence voisine.

Les 118 faces réellement présentes dans les dossiers de textures du portail ont toutes été téléchargées, contrôlées et préparées sous 354 variantes. Sept références ont quinze fichiers et `00Y2C70` (Amber, 24 × 120) en a treize : les indices `@1` et `@10` sont absents de sa liste. Le catalogue annonce explicitement quinze motifs par format 24 × 120 et 20,3 × 90,6 ; l'encadré ne déclare pas un total de quinze fichiers pour chaque SKU ni un total de 120 fichiers. Le nombre récupéré reste donc 118, sans duplication pour compléter une numérotation.

Toutes les sources vérifiées sont des JPEG RGB avec ICC embarqué. Après rotation horaire de 90°, les moteurs utilisent les dimensions commerciales transposées ; les pixels sources sont conservés sans recadrage ni agrandissement. Le grand côté natif maximal est de 906 ou 1 200 pixels selon le format. La qualité haute Quercia n'est pas présentée comme une texture 4K.

Les URL publiques et les contrôles sont dans `quercia-published-assets.json` et `quercia-publication-checks.json` : 1 062 GET réussis pour les 354 variantes depuis trois origines, avec CORS, octets et SHA-256 exacts. Le manifeste de provenance reste inactif ; l'application aux catalogues, les prévisualisations et le déploiement sont contrôlés séparément. Les quatre photos d'ambiance Quercia récupérées ne sont pas des faces de matériaux et n'entrent pas dans ce compte.

Source officielle : https://eliosceramica.com/wp-content/uploads/2026/02/ELIOS_CATALOGO-GENERALE-2026.pdf

## Azuli Mood

La table de correspondance de la page PDF 34, page imprimée 66 du catalogue dédié a été extraite et revue visuellement. Onze couleurs sont disponibles en 10 × 10 cm (`04Q10xx`) et en 5 × 15 cm (`04Q55xx`). Les deux familles de faces doivent conserver leur ratio respectif. Les quart-ronds et mosaïques sont explicitement séparés dans le JSON.

Ces vérifications documentaires ne signifient ni téléchargement ni intégration des textures Azuli Mood. Aucune correspondance spéculative des autres collections n’est ajoutée.

Source officielle : https://eliosceramica.com/wp-content/uploads/2026/07/ELIOS_CATALOGO_AZULI-MOOD_new.pdf

## Droits et activation

Le 23 octobre 2026, Jérôme a confirmé être agent d’usine Elios et disposer de l’autorisation d’utiliser les visuels dans les configurateurs LE ROY FACTORY. Cette confirmation utilisateur est retenue pour la mission et lève le blocage des droits. Elle ne signifie pas qu’un contrat signé du fabricant a été reçu ni qu’une licence publique explicite a été trouvée lors de l’inspection initiale.

L’accès d’écriture au stockage Firebase est confirmé. Les 363 variantes préparées, 354 Quercia et neuf Creta, sont hébergées et leurs lectures publiques ont passé 1 089 contrôles. L’activation locale, les prévisualisations et la publication de production restent des étapes distinctes ; aucune autorisation supplémentaire n’est demandée au titre des droits déjà confirmés.

Ce relevé ne contient aucun identifiant, mot de passe, cookie ou lien de session. Seules les ressources effectivement téléchargées, optimisées et contrôlées peuvent être comptées comme récupérées. L’hébergement, l’activation et les tests des trois configurateurs restent des étapes distinctes.
