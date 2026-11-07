# Visuel de la carte LRF PHOTO STUDIO

Création du 6 novembre 2026, pour la carte `configurateurs.html`.

Le visuel est une illustration originale produite avec l'outil intégré de génération d'images OpenAI. L'image publicitaire fournie par Jérôme a été regardée uniquement pour comprendre la composition souhaitée ; elle n'a pas été utilisée comme image d'entrée, recopiée ni intégrée au site. Aucune photo de tiers, visage identifiable, marque concurrente ou texture commerciale prétendument authentique n'a été ajouté.

Cette image de présentation n'est pas une capture de l'application ni une preuve du fonctionnement de la segmentation. Le carrelage illustré ne nomme aucune référence fabricant. La légende visible indique « Illustration du principe ». Les textes et le bouton restent en HTML. Le vrai logo LRF est conservé dans l'en-tête existant.

## Fichiers livrés

- `assets/img/lrf-photo-studio/photo-studio-card-480.webp` : 480 × 270, 14 810 octets.
- `assets/img/lrf-photo-studio/photo-studio-card-960.webp` : 960 × 540, 37 232 octets.

Les deux variantes sont des réductions/compressions WebP du même original généré ; aucune retouche du contenu n'a été effectuée. Le choix est fait par `srcset` et `sizes`, les dimensions sont réservées et le chargement est différé.

## Prompt final

```text
Use case: ads-marketing. Asset type: original horizontal 16:9 website card photograph for an interior floor photo visualizer. Create a photorealistic editorial image: natural adult hand holding a credible modern black smartphone in foreground slightly left of centre, screen facing camera. No face or body visible beyond hand and forearm. Phone screen clearly shows a luminous contemporary Mediterranean living room, cream walls, a pale sofa and oak furniture fully preserved above a new light beige stone tile floor with subtle real texture and clean perspective. Background is the same living room gently out of focus, with its original warmer floor so the purpose is understandable in a single glance. Main subject stays within central crop safe region. High-end understated interior, daylight, warm white and cream with restrained charcoal. No flowers, no floral patterns, no plants required, no text, no logo, no buttons, no UI text, no watermark, no competitor marks. Normal anatomical hand with five fingers, realistic phone proportions and readable floor plane. This is an illustrative promotional image only, not a screenshot or evidence of a working app, and no real tile collection should be identified or invented.
```

## Contrôle de non-régression

L'ajout est limité à un bloc de style ciblant `.lrf-photo-studio-card` et un nouvel article. Une comparaison par suppression de ces deux insertions restitue exactement le contenu initial de `configurateurs.html`. Les outils existants, leurs liens et leurs scripts sont conservés. Le bouton pointe vers `lrf-photo-studio.html`.
