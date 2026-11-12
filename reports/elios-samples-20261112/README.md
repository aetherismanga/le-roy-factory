# Demandes Elios — vrac, box expo et merchandising

Le parcours `echantillons-elios.html` réunit les trois sélections dans un panier.
Le vrac impose une pièce avec étiquette. Le box utilise le moteur, les gabarits,
les tapis, les colonnes carrelées, les profilés et le relevé natifs de Studio One.
Sa variante compilée conserve un espace local distinct des projets Randal.

## Sources importées

- Mail Ghislaine Lebreton du 12/11/2026, objet « ECHANTILLONS 2027 URGENT A BIEN COMPRENDRE ».
- Les deux listes version 9 et le budget merchandising 2027 joints.
- Merchandising Cersaie 2026, 31 pages, reçu le 05/10/2026.
- Merchandising 2026, 138 pages, reçu le 12/09/2026, et complément de 140 pages reçu le 05/02/2026.
- Les deux catalogues canoniques et les textures maximales existantes.

921 articles existants sont repris sans changer leurs SKU, coloris, formats ou
boîtages. 351 lignes correspondent aux collections, formats et finitions de la
liste de vrac active. Les anciennes feuilles « EX » et « eliminati » ne constituent
pas une autorisation de gratuité. Les formats nominaux Venere et Quercia/Yosemite
sont rapprochés de leurs dimensions calibrées, explicitement dans l'importeur.

216 outils de merchandising sont sélectionnables. 147 possèdent une planche
fabricant contenant leur code exact. Les 69 autres restent indiqués sans visuel
ou sans code confirmé. Aucune photographie d'une autre référence ne leur est
attribuée. Les allocations et quantités du budget agent restent privées. Les 216 valeurs
unitaires HT de la colonne E du fichier « ELIOS_budget campioni AGENT 2027.xlsx »
sont affichées à titre indicatif, avec provenance feuille/cellule. La feuille
BUDGET 2027 est prioritaire sur les listes historiques (EVNR15 : 200 €).
Le merchandising est exclu du montant à payer et soumis à attribution Elios. Les définitions natives limitées et les reconstructions déjà
présentes dans le catalogue sont identifiées.

## Chiffrage et transmission

Le serveur vérifie à nouveau le compte LRF et son partenaire Elios. Il utilise
les tarifs HT actuels de l'API déjà employée par la sélection Elios, et conserve
les prix exacts par SKU pour les décors lorsque leur tarif est disponible.
Un tarif de fond n'est pas substitué à celui d'un décor. Une ligne manquante
reste à confirmer. Les box appliquent 50 % au prix net HT et arrondissent aux
boîtes complètes. La valeur HT du merchandising est présentée séparément dans
le panier, le chiffrage serveur et le mail ; elle ne rend pas le montant à payer
incomplet lorsqu’un tarif indicatif est inconnu. Les profilés restent hors total tant qu'ils ne sont pas tarifés.

Le bouton de demande envoie exclusivement à :

- glebreton@eliosceramica.it
- ctoni@eliosceramica.it
- jerome@leroyfactory.fr
- coryne@leroyfactory.fr

Le visuel PNG d'au moins 1920 pixels et la configuration importable sont
enregistrés dans un espace serveur privé puis joints au mail. Les quantités
indiquées restent un relevé estimatif soumis à confirmation usine. La confirmation
de succès exige l'acceptation SMTP des quatre adresses. Une demande acceptée
n'est pas renvoyée lors d'une répétition ; un résultat de livraison incertain
est conservé et bloque la répétition automatique.

## Vérifications

- `npm run check:core` : réussi.
- `npm run check --workspace=studio-one-atelier-3d` : réussi.
- Tests PLAN & POSE / sécurité : 308 réussis, un test préexistant ignoré.
- Tests Elios : 18 réussis (calcul, références, gratuité, accès, doublons,
  capture, sauvegarde et pièces jointes avec messagerie simulée).
- Construction Studio One et construction publique : réussies.
- Navigateur : recherche, sélection, panier et affichage contrôlés.
- WebGL 2 indisponible dans le navigateur de contrôle : rendu 3D et export GPU
  non vérifiés visuellement. Aucun mail réel n'a été envoyé pour les tests.

## Activation

Le service `eliosSamples` est ajouté au workflow manuel existant, groupe
`elios-samples`, qui publie uniquement `eliosSamples` et `eliosExpoBudget`
pour la version 2. Les règles IAM/Firestore,
les sessions et les autres fonctions restent gérées par le processus existant.
La production doit utiliser ce groupe, puis le même commit testé pour le projet
Vercel Studio One et GitHub Pages. Les deux points d'entrée client sont ajoutés
à la sélection Elios et à la carte Elios de l'espace PRO.

## État de remise

Jérôme a explicitement autorisé la publication du module et de ses visuels sur
le site le 12 novembre 2026. La branche de livraison est
`feature/elios-samples-box-20261112`, reprise sur le `main` actuel pour préserver
les travaux parallèles. Le workflow vérifie les deux rôles agents existants en
lecture seule avant d'activer le service. Les résultats réels de publication
et les identifiants de déploiement sont consignés ci-dessous après vérification.


## Choix des références et suivi Expo clients — version 2

