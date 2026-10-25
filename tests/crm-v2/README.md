# CRM V2 — prévisualisation isolée

La prévisualisation est générée par `node scripts/build-crm-preview.mjs` dans `crm-preview/`.
Seul ce dossier doit être déployé. Ne pas déployer la racine du dépôt pour ces tests.

Les pages métier existantes et leurs extensions sont conservées ; dans la sortie uniquement :

- les imports Firebase sont remplacés par `crm-preview-sdk.mjs` ; aucune connexion Firebase n'est initialisée ;
- les fiches, partenaires associés, historiques, agenda et tournée proviennent de fixtures explicites « DÉMO » ;
- les sauvegardes persistent dans le stockage local du navigateur avec une clé propre à cette prévisualisation ;
- les données commerciales embarquées et les contacts réels sont remplacés par des fixtures ;
- les appels réseau externes sont bloqués par la garde et par une CSP, les formulaires externes sont interdits ;
- les mails, appels téléphoniques et liens externes sont interceptés ; aucun jeton d'authentification réel n'est disponible ;
- seuls les scripts/styles des bibliothèques CDN autorisées et les images des tuiles OpenStreetMap peuvent être chargés ;
- aucune fonction backend, aucun configurateur, catalogue ou tarif n'entre dans le paquet de test.

Le bandeau « VERSION TEST » propose deux comptes fictifs, Jérôme et Coryne. Il ne s'agit pas de l'authentification de production. La protection Vercel doit être conservée ; le partage doit employer un lien temporaire autorisé.

`node --test tests/crm-v2/*.test.mjs` vérifie notamment l'isolation du paquet, les relations d'une fiche, l'atomicité des opérations locales et l'identité des comptes de démonstration.

Les adaptateurs locaux permettent de tester les parcours d'interface ; ils ne certifient ni les permissions Firestore réellement déployées ni le fonctionnement de Google Calendar, des mails, téléversements, géocodages ou calculs d'itinéraires externes. Ces intégrations restent à valider dans un véritable environnement de recette séparé.

Retour arrière : retirer la prévisualisation ou revenir au commit précédent de la branche de test. Aucune restauration de données de production n'est nécessaire car cette version n'y a pas accès. Pour réinitialiser les seules données fictives d'un navigateur, effacer la clé `lrf:crm-v2:fictional-store:v1` de ce domaine de prévisualisation.
