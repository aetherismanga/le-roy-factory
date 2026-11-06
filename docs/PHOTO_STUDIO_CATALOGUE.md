# Photo Studio : sources, couverture et actualisation

Le catalogue Photo Studio est un manifeste généré depuis les sources existantes. Il ne remplace aucun catalogue et n’ajoute aucune grille de prix. La mise à jour est déclenchée par une commande de build ; ce n’est pas une synchronisation en direct.

```sh
node scripts/build-photo-studio-catalogue.mjs
python scripts/cache-photo-studio-textures.py
node scripts/build-photo-studio-catalogue.mjs
node --test tests/photo-studio/catalogue.test.mjs
```

Le cache des textures est un miroir technique dérivé des URL publiques LRF : octets d’origine, SHA-256, dimensions natives, provenance et vérification des SHA-256 de publication Quercia lorsqu’ils existent. Il évite les restrictions CORS du bucket sur une nouvelle origine de prévisualisation. Le script de transfert autorise seulement le bucket public LRF et le préfixe de textures fabricant ; aucune photo d’utilisateur n’est envoyée, aucun relais serveur n’est créé. Les fichiers et le manifeste sont à commettre avec le catalogue. Un nouveau fichier source n’est jamais à recopier manuellement dans une seconde base.

`assets/js/lrf-photo-studio/catalogue.json` livre les seules variantes simulables. `reports/photo-studio/coverage.json` est interne (exclu du build public) et conserve aussi les identités exclues avec leur motif, les empreintes des sources et les comptes par fabricant. Les dimensions numériques viennent des champs canoniques en mètres, convertis en millimètres. Le libellé commercial exact est conservé séparément : un format nominal 120 × 120 peut avoir une cote fabricant de 1 194 mm ; aucun rapprochement de recherche ne modifie le produit choisi.

Les sources canoniques `manufacturer-surfaces.json` et `commercial-surfaces.json` contiennent 1 306 SKU exacts Elios/View. Les variantes de finition restent distinctes. Les autres catalogues sont au niveau collection/coloris ou collection : leurs comptes ne sont donc pas des nombres de SKU. Un identifiant de collection ne devient pas une référence usine inventée.

La sélection de la première prévisualisation est volontairement stricte : 8 références Quercia avec 118 faces originales vérifiées à la référence, et 106 références View à faces fabricant natives, usage sol confirmé et ratio compatible avec le format. Les autres Elios sont recensés, avec exclusion des aperçus couleur, échantillons matière, reconstructions Yosemite, décors non pris en charge, provenance incertaine ou identité non rapprochée. Une preuve `available3d` ou `native` seule n’est pas suffisante.

Le miroir contient 329 profils/faces distincts (38 981 004 octets, ~37,2 Mio), téléchargés uniquement lors de sa préparation. Le navigateur charge les faces du seul produit choisi. Le contrôle automatique vérifie le SHA-256 et le ratio de chaque face après rotation. Une planche de contrôle a été revue pour les 13 collections éligibles, en plus de la face Quercia réelle.

La Fenice est raccordé à son catalogue de 82 collections et 483 coloris, mais les associations exactes entre références, coloris, formats et finitions ne sont pas présentes dans cette source. Elles restent inconnues. Les textures de collection n’ont pas été transformées arbitrairement en variantes. L’audit du PDF fabricant a en outre confirmé que Quarzo120 × 120 n’existe pas dans la matrice Allure, et que plusieurs nuanciers ont des ratios incompatibles avec une face complète. Voir PHOTO_STUDIO_FENICE_AUDIT.md. Cette exigence de réception reste non satisfaite pour La Fenice. Même réserve pour les catalogues BioPietra, Bulbo, Pecchioli et Petracer : collections recensées, sans qualifier leurs ambiances ou nuanciers de tampons de sol.

Reviglass est recensé depuis ses métadonnées existantes et les nouveautés 2026 ; sa pose mosaïque n’est pas prise en charge par ce moteur de dalles. Life Cerámica figure dans les partenaires, mais aucune source produit structurée n’a été trouvée au commit audité.

Les ressources sont les visuels fabricant déjà présents et utilisés par LRF. Le script vérifie leur provenance technique et leur intégrité, mais ne constitue pas une nouvelle confirmation juridique globale des autorisations de chaque fabricant. Aucun visuel concurrent, nuancier repeint ou texture générée n’est ajouté.

Le test d’actualisation ajoute un SKU de contrôle en mémoire à la source, reconstruit le manifeste, vérifie son apparition puis détruit cette copie. Les fichiers source réels et les configurateurs existants ne sont jamais modifiés par ce test.
