# Neobath Anima — atelier privé

Version 20261102-neobath-anima-private-1.

## Parcours livré

Page neobath-anima-configurateur.html ; carte ajoutée aux configurateurs uniquement après autorisation serveur. Deux façades Pura/Ribelle, 42 modules, six finitions de meubles, 257 articles au total, 16 photos de compositions et six textures réelles. Choix meuble/format, finition, plans et vasques, miroirs et éclairages/accessoires. Composition paramétrique 3D avec portes et tiroirs, coordonnées/hauteur de pose, plans continus et sur mesure, ouvertures, ambiance, mode minimum. Récapitulatif chiffré imprimable/PDF, image sur appareil WebGL, import/export JSON et projets sauvegardés localement ou partagés entre les deux agents.

## Sources et règles commerciales

Catalogue complet Anima 2026 : https://www.diffusionedesign.com/wp-content/uploads/2026/09/NEOBATH-ANIMA-2026.pdf (81 pages doubles). Les dimensions/références/prix de chaque article gardent leur page source. Les prix sont recoupés avec la confirmation fabricant du 03/07/2026 : base imposable hors TVA. Aucune remise ni grille d'achat n'est incluse. Les suppléments publics GRASS suivent le catalogue : H26 +15 %, H52 +20 %. Les plans Geacril facturés au centimètre et leurs limites sont explicites. Les finitions NCS nécessitent un code, conservé dans le projet et le récapitulatif.

Les deux bases 80 cm à deux portes conservent une référence à confirmer car le tableau réutilise les codes d'autres formats. Cinq structures Bridge non tarifées restent sur devis, distinctes du BRIDGE100 chiffré à 262 €. Les écarts de montants entre compositions et tableaux sont conservés dans les métadonnées, pas remplacés silencieusement.

## Accès et stockage

L'API Firebase ne renvoie l'interface, son script et le catalogue qu'après validation révocable d'un jeton appartenant à jerome@leroyfactory.fr ou coryne@leroyfactory.fr. Les comptes PRO et les rôles en stockage navigateur ne donnent aucun accès. Réponses privées sans cache. L'iframe est détruite à la déconnexion ou au changement d'identité, et les réponses de requêtes antérieures sont ignorées. Les jetons ne transitent jamais dans l'iframe ni les projets exportés.

Les sources exécutables privées sont sous functions/, exclu de GitHub Pages et du build public. La seule page directe publique est un écran d'accès privé. Les projets partagés utilisent neobath_anima_projects avec validation, versions optimistes et marqueurs de suppression empêchant une ancienne copie de ressusciter un projet supprimé. Les règles Firestore existantes limitent les accès directs aux deux agents.

## Vérification

- 37 tests ciblés passent : authentification, session, ouvertures/géométrie, les 42 vrais modules, catalogue/prix/compatibilités, import, sauvegarde, conflits et aller-retour complet interface/serveur/interface.
- Noyau partagé Randal : npm run check:core réussi.
- 17 tests de non-régression PLAN & POSE/tarifs sécurisés réussis.
- Build public réussi, exclusion des sources privées confirmée. Manifestes privés vérifiés par empreinte SHA-256 avant ouverture du service.
- Navigateur : création d'un meuble 80 cm Rovere Alba + TK80, total HT 768 €, TVA 153,60 €, TTC 921,60 € ; sauvegarde et liste de projets ; contrôle visuel desktop et smartphone 390×844.
- Le navigateur de contrôle désactive WebGL (GL_VENDOR=Disabled). Le repli en vue de face a été vérifié. La géométrie 3D et les mouvements ont été testés sans GPU ; le rendu visuel WebGL final reste à valider sur un appareil compatible. Les intérieurs et formes de vasques sont des reconstructions de visualisation, pas une CAO de fabrication.

Publication prévue par le workflow existant avec sélection limitée à neobathAnimaApplication, et GitHub Pages pour la page d'accès. Les ateliers Randal ne sont pas redéployés.
