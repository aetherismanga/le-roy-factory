# Elios Segmento — 7 novembre 2026

Lot : schémas Elios, Studio One et Catalogue Général.

16 références 15 × 15 cm, 12 motifs, 48 compositions issues du flyer officiel, 46 pièces / 1,04 m² / 18 kg par boîte. Les grilles et les quantités sont partagées par les schémas et les deux ateliers. Les coloris de chaque composition produisent leurs propres besoins, boîtes et références.

Les images proviennent du transfert MINIMALI SEGMENTO envoyé par Ghislaine Lebreton le 6 novembre. Les originaux usine sélectionnés sont conservés ; les dérivés WebP restent à la résolution native 529 × 529 ou 535 × 535, sans agrandissement. Duplex B est normalisé de 180° pour correspondre au flyer, y compris lors de l’utilisation de son original. Voir texture-provenance.json et les métadonnées du catalogue.

## Validation

- Installation npm ci, compilation du site et des deux ateliers : réussies.
- npm run check:core, avec régression Segmento 48 compositions et 3 tests schémas : réussis.
- Contrôles des workspaces Studio One et Général : réussis.
- Suite PLAN & POSE / sécurité / tarifs / contrats : 589 réussis, 1 ignoré, 0 échec (590 tests).
- Navigateur : sélection de motifs/compositions, calcul multicolore S11-G (22 + 5,5 + 5,5 m²), affichage de la fiche quantitative et parcours dans une largeur mobile de 390 px contrôlés.
- WebGL 2 indisponible dans le navigateur de QA : le rendu GPU réel de la pièce n’est pas validé visuellement ici. Les géométries, rotations, chargements, sauvegardes et calculs sont contrôlés par les validations du noyau.

Deux assertions de tests préexistantes ont été actualisées : nom de la fonction de chargement Pool et source native Chalk actuellement publiée. Aucun changement de ces produits n’a été inclus dans le lot.
