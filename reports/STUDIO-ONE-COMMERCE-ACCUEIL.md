# STUDIO ONE BÊTA V2 — prévisualisation commerciale et accueil

## Périmètre et état

Préversion à valider. Le prix public et le parcours sont implémentés ; les conditions professionnelles individuelles ne sont pas raccordées. Aucun déploiement en production, aucune fusion dans main, aucune modification du CRM, des modèles 3D, textures, médias ou règles Firebase.

Base Bêta : `35a357d4bafd0f26b46dd761ad33071e65c6ac05`, branche `feature/studio-one-v22-visite-3d` ; déploiement de référence : `studio-one-beta-test-v2-8f3164u6p-hugol-trading.vercel.app`.

Site audité en lecture seule : `233ab6dda7fb71c5048ac1f983a67ceb3fe0b0c9` de main. Projets Vercel distincts confirmés : `studio-one-beta-test-v2` et `le-roy-factory`. Les modifications CRM récentes présentes sur main ne sont pas copiées ni modifiées.

## Origine et fidélité des prix

Sources existantes :

- `assets/js/studio-one/catalog.js` : grilles meubles C1 du 25/09/2026 ; références RANDAL V04 pour les vasques ; colonne 14177 ; miroirs.
- `assets/js/studio-one/model.js` : règles de références, options et lignes de chiffrage.
- `randal-studio-one.html` : conversion publique existante `euros()`, totaux et identification historique.
- `scripts/build_randal_studio_one_pro.py` : provenance de la grille vasques et conversion documentée.

Le fichier public `src/commerce/catalog.js` contient uniquement les montants TTC, références et métadonnées publiques. Il ne contient ni remise personnelle, ni tarif PRO, ni fichier client. Le script d’import conserve l’empreinte SHA-256 du catalogue source.

La conversion publique reproduit exactement l’ancien configurateur : base commerciale × 2 puis TVA 20 % ; pour les vasques encastrées, tarif catalogue HT × 1,20. Calcul en centimes, arrondi par ligne, puis total des lignes. Aucun supplément de finition ajouté : la source ne prévoit pas de supplément. Références Biscuit conservées avec `BISC.` même si le modèle 3D utilise l’identifiant `BISC`.

Attention : les miroirs sont déjà qualifiés d’indicatifs dans la source historique. La conversion publiée par l’ancien configurateur est conservée et signalée comme indicative, sans prétendre à une nouvelle validation fabricant. La source qualifie leurs valeurs de public HT tout en leur appliquant le convertisseur général : cette ambiguïté commerciale nécessite une confirmation usine avant validation définitive des miroirs.

Résultat : **8 393 comparaisons** de prix et références contre le moteur d’origine passent, dont modèles, tranches de largeurs, huit finitions, vasques et couleurs, familles de miroirs, dimensions et métaux. Détails : `reports/commerce-check.json`. L’inventaire des références sans tarif intégré figure dans `reports/commerce-missing-prices.json` (123 références de robinetterie et cinq sanitaires, plus équipements génériques).

## Accueil et parcours

Entrée par défaut `/` : accueil léger. L’atelier existant reste accessible directement par `/atelier.html`. Les anciens liens `#projet` arrivant à la racine sont redirigés vers le chargeur de projets de l’atelier.

L’accueil tient sur un écran, avec la photo officielle en fond, la signature RANDAL STUDIO ONE, « Votre sur-mesure en 3 minutes », et exactement quatre actions : Nouveau projet, Reprendre mon projet en cours, Mes projets enregistrés, Accéder à l’atelier 3D. Le parcours ne se déroule plus sous l’accueil.

1. Modèle : quatre cartes sur un seul écran mobile. Les photographies officielles sont affichées par fenêtres SVG, sans modifier leurs fichiers. Les vieux encarts, biseaux et morceaux de rangées précédentes sont hors cadrage. Dessins cotés indépendants et détail de coupe à 45° descendant de la lèvre extérieure vers l’intérieur, conformément au modèle existant.
2. Dimensions et finition : largeur entière 40–120 cm, huit finitions.
3. Plan et vasque : plan assorti seul, Sella, Tampa, plan + Neris, plan + Torne ; compatibilités et couleurs réelles.
4. Colonne : STUDIO ONE 14177, 38 × 132 × 27 cm, finition indépendante, ou sans colonne.
5. Miroir : Basic, Zen LED, Ilse LED, Cápsula LED, métallique rectangulaire/rond ; dimensions, références et métaux, ou sans miroir.
6. Récapitulatif / devis : composition, références, réglages et total public TTC, puis bouton « PERSONNALISER MA SALLE DE BAINS EN 3D ».

