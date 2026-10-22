# Portes ouvertes et cotes calculées — correction du 22 octobre

Les nouvelles captures montrent deux régressions concrètes : le rectangle du plan imprimé 2,40 × 2,50 m est refusé, et un dessin en L reste bloqué après une lecture 97 au lieu de 95 et l’absence d’une autre observation.

## Corrections

- Recherche d’une enveloppe à doubles traits non hachurés, y compris avec un vide de porte. Les contours fermés de douche ou de lavabo ne bloquent plus cette recherche. Les pièces fermées occupant déjà l’enveloppe gardent priorité, pour ne pas remplacer plusieurs pièces par un simple rectangle.
- Les relations de cotes sont analysées indépendamment sur chaque axe. Un manque vertical ne masque plus une déduction horizontale. Une observation OCR redondante et contradictoire peut être écartée, avec son texte original et la déduction signalés ; les saisies manuelles contradictoires restent bloquées.
- Les cotes déduites sont de vraies valeurs visibles dans les champs, avec leur calcul, et non des espaces réservés affichés seulement quand tout le plan est résolu. Elles sont recalculées après modification d’une cote ou de l’unité et ne deviennent pas de fausses observations indépendantes.
- La pièce unique reste cochée et les champs restent lisibles pendant une correction. Une lecture rejetée 97 est explicitement distinguée de la déduction 95.
- Pour une cote manuscrite encore manquante, relecture ciblée avec une autre proportion de caractères et deux seuils d’encre. Les côtés déjà calculables ne déclenchent plus la relecture de toute la page. Un manque de reconnaissance n’est plus présenté comme la preuve que le document est illisible.

## Vérifications réalisées

- 39 tests Node passent, dont les cas de porte interrompant un mur non hachuré, la déduction partielle 344 − 249 = 95, le rejet explicite de 97, puis 455 − 218 = 237 et le refus d’une saisie humaine contradictoire.
- Zone du plan imprimé recadrée à partir de la capture jointe : une enveloppe, cotes 2.40 et 2.50 en mètres, 6 m², aucun meuble ajouté.
- Photo manuscrite jointe, passée par le même encodage PNG que l’import : 249 / 455 / 344 / 218 cm et déductions 95 / 237 cm, soit 13,4005 m² au contrôle local.
- Véritable dialogue testé dans un DOM local : 95 reste renseigné si la cote verticale manque ; après 218, 237 est rempli, la vérification active la création et le résultat conserve les bonnes dimensions. Une modification de 455 recalcule la déduction sans réutiliser l’ancienne valeur.
- Chrome : dialogue réellement manipulé avec les observations de la capture (97 et une observation manquante), 95 calculé, puis 237 après saisie de 218, création exécutée. Capture dans `calcul-automatique-20261022.jpg`.
- Chrome : un plan synthétique généré par le banc de contrôle, avec doubles traits, porte ouverte et deux contours de mobilier, passe le véritable lecteur navigateur et crée une pièce de 6 m². Ce contrôle valide aussi le chargement du moteur OCR et du modèle hébergés sur le site. Aucun fichier utilisateur n’a été envoyé dans le navigateur après le refus précédent.

## Limite constatée

L’OCR manuscrit reste sensible au rééchantillonnage : certaines versions réduites ou réencodées de la photo peuvent encore perdre un chiffre ou lire 242 au lieu de 249. Il n’y a pas de garantie de lecture exacte de tout manuscrit. Les observations et les déductions restent à vérifier ; le moteur ne remplace pas une cote réellement indéterminée par une longueur mesurée en pixels. Cette correction distingue ce problème de lecture du calcul des côtés, qui est désormais visible et testable indépendamment.
