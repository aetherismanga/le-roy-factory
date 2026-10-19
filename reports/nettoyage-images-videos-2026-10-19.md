# Nettoyage des images et vidéos — 19 octobre 2026

888 fichiers déjà migrés sont retirés de la version courante du dépôt : **882 images et 6 fichiers vidéo**, représentant **186 879 331 octets** (environ 187 Mo de fichiers Git). Les adresses Firebase déjà utilisées par les pages et les configurateurs sont conservées, ainsi que les données, scripts, PDF, modèles 3D et tarifs.

## Vérification avant retrait

Les 892 images et vidéos du manifeste ont été téléchargées intégralement depuis Firebase. Leur taille, empreinte SHA-256 et MD5 correspondent au manifeste ; leur contenu correspond aux blobs Git, après les conversions de fins de ligne Windows déjà documentées pour 29 SVG et un ancien fichier MP4 vide. Les images matricielles ont été décodées localement ; cinq images refusées par le décodeur local ont été affichées avec succès dans Chrome. Les SVG ont été analysés sans erreur. Aucun fichier n’a été recompressé ou réduit.

Le fichier `pageacceuil.mp4` était déjà un emplacement vide inutilisé (un octet Git, deux octets après extraction Windows), et ne constitue pas une vidéo lisible. Sa copie Firebase est conservée ; aucune référence ne l’active.

## Compatibilité conservée

- Le logo `assets/img/logo03lrf.png` reste disponible pour les anciennes signatures de mails et les liens historiques.
- Les trois petits échantillons Harmony restent dans Git pour que le générateur des modèles 3D puisse toujours les ouvrir. Les 39 modèles GLB restent en place.
- Le service worker précharge désormais le logo réellement présent, à la place d’une ancienne adresse absente. Le cache existant et sa prise en charge des médias Firebase sont conservés.
- Une ancienne adresse GitHub du portrait Coryne dans `layout.css` référence une version différente du fichier actuel : elle reste inchangée. Son commit est conservé par le tag historique, lui-même inchangé.
- Les images hors du manifeste, les captures des rapports et les ressources de l’application Nuage Nomade restent en place. Rien n’est supprimé de Firebase.

Les anciens liens directs vers les 888 fichiers retirés ne constituent plus des adresses de média disponibles sur GitHub Pages. Les pages actuelles utilisent déjà les adresses Firebase. Aucune redirection HTML n’est employée pour les images ou vidéos, car elle ne permettrait pas leur affichage dans une balise média.

## Historique et sauvegardes

La compaction de l’historique a été appliquée et vérifiée sur les **120 branches**, avec sauvegarde complète avant l’envoi atomique et vérification des anciens identifiants de branche. Les arbres courants ne changent pas pendant cette réécriture, et tous les fichiers hors des 888 chemins autorisés restent identiques sur chaque branche. Les sauvegardes précédemment téléchargées sur le PC sont conservées. Le tag historique et les références des anciennes demandes de modification ne sont pas supprimés ; ils peuvent retenir des objets et maintenir le compteur GitHub élevé.

Les vérifications des parcours CRM authentifiés et des applications natives ne sont pas comprises dans cette étape. Leurs sources et mécanismes d’accès ne sont pas modifiés.


## Mesure après nettoyage

Une nouvelle copie Git ordinaire avec branches et tag contient **643 768 769 octets de paquets Git**, soit environ **644 Mo**. La copie vérifiée avant les images et vidéos contenait 701 333 196 octets : le téléchargement Git diminue donc d’environ **58 Mo supplémentaires**. Par rapport aux quelque 906 Mo avant les deux nettoyages, la baisse cumulée est d’environ **262 Mo**.

Les 187 Mo retirés des fichiers courants et les 58 Mo de téléchargement Git sont deux mesures différentes : Git compresse et déduplique les fichiers, et le tag historique conservé retient des copies anciennes. Les anciennes références de demandes de modification peuvent également conserver des objets côté GitHub ; son compteur ne garantit donc pas une baisse immédiate identique à celle d’un nouveau clone.

Exécution et sauvegarde complète : https://github.com/aetherismanga/le-roy-factory/actions/runs/39183745075

La sauvegarde supplémentaire `original-history-before-media-compaction` reste disponible jusqu’au **26 octobre 2026 à 01:06 UTC**. Les archives déjà téléchargées sur le PC ne sont pas modifiées.

## Contrôles complémentaires

- Les cinq vidéos utilisables ont été entièrement décodées avec FFmpeg sans erreur ; leurs dimensions et codecs sont conservés dans le rapport JSON.
- La publication GitHub Pages a réussi. Les six principales pages ont été ouvertes et contrôlées : aucun média chargé n’était cassé, et les aperçus de textures du configurateur répondaient depuis Firebase.
- Le rendu WebGL du navigateur distant ne s’initialise pas. Les tests de régression existants ont **réussi dans Chromium avec moteur logiciel**, pour les deux configurateurs aux largeurs 1440 et 390 pixels. Les 73 textures ELIOS, revêtements indépendants du sol et du mur, formats physiques, prix inchangés, plein écran, ouverture de la composition, exports PNG et sauvegarde/reprise des projets sont validés, sans erreur de script ou de texture manquante dans ces quatre scénarios.

Tests et captures de contrôle : https://github.com/aetherismanga/le-roy-factory/actions/runs/39183951607

Les anciennes copies de travail doivent être remplacées par un nouveau clone pour repartir de l’historique allégé ; conserver séparément les changements locaux éventuels et les archives de sauvegarde.
