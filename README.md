# STUDIO ONE — Atelier salle de bain indépendant

Version expérimentale 22, 19 octobre 2026. Application statique autonome, projet Sites `appgprj_6ad5d7baca4881919c63f3c92de2e6e9`. Publication : https://studio-one-atelier-3d.ccjacou.chatgpt.site

Aucun fichier de production modifié. Aucun appel d’exécution à leroyfactory.fr, Firebase, GitHub ou au CRM. Les ressources sont embarquées dans `dist`. Le dépôt de production et ses données/catalogues ont uniquement été lus pour vérifier les références.

## Salle de bain, plans et sanitaires — version 22

Travail isolé sur `work/studio-one-salle-de-bain-v22`. Le déploiement reste le prototype autonome ; aucune publication sur leroyfactory.fr, aucun changement au dépôt GitHub de production ni à Firebase. Les textures, le paysage et les modèles de baignoire existants sont conservés sans modification. Aucun nouveau fichier binaire lourd : les sanitaires et accessoires supplémentaires sont générés par le code. Aucun nouvel envoi Firebase effectué faute de connexion d’écriture disponible ; les PDF existants sur Firebase ont seulement été consultés.

- **Performances et plan** : fusion des géométries par buffers préalloués, pas de reconstruction des calepinages inchangés ou des murs sans nouvelle ouverture, recherche de pose au sol bornée. Repère vert et aimantation à 90° ou parallèle au dernier segment, y compris après un angle libre. Portes et fenêtres se posent et se déplacent sur le plan ; largeur, hauteur, allège et noir/blanc sont réglables. Application des ouvertures avec validation et retour à l’état précédent en cas de conflit.
- **Démarrage** : trois plans vides avec porte/fenêtre et trois compositions aménagées (douche, bain, suite minérale), entièrement éditables. Elles remplacent le projet courant sur choix explicite ; historique pour revenir en arrière. Le bouton nouveau projet applique meuble 80 Roble/Sella, Capsula 45 × 90 LED allumée, quatre murs Creta Avena, sol Creta Caramello, ambiance chaleureuse, luminosité 105 %, température 4 400 K. Les projets sauvegardés conservent leurs réglages.
- **Pose** : les équipements sanitaires refusent les chevauchements pendant le déplacement. Les meubles/colonnes/miroirs conservent le passage temporaire et le recalage au relâchement. La collision du corps du mitigeur est distincte du bec et du flexible, qui peuvent entrer au-dessus de la cuve. La colonne de douche est placée au droit du caniveau contre le mur le plus proche, mitigeur à 105 cm ; hauteur et position restent réglables. Les parois restent contraintes au pourtour supérieur du receveur.
- **Revêtements** : sol et murs indépendants, aperçu des peintures corrigé. Repères cliquables pour ajouter/supprimer/recolorer chaque profilé et mémoriser le résultat, y compris les angles de baignoire. Angles internes facultatifs ; externes et tabliers carrelés par défaut.
- **Sanitaires** : AMARO VORTEX TR2217R, AMARO BLACK VORTEX TR2217R-U18, KRAL TR2224, DALIA STR4335 et TRIXIE TR443. Ces références proviennent du catalogue **UPTREND 2026**, et non du catalogue AQUA HOME. Coques creuses, rebords, abattants, réservoir KRAL, tablette et porte-serviettes TRIXIE. Dimensions d’encombrement vérifiées ; les courbes sont reconstruites d’après les photos, sans CAO fabricant ni simulation de chasse Vortex. TRIXIE : PDF 62,5 × 28,5 × 15 cm retenu, malgré le tarif JSON 44 × 27 × 15 cm. Références et provenance dans `qa/sanitary-sources.json`.
- **Évacuation et décoration** : choix de siphon bouteille/carré et bonde ronde/carrée sur les lave-mains ; sept couples de références AQUA HOME selon finition (carré en chrome). Serviettes tissées en relief, flacons, savon, plantes et serviettes sur les sèche-serviettes ; décoration masquable par objet. Les accessoires sont de présentation.
- **Grandes compositions** : saisir plus de 120 cm propose plusieurs caissons réels ; par exemple 160 cm donne 80 + 80 ou 100 + 60. Prévalidation de tout le groupe, modèle et finition conservés, plans séparés ; pas de modification partielle si le mur est encombré. Le 40 cm reste explicitement à confirmer au catalogue, comme auparavant.