Une planche fabricant peut illustrer plusieurs codes. Le sélecteur propose les
seules références présentes dans le catalogue canonique, sans case cochée par
défaut. Ajouter ou modifier ne retient que la référence choisie et sa quantité.
L’aperçu HD de la planche est conservé.

Le dossier existant Paramètres → Expo clients conserve les photos, notes et
pièces jointes, et reçoit le suivi annuel Elios. L’enveloppe globale de l’agent
est de 7 % du CA HT de référence, saisi avec sa période et sa source. Le budget
2027 est proposé par défaut, conformément au mail de Gyslaine du 12 novembre.
Aucun CA annuel ou montant historique n’est déduit de statistiques partielles.

Une demande envoyée reste en attente. Seules les lignes accordées par l’usine
consomment le budget, avec la référence et la date de l’accord, l’auteur et
l’historique. L’imputation est la valeur HT du merchandising plus 50 % du net HT
avant remise des expos, en appliquant cette moitié une seule fois. Les montants
accordés, en attente, refusés et le solde global sont distincts ; le filtre client
ne change pas l’enveloppe globale. Les dotations historiques peuvent être saisies
explicitement, sans inventer de valeurs pour les anciens dossiers.

Exemple de contrôle : merchandising 2 × 170 € + expo 1,44 m² × 12 € net HT.
Le client doit 8,64 € HT ; la valeur merchandising est 340 € HT hors montant
à payer ; le budget consommé après accord usine est 348,64 € HT.

Le service `eliosExpoBudget` est réservé aux rôles agents vérifiés côté serveur.
Les collections techniques de budget, décisions, saisies manuelles et demandes ont refusé les lectures anonymes
(403 PERMISSION_DENIED) pendant le contrôle du 12 novembre. Aucun document
client ni décision d’usine n’a été créé pour ces contrôles. Le groupe manuel
`elios-samples` publie uniquement `eliosSamples` et `eliosExpoBudget`.


Contrôles version 2 : 3 tests d’import Python, 7 tests catalogue/sélection et
25 tests serveur Elios (montants, attribution, budget, accès et concurrence)
réussis ; construction publique réussie. Le parcours de sélection a été testé
sur PC et sur une largeur de 390 px : EBRK16 × 2 + EBRK37 × 1 affiche 61 € HT
de valeur indicative et 0 € à payer, sans ajout d’autre référence ni débordement.
Aucun mail et aucune écriture de budget réel n’ont été effectués pour les tests.

Le garde d’année partagé par le suivi CRM a passé trois scénarios dynamiques :
réponses reçues hors ordre, choix d’année changé et année d’écriture figée.
Total ciblé version 2 : 35 tests JavaScript et 3 tests Python réussis.
Le contrôle élargi des fonctions a réussi 180 cas sur 181 ; le dernier demande
le bundle privé Anima `commerce-server.cjs`, absent de ce checkout. Il concerne
une application inchangée et n’a pas été remplacé par une validation fictive.


## Publication du complément merchandising / budget

Le commit de livraison `8c1772e860f50204c8ef4ede01628b19c844aba7` est intégré
à main. GitHub Pages a terminé avec succès l’exécution `43282836244`. Les pages et
ressources publiques de la version 2 ont été contrôlées en HTTP 200. Le catalogue public et
son miroir serveur portent la version `20261112-elios-samples-v2`.
Le ciblage couvre 36 tests JavaScript et 3 tests d’import Python, dont la date
de confirmation selon le jour ouvré en Europe/Paris.

Les services `eliosSamples` et `eliosExpoBudget` sont maintenant activés.
Le workflow manuel a publié uniquement ces deux fonctions, avec le groupe
`elios-samples` et la confirmation `CONFIRMER-PRODUCTION` : résultat vérifié
ci-dessous. Les autres fonctions et les deux ateliers 3D n’ont pas été
redéployés pour ce complément.

## Activation serveur confirmée — 12 novembre 2026

Le workflow manuel « Deploy Firebase Functions », exécution n° 153,
`43286911928`, et son job `131422626907` ont terminé avec succès.
Source publiée : `15b7b3ff3ffd39d746eb0cb2c56ddec7e9e4cd3b` sur `main`.
Ce commit conserve les fonctions du lot Elios testé `8c1772e` ; le seul
complément concerne le chargement des clients du CRM après vérification Agent.

La commande réellement exécutée cible exclusivement :
`firebase deploy --project le-roy-factory --only functions:eliosSamples,functions:eliosExpoBudget --non-interactive`.
Les deux fonctions Node.js 22 de deuxième génération ont été créées en
`us-central1`, puis la publication s’est terminée vers 20 h 10 (Europe/Paris).

- `eliosSamples` : version `20261112-elios-samples-v2`, contrôle authentification
  HTTP 401 réussi, faux rôles refusés.
- `eliosExpoBudget` : version `20261112-elios-expo-budget-v1`, contrôle d’accès
  agent HTTP 401 réussi ; aucune information privée livrée anonymement.
- Les rôles agents existants ont été vérifiés sans modifier de compte ni de claim.
- Les contrôles de fin de publication n’ont envoyé aucun mail et n’ont modifié
  aucune demande ni aucun budget. Aucun accord usine ou CA réel n’a été créé.

La connexion GitHub nécessaire a été achevée après l’autorisation explicite de
Jérôme. L’activation serveur est terminée et vérifiée.

Preuve de publication :
https://github.com/aetherismanga/le-roy-factory/actions/runs/43286911928
