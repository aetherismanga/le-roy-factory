# Reprise de l’intégration Elios — 23 octobre 2026

**Mise à jour après reprise :** les PR 117 et 118 sont fusionnées et Quercia est publié sur les trois adresses publiques. Les tarifs et plinthes du 23 octobre sont préservés. Les 1 089 contrôles publics ont été refaits avec succès et le rendu Plan & Pose a été vérifié en direct. Aucun nouvel original Creta, Mysterium ou Deco n’a été récupéré : le nouveau navigateur se connecte, mais son téléchargement échoue puis sa politique de sécurité refuse l’accès à l’original. Le compte rendu courant est `release-20261023.md`. Les sections suivantes restent le journal de la préparation antérieure.

## Ressources déjà publiées et conservées

Les 363 variantes WebP déjà hébergées ont été restaurées localement et leurs empreintes vérifiées : 354 pour les 118 faces Quercia et neuf pour les trois premières faces Creta. Aucun fichier n’a été réimporté sur Firebase et aucune URL publiée n’a été changée pendant cette reprise.

Les huit références Quercia restent intégrées aux sources et aux prévisualisations des trois configurateurs. Aucun nouveau lot Creta, Mysterium ou Deco n’a été activé pendant cette reprise.

## Lots préparés

| Collection | Ressources repérées dans le portail | Correspondances vérifiées | État |
| --- | --- | --- | --- |
| Creta | 53 faces de base et quatre décors | Huit références de base, R9, rectifié, 60 × 120 cm, épaisseur 8,5 mm | Import et activation préparés ; les décors restent distincts |
| Magnus / Mysterium | 24 faces, quatre par référence | LB1201 à LB1206, poli, rectifié, 120 × 278 cm, épaisseur 6,5 mm | Correspondances et contrôle de sélection préparés |
| Deco | Six bases et 19 décors | Six bases et 17 décors confirmés au catalogue actuel | Deux références Original A restent non assignables |

Les formats carrés et les finitions R10 de Creta ne sont pas assimilés aux nouvelles textures R9 60 × 120 cm. Les petites références Mysterium 60 × 120 cm restent indépendantes des grandes dalles LB120x. Les décors ne remplacent aucune teinte unie.

## Contrôles et limites

- 49 tests Python réussis pour la reprise d’import, le classement, la publication et l’activation, dont 15 pour Mysterium.
- Contrôles de sélection Creta et Mysterium réussis avec des jeux de données synthétiques. Ils ne constituent pas des contrôles réseau des ressources manquantes.
- L’activation Creta exige les 53 faces de base, leurs 159 variantes et 477 contrôles HTTP réels réussis sur les trois origines. Le compteur simulé utilisé par les tests n’active rien.
- Les contrôles empêchent une reprise avec un mauvais format, une mauvaise finition, une autre collection, une image tronquée, une empreinte modifiée ou un profil manquant.
- La conversion CMJN vers sRGB conserve le profil colorimétrique et évite une copie mémoire inutile lorsque l’orientation EXIF vaut un.
- Aucune donnée de connexion, URL privée du portail ou image originale volumineuse n’est ajoutée au dépôt.

Le portail a confirmé la connexion au compte LE ROY FACTORY et affiche les visuels. Les opérations d’enregistrement du fichier ont cependant échoué, avec le bouton officiel comme avec l’enregistrement du visuel affiché, y compris pour un fichier de 431 Ko. Aucun nouveau téléchargement réussi n’est comptabilisé.

Après cette erreur, la reprise du navigateur de travail échoue avant toute ouverture de page. Les deux réinitialisations disponibles ont été tentées sans rétablir l’accès. Cette limite concerne l’environnement de navigation actuel ; elle ne prouve pas un problème des fichiers ou des autorisations Elios.

La préparation Mysterium comprend également la publication contrôlée de 72 variantes et l’activation des six références après 216 contrôles HTTP réels. Ces outils restent inactifs tant que les 24 originaux n’ont pas été récupérés et vérifiés.

La recherche sur les pages publiques officielles fournit seulement des échantillons de 250 à 1 400 pixels et des planches de faces ; ces fichiers ne remplacent pas les originaux professionnels. La récupération des lots MINIMALI reste nécessaire avant leur activation.

Le dossier de reprise conserve les variantes optimisées déjà publiées et les inventaires. Les copies locales des 121 originaux historiques et des quatre ambiances Quercia ne sont plus présentes dans l’environnement repris ; elles ne doivent pas être annoncées comme jointes à cette sauvegarde.
