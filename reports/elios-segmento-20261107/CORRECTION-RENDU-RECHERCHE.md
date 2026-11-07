# Segmento — correction du rendu et recherche

Le mur affichait des carreaux verts dans la composition bleue S01-C car la première transcription des dessins PDF en cellules avait confondu certaines références. Les vérifications précédentes validaient la cohérence du JSON et des calculs sans vérifier assez précisément chaque affectation par rapport au PDF.

La revue complète des 48 compositions corrige 147 affectations de couleurs et 21 rotations liées aux anciennes références erronées, dans 9 compositions. S01-C comprend désormais 20 Duplex C et 16 Coelestis, sans Lapis. Les données corrigées alimentent les schémas, les deux ateliers Randal et la variante privée Neobath ; leurs quantités par référence suivent les corrections.

## Validation du rendu

Les vrais triangles indexés, groupes de matériaux et UV du maillage sont rasterisés avec les textures fabricant. La preuve S01-C-verification.jpg compare le PDF, le maillage avant et le maillage corrigé. Sol/mur, coordonnées négatives et répétitions sont identiques pixel pour pixel ; la direction verticale conserve la rotation attendue. Les tests inspectent les véritables fonctions de chargement et d’application de matériaux des trois applications, les attentes de textures, changements de composition, réapplications et découpes. Un oracle indépendant valide les achats par référence des 9 compositions corrigées.

## Recherche des variantes

Les 48 compositions sont regroupées sous les 12 motifs. Le sélecteur affiche le nombre de variantes de chaque motif ; la recherche accepte couleur, nom, référence ou numéro. Les filtres sont cumulables et persistent après application. Parcourir un motif ou filtrer ne modifie pas la surface : seul le choix d’une composition l’applique. La composition courante reste visible. Les 16 carreaux seuls et les palettes des surfaces secondaires restent accessibles.

Le composant réel a été vérifié dans une fenêtre mobile de 390 px : motif 11, recherche 04I15D0, application S11-G, maintien du filtre et de la recherche. Les calculs, l’accès privé et les compilations font partie des contrôles de publication. WebGL 2 reste indisponible dans ce navigateur ; aucune validation de la scène éclairée par GPU n’est revendiquée.

Validation finale : noyau et contrôles des deux ateliers réussis ; 15 tests ciblés Segmento, 88 tests Anima et 589 tests PLAN & POSE/sécurité réussis (1 test ignoré). Les trois applications et le site ont été compilés.

Publication Pages : la première synchronisation a dépassé les 10 minutes ; la relance du même identifiant a été annulée. Un nouvel envoi exclut uniquement les quatre PNG sources des ambiances extérieures (13 955 686 octets), conservés dans Git. Leurs WebP lossless actifs, 1536 × 1024, sont identiques pixel pour pixel. Aucun nouveau déploiement des ateliers ni de la fonction privée n’est nécessaire pour cet ajustement de publication.

Dernier contrôle du vrai cycle de l’inspecteur : son contenu est recréé après application. Les filtres sont désormais conservés sur son corps stable, avec états séparés pour sol et mur. La régression recrée plusieurs enfants successifs et un nouveau corps ; 8 tests UI et 16 tests Segmento ciblés passent. Le contrôle mobile a été répété avec cette recréation réelle. Reconstruction des trois applications et 88 tests Anima réussis.
