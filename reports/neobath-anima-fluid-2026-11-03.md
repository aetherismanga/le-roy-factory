# Neobath Anima — composition simplifiée et vasques

Release : `20261103-neobath-anima-studio-one-fluid-5`.
Base : `caa206a9efb3f8be628675ad0d46454537680afe`.

## Comportement livré

- Cinq formes de caisson illustrées : deux tiroirs, un tiroir, deux portes, une porte et meuble haut. Pura est proposé d’abord, avec Ribelle ensuite. Les quarante-deux SKU fabricant ne sont pas supprimés ni redimensionnés.
- Un caisson sans cuve est un véritable meuble bas catalogue, avec dessus fermé et tiroir plein. L’ajout d’une vasque sélectionne automatiquement son équivalent sous-vasque réel ; son retrait rétablit le meuble bas. Les références, tarifs, géométries et passages de siphon changent ensemble. La largeur, la façade, l’identité et l’implantation sont conservées. Une conversion sans équivalent fabricant est refusée.
- Sur un plan continu, ce sont les caissons effectivement sous les cuves qui deviennent des sous-vasques. Le propriétaire du plan peut rester un meuble bas si la cuve se trouve au-dessus d’un autre support. Les passages suivent X et Z, y compris après déplacement ou changement de profondeur ; retirer la dernière cuve rétablit le tiroir plein.
- Les modifications sont validées sur toute la composition avant allocation/remplacement des caissons. Les objets anciens quittent la scène seulement après préparation valide. Une erreur annule la transaction ; les verrouillages et la lecture seule sont conservés. L’ouverture en cours des tiroirs garde ses déplacements en mètres, sans saut à la conversion.
- Les changements de couleur actualisent également leurs clés de tarif. Le changement de largeur ne peut plus récupérer une ancienne largeur pendant une conversion de rôle.

## Vasques et glisser-déposer

Le clic gauche maintenu sur une carte de vasque utilise le contrôleur de placement Studio One existant. Le dépôt vise un caisson ou le propriétaire de son plan continu, conserve la matière et les dimensions du plan compatible, applique une position réelle X/Z et propose une aimantation proche limitée à 18 cm. Le dépôt ne crée aucun deuxième meuble ni deuxième plan. La finition fumée/bronze et les options de fond choisies suivent la vasque. Échap, perte de capture, second contact, support incompatible et lecture seule annulent le geste.

Les assemblages de vasques sont remplacés de façon atomique. Les changements de couleur seuls ne reconstruisent pas inutilement les meshes. Les coques fermées utilisent leurs faces orientées, évitant le cumul des faces avant/arrière dans les finitions fumées. Les profils HPL/Fenix et grès différencient leurs bondes, couvercles et pentes d’après les visuels fabricant : A/B/C/D/E/EB ne partagent plus une unique cuve générique. Le gelcoat blanc EB est indépendant du veinage du plan. La nuance du gelcoat coloré E reste une interprétation indicative en l’absence de palette fabricant documentée.

Les cartes A/B/C/D/E correspondent à cinq photographies fabricant distinctes ; E et EB partagent un visuel de famille identifié. Les photos montrent les formes, tandis que la finition choisie s’applique à la 3D.

## Fumé et tablette de fond

Source : catalogue officiel Anima 2026, PDF p.75, pages imprimées 148–149 : https://www.diffusionedesign.com/wp-content/uploads/2026/09/NEOBATH-ANIMA-2026.pdf . ECLISSE114/115/116 et leurs versions /S sont en Ocritech. `/S` signifie semi-encastré.

- « Sans tablette de fond » conserve le fond étanche et la bonde de la cuve.
- La tablette blanche TVL114/115/116 est une option distincte : 188 € HT / 225,60 € TTC.
- Le support ABS noir SUP114/115/116 est indépendant : 105 € HT / 126 € TTC. Il n’est pas automatiquement ajouté avec la tablette.
- Une même référence n’est facturée qu’une fois, même si elle apparaît aussi dans le champ générique d’accessoire.
- Les options sont limitées aux Eclisse fumées/bronze compatibles ; le passage au blanc opaque ou à un autre modèle les réinitialise.

Les dimensions industrielles des tablettes et supports ne sont pas publiées ; leur géométrie est une reconstruction de prévisualisation. Les valeurs optiques fumé/bronze restent indicatives, issues d’échantillons génériques Ocritech et non d’un nuancier Neobath calibré. Les cuves intégrées HPL/Fenix H6 restent interdites conformément à la note fabricant ; cette restriction n’est pas étendue sans preuve aux vasques à poser.

## Validation et publication

193 tests Anima réussissent, y compris les API privées, sauvegardes, tarifs, rôles sur plan continu, annulations, animations, accessoires, glisser-déposer et les 791 combinaisons de géométrie. Le noyau et la construction du site public réussissent ; les fichiers privés restent exclus de Pages. Les entrées et le moteur Studio One originaux restent inchangés ; seules les adaptations Anima sont compilées.

Contrôle des véritables composants DOM en navigateur : meuble bas initial ; ajout Eclisse fumé → sous-vasque ; tablette blanche → ajout exact de 225,60 € ; retrait de la cuve → retour au meuble bas. Contrôle en largeur de 360 px. Le GPU du navigateur de contrôle reste désactivé : les tests CPU/raycast et DOM ne constituent pas une validation du rendu WebGL final.

La publication conserve les identités Firebase vérifiées de Jérôme et Coryne uniquement, le contrôle de révocation serveur et les réponses privées sans cache. Seule la fonction `neobathAnimaApplication` est concernée ; aucun déploiement des deux configurateurs Randal.