Le devis permet d’enregistrer sur cet appareil, d’imprimer/PDF et de préparer une demande de commande. Les destinataires sont ceux du configurateur d’origine (`jerome@leroyfactory.fr`, `coryne@leroyfactory.fr`). Gmail, Outlook, messagerie locale ou copie du message : aucun envoi automatique, aucun nouveau service de commande/CRM. La demande reste à vérifier puis envoyer par l’utilisateur. Les contacts saisis ne sont pas enregistrés dans les projets.

Le bouton « Récapitulatif / devis » dans l’en-tête de l’atelier sérialise l’intégralité de la scène avant navigation. Le devis conserve aussi les meubles supplémentaires, ouvertures, revêtements, vues et profilés. Les éléments sans tarif restent exclus du total mobilier. L’édition du parcours initial n’est proposée que pour une composition encore guidée ; une scène existante repart entière vers la 3D. L’enregistrement met à jour l’identifiant du projet actif, sans créer de doublons à chaque clic et sans confondre deux projets portant le même nom.

Les étapes restent accessibles sans effacement. Sélection locale persistante ; transfert sous forme de projet version 2 vers le chargeur existant. Aucun prix ni identifiant client intégré aux projets ou liens partagés. Le chargeur consomme le transfert seulement après restauration réussie. Un échec affiche un message explicite et conserve la sélection d’accueil.

La scène conserve dimensions, modèle, finition du meuble, plan/vasque et couleur, colonne et finition, miroir/dimensions/métal/LED. Les références et prix sont recalculés à partir des réglages conservés, sans faire confiance à un prix transmis. La mise à jour tarifaire est limitée à une exécution par 120 ms sans être repoussée indéfiniment par les mouvements de caméra. Le montant de l’atelier et le devis utilisent le même moteur que l’accueil ; ajout, duplication, suppression et modification actualisent le total.

Nouveau projet, reprise du projet courant, compositions enregistrées, import JSON, accès direct à l’atelier sans navigation dupliquée. Aucun faux historique de devis : le projet ne contient pas de service de devis clients disponible dans cette Bêta. Les sauvegardes restent propres à chaque adresse de navigateur ; les projets d’une autre prévisualisation doivent être importés par JSON.

## Médias et performances

Uniquement les fichiers existants de Firebase Storage. Correspondances reprises des chemins utilisés par l’ancien configurateur : quatre images meubles, quatre vasques HD et six familles de miroirs. Pas de génération d’images ni de copie des médias lourds dans GitHub.

Colonne 14177 : aucune photo isolée avec correspondance certaine retrouvée dans les fichiers audités. L’interface le dit explicitement et ne présente pas une autre colonne à sa place.

Accueil : HTML 7 380 octets, CSS 19 412 octets et JavaScript 37 780 octets avant compression HTTP. La seule photo de fond est demandée à l’entrée ; les cartes produit sont créées à l’ouverture de leur étape, avec chargement différé des images non essentielles. Aucun chargement de Three.js, HDR, GLB, scènes ou textures 3D depuis l’accueil ; aucune requête commerciale ou de session n’est envoyée à l’entrée. L’identification se charge au devis. Statut hors connexion, message d’erreur d’image, erreurs de connexion LRF et respect de la préférence de mouvement réduit.

Contrôles navigateur : absence de débordement horizontal aux largeurs 320, 360, 390, 768 et 1440 px ; quatre cartes visibles au-dessus de Continuer, y compris à 320 × 568 px ; navigation avant/arrière, restauration après rechargement, reprise, sauvegardes sans doublon, impression, message prérempli et transmission du projet. Détails : `reports/simple-flow-browser.json`. Aucun e-mail de test envoyé. Les mesures réseau locales ne constituent pas une mesure de performance sur téléphone réel ou réseau mobile.

## LRF et sécurité

`api/commercial.js` appelle les fonctions Firebase existantes `createProSession` et `validateProSession`. Aucun accès direct du navigateur à la collection clients. Le code et le département identifient un compte existant : aucune génération ni réattribution de code LRF.

Le jeton est conservé dans un cookie Secure, HttpOnly, SameSite=Strict ; les réponses de compte sont privées et non mises en cache. Aucun compte, jeton ou tarif PRO dans localStorage, liens de partage ou exports de projet. Les montants et remises injectés dans une requête ne sont pas utilisés. L’autorisation RANDAL est lue de la réponse serveur, jamais d’un état fabriqué dans le navigateur.

