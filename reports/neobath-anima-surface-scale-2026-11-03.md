# Anima — veinage stable sur plans, chants et vasques

Release : `20261103-neobath-anima-studio-one-surface-scale-9`.

## Défaut reproduit

La capture du plan THPL12 HPL Statuario montrait des lignes verticales sur le chant de 12 cm. Le placage précédent projetait toutes les faces suivant X/Z et ajustait une image entière à la largeur/profondeur courantes. Sur une face verticale, une coordonnée de texture devenait constante : des triangles avaient une aire de texture nulle. Redimensionner le plan changeait aussi la taille du décor.

La reproduction avec le vrai THPL12 a retrouvé ces stries. Les mesures avant correction comptaient 136 triangles de chant sans aire de texture sur le plan seul et 912 sur le cas de vasque HPL A50. Le ratio de l'image Statuario 1500 × 1000 était déformé pour couvrir un plan 120 × 46,5 cm.

## Correction

Le placage est désormais calculé dans le repère local du plan, à échelle fixe. Le dessus et le fond de cuve partagent un champ continu. Les chants et les parois des cuves veinées sont dépliés à partir de leurs arêtes et rebords ; les panneaux inclinés utilisent leur longueur développée, pas leur seule hauteur projetée. Une face verticale possède donc à nouveau deux dimensions de texture.

Les proportions du fichier source sont conservées. La même matière garde la même densité de décor pour les longueurs 120, 180 et 240 cm, les hauteurs 1/6/12 cm et les changements de profondeur. Déplacer, tourner ou aimanter le plan ne déplace pas l'image sous sa géométrie. La géométrie reste continue : aucun morceau de plan n'est ajouté pour simuler un agrandissement.

Au-delà de l'étendue d'une image finie, un rebouclage miroir évite le bord étiré produit par l'ancien ClampToEdge. Le fichier d'origine n'est ni recoloré ni agrandi ; des répétitions de la photographie restent possibles sur les très grandes surfaces. Les jonctions des panneaux et du fond de cuve restent les limites d'un placage de prévisualisation, pas une simulation garantie de découpe et de raccord du décor en usine.

Les références de taille des fichiers proviennent de `source.runtimeSize`/`nativeSize` ou du fichier chargé. Aucun catalogue fourni ne cote l'échelle physique de ces photographies. La référence fixe de prévisualisation choisie est 0,80 m pour le petit côté de l'image ; l'autre côté suit son ratio. Par exemple, Statuario donne 1,20 × 0,80 m. Cette valeur n'est pas présentée comme une dimension de plaque fabricant. Les plans assortis au bois conservent le repère métrique déjà réglé pour Studio One/Serenade Alba.

## Robustesse et vérification

Le placage utilise les géométries et matériaux Three.js existants ; aucun nouveau shader n'est ajouté. Le découpage des sommets aux limites du placage conserve l'identité des géométries inscrites dans le registre de destruction des plans. Le chargement asynchrone ne recalcule que le plan courant ; les objets de scène ne sont pas stockés dans les données sérialisables du matériau.

Les 251 tests Anima réussissent, sans échec ni test ignoré.

Des tests vérifient la densité isotrope, l'aire de texture des faces, les raccords aux rebords, les pentes, la stabilité après déplacement/rotation, le chargement tardif et la destruction des géométries. Les diagnostics CPU comparent les vrais plans et matériaux avant/après, y compris HPL A50 et grès BASIC50. Après correction, l'audit indépendant ne retrouve aucun triangle de texture dégénéré dans les sept cas inspectés.

Les dimensions, références, prix, façades et la texture Alba des meubles ne changent pas. Le correctif concerne l'adaptation Anima ; Studio One, Catalogue Général et le moteur partagé restent inchangés. L'application conserve l'accès privé de Jérôme et Coryne. Les diagnostics CPU ne constituent pas une validation GPU/PBR finale.
