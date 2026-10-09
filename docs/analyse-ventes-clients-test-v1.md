# Analyse ventes clients — TEST V1

## Périmètre

Page `analyse-ventes-clients.html`, styles dédiés et modules `assets/js/sales/`.
Seule modification partagée : remplacer l'entrée Ma Station dans `account-requests-nav.js`.
Les anciens fichiers Ma Station sont conservés. Les statistiques fournisseurs,
le référentiel clients et l'authentification ne sont pas modifiés.

## Données et accès

Le module réutilise Firebase Auth et `getAgentProfile` existants. Il lit `clients`
et `codeClient`, sans écriture sur les clients ni génération de codes. Les données
commerciales ne sont jamais embarquées dans le dépôt public.

Collections distinctes :

- `lrf_sales_test_v1/workspace` : révision, index des imports actifs et correspondances.
- `lrf_sales_test_v1_imports/{uuid}` : imports immuables, synthèses/détails et références produits.
- `lrf_sales_test_v1_events/{uuid}` : imports, annulations, historique des correspondances.

Les règles Firestore existantes réservent déjà ces collections aux deux agents.
Aucune règle de sécurité, table existante ou configuration de production ne change.
Le même projet Firebase est utilisé : **les collections sont isolées, pas le projet**.
Un déploiement de cette branche est une prévisualisation uniquement.

## Fiabilité

Calculs monétaires en centimes entiers. Une quantité absente reste nulle. Les
unités et bases HT/TTC restent séparées. Synthèses prioritaires sur le détail au
même périmètre fournisseur/client/base. Le mois ou une qualité sélectionnée ne
ventile jamais artificiellement la synthèse annuelle. Les achats sont présentés
comme détail partiel. La couverture réelle est indiquée.

Le rapprochement reste explicite, même pour un nom exactement égal. Le LRF
regroupe les fiches du module ; aucun doublon CRM n'est créé. Les fiches CRM qui
partagent déjà un code sont signalées. Sans code, l'identifiant CRM est conservé.

Un même contenu normalisé est rejeté même si son nom de fichier change.
Les chevauchements client/référence/période sont contrôlés en transaction et
nécessitent un remplacement explicite de l'import complet. Pas de fusion
hasardeuse. L'annulation restaure les imports remplacés, sauf conflit ultérieur.
Les mises à jour concurrentes imposent une nouvelle vérification de l'aperçu.

## Imports et exports

CSV/TSV, Excel : colonnes reconnues, aperçu éditable CSV, puis validation.
JSON : paquet de reprise contrôlé, uniquement des lignes au schéma validé.
PDF et images : texte/OCR avec Tesseract.js, local au navigateur ; structuration
et contrôle manuels nécessaires pour les tableaux irréguliers. **L'OCR n'est pas
un import automatique garanti des relevés VIEW.** Les pages insuffisamment
reconnues restent dans le texte extrait. Ne pas valider un fichier partiellement
reconnu sans prendre en compte ces pages.

Bibliothèques chargées à la demande : SheetJS 0.20.3, PDF.js 4.10.38,
Tesseract.js 5.1.1, jsPDF 2.5.2. Une connexion Internet est requise.
25 Mo/fichier, 30 pages/PDF, 1 500 lignes et 750 ko par import.

Excel : données filtrées et feuille contexte. PDF : fiche/résultat avec contexte,
couverture et détail partiel explicites. Filtrage mémorisé dans la session.

## Vérification

`node --test tests/sales/*.test.mjs`

Avant de déclarer la V1 prête : tester dans un navigateur agent connecté,
importer le paquet privé VIEW, valider les rapprochements LRF, tester le
réimport, l'annulation, les exports et l'écran Android. Les tests unitaires ne
remplacent pas ces validations réelles. Aucune fusion vers main sans accord.
