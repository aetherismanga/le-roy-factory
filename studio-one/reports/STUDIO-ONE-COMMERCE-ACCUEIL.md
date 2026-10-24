> **Mise à jour corrective du 20 octobre 2026 :** voir [CORRECTION-TARIFS-ET-FINITIONS.md](CORRECTION-TARIFS-ET-FINITIONS.md). Cette vérification indépendante corrige le doublement de 25 références de miroirs, exclut leurs achats non documentés et valide désormais le rendu réel WebGL2. Les constats tarifaires et limites GPU de la livraison initiale ci-dessous sont historiques et remplacés par ce contrôle.

# STUDIO ONE BÊTA V2 — accueil, composition vivante et chiffrage LRF

Prévisualisation sur `feature/studio-one-beta-v2-commerce-accueil`. Aucun changement sur main, leroyfactory.fr, les fiches clients, les règles Firebase, les textures ou les géométries existantes.

## Parcours et présentation

- Logo STUDIO ONE du fichier fourni, réutilisé sans redessin ; BÊTA V2 en haut à droite de tous les écrans.
- Accueil : photo officielle et quatre actions. Aucun moteur 3D, HDR, modèle GLB, PDF ou appel commercial à l’entrée.
- Modèle : quatre cartes visibles sur un écran mobile. Autre fond officiel, avec le meuble 1 tiroir XL. Les fenêtres d’affichage excluent les anciens encarts et morceaux de rangées sans modifier les photos originales.
- Dès Dimensions & finition : aperçu mobilier 3D à gauche, choix au centre, devis progressif à droite. Sur smartphone, aperçu au-dessus des choix et montant permanent en bas ; le détail du devis s’ouvre au toucher.
- Les échantillons utilisent exactement les couleurs et les quatre textures de `src/model.js`. Les bois ne sont plus représentés par des pastilles unies. Aucun changement des textures de l’atelier.
- Plan/vasque, colonne et miroir actualisent le mobilier et le devis. Retour, rechargement et reprise conservent les réglages.
- Récapitulatif : bouton « Voir ma composition 3D » en haut à droite. Le grand bouton inférieur est supprimé. Enregistrer, imprimer/PDF et préparer un message restent disponibles.
- Les mentions « Prix public TTC », « public TTC » et « TVA 20 % incluse » ont été retirées de l’interface et des documents/messages. Le calcul et les montants restent inchangés.

L’aperçu charge les véritables constructeurs `makeModel`, `makeColumn`, `makeCatalogueMirror`, leurs matériaux, vasques et éclairage LED. Il n’utilise aucun dessin pour remplacer le mobilier configurable. La scène complète reste dans l’atelier ; l’aperçu du parcours/récapitulatif cadre le mobilier RANDAL, avec ses placements. Les autres équipements restent conservés dans le projet et signalés hors chiffrage.

## Origine des prix et accès PRO

Source auditée : `aetherismanga/le-roy-factory`, main `233ab6dda7fb71c5048ac1f983a67ceb3fe0b0c9`.

- `assets/js/studio-one/catalog.js` : meubles C1 du 25/09/2026, références RANDAL V04, colonne et miroirs.
- `assets/js/studio-one/model.js`, fonction `lines()` : références et unités commerciales ; vasques encastrées à valeur source / 2.
- `randal-studio-one.html` : `total()` et affichage privé `lrfCode(total())`, distincts de la conversion publique `euros()`.
- `scripts/build_randal_studio_one_pro.py` : conversion des vasques documentée : public / 1,20 × 0,50.

La grille d’achat historique a été importée sans extrapolation dans `server/data/studio-one-purchase.json` : **328 références distinctes**, vérifiées par 335 comparaisons. Ce fichier et le calcul d’achat sont exclusivement des dépendances serveur. Ils ne sont pas copiés dans dist ni importés par une entrée navigateur. Aucun taux de remise saisi dans une requête n’est utilisé.

Il s’agit de la grille STUDIO ONE existante. Aucune condition individuelle supplémentaire n’est documentée dans les sources auditées ; aucune remise par client n’a été inventée. Les confirmations fabricant déjà nécessaires pour les miroirs et le 40 cm restent signalées. Le prix public conserve exactement le calcul historique en centimes.

La réponse anonyme ne contient aucun montant PRO, aucun client ni aucune grille d’achat. Après vérification de sa session et de son accès RANDAL, le compte reçoit le chiffrage de sa composition et ses propres coordonnées, jamais celles d’un code transmis sans vérification.

Le format `LRF-00345-563.5200` est un **affichage de composition** : le suffixe est le montant d’achat de cette composition avec quatre décimales. Le véritable code de fiche reste `LRF-00345`. Aucun compte ni code LRF n’est créé, réattribué ou modifié.

## Identité et documents