Les 18 suites automatisées couvrent géométrie, contrôles, import/export, six compositions, coloris, dimensions sanitaires, collisions et ouvertures 2D/3D. Mesures CPU de préparation de pièces jusqu’à 100 m² et douze angles enregistrées dans `qa/mission-result.json` ; ce ne sont pas des mesures FPS sur le PC client. La validation visuelle WebGL, Android et Safari/iPhone n’a pas pu être réalisée dans cet environnement. À vérifier sur appareils réels avant toute intégration en production.

## Aménagement intuitif et détails — version 21

- **Parois de douche** : verre et profilés cliquables, modèle/finitions/largeur et suppression depuis le panneau. La pose libre est remplacée par une fixation sur le bord supérieur d’un receveur. Choix du receveur et du bord gauche/droit/avant/arrière ; les largeurs trop grandes pour ce bord sont masquées. Le glisser reste sur son périmètre. Déplacement et rotation du receveur entraînent ses parois ; le contrôle de collision tient compte de leur hauteur. Supprimer une paroi conserve le receveur ; supprimer le receveur retire ses parois associées. Les robinets restent indépendants. Les anciens placements de parois sont recalés sur leur receveur lors de la réouverture.
- **Cloisons** : bouton « + Cloison droite », longueur/direction/épaisseur/hauteur et déplacements par glisser sur le plan. Poignées d’extrémité, aimantation horizontale/verticale ; dessin en un glisser ou deux touchers. Coordonnées regroupées dans une section facultative. Au clic sur une face en 3D : réglages de cloison avant les revêtements, déplacement sur le plan ou suppression. Les objets fixés à une cloison empêchent sa suppression accidentelle.
- **Flexibles de bain** : nouvelle courbe 3D qui franchit le bord arrière puis descend dans la cuve, au lieu de rester plaquée derrière la baignoire ; variante sur pied ajustée également. Robinet et baignoire restent des objets séparés : leur position relative doit rester cohérente.
- **Profilés** : angles externes de pièce et de cloisons, rives et tabliers carrelés de baignoires. Angles internes désactivés par défaut, option explicite. Profilés génériques de présentation en quatre finitions, sans référence fabricant.
- **Fenêtres** : joints de vitrage, paumelles et verre physique ; vue extérieure de jardin méditerranéen, locale et recadrée suivant les proportions du vitrage. Le paysage est une image photographique générée, pas un extérieur 3D navigable ni une vue réelle d’un lieu.
- **Sèche-serviettes** : échelle à tubes ronds et modèle à lames plates, environ 50 × 128 cm. Chrome, noir mat, or brossé et cuivre. Objets 3D génériques destinés à l’aménagement visuel, sans référence commerciale ou simulation thermique. Ajout, déplacement sur les murs, changement de finition et suppression indépendants.
- **Carreau par carreau** : au clic sur un mur, choisir « Modifier un carreau », cliquer le carreau, puis un coloris de sa propre collection. Contour doré sur la sélection. La géométrie, les joints et la taille du carreau restent inchangés. Les choix sont sauvegardés/partagés et les quantités sont réparties par couleur et boîtage. Le calcul par couleur répartit la surface des joints au prorata des faces carrelées et conserve le total net du mur ; les chutes ne sont pas réemployées automatiquement.

Asset de fenêtre enregistré : `dist/assets/exterior/mediterranean-garden.webp`, généré avec l’outil imagegen intégré. Brief : vue photographique de jardin méditerranéen, oliviers, végétation douce, muret de pierre et ciel, lumière naturelle ; sans cadre de fenêtre, personne ou texte. L’image PNG originale reste conservée par le service de génération. Les trois dimensions du mobilier, du vitrage et des équipements restent de véritables géométries ; seul le paysage extérieur utilise ce fond.

