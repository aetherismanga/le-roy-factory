# Petracer’s — meubles, sanitaires, robinetterie et miroirs

Livraison du 1 novembre 2026, site public GitHub Pages. La sélection des 21 collections de carrelage est conservée.

## Sources et contenu

- Catalogue officiel actuellement lié par https://petracer.it/downloads/ : https://petracer.it/wp-content/uploads/2026/07/Low-catalogo-OII-mail-.pdf (129 pages PDF).
- Les métadonnées du PDF indiquent novembre 2022, sans année éditoriale explicite. Le dossier d’upload 2026/07 ne vaut pas date d’édition.
- 69 fiches : 12 meubles, 20 sanitaires, 23 robinetteries, 9 miroirs, 5 accessoires.
- 117 photographies distinctes, 120 usages dans les fiches, 179 fichiers WebP locaux (environ 6,19 Mo). Définition native conservée ; miniature séparée quand utile. Les identifiants PDF, pages, dimensions natives et sources sont conservés dans le JSON.
- Les modèles et vues ont été contrôlés contre les pages fabricant et le catalogue, notamment Fantasma, Primo Attore, les miroirs, WC/bidets et les quatre familles de robinetterie.
- Le catalogue ne donne pas les cotes ni les SKU des modèles : aucune dimension, référence article, disponibilité ou grille de prix n’est inventée.

## Parcours

Petracer’s est disponible dans les univers Meubles, Sanitaire et Robinetterie & miroir. Chaque univers ne présente que ses fiches. Recherche, filtres documentés, familles et lexique A–Z ; liens directs par catégorie et modèle ; galeries, flèches, navigation tactile, plein écran et zoom. Les demandes de conseil préparent un e-mail à Jérôme et Coryne avec produit, quantité en pièces et lien direct, sans envoi automatique. La carte usine affiche «Catalogue & conseils» au lieu d’un badge de prix non disponible.

Les catalogues et la recherche d’accueil donnent accès aux trois nouveaux univers et aux modèles correspondants.

## Vérification

- 52 tests sélection/recherche réussis dans le checkout de livraison, dont 14 tests Petracer.
- Syntaxe des cinq scripts modifiés et git diff --check valides.
- npm run check:core réussi dans un checkout QA dont les trees Git shared, studio-one, randal-general, PLAN & POSE et tests sont identiques.
- 344 tests PLAN & POSE, sécurité et tarifs réussis, 0 échec ; 1 test UI de reprise ignoré faute de Chromium. Tests UI tarifs PC/Android/iPhone non exécutés : binaires Playwright absents.
- Contrôle navigateur : grille meubles, fiche Fantasma, plein écran et zoom ; lien direct sanitaire Venetia WC suspendu et changement de photo ; fiche Divino dans une iframe de 390 × 844 px utilisant univers-ios.html ; recherche d’accueil Divino et liens vers la bonne catégorie. Le contrôle responsive ne constitue pas un test sur un iPhone physique. Les gestes tactiles sont couverts par les tests automatisés.
- Construction du site public réussie, contrôles de protection des tarifs inclus.

Aucun configurateur ni service privé modifié. Aucun déploiement Vercel requis. Les modifications CeraStone présentes sur main sont conservées.
