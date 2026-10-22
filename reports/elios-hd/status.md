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
- Neuf variantes sRGB 256 / 1 024 / 4 096 pixels préparées, 5 856 594 octets.
  Les originaux pèsent ensemble 387 872 271 octets et restent hors GitHub.
- Conversion ICC, dimensions, proportions, rotation, empreintes, reprise et
  refus d'une source CMYK sans profil contrôlés.
- Préparation du rendu ELIOS dans LRF Plan & Pose et de son export PNG/PDF
  en 4 096 pixels ; catalogue actuel inchangé tant que les ressources ne sont
  pas publiées. Les autres fabricants conservent leur comportement.
- Vérification du mécanisme existant de qualité et capture HD des deux moteurs
  RANDAL. Aucune texture de ces moteurs n'a été remplacée durant cette phase.

## Publication en attente

**Aucune nouvelle référence activée. Aucun configurateur publié par cette mission.**

Le 23 octobre 2026, Jérôme a confirmé être agent d'usine Elios et disposer de
l'autorisation d'utiliser ces visuels dans les configurateurs LE ROY FACTORY.
Cette confirmation utilisateur lève le blocage des droits pour la mission.
Elle est enregistrée comme déclaration de l'utilisateur, sans prétendre qu'un
contrat signé du fabricant a été reçu ou qu'une licence publique a été trouvée.
Les trois faces Creta dont l'identité et le profil ICC ont été vérifiés peuvent
donc être préparées pour l'intégration ; leur hébergement et leur activation
restent des étapes distinctes.

Le stockage existant est lisible pour les objets publics déjà publiés.
L'environnement local n'a pas de connexion Cloud Storage utilisable pour
l'écriture. La console Firebase a présenté la connexion Google ; sa connexion
n'a pas pu être confirmée après expiration des appels du navigateur. Cela ne
prouve ni un échec des identifiants ni une panne de Firebase.

Le téléchargement complet est suspendu avant saturation du disque local. Sa
reprise exige une destination durable accessible pour traiter les originaux
séquentiellement et publier seulement leurs variantes optimisées.

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

1. Établir une connexion d'écriture au stockage existant sans publier de secret.
2. Télécharger et rapprocher les références, couleurs, formats et faces réels ;
   dédoublonner par empreinte et préparer les trois niveaux en flux.
3. Publier les variantes sous un préfixe immuable et activer uniquement les
   collections complètes et vérifiées dans les deux moteurs RANDAL et le
   catalogue LRF, puis tester sols, murs, cloisons, poses et captures.
4. Déployer et vérifier les trois résultats avant d'annoncer la mise en ligne.
