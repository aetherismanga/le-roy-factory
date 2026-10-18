# Migration des médias publics vers Firebase

931 fichiers copiés, 189 310 364 octets. Les images, textures, vidéos et modèles publics sont servis depuis des URL versionnées du bucket existant. Les originaux et tout l’historique Git sont conservés. Aucun espace GitHub n’est encore libéré.

Contrôles : empreintes MD5 identiques pour les 931 copies ; 886 images décodées avec contrôle canvas ; 39 en-têtes GLB valides ; cinq vidéos lues. Le sixième fichier vidéo est un ancien fichier inutilisé de deux octets, conservé sans activation. Tests des deux configurateurs sur ordinateur et mobile, 73 textures ELIOS, dimensions, prix, sélections indépendantes, sauvegarde des projets et export PNG réussis. Dix vérifications de pages sur ordinateur/mobile sans image cassée ni débordement horizontal.

Les règles Firebase Storage et les droits globaux du bucket ne sont pas modifiés. Seuls les objets déjà publics du site disposent d’un accès public individuel. Les protections des tarifs et les mécanismes d’authentification restent inchangés. Les parcours CRM authentifiés et applications natives ne sont pas testés dans cette étape.
