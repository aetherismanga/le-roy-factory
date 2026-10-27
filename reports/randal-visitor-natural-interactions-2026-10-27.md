# Visiteur Ultra : bras, contact et expressions

## Comportement

Les deux ateliers partagent désormais la même séquence d'interaction : atteindre la poignée, saisir, accompagner le mécanisme puis relâcher la main. Les prises continues sont choisies à proximité de l'épaule du bras utilisé. Les poignées et les vantaux sont suivis dans leurs véritables repères mobiles, y compris sur un meuble tourné ou une porte à charnières inversées.

Le changement d'état attend le contact du point de paume du squelette à moins de 3,5 cm de la prise. L'attente est bornée. Un clic à distance ou une prise physiquement inaccessible conserve l'ouverture habituelle, sans étirer le bras. Le capteur n'est pas une mesure photogrammétrique de la surface des doigts.

Les coudes restent vers l'avant du corps, les poignets s'orientent vers la prise et les doigts se referment progressivement. Le regard accompagne la main ; le sourire fixe est remplacé par une expression discrète qui évolue entre repos et concentration. Les bras, épaules et mains bougent davantage au repos. Les prises basses entraînent une flexion du buste et des genoux limitée à 25 cm, avec les pieds maintenus au sol par le solveur du squelette.

La course des tiroirs et des portes est progressive. Pendant une prise proche, le corps peut reculer au maximum de 0,65 m/s pour conserver sa place devant le mécanisme. Si le mur arrière bloque ce petit recul, la frame proposée et l'intention d'ouverture sont restaurées ; aucun saut de position n'est utilisé. Les projets de démonstration verrouillés retrouvent leurs états d'ouverture initiaux à la sortie.

Les gestes restent réservés au choix explicite Ultra en visite. Les autres profils conservent leurs mécanismes et ne chargent pas le personnage. La préférence système de réduction des mouvements conserve l'ouverture habituelle. Les optimisations du profil Léger publiées dans `ad988a4` sont intégrées depuis `main` (`c4b5e07`), sans publication du site public.

## Vérifications

- Solveur sur le vrai GLB : portée, longueur des os, paume, suivi d'une cible mobile, prise basse, transition de main, retour au repos et absence de croisement du buste.
- Pilote : poignées réelles Studio/Général, prise continue, levier de porte, charnières gauche/droite, colonne Harmony à plusieurs vantaux, délais, capteur de contact et annulations.
- Intégration du contrôleur réel et du wrapper Ultra : ouverture après contact, recul devant le tiroir, blocage par le mur arrière, retour au repos, abandon avant contact et absence de chargement du personnage en Standard.
- Rendu extérieur minimal du vrai modèle et des vrais meubles : poses de contact, suivi, retour au repos et porte, sans le compositeur Ultra. Il ne remplace pas une nouvelle validation GPU complète des reflets sur téléphone.
- Le test historique `tests/security/legacy-recovery-storage.test.mjs:127` reste en échec sur l'interface retirée de récupération. Ce chemin n'est pas modifié par ce lot.

Les textures et le modèle GLB sont conservés. Livraison sur une branche de test et prévisualisations des deux ateliers ; aucune mise à jour de `main` ni des adresses de production n'est effectuée.

## Résultats du lot livré

- 60 tests ciblés sur les contrôleurs, les gestes, les collisions et la planification du rendu : 60 réussis.
- Solveur du vrai squelette : 8 contrôles de portée, 9 de marche et 7 de cycle de vie réussis ; contrôles de reflets partagés également réussis.
- Construction et script `check` des deux workspaces réussis ; noyau partagé réussi.
- Régressions PLAN & POSE/sécurité : 305 réussis sur 306, avec le seul échec historique de récupération déjà indiqué.
- Prévisualisations Vercel du SHA `621ca3e1661ed24040ad84d73042a2e0192871a8` prêtes. Contrôle HTTPS des deux ateliers : page 200, empreinte de chaque application identique au build testé, vrai GLB de 4 449 532 octets et quatre cartes WebP disponibles.
- Les sources du site public et les domaines de production n’ont pas été publiés par cette livraison.
