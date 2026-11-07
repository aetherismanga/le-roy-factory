# Rendu photo local

Le moteur ne génère aucun produit. Il échantillonne les faces fabricant de la variante choisie à travers une homographie du plan du sol. Le masque reste indépendant des quatre points de perspective : une ouverture sous une chaise ou un tapis protégé reste inchangée lorsqu’on change de référence ou de projection.

## Contrats

- `geometry.mjs` utilise des points photo normalisés et des dimensions de plan en millimètres. `planeProjection(quad,widthMm,heightMm)` calcule une homographie de la photo au plan par DLT homogène. Les quadrilatères croisés, concaves, inversés ou dégénérés sont refusés.
- `tileAt` adresse les carreaux dans leur plan selon `widthMm` et `heightMm`, joints inclus. Le décalage 1/3 est périodique sur trois rangées. La rotation de pose à 90° transforme le plan, sans remplacer le format commercial. `textureRotation` corrige séparément l’orientation fixe d’une face fabricant.
- `mask.mjs` contient un octet alpha par pixel. Pinceau et contour travaillent en coordonnées de la photo de travail. Le redimensionnement conserve les trous de protection et ne fabrique pas de nouveau masque.
- `renderer.mjs` compose uniquement les pixels du masque. Le choix de face est déterministe à partir des coordonnées du carreau et d’une graine sauvegardée. L’estimation d’éclairage utilise une grille 10 × 10 lissée trois fois : elle ne multiplie jamais la texture par les détails de la photo originale. Le réglage zéro la désactive.
- `import.mjs` décode JPEG, PNG et WebP avec l’orientation du navigateur ; export jusqu’à 2 600 pixels et travail jusqu’à 1 100 pixels sur le grand côté, sans agrandissement. Le HEIC/HEIF reçoit un message demandant un JPEG. Une photo de plus de 40 Mo ou de 80 mégapixels est refusée avec un message explicite.
- `storage.mjs` sauvegarde un projet par appareil dans IndexedDB. La photo normalisée est un Blob ; masque, réglages et référence exacte sont des données clonées, versionnées. Aucune photo n’est envoyée par ce module.

## Textures et mémoire

`loadFaces(product,{quality:'preview'})` choisit les faces légères lorsque leur ordre et leur nombre correspondent à la liste HD. `quality:'export'` repart toujours des faces originales. Le décodage d’export est limité à 4 096 pixels par face et à environ 24 mégapixels cumulés pour les douze premières faces ; les URL HD ne sont pas modifiées. La propriété `reduced` signale une réduction de décodage. Le cache LRU est limité à dix faces / 96 Mo.

Les textures sont chargées par `fetch` avec CORS avant tout dessin ; un refus réseau/CORS ne produit pas un canvas contaminé utilisable seulement à l’écran. Le chargement est annulable, avec un délai maximal de 25 secondes. Le rendu cède régulièrement la main au navigateur et vérifie l’annulation. Les points au-delà de l’horizon stable conservent la photo originale.

## Limites

La proposition initiale de perspective issue des extents du masque est une aide visuelle, sans mesure métrique. Une calibration n’est métrique que si les quatre points délimitent le même rectangle physique et ses deux dimensions connues sont fournies. Sans cette calibration, l’échelle reste indicative. Ce moteur ne calcule aucune surface ou quantité et ne reproduit pas les reflets exacts d’un sol poli.

La protection des pieds fins et tapis dépend du masque calculé puis confirmé/corrigé ; les formules de projection n’inventent pas la partie cachée du sol. Une texture erronée dans une source ne peut pas être corrigée par le moteur : l’éligibilité relève de l’adaptateur catalogue.

## Contrôles exécutés

`node --test tests/photo-studio-core.test.mjs` : douze tests Node réussis. Ils couvrent l’homographie, les points de fuite, les dimensions en millimètres, les poses, la rotation de face, le masque, l’annulation/rétablissement, le redimensionnement, les arrondis de dimensions à la reprise d’une photo sauvegardée, le lissage de l’ancien motif et la préservation raster des pixels hors masque / dans un trou de meuble.

Les tests raster utilisent des doublures minimales de Canvas/ImageData pour exécuter la composition réelle ; ils ne constituent pas des tests de navigateur, de CORS distant, de caméra physique ou de réalisme photo. Ces contrôles doivent être consignés séparément dans le rapport de réception.
