# Neobath Anima — matières, vasques et entrée directe

## Parcours

Nouveau projet ouvre directement le véritable atelier Studio One avec un meuble
Pura 80 valide. Reprendre et Modifier mes choix ouvrent aussi l’atelier. Les
projets enregistrés sont conservés ; le parcours préalable à six écrans n’est
plus imposé. L’accueil garde ses commandes et sa photographie fabricant HD.

Le panneau plan est organisé par famille, modèle/épaisseur, supports, dimensions,
matière puis vasque. Une photographie montrant une vasque ne fait plus croire
qu’elle est incluse dans le prix d’un plan seul. Les tarifs du plan et de la
vasque restent séparés ; le choix Fenix/HPL est conservé après l’ajout d’une cuve.

## Surfaces et textures

40 choix : 11 Fenix, 14 HPL, 11 grès, 2 Geacril et 2 Geacril Stone.
51 nouveaux WebP, 13,75 Mo, résolution maximale de production 2048 pixels.
Les Fenix unis utilisent le RGB officiel du fabricant dans leur matériau mat :
une photographie éclairée ne modifie pas leur teinte. Les photos officielles
restent visibles dans les vignettes. Les sources Adobe RGB ont été converties
vers sRGB pour les dérivés. HPL et grès utilisent les vrais motifs de surface.

Les sources HD sont corroborées pour les 11 Fenix, les 14 HPL et 9 grès. Pour
Ceppo Pietra d’Iseo et Travertino, les candidats HD de motifs différents ont été
rejetés. Leurs vrais échantillons du PDF restent à leur résolution native de
182 pixels. Aucune texture n’est inventée ou artificiellement agrandie. Les
origines, dimensions et correspondances sont consignées dans le manifeste.

Chaque plan possède son matériau indépendant : il n’est plus peint en blanc
comme une vasque céramique, ni modifié lors d’un changement de façade. Les
textures chargées sont limitées par un cache de quatre entrées et libérées.

## Ribelle et géométrie

Le profil Ribelle a un relief continu avec normales analytiques lissées. Les UV
conservent une échelle cohérente, la bonne orientation des pixels et le même
échantillon pour la couleur et le relief. Le wrapping miroir supprime les
raccords des photos bois non répétables. Le grain ne forme plus les grandes
boucles croisées du rendu antérieur.

Picasso DX/SX conserve sa grande cuve dans les limites du plan. Les centres
autoritaires sont partagés par les trous, coques, robinets, passages de siphon
et validation. Les triangulations, normales, coutures et découpes sont corrigées.
Les robinets suivent leurs vrais perçages latéraux quand le bandeau arrière
est insuffisant ; un montage mural requis ne reçoit pas un robinet posé flottant.

Les trois Eclisse/S sont semi-encastrées, avec une découpe de coque réelle.
Le rebord apparent de 25 mm est une reconstruction visuelle ; la profondeur
d’encastrement industrielle n’est pas documentée et reste à confirmer. Les
dimensions extérieures du catalogue sont conservées.

La lecture des colonnes Eclisse p.148–149 corrige aussi le tarif : Opaco/blanc
mat 492 € HT, Fumé et Bronze 540 € HT. Les nuances Fumé/Bronze proviennent de
nuanciers génériques Ocritech Onsen, sans prétendre à une calibration Neobath ;
une note de rendu indicatif accompagne ces options.

## Plans personnalisés

La longueur de fabrication est indépendante de la somme des caissons supports.
Exemple : plan de 147 cm sur 100 + 40 cm de caissons réels, avec débords gauche
et droit visibles, facturé une seule fois sur 147 cm. Les caissons ne sont pas
agrandis fictivement. La position des cuves reste contrôlée sur les sous-vasques.

La plage 60–240 cm est une limite actuelle de l’atelier, non une limite fabricant
revendiquée. Les dimensions sur mesure sont soumises à confirmation de fabrication.
Les profondeurs non universellement documentées reprennent les implantations
sourcées par famille et sont présentées comme dimensions de prévisualisation.

## Vérification et publication

126 tests consolidés réussis, dont 791 combinaisons de géométrie couvrant 137
références, les 40 matières avec les vrais matériaux des meshes, les variantes
Eclisse, les transitions, la sauvegarde stricte, la facturation et les accès.
Le noyau partagé et les contrôles PLAN & POSE/tarifs réussissent. Le paquet serveur
est validé dans un répertoire isolé sans accès aux fichiers publics du site.

Le navigateur contrôle l’entrée Nouveau projet directement vers l’atelier et
les vrais formulaires natifs sur mobile. Exemple testé : Fenix Blu Shaba de
90 cm sur caisson 80, débords 5/5 cm, ajout VASCA A50 en conservant la longueur,
la matière, le modèle TFX1 et les tarifs séparés. Pas de débordement horizontal
sur le formulaire mobile 390 pixels.

Six rendus CPU indépendants des vrais meshes et UV ont été inspectés : Picasso
DX/SX, Ribelle Rovere, Fenix, HPL et grès. Ils contrôlent les formes et textures,
sans reproduire exactement l’éclairage WebGL. WebGL est désactivé dans le
navigateur de contrôle ; aucune validation visuelle GPU n’est revendiquée.

L’accès reste réservé aux deux agents Firebase vérifiés Jérôme et Coryne. Les
ressources privées restent exclues du site public et les jetons ne pénètrent
pas l’iframe. Aucun message ni commande n’est envoyé pendant les tests.
