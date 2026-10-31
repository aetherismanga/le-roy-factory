# Accueil : cadrage élargi et cartes illustrées — 31 octobre 2026

Demande : retrouver le cadrage plus large de l'ancien accueil et alléger la seconde section, avec des images correspondant aux trois sujets. Base vérifiée : `3d1049861082888a8fbe5cf7084176f8313484b9` ; branche dédiée `design/home-framing-cards-20261031`. Les PR ouvertes ont été consultées ; les travaux configurateurs/CRM et l'ancienne PR de performance #152 restent distincts.

## Modifications

- Le précédent fond clair de bureau était déjà recadré dans son fichier source. Un nouveau décor large montre la baignoire entière, les matériaux et davantage d'espace. Le logo et le texte sont moins imposants ; les quatre promotions restent accessibles.
- Seconde section sur fond crème, titres lisibles, trois cartes avec image, présentation courte et lien : agence/secteurs, fabricants/collections, conception 3D.
- Images existantes : ambiance fabricant VIEW COCO, matière Elios Stone Icon, projection du projet de démonstration RANDAL Studio One. Les légendes identifient leur origine ; elles ne sont pas présentées comme des réalisations clients de l'agence.
- Informations complémentaires dans un élément HTML natif `details` ; les 15 destinations de liens de l'accueil précédent sont conservées. Un seul H1, canonique, métadonnées et données structurées restent en place.
- Cartes sur une colonne jusqu'à 900 px. Images différées, dimensions explicites, focus clavier et réduction des animations conservés.
- Les fonds mobile et sombre, les catalogues, tarifs, comptes, moteurs 3D et calculs ne sont pas modifiés. Le seul changement du script de fond est le chemin de l'image claire de bureau.

## Provenance du nouveau décor

Outil intégré `image_gen`, mode édition d'image ; aucune API/CLI externe. Cible exacte inspectée : `image-edit-target-be599ce83824f5a0.png`, fournie par Jérôme et correspondant à son ancien aperçu d'accueil.

Prompt appliqué (synthèse du brief de génération) : éditer l'ancien aperçu pour obtenir uniquement son décor de salle de bains dans une composition panoramique large et moins rapprochée ; conserver la baignoire entièrement visible à gauche, les oliviers, le marbre crème et la lumière naturelle ; dégager le centre pour le logo et le texte HTML et le côté droit pour les offres ; enlever l'interface, les textes, les logos et les cadres floraux ; ne pas ajouter de fleurs, de personnes ou de filigrane.

Sortie : PNG 1774 × 887, puis dérivé WebP qualité 85 dans `assets/img/home-refresh-20261031/bathroom-wide-light.webp`, 224 500 octets. Les anciens médias sont conservés. Ce décor généré est une illustration d'ambiance et ne constitue ni une photographie d'un établissement LE ROY FACTORY ni une réalisation client.

## Vérifications avant publication

- `npm ci --ignore-scripts --include=dev` : réussi.
- `npm run check:core` : réussi.
- Tests PLAN & POSE, suite, sécurité, tarifs agents, impact de publication, contrats de surfaces et identité RANDAL : 486 tests, 485 réussis, 1 ignoré, aucun échec.
- `npm run build:site` : réussi ; sortie publique limitée aux fichiers autorisés.
- `python3 scripts/check-public-seo.py` : réussi, 133 URL canoniques, 154 références locales vérifiées, code exécutable préexistant de l'accueil conservé.
- Vérification des références de l'accueil : aucune ressource locale manquante, 15 destinations précédentes conservées, 18 scripts externes avant/après, dimensions et textes alternatifs sur les images.
- `node --check assets/js/home-background-switcher.js` et `git diff --check` : réussis.
- Contrôle visuel Chrome : fenêtre PC courante et prévisualisation à 1920 × 1080, décor large, logo, recherche, mode clair et quatre promotions visibles après chargement.

Limite explicite : le navigateur distant s'est bloqué lors du passage à la seconde section dans le cadre de contrôle responsive. Les captures finales de cette section, les interactions complémentaires et les contrôles visuels Android/iPhone n'ont donc pas pu être achevés dans cette session. Les règles responsive ont été vérifiées dans les sources ; aucun test sur un iPhone physique ou Safari n'est revendiqué.

## Publication

Ce lot concerne uniquement le site public GitHub Pages. Aucun déploiement Vercel n'est requis. Le manifeste public porte la version `20261031-home-illustrated-1`. Après la fusion, vérifier le succès du déploiement Pages, les contenus et empreintes des fichiers publics ainsi que cette version sur le domaine réel.
