# Diagnostic et correction de la visite 3D — 4 novembre 2026

Lot : `20261104-visit-stable-1`. Applications : Studio One, Catalogue Général et Neobath Anima (`studio-one-visit-stable-14`).

## Causes établies dans le moteur

1. Le changement de phase désactivait les ombres pendant la marche. Le soleil conservait son intensité alors que les murs ne l'occultaient plus : la pièce s'éclaircissait. Le moteur conserve maintenant les ombres et réutilise leur carte lorsque seule la caméra bouge. Les tiroirs, portes et fenêtres mobiles continuent de les actualiser.
2. En Ultra, le mouvement coupait le GTAO et changeait la résolution de transmission du verre. Cela changeait les contacts et redimensionnait des cibles GPU. Le chemin de rendu, les paramètres de lumière et les buffers de transmission restent maintenant stables pendant la visite.
3. Le redimensionnement Ultra répétait des allocations, même à taille identique, et agrandissait temporairement les buffers AO avant de les réduire. Les dimensions inchangées ne provoquent plus d'allocation ; les trois buffers AO restent à demi-résolution.
4. Les miroirs Ultra utilisaient encore des cibles 2048×2048 avec MSAA 4× pendant l'édition. Ils utilisent désormais une cible stable 1024×1024 sans MSAA, avec une cadence de mouvement plafonnée à 24 Hz sur PC (15 en Standard). La capture HD retrouve les cibles 2048×2048 et le MSAA prévu. La résolution principale, les textures et le relief des meubles sont conservés.
5. La préparation des murs pour une capture d'ombre s'exécutait même lorsque le moteur allait réutiliser la carte. Elle est désormais évitée dans ce cas. Les transitions de caméra ne sont plus traitées comme des modifications de géométrie.

## Vérifications

- 21 nouveaux tests exécutent les contrôleurs réels des trois ateliers en Léger, Standard et Ultra : stabilité de la recette lumineuse, mouvements de caméra, tiroirs et fenêtres.
- 3 nouveaux tests observent les allocations des véritables EffectComposer, GTAOPass et render targets de Three.js : aucun redimensionnement identique, AO toujours à demi-résolution, nettoyage des buffers.
- Suite Anima/rendu/capture : 387 tests réussis. Vérifications du noyau commun et des deux workspaces exécutées avant publication ; intégrité SHA-256 des ressources privées conservée.
- Les contrôles techniques n'utilisent pas le GPU du PC de Jérôme. WebGL reste désactivé dans le navigateur de contrôle ; aucun FPS, gain global en pourcentage ou absence universelle de saccades n'est affirmé. La scène exacte de la capture utilisateur n'a pas été mesurée sur son PC.

Les projets, comptes, tarifs et matériaux fabricants ne sont pas modifiés par cette correction.
