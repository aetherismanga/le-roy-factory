# Neobath Anima — détails, plans indépendants et équipements

Release : `20261103-neobath-anima-studio-one-details-6`.
Base : `46bf7831f32605a630148475a44e1c2949d1d6d0` ; conserve la publication du calculateur de ragréage arrivée pendant ce travail.

## Implantation et équipements

Le changement Pura/Ribelle conserve l'identité, la largeur catalogue, les équipements, l'ouverture animée, la position murale, l'altitude et l'orientation effectives du caisson. Il n'applique plus une nouvelle hauteur de pose par défaut. Les transactions valident l'ensemble avant remplacement et restaurent les objets en cas d'échec.

Une section « Plans de travail » ajoute des plans indépendants sans caisson : matières, épaisseurs, longueurs, profondeurs, finitions, vasques et positions X/Z. Les formats fixes gardent le modèle, le nombre de cuves et leur implantation manufacturée ; aucun format inconnu ne remplace silencieusement une référence par un autre modèle. Déplacement, réouverture, glisser-déposer des vasques, aperçu devis et prix sont pris en charge. Les fixations et supports muraux ne sont pas inclus ; les profondeurs spéciales restent sur devis.

SideBar peut être placé à gauche ou à droite, puis sélectionné dans la scène pour changer sa couleur. Sa géométrie respecte l'enveloppe publiée 40 × H 2,5 × P 5 cm. Les dépassements du mur et les collisions latérales avec un autre caisson/accessoire du même mur sont refusés, sans agrandir fictivement le SKU du caisson.

Bridge propose les largeurs documentées 80/100/120/140 cm, P 43,5 cm, H 15 ou 35 cm, aluminium noir mat. Le choix explicite place le piètement au sol ; le retrait restaure la hauteur suspendue précédente. Les caissons supports d'un même plan continu changent ensemble ; un membre sans variante compatible bloque l'opération entière. Les parties de tube non cotées restent une reconstruction. Le pied individuel PIE35 visible dans DNA ne possède pas ici de compatibilité Anima, quantité/kit, fixation et tarif Anima suffisamment établis : aucun lot fictif n'est créé.

## Géométrie et robinetterie

Les prises intégrées sont des profils courbes avec une bande de prise lisse. Ribelle utilise des cannelures en relief, des plateaux étroits et des creux arrondis. Les intérieurs de tiroirs ont un aspect gris textile non métallique ; les coulisses métalliques conservent leur matériau. Les UV sont dimensionnés en mètres.

ECLISSE114/S possède une plage arrière percée, une ouverture de cuve décalée et une partie semi-encastrée visible. Cette particularité provient de sa photographie identifiée dans DNA ; elle n'est pas attribuée sans preuve aux autres Eclisse. Les cuves, bords, perçages et bondes sont de véritables surfaces. La géométrie et le type de bonde suivent la vasque sélectionnée, indépendamment de la matière du plan.

Les mitigeurs attachés sont filtrés sur la géométrie réellement modélisée : embase, perçage, hauteur et portée au-dessus de la cuve. Une référence inconnue ou incompatible est refusée ; aucune substitution automatique n'est faite. Le contrôle s'applique aussi aux plans indépendants et aux aperçus devis. La robinetterie attachée reste explicitement exclue du chiffrage Anima.

## Sources et limites de précision

Source des caissons et des prix : catalogue pro ANIMA 2026, PDF 81 pages, correspondant au PDF officiel : https://www.diffusionedesign.com/wp-content/uploads/2026/09/NEOBATH-ANIMA-2026.pdf . Détails : p.9 poignées et intérieurs ; p.54 SideBar ; p.56–57 Bridge ; p.58 schémas H26/H52 ; p.62 BRIDGE100 ; p.65–67 prises ; p.75 Eclisse/TVL/SUP. DNA sert aux visuels des équipements communs, notamment p.42 ECLISSE114/S et p.53 grès, sans fournir de prix ni de caissons à Anima.

BRIDGE100 H35 : 262 € HT. SideBar noir/chrome : 115 € HT. Les autres variantes dimensionnelles Bridge et le SideBar blanc restent sur devis faute de référence/prix Anima suffisamment établis. Aucune grille DNA ni aucun tarif inventé n'est utilisé.

Les dimensions extérieures cotées sont conservées. Le pas/profondeur des cannelures, la section de prise, les courbes intérieures des cuves, l'épaisseur des parois, les perçages reconstruits et les teintes photographiques non calibrées ne constituent pas un gabarit industriel de fabrication ou de pose. Les vérifications de mitigeurs utilisent ces enveloppes et profils de prévisualisation ; elles ne remplacent pas un gabarit fabricant.

## Validation

235 tests Anima réussissent, sans échec ni test ignoré. Le détail des contrôles est conservé dans les suites Anima : positions et matrices réelles, Bridge/SideBar, transactions de groupe, sauvegarde/validation privée, tarifs, plans indépendants, perçages/raycast, cuves semi-encastrées et mitigeurs. Le noyau et le build public réussissent ; les sources Studio One, Catalogue Général et moteur partagé restent inchangées. Les bundles privés gzip et leurs empreintes sont recompilés depuis les entrées originales Studio One.

Contrôle navigateur des vrais composants DOM : sélection Bridge35, SideBar côté droit et chrome, plan Fenix sans meuble, longueur180/profondeur60 et statut sur devis. Des vues CPU des vrais maillages permettent de rechercher les trous et faces inversées. Le GPU du navigateur de contrôle est indisponible : ces contrôles ne constituent pas une validation du rendu WebGL final.

La publication est limitée à la fonction `neobathAnimaApplication` et au chargeur Pages. L'accès reste réservé aux identités Firebase vérifiées de Jérôme et Coryne, avec contrôle de révocation et réponses privées sans cache.