Contrôles ajoutés : vitrage sélectionnable, quatre bords × quatre rotations de receveur, déplacement et collisions de l’ensemble, deux sèche-serviettes × quatre finitions, tracé/déplacement de cloisons et annulation, palette 3D de cloison, couleurs de carreaux et réouverture de projet, quantités et découpes autour des ouvertures, flexibles et profils. Contrôle navigateur/GPU toujours indisponible ici : aucune certification de photoréalisme ou de fluidité sur appareil réel.

## Corrections au clic, éclairage et pose — version 20

- Clic sur le plan assorti, le plan percé ou la vasque : choix des modèles compatibles. Largeurs standard : Sella/Tampa encastrées ou vasques à poser ; hors standard : plan assorti, Neris (dès 50 cm) ou Torne (dès 40 cm). Aucune cuvette déformée pour obtenir une largeur non référencée.
- Miroir LED : bouton Allumer/Éteindre entre Dupliquer et Supprimer. Diffuseur lumineux, halo doux de forme adaptée et deux lumières surfaciques bornées éclairant réellement les matériaux. Le halo mural est une approximation analytique, pas une simulation de lumière globale ni un calcul photométrique fabricant. Le mode Léger garde le halo/diffuseur mais désactive ces lumières supplémentaires. Reflet planaire réel conservé.
- Receveur/baignoire : boutons Plaquer au mur, Angle gauche et Angle droit. Le placement tient compte de l’emprise après rotation, même quand le décalage du repère doit être négatif. Le glisser au sol se cale à moins de 3 cm des murs dans une pièce convexe et absorbe le dépassement du pointeur. Les pièces concaves et cloisons gardent la validation anti-traversée ; une implantation impossible reste refusée.
- Caniveau : sens inversé, longitudinal dans la profondeur, grille métallique de 28 mm de large, longueur 64–140 cm selon le receveur, vraie réservation et fond sombre sous la grille.
- Tablier : carrelage sur trois faces à l’échelle physique, joints conservés. La coque porteuse ne reçoit plus de texture et reste derrière les carreaux, supprimant la zone étirée/superposée. Couleur et collection indépendantes conservées.

Vérifications supplémentaires : les deux angles des quatre murs avec quatre orientations pour receveur et baignoire, géométrie réelle du caniveau, UV physiques et superposition du tablier, lumières sans interception des clics, actions du panneau et maintien de la caméra. Pas de contrôle visuel GPU disponible dans cet environnement ; le résultat lumineux reste à valider sur écran réel.

## Accès direct au modèle et à la largeur

Au clic sur un meuble ou sa vasque, le panneau contextuel propose les quatre modèles STUDIO ONE et la largeur entière 40–120 cm avec bouton Appliquer ou touche Entrée. Ces contrôles sont affichés avant les finitions, dans le panneau latéral sur PC et la palette courte sur mobile. Ils réutilisent les validations de compatibilité et de placement existantes. Le changement de largeur depuis cette palette conserve la caméra.

## Dernières modifications : aménagement, revêtements et relevé

