# Anima — façades rectilignes et bois Serenade Alba

Release : `20261103-neobath-anima-studio-one-facades-8`.

## Façades

Les photographies natives du catalogue (`pura-rovere-drawers-detail.webp`, `ribelle-rovere-grip-detail.webp`, `anima-six-facades-native.webp`), complétées par les vues Anima p.9/29/42, montrent des prises rectilignes avec des retours latéraux biseautés. La reconstruction précédente utilisait un quart-de-rond traversant toute la largeur et entaillant les extrémités. En perspective, cela créait les grandes découpes en C signalées sur la capture utilisateur.

Le nouveau profil enlève cette courbe : lèvre fine, pente droite, fond de prise rectiligne et retours de bout. Les extrémités restent pleines et rectangulaires. Les surfaces et normales du relief Ribelle restent indépendantes du veinage ; aucune photographie contenant déjà des ombres de cannelures n'est appliquée sur les reliefs.

Les enveloppes des références et leur fonctionnement ne changent pas. La hauteur de zone de prise et les retours sont estimés depuis les photographies, pas des cotes d'usinage industriel publiées. Les maillages sont contrôlés en volume, normales, incidence des arêtes et raycasts sur les bouts et le fond de prise, dans les largeurs 40/60/80/120 cm.

## Bois demandé par Jérôme

La finition Anima `rovere-alba` réutilise désormais l'échantillon plat Serenade Alba (`ALBA`) de Studio One, conformément à la demande. L'ancienne apparence mélangeait une petite photographie de côté 385 × 204 et une petite photographie de façade 495 × 170 ; leurs ombres, couleurs et motifs divergeaient visiblement.

Les trois profils utilisent les assets canoniques Studio One, sans duplication, recadrage, recoloration ni agrandissement :

- `https://studio-one-beta-test-v2.vercel.app/assets/finishes/20261022/alba-fluid.webp`
- `https://studio-one-beta-test-v2.vercel.app/assets/finishes/20261022/alba-balanced.webp`
- `https://studio-one-beta-test-v2.vercel.app/assets/finishes/20261022/alba-max.webp`

Le fichier max est natif 945 × 2048 ; SHA-256 `771491decd956c424fe4302a82cda712f5f84f30d9e0bc5485b1fbbbcb84fcc4`. Les fichiers publics sont vérifiés byte à byte et répondent avec CORS `*` pour l'origine `https://leroyfactory.fr`.

La teinte sRGB, les répétitions, la rugosité 0,46, le vernis 0,13, sa rugosité 0,35 et le microrelief 0,00045 reprennent Studio One. Le veinage suit les visuels : horizontal sur les façades Pura, vertical sur Ribelle et les colonnes. Ces orientations utilisent des clones de texture indépendants ; changer un meuble ne modifie pas les cartes d'un autre.

L'atelier, l'aperçu devis, les miniatures et la préparation HD suivent la même définition. Le mode auto peut promouvoir une image fluid vers balanced avant de choisir le fichier ; le mode max conserve la véritable image HD. Un seul téléchargement d'image par profil remplace les chargements séparés des anciennes photographies.

Il s'agit d'une substitution visuelle demandée : les identifiants, noms commerciaux, références et tarifs Anima sont conservés. La provenance ne présente pas l'échantillon Randal comme un nuancier Neobath calibré. Les cinq finitions unies Anima gardent leur teinte et leur aspect mat.

## Vérification et publication

Les 245 tests Anima réussissent, sans échec ni test ignoré. Le build privé et le build public réussissent ; les fichiers privés restent exclus de Pages.

Les tests ciblent les vraies géométries et les véritables fonctions de chargement et de peinture des matières, y compris les colonnes et l'export HD. Le test de démarrage ajouté après le précédent incident reste inclus. Des diagnostics CPU inspectent les profils et le placement des pixels de l'image HD ; ils ne constituent pas une vérification GPU/PBR finale.

Le noyau commun reste validé. Les sources originales Studio One, Catalogue Général et le moteur partagé ne sont pas modifiés. La publication conserve le serveur privé Anima et l'accès vérifié de Jérôme et Coryne seulement.