Le serveur réutilise `createProSession`, `validateProSession` et `getAccountClientPrefill`. Les coordonnées sont demandées à partir du code et du département retournés par la session vérifiée. Les réponses sont privées, `no-store` ; les jetons restent en cookies Secure, HttpOnly, SameSite=Strict.

Pour Jérôme et Coryne, l’identité Firebase existante est vérifiée auprès de Google ; le projet, l’émetteur, l’UID, l’expiration, la révocation et l’adresse autorisée sont contrôlés côté serveur. Un champ `isAdmin`, une adresse ou un code fournis par le navigateur ne donnent pas ce rôle. L’interface affiche alors **Administrateur** en rouge. Aucun mot de passe ni jeton n’est retourné au navigateur par la passerelle.

Un changement de session entre onglets provoque une nouvelle vérification. Une réponse tardive ne peut pas rétablir un compte déconnecté. Une expiration retire les prix PRO et les coordonnées associées de l’écran. Les identités, mots de passe et prix PRO ne sont pas stockés dans les projets, liens de partage ou exports JSON.

- Client LRF : coordonnées de son compte, références produits et référence chantier reprises à l’impression et dans le message de commande.
- Coordonnées incomplètes : formulaire de complément pour le document, sans mise à jour de la fiche CRM.
- Particulier : fiche nom, e-mail, téléphone, adresse, code postal, ville et référence chantier ; consentement requis pour la demande de rappel.
- Destinataires fixes repris du configurateur d’origine : Jérôme et Coryne. Gmail, Outlook, messagerie locale ou copie du texte. Le client vérifie et envoie dans sa messagerie ; aucun e-mail automatique ni commande ferme n’a été envoyé pendant les tests.

Le chantier est conservé par le véritable chargeur et collecteur de l’atelier, y compris après sauvegarde/retour au devis. Le retour sérialise toute la scène : meubles supplémentaires, ouvertures, revêtements, vues et profilés compris. Aucun élément de la composition n’est supprimé par le récapitulatif.

## Performances et vérification

Le module 3D du parcours est séparé du JavaScript initial et demandé seulement à Dimensions & finition. Aucun catalogue de revêtements, HDR, GLB ou texture de pièce n’est chargé par cet aperçu. Les textures de finition existantes sont partagées avec le cache navigateur. Rendu à la demande, définition bornée sur mobile, reflets bornés ; pas d’animation permanente sur l’accueil.

Contrôles exécutés :

- `npm run build` et les **18 suites** `npm run check`.
- `STUDIO_ONE_SOURCE=../site-audit node qa/commerce-check.mjs` : **8 393 comparaisons** de prix publics/références et **5 184 placements**.
- `node qa/purchase-identity-check.mjs` : grille achat, refus des injections/partenaires non autorisés/sessions expirées/faux administrateurs, vrais modèles et couleurs.
- `node qa/identity-race-check.mjs` : déconnexion et réponses tardives.
- `node qa/simple-flow-check.mjs` : sauvegarde stable, scène complète, erreur de stockage et message.
- `node qa/commerce-browser.cjs` : 1440×900, 768×1024, 390×844, 360×640 et 320×568 ; prix progressif, miroir, retour/rechargement/reprise, coordonnées, chantier, impression, message, compte synthétique, administrateur synthétique et nettoyage après expiration/déconnexion.
- Six transferts ont traversé le véritable initialiseur et `restoreProject` : meubles, références, finitions, prix et chantier conservés.
- Les services réels de préremplissage LRF et de validation Firebase répondent et refusent les requêtes sans identifiants valides. Aucun compte réel n’a été utilisé.

## Limites à valider

1. Le navigateur automatisé de cet environnement ne crée pas WebGL2 (« Error creating WebGL context »). Les contrôles de géométrie, données et interface passent ; le rendu 3D visuel, ses FPS et son aspect sur matériel réel ne sont pas déclarés validés. Un état d’erreur explicite conserve les choix et permet de réessayer.
2. Les comptes client et administrateur testés sont synthétiques. Jérôme/Coryne et un client réel doivent encore essayer leur connexion sur la prévisualisation.
3. La session de leroyfactory.fr ne traverse pas automatiquement un domaine Vercel indépendant. La prévisualisation conserve sa propre session après la première identification ; les sessions du site ne sont relues automatiquement que sur le même domaine. Le raccordement de domaines au site de production n’a pas été publié.
4. Tarifs non intégrés : inventaire conservé dans `commerce-missing-prices.json` (robinetterie, sanitaires, équipements, profilés et revêtements). Ils restent hors montant mobilier, sans prix inventé.
5. Miroirs : base historique indicative à confirmer fabricant ; largeur 40 cm à confirmer usine. Doubles vasques : géométrie actuelle non prise en charge, donc non proposées.
