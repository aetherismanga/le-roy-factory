# RANDAL Catalogue Général 3D

Copie indépendante de STUDIO ONE BETA V2 (`599a3e02af3bcb099a1bc89eedfc438238b4673b`). Le projet et la branche Studio One ne sont pas modifiés.

## Développement

```sh
npm ci --ignore-scripts
npm run check
npm run build
```

Vercel : projet `randal-catalogue-general-3d`, racine `randal-general`, sortie `dist`. La page officielle `randal-configurateur.html` conserve son URL et intègre cette application indépendante. Le paramètre `collection` est conservé.

Le moteur Three.js, la navigation, la conception des pièces, les carrelages ELIOS/VIEW, l'éclairage, la gestion des projets, le partage, les outils d'aménagement et les modèles de vasques et miroirs proviennent de Studio One. Les ressources existantes sont lues sur Firebase et sur la publication Studio One. Trois photographies originales du PDF sont extraites dans `dist/assets/materials` pour les matériaux HD ARUBA ; leur provenance et leur résolution native figurent dans `source.json`. Aucun HDR, GLB ou PDF supplémentaire n'est copié.

## Catalogue et tarifs

Onze collections : Harmony, Luce, Brent, Aruba rainuré, Aruba, Aras, Boreal, Brunei, Amat, Less, Sima. Seize modèles de meubles et sept colonnes. Les géométries sont paramétriques et reconstruites selon les cotes, dessins et photographies du catalogue ; aucun fichier CAO constructeur n'a été fourni.

`src/commerce/catalog.js` contient les références par dimensions et finition et les montants en **centimes TTC** lus dans le PDF public `assets/pdf/RANDAL-V04.pdf`. `catalogue-audit.json` fournit les pages et la somme SHA-256 du PDF contrôlé. Ne pas ajouter une deuxième TVA ni réutiliser la grille d'achat Studio One.

Les couleurs et variantes non documentées dans cette adaptation ne sont pas proposées. Les meubles seuls, les plans et vasques compatibles sont chiffrés séparément. Les doubles vasques 120 cm et Tampa 140 cm disposent de leur géométrie et de leurs références ; Luce 120 utilise la vasque Tampa centrée 6232. Les tarifs de pose, transport, accessoires, robinetterie et carrelages ne sont pas inventés.

## Compte professionnel

Le service `/api/commercial` reprend la vérification LRF côté serveur, les droits partenaire et l'accès administrateur Firebase. Le code LRF existant est réutilisé et aucun compte n'est créé. Les jetons et coordonnées client ne figurent jamais dans les projets partagés. Les clés de stockage des compositions sont propres au catalogue général.

**Limitation documentée :** aucune grille d'achat ou condition commerciale individuelle vérifiée pour le catalogue général n'a été trouvée. `server/purchase.js` retourne donc un prix HT sur demande. Il est volontairement impossible de produire un montant professionnel en appliquant une remise supposée ou la grille Studio One.

## Façades et quincaillerie — contrôle du 20 octobre 2026

- ARUBA : façades planes de 19 mm ; ARUBA rainuré : panneau fermé de 19 mm avec rainures réellement creusées, pas de lames rapportées. Poignées noires fines et cintrées sur les deux versions (photos p.15 et p.17). Les matériaux reprennent le bois des photographies natives, sans photographie fixe à la place du modèle.
- HARMONY : panneaux et façades droites de 16 mm (p.3). LESS est également coté à 16 mm (p.31). Les autres caissons ont des panneaux de 19 mm ; le plateau SIMA mesure 10 cm.
- BOREAL : profil aluminium en U inversé, conformément à la coupe p.24. Le PDF confirme uniquement le noir : « Negro / Noir / Black » est une traduction en trois langues. Deux couleurs supplémentaires ne sont pas documentées et ne sont pas proposées comme variantes fabricant.
- BRENT : or vieilli / argent vieilli, avec changement de la référence ORO / PLATA ; montant TTC du meuble identique, sans supplément inventé. LESS : Alba/bouton blanc (14038), bleu/bouton nickel (14039), tórtora/bouton noir (14040), conformément à la p.32. Choisir un bouton LESS sélectionne sa finition de meuble associée.
- BRUNEI : façades en retrait, cadre latéral et gorges de préhension élargies. Les versions doubles 120 cm sont divisées en deux caissons.
- AMAT : les quatre variantes correspondent à 2 ou 3 tiroirs, avec porte gauche ou droite (p.29–30). Les identifiants existants sont conservés pour ouvrir les projets antérieurs ; les références restent celles du catalogue.
- Les tiroirs partagent les flancs aluminium, les coulisses, le fond ouvert en U et l'organiseur du tiroir supérieur. La découpe AMAT est décentrée vers la vasque ; les hauteurs et le dégagement sous vasque restent adaptés au format.
- Les cartes de sélection sont rendues avec les véritables modèles paramétriques et le contexte WebGL existant. Les formats et la barre de largeurs se limitent aux variantes de la collection sélectionnée.

`qa/manufacturer.mjs` vérifie les profils, les retraits, les variantes gauche/droite, les couleurs/références et l'absence de faces diagonales parasites dans le carrelage. `qa/catalogue.mjs` contrôle les 292 combinaisons de meubles et leurs tarifs publics TTC.
