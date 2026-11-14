# Dossier Google Play — préparation

Aucun accès Play Console ni téléversement n’a été réalisé. Le dossier fournit une version signée à tester, pas une approbation Google Play.

## Fiche et médias

- listing.fr-FR.json : nom, descriptions, notes de version.
- icon-512.png : copie exacte du logo officiel, PNG RGBA 512 × 512.
- feature-graphic-1024x500.png : visuel opaque crème/anthracite/doré.
- screenshots/ : captures réelles anonymes de l’APK. La barre du navigateur doit rester visible tant que l’association de domaine n’est pas validée ; renouveler les captures ensuite.
- Catégorie proposée : Maison et intérieur. Confirmer pays, distribution, public cible et coordonnées de l’éditeur.

## Points à compléter avant soumission

1. Accès Play Console et vérification de l’éventuelle existence du package fr.leroyfactory.crm. Confirmer certificat d’importation et code de version. Les exigences de tests fermés/vérification d’identité propres au compte restent à vérifier.
2. Empreinte Play App Signing puis accord explicite pour publier les associations de domaine décrites dans le README.
3. Identité légale et e-mail support à afficher. Aucun e-mail privé n’a été choisi arbitrairement.
4. Comptes de recette/révision Google : accès professionnel, agent et partenaires, avec données fictives et droits limités. Stocker ces accès hors Git.
5. Recette de connexion, persistance, déconnexion, rôles, Google Calendar et ateliers. Les commandes/envois/suppressions exigent un environnement de test ou une autorisation spécifique.
6. Sauvegarde portable de la clé sur support indépendant, phrase secrète conservée séparément.

## Confidentialité et déclaration des données

La page actuelle https://leroyfactory.fr/politique-confidentialite.html répond 200 mais documente principalement le formulaire de contact. Elle ne couvre pas complètement l’application, Firebase, Google, les données CRM, les commandes, les durées de conservation et les modalités opérationnelles de suppression. L’éditeur doit la compléter et l’approuver avant publication Android. Elle n’a pas été modifiée.

Le conteneur n’ajoute ni publicité ni collecte native d’identifiants. Cela ne permet **pas** de déclarer « aucune collecte » pour l’ensemble du service web exposé.

| Catégorie à examiner | Finalité à confirmer |
|---|---|
| Nom, e-mail, UID, session | Authentification Firebase et compte professionnel |
| Coordonnées et données professionnelles | CRM, accompagnement commercial |
| Commandes, devis, projets, documents | Exécution et suivi des demandes, exports |
| Localisation, photos/fichiers, micro si utilisés | Fonctions web facultatives, autorisées dans le navigateur |
| Agenda Google et autorisations OAuth | Fonctions d’agenda de l’utilisateur habilité |
| Journaux techniques et prestataires | Traitements réels Firebase/Google, hébergeurs et partenaires |

Pour chacune : confirmer collecte/partage au sens Google, finalité, nécessité, chiffrement, conservation et suppression. « Pas de vente » ne signifie pas « pas de partage ». Vérifier la création de compte dans tous les parcours : si elle est proposée, prévoir la demande de suppression dans l’application et un lien public fonctionnel. Aucune suppression n’a été testée en production.

La décision d’acceptation appartient à Google. La publication restera une étape séparée avec autorisation.

Sources : [Sécurité des données](https://support.google.com/googleplay/android-developer/answer/10787469), [médias Play](https://support.google.com/googleplay/android-developer/answer/9866151), [suppression de compte](https://support.google.com/googleplay/android-developer/answer/13327111).