- **Éléments séparés** : receveur résine, paroi fixe/retour liée à son receveur, colonne de douche, bain mural et bain sur pied sont sélectionnables et supprimables séparément. Les interactions autorisent le recouvrement physiquement normal d’une paroi/robinetterie et d’un receveur. Le receveur se plaque au mur ; la paroi s’insère par défaut perpendiculairement, avec un bord sur ce mur. Bouton « Plaquer au mur » pour corriger un placement libre.
- **Baignoires** : tablier de 55,8 cm rejoignant le bord à 57 cm, plage modélisée autour de la cuve arrondie. Le tablier carrelé a sa propre collection et couleur. L’îlot n’a pas de tablier. Les robinets de bain ne font plus partie du maillage de baignoire.
- **Six familles RANDAL** : rond métallique, rectangulaire métallique, Basic réversible, Zen LED, Ilse LED et Cápsula LED ; toutes les dimensions et références p.36 du catalogue général. Les modèles réfléchissent réellement suivant leur contour. Les traitements antibuée et capteurs électroniques ne sont pas simulés ; les détails de fabrication sont reconstruits.
- **ELIOS / VIEW / peinture** : choix du fabricant puis collection. Shell/Creta conservés ; Corso Beige et Golden Stone Ivory/Sand/Pearl/Oxid/Carbon locaux, issus de la sélection revue. Coco et les autres échantillons non validés restent exclus. Corso en 60×90 / 60×120, Golden Stone en 30×60 / 60×60 / 60×120 / 120×120, finition naturelle. Peinture continue sans joints, microrelief de rouleau, sept teintes et couleur personnalisée.
- **Cloisons dans le plan** : deux clics ou coordonnées exactes, épaisseur 5–30 cm, hauteur 30 cm à hauteur totale, huit segments maximum. Deux faces indépendantes pour revêtement et fixation d’objets. Les portes/fenêtres percent les deux faces. Les segments croisés ou chevauchants sont refusés ; déplacer/supprimer les objets fixés avant de supprimer leur cloison. Les identités de cloisons sont conservées lors des modifications.
- **Surfaces et calepinage** : déduction réelle de l’emprise des cloisons au sol et des ouvertures dans les murs ; deux faces de chaque cloison et trois tabliers pris en compte. La grille réelle donne le nombre de carreaux entiers et à découper. Le besoin retient le maximum entre les carreaux sources de ces découpes (sans réemploi de chutes) et la surface nette majorée du pourcentage choisi ; regroupement par produit et arrondi à la boîte complète. Relevé des zones, commande groupée et export CSV. Les surfaces sous équipements sont incluses ; tableaux/reveaux et joints de dilatation non ajoutés. Ce calcul prudent ne remplace pas un plan de découpe optimisé par un poseur.
- **Boîtages vérifiés** : ELIOS Shell/Creta 60×120 : 2 pièces / 1,44 m². VIEW Corso 60×90 : 2 / 1,08 ; 60×120 : 2 / 1,44. Golden Stone 30×60 : 8 / 1,44 ; 60×60 : 4 / 1,44 ; 60×120 : 2 / 1,44 ; 120×120 : **1 / 1,44**, correction par rapport à la vieille liste locale qui indiquait 2 / 2,88. Sources précises dans `qa/packaging-verified.json` et `src/surface-catalog.js`.
- **Profilés aluminium** : géométrie en L sur les rives de cloisons, dessus des demi-cloisons, encadrements d’ouvertures et rives de murs choisies ; noir, argent, doré, bronze. Métré en mètres linéaires ; profils génériques de présentation, pas de référence commerciale ou de longueur de barre certifiée.
- **Projets** : schéma version 2. La réouverture d’un ancien projet version 1 transforme ses accessoires couplés en objets séparés. Les peintures personnalisées, cloisons, miroirs, profilés, formats, marge et équipements restent dans l’export/partage et Annuler/Rétablir. Maximum porté à 32 éléments pour inclure les accessoires séparés ; toujours trois reflets maximum.

## Mobilier et équipements

| Objet | Référence / dimensions |
| --- | --- |
| STUDIO ONE 2 tiroirs | 13692, H 54 × P 46 cm, base de présentation 28 cm |
| STUDIO ONE 3 tiroirs | 13693, H 91 × P 46 cm, posé au sol |
| STUDIO ONE 1 tiroir XL | 13691, H 37,5 × P 46 cm, base 28 cm |
| STUDIO ONE 2 tiroirs XL | 14176, H 75 × P 46 cm, base 28 cm |
| Colonne 1 porte | 14177, 38 × 132 × 27 cm, charnières réversibles |
| Miroir métallique rond Ø 60 | noir 3717, doré 3722, bronze 3723, argent 3725 |
| Sella encastrée | 60/70/80/90/100/120 cm, réf.2215/2808/2171/13237/3279/6389 |
| Neris à poser | 46 × 33 × 14 cm, blanc brillant 9567 |
| Torne à poser | Ø37 × 12 cm, blanc brillant 9559 |

Quatre formats de caissons construits avec la même géométrie paramétrique, panneaux de 19 mm, véritable pente à 45° haute à l’avant, bords adoucis, tiroirs creux et coulisses reconstituées. Largeurs 40–120 cm au centimètre ; le 40 cm reste à confirmer auprès du fabricant. Sella/Tampa encastrées uniquement aux largeurs référencées. Plan assorti seul ou avec vasque à poser ; Neris dès 50 cm, Torne dès 40 cm. Sella blanc brillant, Tampa brillant/blanc mat/noir mat, Neris et Torne en neuf coloris. Chaque meuble garde indépendamment son format, sa finition, sa vasque, ses couleurs et sa robinetterie.

