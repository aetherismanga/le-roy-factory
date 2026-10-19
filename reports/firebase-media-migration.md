> **Mise à jour du 19 octobre 2026 :** 888 images et vidéos déjà migrées ont depuis été retirées du dépôt et leur historique a été compacté sur les 120 branches. Voir [le rapport de nettoyage](nettoyage-images-videos-2026-10-19.md). Le texte ci-dessous décrit l’étape initiale du 18 octobre.

# Migration des médias publics vers Firebase

931 fichiers copiés, 189 336 344 octets stockés (189 310 364 octets dans les blobs Git). Les images, textures, vidéos et modèles publics sont servis depuis des URL versionnées du bucket existant. Les originaux et tout l’historique Git sont conservés. Aucun espace GitHub n’est encore libéré.

Contrôles : empreintes MD5 identiques pour les 931 copies ; 886 images décodées avec contrôle canvas ; 39 en-têtes GLB valides ; cinq vidéos lues. Le sixième fichier vidéo est un ancien fichier inutilisé de deux octets, conservé sans activation. Tests des deux configurateurs sur ordinateur et mobile, 73 textures ELIOS, dimensions, prix, sélections indépendantes, sauvegarde des projets et export PNG réussis. Dix vérifications de pages sur ordinateur/mobile sans image cassée ni débordement horizontal.

Les règles Firebase Storage et les droits globaux du bucket ne sont pas modifiés. Seuls les objets déjà publics du site disposent d’un accès public individuel. Les protections des tarifs et les mécanismes d’authentification restent inchangés. Les parcours CRM authentifiés et applications natives ne sont pas testés dans cette étape.

Les fins de ligne de 29 fichiers SVG et du fichier MP4 vide inutilisé ont été converties par Git sous Windows lors de l’extraction. Leur contenu visuel est inchangé ; le manifeste distingue la taille du blob Git et celle du fichier copié. Les empreintes vérifiées portent sur les fichiers sources extraits. Prévisualisation en ligne vérifiée : accueil, réalisations et deux configurateurs avec textures et exports canvas.

Le service worker reconnaît uniquement les nouvelles URL des médias publics de ce projet dans Firebase. Il conserve le cache existant et accepte les réponses images opaques ainsi que les lectures CORS pour les textures. Test hors connexion : accueil mobile déjà visité avec 21 images visibles, aucune manquante ; texture ELIOS chargée et export PNG fonctionnels. Les domaines tiers, objets privés et requêtes POST sont exclus de cette nouvelle prise en charge.