**Blocage restant** : `validateProSession` renvoie identité, code LRF et partenaires autorisés, mais aucune condition commerciale individuelle RANDAL. Aucune source de conditions individuelles vérifiable n’a été retrouvée dans les fichiers audités. L’ancien calcul professionnel est une base globale exposée côté navigateur, pas un calcul par compte sécurisé. Il n’est donc pas repris comme tarif personnel. Un compte vérifié affiche « Votre prix PRO HT : Prix sur demande » tant que sa condition réelle ne peut pas être lue côté serveur.

Un compte réel autorisé n’a pas été utilisé pour tester la connexion. Les tests de session autorisée sont synthétiques et ne constituent pas une validation d’un compte client réel. La connexion automatique depuis leroyfactory.fr ne peut pas traverser les domaines de prévisualisation ; une identification sur la Bêta indépendante peut être nécessaire. Aucun changement sur le site principal pour contourner cette séparation.

## Tarifs/options manquants et points à valider

- Toutes les conditions PRO HT propres à un client : source sécurisée à raccorder ; aucun tarif individuel inventé.
- Miroirs : confirmation fabricant de la base et du montant public TTC final.
- Largeur 40 cm : confirmation usine déjà signalée dans l’ancien configurateur.
- Meuble nu sans plan : option commerciale historique sans mode géométrique correspondant dans la Bêta ; le parcours propose le plan assorti sans vasque.
- Doubles vasques 120 cm : références source existantes, mais modèles doubles non pris en charge par la géométrie actuelle de la Bêta ; exclus du parcours pour respecter l’interdiction de modifier les modèles.
- Autres séries/modèles non présents dans la source STUDIO ONE : pas de nouvelles références supposées.
- Robinetterie, sanitaires, accessoires, profilés et revêtements : pas de tarif intégré sans grille vérifiée. Leur nombre est indiqué séparément ; ils ne sont pas inclus silencieusement dans le total mobilier. La robinetterie automatiquement ajoutée par le moteur 3D est explicitement exclue du montant mobilier, comme les équipements indépendants sans tarif ; elle ne doit pas faire varier silencieusement ce montant lors du transfert.
- Photo isolée de colonne 14177 à identifier.
- Devis de compte/cloud et reprise entre domaines : service absent de la Bêta auditée.
- Validation d’un vrai compte et test sur matériel mobile réel restant nécessaires.

## Tests et reproduction

- `npm ci && npm run build && npm run check` : 18 suites géométrie/commandes. Les tests DOM pointent vers `atelier.html`, qui contient le même atelier. Les anciens tests interdisaient toute URL distante malgré les photos Firebase déjà présentes dans la branche : leur assertion porte maintenant sur les chargements 3D. Le banc de commandes charge désormais le module de visite 3D existant dans son contexte DOM de test.
- `STUDIO_ONE_SOURCE=../site-audit node qa/commerce-check.mjs` : compare avec le checkout de main audité ; sans cette variable, les tests autonomes de tarifs et sécurité restent exécutables.
- `node qa/simple-flow-check.mjs` : transfert complet scène/devis, sauvegarde stable, panne de stockage bloquant la sortie, texte de commande et coupe cotée.
- `node qa/commerce-browser.cjs` : utilise Playwright et Chromium ; `STUDIO_CHROMIUM` permet d’indiquer le binaire, `BASE_URL` permet de viser la prévisualisation. Tests d’écran et conservation du parcours ; le script indique explicitement si WebGL2 manque.
- Six parcours guidés ont aussi traversé le véritable initialiseur de transfert et `restoreProject` dans le banc de commandes : références, dimensions, finitions et TTC conservés ; transfert consommé seulement au succès.
- 5 184 dispositions guidées (largeurs, quatre modèles et tous formats de miroir avec colonne) sont vérifiées sans collision par le moteur de placement.
- 24 projets guidés (quatre meubles × six familles de miroirs, avec colonne) ont été construits et validés par le moteur réel de placement, sans changer la géométrie.

Démonstration : choisir 3 tiroirs, 100 cm, Biscuit ; Tampa noir mat ; colonne Nogal Valentina ; Ilse LED 100 × 80. Revenir à l’étape précédente, continuer, puis ouvrir en 3D. Le récapitulatif doit rester identique à l’entrée ; une modification de largeur dans l’atelier doit actualiser le chiffrage.

**Limite environnementale** : Chromium local ne peut pas créer WebGL2 (EGL/ANGLE logiciel indisponible). Les tests de données/placement et le parcours d’accueil passent, mais la validation visuelle de la scène et les FPS réels ne doivent pas être annoncés comme réussis sur cette seule base.
