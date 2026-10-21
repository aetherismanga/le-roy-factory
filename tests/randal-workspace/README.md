# Contrôle des ateliers RANDAL — 21 octobre 2026

Les deux applications conservent leurs catalogues et leurs grilles tarifaires distincts. Le contrôleur de projets est commun à la sélection, à la composition 3D et aux plans maison. Les comptes et prix d’achat passent par la vérification serveur existante ; aucune remise du catalogue général n’est déduite de celle de STUDIO ONE.

## Tests

- `node --test functions/test/configurator-projects.test.cjs tests/randal-workspace/project-sync.test.mjs` : propriétaires, références de projet, révisions, suppression définitive, protection des commandes, envoi simulé et reprise d’un enregistrement au changement de page.
- `npm run check` dans chacun des deux configurateurs : géométrie, produits, tarifs, commandes et surfaces.
- `node qa/empty-templates-check.mjs`, `npm run check:workshop` et `npm run check:arrangement` dans la maison : quatre plans, surfaces, ouvertures, mobilier et conservation de la maison témoin originale.
- `browser.mjs` : sélection → sauvegarde client → 3D → récapitulatif → validation → duplication ; import nommé, suppression, connexion depuis le site, plans vides et édition d’une maison.
- `avatars-browser.mjs` : les deux personnages existants, les deux vues et les déplacements avec de véritables événements tactiles dans chaque configurateur.
- `STUDIO_PROJECT_ROOT=/chemin/studio-work node --test tests/randal-workspace/{account-presentation,identity-state,client-auth}.test.mjs` : référence d’achat vérifiée `LRF-00003-220-00`, codes postaux, réponses de connexion reçues dans le désordre et conservation du dernier compte authentifié.
- `account-projects-browser.mjs` : véritables scripts de session et passerelle du site, API commerciale réelle avec validation amont simulée et lente, cookies tiers absents, ancien marqueur de déconnexion, passage sélection → 3D, aperçus enregistrés et cartes de projets sur mobile. Une ancienne commande sans image affiche son propre plan sauvegardé.

Les scénarios navigateur servent les builds locaux sur leurs origines de production et simulent les réponses de compte/projet. Les matières et modèles sont les ressources réelles. Ils ne créent aucun dossier de client réel et n’envoient aucun e-mail réel. Le workflow Firebase vérifie séparément l’édition de la base existante et le refus des appels anonymes après déploiement.

Variables du lanceur navigateur : `WORKSPACE_ROOT`, ou chemins explicites `STUDIO_DIR`, `GENERAL_DIR`, `HOUSE_DIR`, `SITE_DIR`. `QA_OUTPUT` choisit le dossier des captures et résultats. Le moteur Chromium est lancé en mode logiciel pour le contrôle fonctionnel ; ces résultats ne sont pas une mesure des performances du PC client.

## Publication et retour arrière

STUDIO ONE conserve sa branche dédiée. Le site et le catalogue général restent sur `main`. Les plans maison utilisent la branche indépendante de la maison, avec un paramètre de contexte ; sans ce paramètre, la maison témoin meublée reste le comportement initial. Les ressources d’avatar sont partagées depuis cette application et ne sont pas dupliquées.

Un projet validé est immuable dans le service serveur. Un projet supprimé laisse seulement un identifiant de suppression, sans géométrie ni données de client : un ancien enregistrement automatique ne peut pas le recréer. Les copies importées ou dupliquées reçoivent toujours une nouvelle identité.

## Cloisons, niches et calepinage — 22 octobre 2026

Les deux applications réutilisent leur moteur, leurs catalogues RANDAL et leurs tarifs respectifs. Les ajouts communs sont `tile-layout.js`, `niches.js`, `surface-zones.js` et `renovation.js` :

- création de pièce mise en avant ; plans salle de bains / maison conservés comme choix secondaire ;
- mobilier visible et déplaçable dans le dessin du plan, mesures contextuelles et aimantation des extrémités de cloison à 8 cm des murs ;
- niches réellement évidées, cinq faces intérieures, profondeur bornée par l’épaisseur de la cloison, modification et déplacement dans la scène ;
- positions verrouillables par élément ou pour toute la composition, avec équilibrage des coupes lors du verrouillage des meubles ;
- bandes murales et tapis rectangulaires de carreaux hexagonaux ou petits formats, avec dimensions, joints et profils de séparation ;
- profils sur des joints de mur ou de sol, recoupés aux limites de surface et aux vides ; les cloisons et baignoires n’en reçoivent plus automatiquement ;
- pose droite, décalée et opus uniquement pour les collections disposant des formats compatibles ; métrés réels, retraits d’ouvertures, niches et zones, coupes, marge et regroupement par produit ;
- WC complet avec bâti-support, habillage et plaque double chasse personnalisables ;
- envoi administrateur utilisant l’identité LRF vérifiée déjà reçue, progression visible, confirmation du service et possibilité de réessayer en cas d’échec.

`manufacturer-surfaces.json` reprend 50 collections ELIOS et 24 collections VIEW : 363 coloris documentés, dont 248 avec visuels matière exploitables. Les coloris sans ressource fabricant restent identifiés et désactivés. Les anciennes textures locales sont conservées. Les 303 faces supplémentaires publiées dans le stockage d’assets existant proviennent des sources fabricant : 136 VIEW, 30 Slate, 38 Domus Clay Red et 99 Azuli Mood. Slate dispose de cinq véritables faces par coloris. Les définitions natives sont conservées, sans agrandissement artificiel ; certaines petites vignettes de PDF ne constituent pas des textures HD. Les photographies d’ambiance ne remplacent pas la géométrie paramétrique des carreaux.

Le manifeste du publieur conserve les PDF, leurs empreintes et les images extraites. Les images ELIOS externes passent par une réécriture Vercel pour être utilisables comme textures WebGL. Les règles CORS du bucket existant conservent les règles antérieures et autorisent la lecture depuis les origines de production des configurateurs. Aucune règle d’accès aux données privées n’est ouverte.

Aucun conditionnement ou prix nouveau n’est déduit d’un autre produit. Si le conditionnement n’est pas vérifié, le rapport indique « conditionnement à confirmer », donne les pièces estimées et laisse les boîtes non calculées. Le professionnel peut renseigner les pièces et m² par boîte depuis sa fiche fabricant ; ces valeurs sont enregistrées dans le projet. L’équilibrage réduit les coupes étroites et tient compte des meubles verrouillés, mais ne simule pas une réutilisation garantie des chutes.

Vérifications supplémentaires :

- `STUDIO_PROJECT_ROOT=/chemin/studio-work node --test tests/randal-workspace/renovation-core.test.mjs` : géométrie réelle, métrés de niches, blocages, faces multiples indexées, opus, hexagones, WC et profils recoupés ;
- `node tests/randal-workspace/renovation-browser.mjs` : parcours interactif sur les deux builds, largeur 390 px, gestes de déplacement, bandes et tapis, verrouillage, import / restauration et envoi simulé par l’API existante ;
- contrôles HTTP des ressources natives publiées et des échantillons ELIOS utilisés ; aucun envoi d’essai à un client réel.
