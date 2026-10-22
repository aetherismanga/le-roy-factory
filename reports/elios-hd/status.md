# ELIOS HD — état de la mission, mis à jour le 23 octobre 2026

## Réalisé

- Connexion au portail officiel, compte LE ROY FACTORY vérifié visuellement.
- Inventaire des 32 dossiers de collections actuelles et de leurs 391 dossiers.
- 6 555 fichiers listés, dont 5 969 images de textures, 475 ambiances, un PDF,
  un fichier `.jps` à vérifier et 109 fichiers parasites exclus.
- Poids affiché d'environ 90 Go ; les fichiers ne sont pas tous téléchargés.
  Les chiffres d'inventaire ne sont pas un dédoublonnage par contenu.
- Trois originaux Creta téléchargés : `03V6A00@1.jpg` (Zucchero),
  `03V6A10@1.jpg` (Avena), `03V6A20@1.jpg` (Malto), références 60 × 120 cm.
- Neuf variantes sRGB 256 / 1 024 / 4 096 pixels préparées, 5 856 594 octets,
  envoyées dans le stockage Firebase existant par la console connectée.
  Les originaux pèsent ensemble 387 872 271 octets et restent hors GitHub.
- Lecture publique des neuf variantes contrôlée depuis les trois origines
  LE ROY FACTORY, STUDIO ONE et RANDAL Général : 27 téléchargements GET,
  type WebP, CORS, tailles et SHA-256 comparés à la préparation locale.
- Conversion ICC, dimensions, proportions, rotation, empreintes, reprise et
  refus d'une source CMYK sans profil contrôlés.
- Préparation du rendu ELIOS dans LRF Plan & Pose et de son export PNG/PDF
  en 4 096 pixels ; catalogue actuel inchangé tant que les collections ne sont
  pas complètes et leurs correspondances de format vérifiées. Les autres fabricants conservent leur comportement.
- Vérification du mécanisme existant de qualité et capture HD des deux moteurs
  RANDAL. Aucune texture de ces moteurs n'a été remplacée durant cette phase.

## Hébergement vérifié ; activation et déploiement à poursuivre

**Aucune nouvelle référence activée. Aucun configurateur publié par cette mission.**

Le 23 octobre 2026, Jérôme a confirmé être agent d'usine Elios et disposer de
l'autorisation d'utiliser ces visuels dans les configurateurs LE ROY FACTORY.
Cette confirmation utilisateur lève le blocage des droits pour la mission.
Elle est enregistrée comme déclaration de l'utilisateur, sans prétendre qu'un
contrat signé du fabricant a été reçu ou qu'une licence publique a été trouvée.
Les trois faces Creta dont l'identité et le profil ICC ont été vérifiés sont
hébergées sous neuf variantes. Leur activation dans les configurateurs reste
une étape distincte ; la collection Creta est encore incomplète.

L'accès d'écriture à Firebase est désormais confirmé : les neuf variantes
ont été envoyées depuis la console et leurs octets publics vérifiés. Firebase
n'est donc pas un blocage de connexion. Les CLI et ADC restent non connectés
dans l'environnement local ; aucun jeton de compte Google ou cookie
d'authentification n'a été lu ou exporté. Les URL publiques des seules textures
sont conservées dans le manifeste inactif `published-assets.json`.

Le téléchargement complet reste à réaliser en flux pour éviter la saturation
du disque : préparer puis héberger les variantes optimisées dans le stockage
existant maintenant accessible. Les trois originaux de contrôle sont conservés.
Aucune collection incomplète n'est activée. Le cache des moteurs RANDAL doit
aussi distinguer les formats avant une activation limitée aux vrais 60 × 120 cm :
un même coloris peut être posé simultanément en carré et en rectangle.

## Ressources particulières

- Skultura : 37 ambiances, aucun dossier MINIMALI observé.
- Stone Icon : seul un dossier AMBIENTI vide est présent ; aucune image de
  texture ou d'ambiance n'a été observée dans cette collection.
- Mysterium : 24 faces et 13 ambiances sous le dossier Magnus.
- Shell Ivory : extension `.jps` à vérifier, sans la traiter comme JPEG validé.
- Une copie de travail Allure est incluse dans l'inventaire des textures et
  doit être exclue ou comparée par empreinte lors de la récupération.

## Vérifications du code préparé

Les 63 tests LRF Plan & Pose passent, dont huit nouveaux tests de textures :
correspondance exacte au catalogue ELIOS, choix des trois niveaux, source HD
sans repli vers une vignette, orientation et découpe sur de vrais calepinages,
images embarquées, reprise réseau, budget mémoire et annulation. Les contrôles
de syntaxe et d'espaces passent. Le scénario DOM temporaire a aussi contrôlé
l'export et la restauration de l'état après une erreur.

La régénération du catalogue ne change aucun produit existant. Il reste à
effectuer les contrôles visuels dans les trois applications avec les nouvelles
ressources effectivement hébergées, ainsi que les essais sur appareils réels.

Les inventaires détaillés privés avec liens du portail sont conservés dans le
dossier de reprise ; seul le résumé sans liens de session est versionné ici.

## Suite nécessaire

1. Télécharger et rapprocher les références, couleurs, formats et faces réels ;
   dédoublonner par empreinte et préparer les trois niveaux en flux.
2. Compléter les collections, puis vérifier les caches par format et la
   correspondance exacte de chaque référence dans les trois configurateurs.
3. Activer uniquement les collections complètes et vérifiées ; tester sols,
   murs, cloisons, poses et captures avec les ressources hébergées.
4. Déployer et vérifier les trois résultats avant d'annoncer la mise en ligne.
