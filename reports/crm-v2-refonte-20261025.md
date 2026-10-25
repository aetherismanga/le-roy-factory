# CRM LE ROY FACTORY V2 — version de test

Branche : `work/crm-v2-refonte-professionnelle-20261025`.
Base : `main` au commit `d238279752209aacf0474e673418af3cd752b3ce`.
Correctifs CRM repris de la PR 121, commit `84482a0939b21cdba83ac94ad214dadf48cae266`.
Les 74 fichiers CRM de cette PR ne présentent pas de conflit avec cette base ; les scripts du package actuel sont conservés et complétés.

## Périmètre livré

Le CRM existant est conservé : 20 pages métiers, formulaires et gestionnaires existants. La branche prépare une interface claire, un menu regroupé, une barre mobile Accueil/Clients/Carte/Tournées/Menu, une barre PC réductible et une fiche client mobile avec actions rapides. Les liens publics Catalogues/Fabricants sont retirés du menu, les fabricants et autorisations internes restent disponibles.

L’accueil lit les collections existantes : clients, rendez-vous, tournées, historiques et communications. Les chiffres ne sont pas inventés : les états indisponibles restent signalés. Les relances sont fondées sur le dernier contact connu de plus de 60 jours ; les comptes-rendus en attente demandent un statut explicite. Recherche clients, codes LRF, partenaires, contacts et comptes-rendus. L’heure reste discrète ; anciens scripts horloge, météo et avatar désactivés pour V2.

Le bonjour quotidien utilise l’UID et le profil authentifié, avec 70 phrases locales. Stockage par compte et date locale, fermeture immédiate, absence de nouvel appel IA ou Firebase, gestion des changements de compte et des ouvertures simultanées via Web Locks si disponible. La déduplication est par navigateur ; si tout stockage persistant est bloqué, elle est limitée à la page courante.

Les corrections transactionnelles de la PR 121 préservent identifiants, codes et associations. Une ancienne correction automatique de code dans `statistiques-lrf-multi.js` est également neutralisée : la consultation n’altère plus les codes LRF.

## Isolation de l’aperçu

Construire avec `npm run build:crm:preview`. Déployer **uniquement** la sortie `crm-preview/`, jamais la racine du dépôt. Le constructeur suit une liste de pages autorisées et les dépendances locales. L’aperçu remplace les imports SDK Firebase par un adaptateur fictif local, retire la configuration Firebase réelle, remplace les données commerciales embarquées par des exemples et bloque mails, Calendar, fichiers distants et appels API externes.

La CSP `connect-src 'self'`, le blocage réseau du navigateur et l’absence du SDK réel apportent des protections indépendantes. Les seules images externes autorisées sont les tuiles cartographiques OpenStreetMap. Les bibliothèques UI CDN sont autorisées ; aucun service externe d’écriture n’est connecté. Les liens externes appel/mail/GPS sont neutralisés dans cette version de test.

Les profils Jérôme et Coryne dans l’aperçu sont explicitement des comptes **de démonstration**, sans identifiants réels. Les modifications de test sont conservées uniquement dans le navigateur. Aucun client réel, règle Firebase, backend, configurateur, catalogue, texture ou tarif n’est modifié. Aucun merge ni déploiement de production n’est effectué.

## Vérification

`npm run test:crm` : 123 tests réussis à ce stade. Contrôles sur identifiants, conflits, transactions, associations, codes, documents, comptes-rendus, mails simulés, marqueurs, exports, accueil et isolation. Analyse statique des modules de la sortie : 100 modules analysés, 79 liés, aucune erreur. Résultats dans `reports/crm-v2/test-results.json`.

Contrôles Cloud Chrome effectués sur l’aperçu protégé : accueil chargé avec chiffres des fixtures ; navigation et menu ; ouverture de fiche ; trois partenaires cochés ; modification de note ; réouverture confirmant la note, les partenaires et le code LRF ; carte six marqueurs puis deux après filtre 34. `review.html` permet une simulation responsive à 320/375/390/430/844/1366 pixels.

Ces contrôles ne sont pas des tests sur de vrais appareils Android/iPhone. Safari iOS, clavier et autorisations GPS natifs, réseau mobile dégradé et reconnexion doivent encore être validés sur appareils. Les règles Firebase effectivement déployées, l’authentification réelle, Google Calendar, les téléversements et l’idempotence serveur des mails restent hors validation. Treize logos fabricants décoratifs manquent dans l’aperçu ; les noms et associations sont conservés. Les statistiques privées encore présentes dans l’ancien site public nécessitent un chantier de migration distinct ; cette mission ne modifie pas ce site.

## Retour arrière

La production demeure sur sa version actuelle : aucune restauration de données n’est nécessaire. Pour interrompre le test, révoquer son lien temporaire puis supprimer le déploiement de prévisualisation si souhaité. Conserver la branche sans la fusionner. Le stockage fictif local est isolé par l’origine et par des clés `lrf:crm-v2:fictional-*`. Ne pas effacer les données du site officiel.

Toute future publication demande une validation explicite de Jérôme, une nouvelle revue du diff contre le `main` alors courant et des tests avec un véritable environnement Firebase de test. Aucun changement de protection Vercel n’est nécessaire : conserver la protection et utiliser un lien temporaire limité à la prévisualisation.

Prévisualisation protégée : https://le-roy-factory-d8sb406cn-hugol-trading.vercel.app — déploiement `dpl_71vqBNevV44yp7UBKmhPBs3BmFUL`, cible preview (target null), aucun alias de production.
