# STUDIO ONE — ELIOS, VIEW et projets — 19 octobre 2026

## Textures ELIOS

Les 73 fichiers activés ont été téléchargés depuis leurs adresses Firebase et contrôlés : tailles et SHA-256 identiques au manifeste de migration. Aucun fichier ELIOS ni aucune règle d’accès n’a été supprimé ou modifié.

Le service worker pouvait renvoyer une ancienne réponse opaque d’aperçu à une requête CORS de texture. Une telle image est affichable dans une balise image, mais illisible par un canvas WebGL. Le correctif refuse ce cache pour les requêtes CORS et utilise une adresse de lecture versionnée pour les matières. Les nouveaux aperçus sont eux aussi chargés en CORS. Le cache et les sauvegardes de projets ne sont pas effacés.

Le test de cache couvre la réponse opaque, la réutilisation d’une réponse CORS valide et la compatibilité des images d’affichage. Le test navigateur injecte une véritable réponse opaque dans CacheStorage avant de charger Quercia dans le moteur 3D.

## VIEW

Six fichiers natifs sur Firebase, vérifiés octet pour octet identiques à la sauvegarde récupérée : Corso Beige ; Golden Stone Ivory, Sand, Pearl, Oxid et Carbon. Les fichiers ne sont pas réintroduits dans GitHub. Seuls le manifeste, les contrôles et les références sont versionnés.

Coco Light et Beige restent exclus : source limitée à 589 × 387 pixels. Corso Avorio reste exclu : joints incorporés dans l’image de plusieurs carreaux. Les autres collections VIEW ne sont pas proposées dans STUDIO ONE.

L’upload récupère uniquement les six images source officielles et contrôle le PDF, les dimensions, chaque pixel RGB et le fichier WebP final avant de créer un objet. Il refuse d’écraser un objet différent. Les droits existants de création suffisent ; aucune extension IAM ni modification globale du bucket n’est appliquée.

## Mes projets

Cartes adaptatives, recherche par client ou nom de projet, date, nombre d’éléments et aperçu. Les nouveaux projets enregistrent une vignette JPEG compacte ; les anciens utilisent le schéma existant sans réécriture de leurs données. Si le quota local empêche l’ajout de la nouvelle vignette, l’enregistrement est retenté sans elle. Les clés de stockage par compte sont conservées.

Fermeture par bouton, clic extérieur ou Échap ; gestion du focus et fond inerte. Les noms de projet et client sont insérés comme texte.

## Vérification

Tests locaux aux largeurs 1440 et 390 pixels : six coloris VIEW chargés, textures indépendantes du sol et du mur, cache opaque récupéré, export PNG, devis inchangé, recherche, anciens projets préservés et ouverts, nouvel aperçu enregistré, fermeture au clavier et au clic extérieur. Les quatre scénarios de régression STUDIO ONE/RANDAL passent aussi localement, sans erreur de script ni ressource manquante.

Contrôle complet réussi avant publication, incluant le chargement des 73 coloris ELIOS : https://github.com/aetherismanga/le-roy-factory/actions/runs/39217657197

Publication des six originaux vérifiée : https://github.com/aetherismanga/le-roy-factory/actions/runs/39217216076

La vérification ne remplace pas un contrôle sur l’appareil réel de l’utilisateur. Aucune modification du matériel de rendu ni des données tarifaires n’est effectuée.
