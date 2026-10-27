# Visite Ultra — collisions et personnage affinés

Les deux ateliers partagent une enveloppe corporelle de 30 cm autour du visiteur de 1,65 m (caméra à 1,55 m). Les empreintes des meubles sont converties du repère plan vers le repère monde, avec correction du décalage Z historique de 23 cm. Les volumes réellement visibles incluent le débord de vasque, le plan et les tiroirs ouverts. Les cloisons basses et les parois fixes restent solides ; les receveurs bas restent accessibles. Les sous-pas empêchent les traversées rapides et diagonales. L'entrée en visite trouve un emplacement libre et conserve les passages de portes ouvertes.

Les volumes sont mis en cache pendant 80 ms, avec invalidation à l'entrée ou au changement de pièce/composition. Banc CPU sur un vrai meuble Studio : construction médiane de 0,78 ms (p95 4,82 ms), 1 000 résolutions de déplacement en 27,3 ms. Ces chiffres ne mesurent pas le GPU d'un téléphone.

La marche suit le déplacement accepté après collision, y compris le recul et le déplacement latéral. Pousser contre une vasque arrête la cadence et ramène progressivement le personnage au repos. Le buste suit le regard avec amortissement ; la respiration, le transfert du poids, les mains, les doigts et le clignement complètent les mouvements.

La tête passe de 3 007 à 12 028 triangles (15 967 pour le modèle complet), avec coutures UV, 80 articulations et quatre expressions préservées. Les contours des cheveux et de la barbe sont adoucis ; la géométrie des vêtements est conservée. Les normales du tissu et de la peau sont atténuées. Le GLB fait 4 449 532 octets, SHA256 `8d8058c1b5270dcd3e58554f71462cbed0ec4e4e448a58b423df8fc59ea41678`. Les textures conservent leur résolution native et aucun téléchargement de texture supplémentaire n'est ajouté.

Le personnage reste réservé à la visite avec le choix explicite Ultra HD et aux captures de miroirs/vitres. C'est une interprétation temps réel, pas un scan photoréaliste.

## Vérifications

- Huit tests de collisions : les quatre murs, meuble suspendu, débord et tiroir, entrée libre, pas rapides/diagonaux, cloison basse, porte ouverte, receveur et vitrage, maillages instanciés et vrai meuble Général décoré.
- Neuf contrôles d'animation sur le vrai GLB et sept contrôles de cycle de vie passent, y compris après restauration de l'espace de travail.
- Les deux constructions, les scripts de contrôle des deux workspaces et le noyau partagé ont passé avant le nettoyage automatique de l'espace de travail.
- Les tests PLAN & POSE/sécurité avaient un seul échec historique sur l'interface de récupération retirée (`tests/security/legacy-recovery-storage.test.mjs:127`), déjà présent avant ce lot.
- Sources restaurées depuis les patches exacts ; modèle récupéré depuis le blob GitHub sauvegardé. Aucune texture ni géométrie régénérée pendant la restauration.

Livraison limitée aux prévisualisations des deux ateliers, sans mise à jour de `main` ni des domaines de production.

Le contrôle final du Général a détecté une sphère source de feuillage instancié interprétée à sa taille brute. La collecte applique maintenant chaque matrice d'instance pour conserver les dimensions réelles des décorations. Un test sur le meuble Harmony / Neris de 100 cm vérifie une empreinte de meuble réaliste et un arrêt à 30 cm du bord visible.

## Acceptation navigateur ciblée

Le contrôle initial Studio One a validé le clavier et le déplacement tactile à deux doigts. Une capture du miroir a été inspectée avant le nettoyage automatique : le personnage était visible et ne traversait pas le meuble.

Après correction du feuillage instancié, le contrôle final du Catalogue Général passe ses quatre assertions : clavier maintenu, joystick tactile dans un écran de 390 × 844, animation au repos et libération à la sortie d'Ultra. Les deux entrées avancent les vrais contrôleurs de visite et le squelette sur six secondes simulées à 20 Hz. Le front réel du meuble Neris de 100 cm est à Z = 0,220000 m ; le visiteur s'arrête à Z = 0,547500 m, soit une marge de 32,75 cm. La vitesse de marche mesurée est nulle et le mélange de marche revient au repos. Aucune erreur JavaScript, aucun échec d'asset et aucune substitution de média n'ont été observés.

Le fichier GLB effectivement demandé par le navigateur final possède les 4 449 532 octets et le SHA256 indiqués ci-dessus. Pour ce contrôle de collisions final, la programmation des images a été gelée et les contrôleurs avancés manuellement après le chargement réel du squelette ; il ne constitue donc pas une nouvelle validation visuelle GPU des reflets, et ne simule pas les performances d'un téléphone physique. La capture de Studio est une vérification antérieure, distincte de ce contrôle final.
