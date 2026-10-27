# RANDAL — mains visibles pendant la visite

## Défaut signalé

La livraison précédente conservait intentionnellement le personnage entier hors de la caméra principale. Les gestes étaient animés sur son squelette, mais visibles uniquement dans les reflets. Cela ne répondait pas à l'attente d'une main visible directement lors de l'ouverture d'une porte ou d'un tiroir.

## Correction

- La caméra principale affiche le bras qui saisit la poignée ou le bord du tiroir pendant l'approche, l'ouverture/fermeture et le retour.
- Géométrie limitée aux triangles des bras/mains, extraite du modèle existant et liée au même squelette. La main en vue directe suit donc exactement la prise du personnage réfléchi. Aucun deuxième modèle ni téléchargement de textures.
- Le personnage entier reste réservé aux reflets. Les bras séparés sont masqués pendant ces captures pour éviter un doublon.
- Les bras sont exclus du picking : les touches suivantes atteignent toujours le meuble et les vrais obstacles conservent leur priorité.
- Une prise continue privilégie le point touché ou un point central réellement atteignable. Le point le plus proche de l'épaule reste un recours, car il plaçait la main au bord d'un écran portrait.
- Le texte d'aide se masque pendant la prise. Le joystick du Général s'estompe tout en restant utilisable. L'aide retrouve son cycle habituel après le geste ; le délai de six secondes de Studio est conservé.
- Aucun changement du regard ou de la caméra ; le visiteur garde le contrôle. Ultra HD explicite, mode visite et préférence de réduction des animations restent respectés.
- Les collisions et le recul progressif de l'opérateur restent en place.

## Validation

- 69 tests ciblés réussis : contact réel de la paume, ouverture progressive, retour, portes/tiroirs, collisions, retrait, annulation, isolation des bras et picking réel.
- Le meuble LUCE 80 cm à un seul tiroir de la capture déclenche bien la prise à distance normale de collision, sans ouverture de secours à distance.
- Noyau partagé et contrôles des deux ateliers réussis. Les deux builds réussissent.
- Captures GPU avec le vrai modèle en première personne : main visible sur le tiroir et sur la poignée de porte, sans tête ni torse. Modèle direct limité à 2 140 triangles ; aucun nouveau matériau ou texture.
- Acceptation dans l'application réelle à 390 × 844 : 4/4 scénarios réussis, tiroir LUCE et porte du Général, tiroir et porte de Studio. Vrais touchers sur le canvas, contact de la paume dans les 80 % centraux du cadre, mécanisme progressif, aide masquée puis retour du bras vérifiés ; aucune erreur JavaScript.
- Comparaison des pixels de peau entre le contact et le même rendu sans bras : Général LUCE 8 635 pixels, porte Général 17 102, tiroir Studio 8 013, porte Studio 17 560. Les mains apparaissent réellement dans le cadre, et non uniquement dans les diagnostics.

Le test mobile compile les sources réelles avec des diagnostics locaux et un pilotage de temps déterministe. `preserveDrawingBuffer` et une synchronisation GL sont activés uniquement pour éviter les captures vides du rendu logiciel avec la boucle RAF suspendue. Les textures étrangères à l'avatar manquantes dans ce checkout sont remplacées uniquement dans ce test ; cette acceptation ne valide pas les textures des fabricants.

La validation visuelle porte sur un navigateur Chromium avec rendu logiciel, pas sur un téléphone physique.

Les corrections sont destinées aux prévisualisations ; les domaines habituels et la branche main restent inchangés.

Commit exécuté par les deux prévisualisations : `1d10fa6162b9c100340e93167bf21db058f54e05`.

- Général : `dpl_3Cn8zniXqmNBxCZuU8dumQ1qPeRx`.
- Studio : `dpl_sD7TQQ67QXm2WBS1FhMfmQxniZAC`.

Les deux déploiements sont READY, sans cible production.
