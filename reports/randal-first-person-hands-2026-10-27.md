# RANDAL — mains visibles pendant la visite

## Défaut signalé

La livraison précédente conservait intentionnellement le personnage entier hors de la caméra principale. Les gestes étaient animés sur son squelette, mais visibles uniquement dans les reflets. Cela ne répondait pas à l'attente d'une main visible directement lors de l'ouverture d'une porte ou d'un tiroir.

## Correction

- La caméra principale affiche le bras qui saisit la poignée ou le bord du tiroir pendant l'approche, l'ouverture/fermeture et le retour.
- Géométrie limitée aux triangles des bras/mains, extraite du modèle existant et liée au même squelette. La main en vue directe suit donc exactement la prise du personnage réfléchi. Aucun deuxième modèle ni téléchargement de textures.
- Le personnage entier reste réservé aux reflets. Les bras séparés sont masqués pendant ces captures pour éviter un doublon.
- Les bras sont exclus du picking : les touches suivantes atteignent toujours le meuble et les vrais obstacles conservent leur priorité.
- Aucun changement du regard ou de la caméra ; le visiteur garde le contrôle. Ultra HD explicite, mode visite et préférence de réduction des animations restent respectés.
- Les collisions et le recul progressif de l'opérateur restent en place.

## Validation

- 68 tests ciblés réussis : contact réel de la paume, ouverture progressive, retour, portes/tiroirs, collisions, retrait, annulation, isolation des bras et picking réel.
- Le meuble LUCE 80 cm à un seul tiroir de la capture déclenche bien la prise à distance normale de collision, sans ouverture de secours à distance.
- Noyau partagé et contrôles des deux ateliers réussis. Les deux builds réussissent.
- Captures GPU avec le vrai modèle en première personne : main visible sur le tiroir et sur la poignée de porte, sans tête ni torse. Modèle direct limité à 2 140 triangles ; aucun nouveau matériau ou texture.

La validation visuelle porte sur un navigateur Chromium avec rendu logiciel, pas sur un téléphone physique.

Les corrections sont destinées aux prévisualisations ; les domaines habituels et la branche main restent inchangés.
