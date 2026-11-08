# RANDAL · Reflets, zoom et ouverture individuelle

Le 8 novembre 2026, la présentation réservée au compte client RANDAL vérifié reçoit les corrections de netteté, de sélection, d'ouverture et de lumière demandées. Les deux ateliers et les autres comptes conservent leurs profils habituels ; aucun rendu photo progressif n'est réintroduit.

## Sélection et ouverture

Le cadre BoxHelper n'est plus créé dans la scène de présentation. Le ciblage par rayons, le clic contextuel, le déplacement à la souris ou au doigt, les contraintes, la charnière et le pincement restent disponibles.

Les options du meuble ou de la colonne sélectionné proposent Ouvrir/Fermer cet élément. L'action ne modifie pas les autres objets. Les animations indépendantes durent 900 ms et gardent les courses natives : 20 cm en haut, 26 cm au milieu et 31,5 cm en bas lorsque la profondeur le permet. Les états mixtes et l'avancement restent conservés sur un nouvel objet portant le même identifiant, ainsi qu'après la réapplication de réglages sur le même objet. Les wrappers appellent refreshOpening avant de dessiner. Le bouton global ferme seulement si tous les éléments ouvrables sont ouverts ; sinon il ouvre toute la composition.

## Lumière initiale

La migration présentation version 3 applique 71 % aux projets antérieurs. Les sols, murs, cotes, meubles et autres préférences enregistrés en version 2 restent conservés. Les projets plus anciens reçoivent d'abord les réglages de présentation précédents : Yosemite Honey pose 2/3, Gris perle et cotes masquées. Les choix de lumière explicites faits après migration restent enregistrés.

## Définition et matériaux

Les finitions de la présentation chargent désormais systématiquement leurs variantes maximales, indépendamment d'une réduction des effets graphiques. La première réduction de définition du Catalogue général est évitée. Les pixels natifs, la rotation et les répétitions validées sont conservés ; les images trop grandes sont uniquement bornées par la capacité texture de l'appareil et une limite de 4096 pixels, avec réduction de qualité élevée. Les filtres sont linéaires/trilinéaires, avec mipmaps et anisotropie selon la capacité matérielle.

Les photographies couleur ne sont plus clonées en relief pour les finitions de cette présentation : bumpMap est nul et bumpScale est nul. Cela retire le faux relief brillant qui accentuait les détails et défauts de compression. Les recettes des aperçus ordinaires sont conservées.

Le miroir utilise des cibles au rapport du viewport et des paliers de définition qui augmentent au zoom, jusqu'à environ 3840 × 2160 sur un appareil adapté. Le budget total de pixels et de mémoire est partagé entre les miroirs ; le multisampling est explicitement borné. Les cibles ne rétrécissent pas à chaque mouvement. La protection de performance retire d'abord l'occlusion de contact et réduit les ombres plutôt que de remplacer les sources HD et la définition de l'écran par l'ancien profil 1,5 mégapixel. Un export ne réduit plus les reflets de présentation à 1024 × 1024.

La fenêtre blanche garde son vitrage et sa quincaillerie, avec une réponse de cadre PVC non métallique. Le panorama utilise ses pixels natifs, son cadrage correct, les mipmaps et l'anisotropie ; ses textures restent propres à la présentation et sont libérées à la fermeture.

## Limites réelles des sources

L'original du jardin méditerranéen présent dans le dépôt est un WebP 1536 × 1024. Les PNG des autres ambiances ne contiennent pas davantage de pixels que leurs WebP sans perte. Le maximum authentique Nogal Valentina est de 567 × 1229 pixels. Aucun agrandissement artificiel ni texture de bois inventée n'est présenté comme une source HD supplémentaire. Le grossissement ne peut pas produire des détails fabricant absents de ces originaux.

## Vérification

176 tests ciblés de présentation, de commandes, de géométrie et de qualité passent, avec des régressions sur les vrais chargeurs de textures des deux ateliers. Ils vérifient les sources max, l'absence de relief inventé, les UV, les filtres, la limitation matérielle, les allocations de reflets, les ouvertures séparées et les migrations. Le noyau partagé, PLAN & POSE et la sécurité, les contrôles des deux workspaces et les builds complètent la recette.

Le navigateur de contrôle ne dispose pas de WebGL. Le contrôle de l'interface utilise donc explicitement un rendu simulé ; il ne constitue pas une validation visuelle de la netteté et des reflets sur GPU.
