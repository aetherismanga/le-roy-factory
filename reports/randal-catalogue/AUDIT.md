# Audit RANDAL Catalogue général — 17 octobre 2026

Base Git : `b23f1344b90e8358dce386d42f462a6023bb5341`. Sauvegarde : `backup/randal-catalogue-before-20261017`. Branche : `refactor/randal-catalogue-general-20261017`.

## Périmètre et conservation

STUDIO ONE est protégé : aucun de ses fichiers, données, styles, prix, modèles, projets ou dépendances partagées n’est modifié. Les modules ajoutés appartiennent exclusivement au Catalogue général. Le moteur `randal-composition-3d.js` est référencé uniquement par `randal-configurateur.html`.

Les données d’origine sont archivées dans `baseline-data.json`, le script original dans `original-configurator.js`, les 431 montants affichés dans `baseline-prices.json`. La conversion déjà présente dans le code initial reste strictement identique ; aucune nouvelle conversion ni correction de prix n’est appliquée. Les prix du PDF ne sont pas utilisés pour la refonte.

## Inventaire des collections

| Collection | Pages | Types | Largeurs existantes (cm) | Finitions |
|---|---|---|---|---|
| Harmony | 3–6 | 2 tiroirs, 3 tiroirs avec pieds, Colonne auxiliaire | 60, 70, 80, 90, 100, 120 | 3 |
| Luce | 7–9 | 1 tiroir, Colonne auxiliaire | 80, 120 | 3 |
| Brent | 10–14 | 3 tiroirs, 2 tiroirs + niche, Colonne auxiliaire | 80, 100, 120, 140 | 8 |
| Aruba rainuré | 15–16 | 2 tiroirs rainurés | 60, 70, 80, 90, 100, 120 | 3 |
| Aruba | 17–19 | 2 tiroirs, Colonne auxiliaire | 60, 70, 80, 90, 100, 120 | 6 |
| Aras | 20–22 | 2 tiroirs, Colonne auxiliaire | 60, 70, 80, 90, 100, 120 | 5 |
| Boreal | 23–25 | 2 tiroirs, Colonne auxiliaire | 60, 79, 120 | 5 |
| Brunei | 26–27 | 2 tiroirs | 60, 70, 80, 90, 100, 120 | 4 |
| Amat | 28–30 | 2 tiroirs, 2 tiroirs + porte, 3 tiroirs avec pieds, 3 tiroirs + porte avec pieds | 80, 90, 100, 120 | 3 |
| Less | 31–32 | Meuble 1 porte | 40 | 3 |
| Sima | 33–34 | Plateau pour vasque à poser | 60, 80, 100, 120 | 3 |

Les tableaux de références, hauteurs, profondeurs, finitions et prix sont conservés intégralement dans `baseline-data.json` puis structurés dans `assets/js/randal-catalogue/data.js`. Vasques : Sella, Tampa, Neris, Torne ; 7 finitions de plateaux ; 6 familles de miroirs avec formats et cadres ; colonnes assorties pour Harmony, Luce, Aruba, Aras et Boreal, colonnes Brent indépendantes. Les autres demandes de miroir sont conservées comme texte à préciser, sans créer d’article fictif.

## Comparaison au PDF fourni

Document analysé : RANDAL V04, 43 pages. Les 431 entrées tarifaires conservées renvoient à des références retrouvées dans son texte. Le fichier `catalogue-correspondence.csv` donne les pages et la décision pour chaque entrée. Ce repérage textuel ne constitue pas une certification fabricant de chaque combinaison. Les dessins techniques ont été utilisés pour les particularités ci-dessous.

