État après retrait des copies : [nettoyage des catalogues publics](nettoyage-catalogues-publics.md). Le rapport ci-dessous décrit la phase initiale de copie.

# Migration des catalogues publics vers Firebase

Date : 18 octobre 2026. Base : 85d5f6bd3f7858c8f9381efe1974ee4d822df1b4.

34 catalogues publics, 625 530 416 octets, copies dans un prefixe distinct du bucket existant. Les empreintes MD5 et les tailles retournees par Firebase correspondent aux originaux. Les chemins, generations, empreintes SHA-256 et URL sont dans firebase-storage-migration.json.

Les pages et scripts utilisent les nouvelles URL. Les PDF originaux restent dans le depot pour conserver les anciens liens, les traitements automatiques et un retour arriere immediat. Aucune regle Storage ou Firestore, aucun code de connexion ni acces aux tarifs proteges n a ete modifie. La configuration CORS autorise GET et HEAD depuis le domaine du site et le serveur de test local ; elle ne donne aucun droit d ecriture.

Controles : syntaxe des 17 fichiers JavaScript modifies ; telechargement partiel des 34 PDF depuis un navigateur ; rendu de la premiere page de chaque PDF ; page Catalogues sur ordinateur et mobile ; lecteur La Fenice sur ordinateur et mobile, navigation a la page 2 ; comparaison avec la version de reference. Les deux erreurs JavaScript observees sur Catalogues sont aussi presentes dans la reference.

Limites : cette phase ne supprime aucun fichier et ne reduit pas encore la taille du depot. Les autres projets, les images et les videos restent a migrer. Les comptes et actions protegees du CRM n ont pas ete testes avec un utilisateur connecte. Les donnees vivantes Firebase et les sauvegardes precedentes restent intactes.

Avant un retrait des PDF du depot, adapter les workflows qui les utilisent comme fichiers locaux et traiter les anciennes URL. Un nettoyage d historique Git est une operation distincte, qui ne doit pas etre lancee automatiquement avec cette phase.