Huit finitions authentiques : Roble Amazona, Serenade Alba, Nogal Valentina, White Bolero, Azul Acero, Gris Tórtora, Biscuit, Muted Green. Bois 186 × 186 pixels et White Bolero 187 × 187 : albedos d’origine sans agrandissement inventé. Rugosités et reliefs estimés. La fidélité des teintes doit être vérifiée sur échantillons physiques.

Trois baignoires génériques d’aménagement, arrondie/rectangulaire/îlot, adaptées aux longueurs 140/150/160/170 cm et profondeurs proposées. Cuves réellement creuses tirées de maillages CC0 téléchargés. Tablier blanc ou réellement carrelé avec joints de 2 mm et matériau du mur choisi. Le carrelage du tablier suit la couleur du mur de référence ; il possède sa propre grille de pose. La robinetterie et les parois se placent indépendamment des baignoires et receveurs. Les longueurs adaptées ne certifient pas la disponibilité d’un produit commercial.

Douche générique avec receveur résine blanc/gris/beige/anthracite, côtés 80–200 cm ; paroi fixe droite ou fixe avec retour d’angle (choix de prototype à valider). Largeurs de paroi 80/90/100/110/120/140 cm, limitées à la largeur du receveur. Profils métalliques coordonnables à la robinetterie et aux cadres.

`src/aquahome-catalog.js` contient 123 références AQUA HOME correspondant à cinq usages : lavabo, lavabo haut, douche, bain mural, bain sur pied. Noms, finitions et références proviennent du catalogue existant ; les correspondances de finition ont été vérifiées sur les pages PDF, notamment les lignes Malibu. Les robinets sont des reconstructions volumétriques par famille et usage, pas des fichiers CAO fabricant. Bel Air normal H165 mm / haut H274 mm ; modèles sur pied Cylindric/Square/Curve d’après leurs dessins. Les écarts de forme fine et les variantes de mécanisme ne constituent pas une représentation d’exécution certifiée.

## Interface et outils

- PC : grande vue 3D, navigation Pièce/Mobilier/Finitions/Présentation et un panneau latéral repliable. Petites palettes directes au clic sur les objets.
- Mobile : quatre pastilles en bas, panneau repliable de 38 % de hauteur maximale et palette contextuelle courte à défilement horizontal. Réglages avancés et qualité manuelle dans « Plus de réglages ». Adaptation automatique par défaut ; aucune hypothèse de puissance basée uniquement sur le type d’appareil.
- Ajout précédé d’un choix de modèle ; ajout/suppression sans recadrage de caméra. Duplication depuis le menu d’objet ou Ctrl/Cmd D.
- Glisser maintenu à la souris ; maintien tactile de 340 ms. Les meubles traversent temporairement les autres objets et retrouvent une position libre au relâchement. Alignement magnétique à 3 cm des centres ou des bords. Les équipements se déplacent sur le plancher, avec rotation par pas de 90° ; les parois de douche restent sur le périmètre de leur receveur.
- Fixation sur n’importe quel mur, positions et hauteurs numériques, centrage d’un miroir sur le meuble le plus proche du même mur.
- Tiroirs individuels, meuble entier ou composition entière. Course supérieure 20 cm, intermédiaire 26 cm, inférieure 31,5 cm ; tiroir unique XL 31,5 cm. Portes de colonne et de pièce réversibles.
- Annuler/Rétablir (50 états, Ctrl/Cmd Z et Maj Z). La sélection/caméra seule ne modifie pas la composition.
- Plan de 3–12 sommets, dimensions/angles, fenêtres et portes noir/blanc à dimensions variables, véritables découpes des murs, cotes projetées dans la vue.
- Quatorze textures ELIOS, complétées par six textures VIEW : six Shell et huit Creta, sélection indépendante sol et par mur, application à tous les murs, pose 120 × 60 horizontale ou verticale, alignée ou décalée de moitié et origine réglable. Joints fixes de 2 mm. Métrés et nombres de carreaux avec 10 % de marge **indicatifs**, non devis de calepinage.
- Sauvegarde automatique de travail dans le navigateur ; 20 projets nommés avec vignette, réouverture/suppression. Export/import JSON pour conserver une copie externe.
- Partage par URL autonome encodant un instantané de la configuration : ouvre la même composition sur un autre appareil. Pas de compte, pas de stockage distant, pas de synchronisation ultérieure ni de collaboration en direct. Certains services de messagerie limitent la longueur des URL ; export JSON en solution de repli.
- Présentation sans menus, vue à hauteur des yeux, jusqu’à trois cadrages mémorisés et export PNG jusqu’à la cible HD permise par l’appareil. Taille réelle d’export plafonnée pour éviter les allocations excessives.