| Donnée / bug initial | Cause | Décision |
|---|---|---|
| Neris et Torne | Tables de références interverties | Réaffecter selon le dessin p.41, en conservant les mêmes tarifs existants par référence |
| Colonne Luce | Largeur et profondeur inversées dans la normalisation | 25 × 165 × 30 cm selon p.9 ; aucune modification de référence/prix |
| Harmony 120 commercial | Migration existante 119 → 120 utilisée aussi comme dimension 3D | Géométrie et devis meuble 119 cm selon p.4–5 ; vasque/plateau 120 cm indépendants |
| Boreal 79 | Recherche de vasque sur largeur 79 absente du tableau 80 | Meuble 79 cm, vasque 80 cm ; aucun plateau 79 inventé |
| Less | Montage sans vasque supprimant le lavabo intégré dans la 3D | Représenter le lavabo du dessin p.32 sans ligne facturée supplémentaire |
| Tampa 140 | Référence double cuve dessinée avec une seule cuve | Deux cuves pour la référence 6236 existante |
| SIMA 13990 / 13993 / 13996 / 13999 | Références communes avec Amat dans le PDF lui-même | Conserver collection + modèle + référence comme identité commerciale ; demander confirmation usine, ne pas inventer de remplacement |
| Position des objets | Recréation de toute la scène et sélection par type global | Identifiants persistants ; positions stockées séparément de la géométrie |
| Quantité > 3 | Le devis acceptait davantage d’exemplaires que les clones 3D | Créer une instance indépendante par exemplaire, ajout atomique sans collision |
| Portes / tiroirs hors Harmony | Façades statiques sur blocs pleins | Caisses creuses, groupes de tiroirs et pivots de porte par modèle |
| Navigation | Brouillon forcé à l’étape 1, absence de précédent/suivant, perte de couleur | Restauration de l’étape et conservation des choix compatibles |

## Textures et qualité réelle

8 textures ELIOS Creta existantes, 558 × 558 pixels ; elles proviennent des échantillons du catalogue ELIOS 2026 p.112. Les images natives de ces pastilles dans le PDF mesurent environ 117 × 118 pixels : aucun agrandissement n’est annoncé comme HD. Une seule face est disponible par coloris. Les fichiers partagés ELIOS restent intacts.

COCO Beige VIEW : photo utilisateur 240 × 295 montrant plusieurs carreaux. Le moteur extrait une face rectangulaire identifiable de 101 × 67 pixels pour poser des carreaux 60 × 40 cm avec joints de 2 mm. Résolution limitée, aucun fichier fabricant HD disponible. Ce revêtement reste une ambiance indicative.

46 pastilles RANDAL de 188 × 188 pixels. Le moteur prélève la matière sans agrandir à 1024 ni inventer du veinage. Les couleurs et références existantes sont conservées. Pas de normal map fabricant disponible. Inventaire complet : `texture-inventory.json`.

Optimisations prévues : cache image/texture par URL et orientation ; partage des matériaux texturés ; rendu à la demande ; définition plafonnée sur téléphone ; ombres 1024/2048 selon écran ; environnement miroir 128/256 ; libération GPU à la fermeture. Les tests doivent confirmer les comportements.

## Fonctions commerciales existantes

La page d’origine préparait un message via `RandalMailChooser`, sans envoi serveur automatique : destinataire help.pro.fr@randal.group et copies commerciales existantes. Ce mécanisme est conservé pour le professionnel, avec confirmation. Le visiteur prépare une demande à Coryne et Jérôme, contenant la composition. Aucun message réel ni commande ne sera envoyé pendant les essais.

La session professionnelle existante est lue via `LRF_PRO_SESSION` ; la refonte ne change aucun mécanisme de connexion. Les projets Catalogue sont locaux et séparés par compte, avec un espace visiteur distinct. Aucun stockage cloud ajouté. Le catalogue interactif existant possède déjà sommaire, index, zoom et navigation : conservé avec accès direct à la page du modèle sélectionné.

## Vérification à livrer

Contrôle automatisé des 431 prix, conservation des données, fichiers STUDIO ONE protégés et compatibilités. Essais Playwright Chromium WebGL sur ordinateur et émulation tactile smartphone. Dossier A4 avec récapitulatif et quatre captures actuelles. La matrice finale distinguera les essais réussis, les simulations et les limites non vérifiées.

## Complément textures fabricant — vérification web

Les huit coloris Creta ont été retrouvés sur la page officielle ELIOS : https://eliosceramica.com/collezione/creta/ . Les six fichiers de 2024 mesurent 1400 × 700 px, Malto et Pepe 1200 × 700 px. Ce sont des échantillons matière sans mobilier, pas des photos d’ambiance. Les originaux sont conservés dans `assets/img/randal/catalogue-tiles/` ; provenance, dimensions, taille et empreintes figurent dans `manufacturer-textures.json`. Le moteur prélève un carré central natif de 700 px sur ordinateur et réduit à 512 px sur smartphone, sans étirement et sans fabriquer de nouvelles faces. Les textures partagées existantes restent disponibles en secours et ne sont pas modifiées. La résolution réelle est indiquée ; aucune qualité HD n’est revendiquée.

La lecture des sessions PRO est isolée dans `account.js`, suivant les mêmes clés et le même service `validateProSession` que le site. Elle évite de charger des extensions analytiques ou tarifaires étrangères au Catalogue général. Aucun module partagé de connexion n’est modifié.
