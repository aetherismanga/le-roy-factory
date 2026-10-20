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

Résultat : **8 393 comparaisons** de prix et références contre le moteur d’origine passent, dont modèles, tranches de largeurs, huit finitions, vasques et couleurs, familles de miroirs, dimensions et métaux. Détails : `reports/commerce-check.json`.

## Accueil et parcours

Entrée par défaut `/` : accueil léger. L’atelier existant reste accessible directement par `/atelier.html` et `/index.html`.

1. Meuble : quatre modèles, largeur entière 40–120 cm, huit finitions.
2. Plan et vasque : plan assorti seul, Sella, Tampa, plan + Neris, plan + Torne ; compatibilités et couleurs réelles. Si une nouvelle largeur invalide une vasque encastrée, l’interface sélectionne explicitement le plan assorti, et le choix est visible dans le récapitulatif.
3. Colonne : STUDIO ONE 14177, dimensions fixes 38 × 132 × 27 cm, finition indépendante, ou sans colonne.
4. Miroir : Basic, Zen LED, Ilse LED, Cápsula LED, métallique rectangulaire/rond ; dimensions, références et métaux, ou sans miroir.
5. Vérification et bouton « PERSONNALISER MA SALLE DE BAINS EN 3D ».

Les étapes restent accessibles sans effacement. Sélection locale persistante ; transfert sous forme de projet version 2 vers le chargeur existant. Aucun prix ni identifiant client intégré aux projets ou liens partagés. Le chargeur consomme le transfert seulement après restauration réussie. Un échec affiche un message explicite et conserve la sélection d’accueil.

La scène conserve dimensions, modèle, finition du meuble, plan/vasque et couleur, colonne et finition, miroir/dimensions/métal/LED. Les références et prix sont recalculés à partir des réglages conservés, sans faire confiance à un prix transmis. Le récapitulatif de l’atelier utilise le même moteur que l’accueil ; ajout, duplication, suppression et modification actualisent les lignes.

Nouveau projet, reprise du projet courant, compositions enregistrées, import JSON, accès direct à l’atelier et lien vers les catalogues existants. Aucun faux historique de devis : le projet ne contient pas de service de devis clients disponible dans cette Bêta. Les sauvegardes restent propres à chaque adresse de navigateur ; les projets d’une autre prévisualisation doivent être importés par JSON.

## Médias et performances

Uniquement les fichiers existants de Firebase Storage. Correspondances reprises des chemins utilisés par l’ancien configurateur : quatre images meubles, quatre vasques HD et six familles de miroirs. Pas de génération d’images ni de copie des médias lourds dans GitHub.

Colonne 14177 : aucune photo isolée avec correspondance certaine retrouvée dans les fichiers audités. L’interface le dit explicitement et ne présente pas une autre colonne à sa place.

Accueil : HTML 5 655 octets, CSS 11 132 octets et JavaScript 24 703 octets avant compression HTTP. Chargement différé des photos de cartes et priorité à la photo principale. Aucun chargement de Three.js, HDR, GLB, scènes ou textures 3D depuis l’accueil ; les catalogues PDF s’ouvrent seulement sur demande. Statut hors connexion, message d’erreur d’image, erreurs de connexion LRF et respect de la préférence de mouvement réduit.

Contrôles navigateur : absence de débordement horizontal aux largeurs 320, 390, 768, 1024 et 1440 px ; navigation avant/arrière, restauration après rechargement et transmission du projet. Les mesures réseau locales ne constituent pas une mesure de performance sur téléphone réel ou réseau mobile.

## LRF et sécurité

`api/commercial.js` appelle les fonctions Firebase existantes `createProSession` et `validateProSession`. Aucun accès direct du navigateur à la collection clients. Le code et le département identifient un compte existant : aucune génération ni réattribution de code LRF.

