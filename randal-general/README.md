# RANDAL Catalogue Général 3D

Copie indépendante de STUDIO ONE BETA V2 (`599a3e02af3bcb099a1bc89eedfc438238b4673b`). Le projet et la branche Studio One ne sont pas modifiés.

## Développement

```sh
npm ci --ignore-scripts
npm run check
npm run build
```

Vercel : projet `randal-catalogue-general-3d`, racine `randal-general`, sortie `dist`. La page officielle `randal-configurateur.html` conserve son URL et intègre cette application indépendante. Le paramètre `collection` est conservé.

Le moteur Three.js, la navigation, la conception des pièces, les carrelages ELIOS/VIEW, l'éclairage, la gestion des projets, le partage, les outils d'aménagement et les modèles de vasques et miroirs proviennent de Studio One. Les ressources binaires sont lues à leurs URL existantes sur Firebase et sur la publication Studio One ; aucune copie de texture, HDR, GLB ou PDF n'est ajoutée dans Git.

## Catalogue et tarifs

Onze collections : Harmony, Luce, Brent, Aruba rainuré, Aruba, Aras, Boreal, Brunei, Amat, Less, Sima. Seize modèles de meubles et sept colonnes. Les géométries sont paramétriques et reconstruites selon les cotes, dessins et photographies du catalogue ; aucun fichier CAO constructeur n'a été fourni.

`src/commerce/catalog.js` contient les références par dimensions et finition et les montants en **centimes TTC** lus dans le PDF public `assets/pdf/RANDAL-V04.pdf`. `catalogue-audit.json` fournit les pages et la somme SHA-256 du PDF contrôlé. Ne pas ajouter une deuxième TVA ni réutiliser la grille d'achat Studio One.

Les couleurs et variantes non documentées dans cette adaptation ne sont pas proposées. Les meubles seuls, les plans et vasques compatibles sont chiffrés séparément. Les doubles vasques 120 cm et Tampa 140 cm disposent de leur géométrie et de leurs références ; Luce 120 utilise la vasque Tampa centrée 6232. Les tarifs de pose, transport, accessoires, robinetterie et carrelages ne sont pas inventés.

## Compte professionnel

Le service `/api/commercial` reprend la vérification LRF côté serveur, les droits partenaire et l'accès administrateur Firebase. Le code LRF existant est réutilisé et aucun compte n'est créé. Les jetons et coordonnées client ne figurent jamais dans les projets partagés. Les clés de stockage des compositions sont propres au catalogue général.

**Limitation documentée :** aucune grille d'achat ou condition commerciale individuelle vérifiée pour le catalogue général n'a été trouvée. `server/purchase.js` retourne donc un prix HT sur demande. Il est volontairement impossible de produire un montant professionnel en appliquant une remise supposée ou la grille Studio One.
