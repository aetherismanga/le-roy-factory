# Personnage de visite Jérôme — RANDAL

Le personnage est un véritable modèle 3D articulé, personnalisé à partir de la référence fournie. Il est chargé uniquement lorsque la visite 3D est active et que l'utilisateur a sélectionné explicitement Ultra HD. Le profil Automatique et les exports HD n'activent pas le personnage.

Le corps suit le déplacement et l'orientation du visiteur, avec une animation de marche et des mouvements discrets au repos. Il est visible uniquement pendant les captures de scène des miroirs et des vitres ; la caméra principale ne traverse pas sa propre tête. Les parois vitrées conservent leur transmission et reçoivent un reflet de Fresnel, limité à deux captures locales. Quitter Ultra ou la visite libère le modèle et les cibles de reflet.

Les deux applications consomment les mêmes modules de personnage, d'animation et de vitrage. Le modèle, ses cartes UV, sa licence et sa provenance sont copiés dans chaque build ; aucune dépendance au déploiement de la maison n'est nécessaire.

## Limite de fidélité

Il s'agit d'une interprétation temps réel du portrait sur une base Microsoft Rocketbox sous licence MIT, avec textures et géométrie personnalisées. Ce modèle n'est pas un scan du visage et n'égale pas l'image photoréaliste de référence. Les albedos natifs de 1254 pixels ne sont pas présentés comme des textures 4K.

## Vérifications

- Construction des deux applications.
- Noyau partagé et contrôles des deux workspaces.
- Chargements parallèles, annulation, erreurs et libération GPU du personnage.
- Reflets réels, limites des cibles, absence de récursion, conservation de la transmission et nettoyage des vitres.
- Acceptation navigateur des deux applications : activation exclusive, marche, reflets, sortie Ultra et visite mobile automatique.

La suite générale a également été lancée : 470 tests sur 471 passent. Le seul échec est le test navigateur historique de l’interface retirée de récupération de projets (`tests/security/legacy-recovery-storage.test.mjs:127`). La page et les modules qu’il vérifie ne sont pas modifiés par ce lot. Les tests PLAN & POSE passent après inclusion des sources historiques requises par leurs propres comparaisons.