## Rendu et performance

Three.js r180, matériaux PBR, HDR PMREM, tone mapping AgX, éclairages surfaciques et trois ambiances. Luminosité 40–180 % et température 2700–6500 K. Soleil recalé sur la composition et sur la première fenêtre en mode Jour ; ombres couvrant les éléments. Les murs peuvent se masquer pour la visite tout en restant occultants lors du calcul d’ombre. Rétroéclairage de miroir optionnel, simplifié en mode Léger.

Trois budgets distincts Ultra/Standard/Léger, adaptation automatique indépendante : Ultra ajoute GTAO et des buffers plus fins ; Standard garde le rendu détaillé ; Léger coupe les ombres projetées et simplifie le verre. Reflets planaires réels et cadencés, résolution limitée suivant l’écran/GPU, absence de récursion entre miroirs. Les textures sont partagées et les ombres stables réutilisées. Rendu à la demande après stabilisation ; les reflets ne sont pas des images préfabriquées. Maximum 32 objets et 3 miroirs réfléchissants par composition. Pas de lumière globale calculée par lancer de rayons.

## Vérifications et limites

`npm run check` exécute les contrôles de géométrie, matériaux/options, contrôleurs d’interface, composition, navigation, ouvertures, placement, qualité et nouvel aménagement salle de bain. Les contrôles supplémentaires couvrent les quatre formats à plusieurs largeurs, les douze couples type/longueur de baignoire avec cuvette réellement creuse, les parois/finishes/largeurs, les 123 robinets, le placement libre et les collisions au relâchement, le partage Unicode, l’historique, les projets et la couverture des carrelages autour des ouvertures. `npm run build` produit le bundle local et des URL de fichiers avec empreinte de contenu.

**Contrôle visuel navigateur/GPU non réalisé ici** : le navigateur de contrôle prescrit n’est pas disponible dans l’environnement Sites. Aucun résultat ne certifie le photoréalisme final ou un débit d’images sur PC client, Android ou Safari/iPhone. Les contrôleurs sont exercés avec des objets Three.js réels et un document simulé, pas avec une vraie page rendue. Avant intégration : tests visuels et performances sur appareils réels, validation des matériaux et des détails par série, confirmation fabricant des compatibilités et dimensions. La mise en ligne du prototype ne vaut pas autorisation d’intégration.

## Sources et licences

- Catalogues STUDIO ONE/RANDAL et tarif CREA FLOW C1 du 25/09/2026 : dimensions, références et nuanciers fournis dans le projet existant, consultés en lecture seule.
- Catalogue AQUA HOME fourni par le projet existant : 123 références ciblées, source/page conservées dans les données.
- Baignoires Innerscene, licence CC0-1.0 : https://www.innerscene.com/tools/library/3d-parts/soak-freestanding-oval-bath-a29c42f0 et https://www.innerscene.com/tools/library/3d-parts/inset-bath-inset-bathtub-118db49b . GLB d’origine, données extraites et provenance dans `dist/assets/bathroom/`. Script reproductible dans `tools/prepare-bath-assets.py`.
- Environnements CC0 : https://polyhaven.com/a/studio_small_09 et https://polyhaven.com/a/poly_haven_studio .
- Three.js, MIT ; licence embarquée dans `dist/assets/THREE-LICENSE.txt`.

La généralisation est possible en réutilisant géométrie paramétrique, matériaux, contrôles et placements, mais requiert une validation fabricant par série et de meilleurs albedos pour des gros plans véritablement photographiques. Pas de gain de qualité prétendu au-delà de la résolution des échantillons d’origine.