Le jeton est conservé dans un cookie Secure, HttpOnly, SameSite=Strict ; les réponses de compte sont privées et non mises en cache. Aucun compte, jeton ou tarif PRO dans localStorage, liens de partage ou exports de projet. Les montants et remises injectés dans une requête ne sont pas utilisés. L’autorisation RANDAL est lue de la réponse serveur, jamais d’un état fabriqué dans le navigateur.

**Blocage restant** : `validateProSession` renvoie identité, code LRF et partenaires autorisés, mais aucune condition commerciale individuelle RANDAL. Aucune source de conditions individuelles vérifiable n’a été retrouvée dans les fichiers audités. L’ancien calcul professionnel est une base globale exposée côté navigateur, pas un calcul par compte sécurisé. Il n’est donc pas repris comme tarif personnel. Un compte vérifié affiche « Votre prix PRO HT : Prix sur demande » tant que sa condition réelle ne peut pas être lue côté serveur.

Un compte réel autorisé n’a pas été utilisé pour tester la connexion. Les tests de session autorisée sont synthétiques et ne constituent pas une validation d’un compte client réel. La connexion automatique depuis leroyfactory.fr ne peut pas traverser les domaines de prévisualisation ; une identification sur la Bêta indépendante peut être nécessaire. Aucun changement sur le site principal pour contourner cette séparation.

## Tarifs/options manquants et points à valider

- Toutes les conditions PRO HT propres à un client : source sécurisée à raccorder ; aucun tarif individuel inventé.
- Miroirs : confirmation fabricant de la base et du montant public TTC final.
- Largeur 40 cm : confirmation usine déjà signalée dans l’ancien configurateur.
- Doubles vasques 120 cm : références source existantes, mais modèles doubles non pris en charge par la géométrie actuelle de la Bêta ; exclus du parcours pour respecter l’interdiction de modifier les modèles.
- Autres séries/modèles non présents dans la source STUDIO ONE : pas de nouvelles références supposées.
- Robinetterie, sanitaires, accessoires, profilés et revêtements : pas de tarif intégré sans grille vérifiée. Leur nombre est indiqué séparément ; ils ne sont pas inclus silencieusement dans le total mobilier. Une option de robinetterie associée sans tarif affiche « Prix sur demande » et rend le total correspondant incomplet.
- Photo isolée de colonne 14177 à identifier.
- Devis de compte/cloud et reprise entre domaines : service absent de la Bêta auditée.
- Validation d’un vrai compte et test sur matériel mobile réel restant nécessaires.

## Tests et reproduction

- `npm ci && npm run build && npm run check` : 18 suites géométrie/commandes. Les anciens tests interdisaient toute URL distante malgré les photos Firebase déjà présentes dans la branche : leur assertion porte maintenant sur les chargements 3D. Le banc de commandes charge désormais le module de visite 3D existant dans son contexte DOM de test.
- `STUDIO_ONE_SOURCE=../site-audit node qa/commerce-check.mjs` : compare avec le checkout de main audité ; sans cette variable, les tests autonomes de tarifs et sécurité restent exécutables.
- `node qa/commerce-browser.cjs` : utilise Playwright et Chromium ; `STUDIO_CHROMIUM` permet d’indiquer le binaire, `BASE_URL` permet de viser la prévisualisation. Tests d’écran et conservation du parcours ; le script indique explicitement si WebGL2 manque.
- 24 projets guidés (quatre meubles × six familles de miroirs, avec colonne) ont été construits et validés par le moteur réel de placement, sans changer la géométrie.

Démonstration : choisir 3 tiroirs, 100 cm, Biscuit ; Tampa noir mat ; colonne Nogal Valentina ; Ilse LED 100 × 80. Revenir à l’étape précédente, continuer, puis ouvrir en 3D. Le récapitulatif doit rester identique à l’entrée ; une modification de largeur dans l’atelier doit actualiser le chiffrage.

**Limite environnementale** : Chromium local ne peut pas créer WebGL2 (EGL/ANGLE logiciel indisponible). Les tests de données/placement et le parcours d’accueil passent, mais la validation visuelle de la scène et les FPS réels ne doivent pas être annoncés comme réussis sur cette seule base.
