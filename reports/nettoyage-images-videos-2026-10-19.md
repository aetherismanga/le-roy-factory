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

Cette suppression des fichiers courants sera suivie d’une compaction contrôlée de l’historique des branches, avec sauvegarde avant envoi atomique. Les sauvegardes précédemment téléchargées sur le PC sont conservées. Le tag historique et les références des anciennes demandes de modification ne sont pas supprimés ; ils peuvent retenir des objets et maintenir le compteur GitHub élevé.

Les vérifications des parcours CRM authentifiés et des applications natives ne sont pas comprises dans cette étape. Leurs sources et mécanismes d’accès ne sont pas modifiés.
