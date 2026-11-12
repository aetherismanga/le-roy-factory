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
attribuée. Les contributions de budget agent sont retirées des planches client,
et ne sont jamais intégrées à une grille client. Le merchandising est chiffré
sur demande. Les définitions natives limitées et les reconstructions déjà
présentes dans le catalogue sont identifiées.

## Chiffrage et transmission

Le serveur vérifie à nouveau le compte LRF et son partenaire Elios. Il utilise
les tarifs HT actuels de l'API déjà employée par la sélection Elios, et conserve
les prix exacts par SKU pour les décors lorsque leur tarif est disponible.
Un tarif de fond n'est pas substitué à celui d'un décor. Une ligne manquante
reste à confirmer. Les box appliquent 50 % au prix net HT et arrondissent aux
boîtes complètes. Les profilés restent hors total tant qu'ils ne sont pas tarifés.

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
`elios-samples`, qui ne publie que cette fonction. Les règles IAM/Firestore,
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
et les identifiants de déploiement seront consignés après leur vérification.
