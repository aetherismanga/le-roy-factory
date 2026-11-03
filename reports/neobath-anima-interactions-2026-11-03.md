# Neobath Anima — interactions et qualité du 3 novembre 2026

Release : `20261103-neobath-anima-studio-one-interactions-4b`.
Base : `5eb106c7453b53ddff9435521eba26c059927bdf`.

## Changements

La véritable interface et les entrées Studio One restent les sources compilées. Aucun changement dans Studio One, Randal Général ou le moteur partagé ; les adaptations sont isolées dans Anima.

- Le dessus du caisson, son plan et sa vasque ouvrent l’inspecteur droit « Plans et vasques » avant la sélection des revêtements. Une cible horizontale invisible couvre aussi un sous-vasque nu. Les références sont illustrées ; un plan seul utilise un schéma de matière sans fausse cuve.
- Le plan sur mesure se déplace séparément. La prévisualisation ne modifie pas les caissons ; l’aimantation n’accepte que des supports réels, libres, juxtaposés et compatibles. Un dépôt invalide, Échap, une perte de capture ou un second doigt rétablit la pose précédente. Les dimensions, matière, vasque et tarifs suivent le plan.
- Choix des caissons : huit modèles Pura illustrés, puis Pura/Ribelle et largeurs de stock. Le choix de 180 cm propose notamment 100 + 80 et 120 + 60. Les assemblages sont constitués de vrais SKU ; ils repartent sans plan pour permettre un choix continu explicite.
- Miroirs : quinze modèles illustrés regroupant les quarante-deux formats source. Le modèle OFFSET carré conserve sa forme carrée.
- Plans linéaires : longueur, débords, profondeur et décalages X/Z de vasque persistés. La même implantation pure pilote la validation, les trous du plan, la coque, les bondes et les perçages. Les cuves doivent rester dans le plan et au-dessus de véritables sous-vasques. Les plans de stock conservent leurs dimensions et positions source.
- Les dimensions et les positions de vasque se valident ensemble dans une seule transaction : une implantation profonde faisable ne peut plus être bloquée par un état intermédiaire. Une nouvelle cuve se positionne initialement au-dessus du caisson, même sur un plan déjà approfondi.
- Une profondeur différente de la profondeur de référence rend le prix du plan « sur devis » ; aucun tarif d’une autre profondeur n’est présenté comme ferme. Les limites techniques de prévisualisation ne constituent pas des capacités de fabrication certifiées.
- Façades : profils de prise en main horizontaux reconstruits depuis les photos officielles des pages 128–132 ; portes orientées correctement, colonne à prises opposées et dessus fermé pour les meubles bas/hauts.
- Les cinq finitions unies emploient la couleur et une réponse PBR, sans photographie de cannelures ni double relief imprimé. Le relief Ribelle reste géométrique. Le bois garde ses sources fabricant, sens du fil et filtrage anisotrope ; un bord photographique de huit pixels du bois Pura est écarté sans agrandissement ni modification de couleur, supprimant une fausse ligne d’ouverture.
- La matière des plans suit une seule feuille continue dans le repère local du plan, y compris après agrandissement ou déplacement. Aucun ajout de plaque ni répétition de bande. La taille du veinage reste une interprétation de l’échantillon fabricant.
- La qualité automatique conserve une définition lisible ; les modes Léger manuel et Ultra ne sont pas modifiés.

## Vérifications

162 tests sur 162 réussissent. La suite complète Anima inclut les API privées et la cohérence SHA-256 des huit ressources compilées, les interactions réelles transformées, les contrôles DOM, les assemblages 180 cm, la conservation des prix et projets, les quarante-deux caissons et 791 combinaisons de géométrie plans/vasques. Les résultats finaux figurent dans la vérification de publication.

`npm run check:core` réussit. `npm run build:site` réussit et exclut les services et bundles privés. Le build Anima réutilise 171 modules source originaux. Les originales Studio One et Catalogue Général restent inchangées.

Contrôle navigateur des vrais composants DOM sur bureau et dans un conteneur mobile de 360 px, avec photographies fabricant. Diagnostic WebGL du navigateur de contrôle : indisponible (`GL_VENDOR=Disabled`, `GL_RENDERER=Disabled`). Trois vues CPU ont été générées depuis les véritables meshes, UV et pixels source pour contrôler les gorges, le relief et le recadrage du bois. Ces vues ne remplacent pas une vérification du rendu PBR/GPU final.

## Limites et accès

Dimensions extérieures et SKU : catalogue officiel. Sections des gorges, pas/profondeur des cannelures et certains contours de cuves : reconstruction photographique de prévisualisation, sans gabarit industriel. Les capacités et découpes de fabrication restent à confirmer sur les données du fabricant. Les couleurs Ocritech Fumé/Bronze et deux échantillons Grès peu résolus conservent leurs limites de provenance documentées dans la livraison précédente.

Accès inchangé : identités Firebase vérifiées de Jérôme et Coryne uniquement ; contrôle de révocation serveur, réponses privées sans cache. La publication cible uniquement `neobathAnimaApplication` et GitHub Pages pour le lanceur versionné ; aucun déploiement des deux ateliers Randal.
