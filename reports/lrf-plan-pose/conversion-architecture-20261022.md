> Complément et limites observées : [correction des portes ouvertes et calculs](regressions-contours-calculs-20261022.md).

# Conversion des plans : architecture, unités et export RANDAL

La conversion utilise d’abord les bandes pleines ou hachurées des murs pour retrouver l’enveloppe intérieure, même lorsqu’une porte l’interrompt. Les tracés intérieurs connectés sont proposés comme cloisons ; les contours fins de meubles et les annotations ne sont pas copiés dans le plan créé. À défaut de bandes architecturales, le lecteur reprend les contours orthogonaux du dessin normalisé (règle ou main levée). Un bord de feuille n’élimine plus le vrai contour de la pièce.

Le lecteur essaie les quatre orientations sur l’image d’origine pour les textes imprimés et les unités, puis utilise la normalisation et des recadrages agrandis pour le crayon. Les groupes de milliers espacés sont associés (« 3 595 », « 2 230 »). Les mm, cm et m sont convertis en centimètres en interne. L’unité proposée reste visible et modifiable avant la création ; un suffixe écrit avec un nombre prend priorité. Le mot isolé « CM » à l’intérieur d’un meuble n’est pas une preuve d’unité.

Le dialogue conserve les nombres lus dans leur unité ; changer l’unité ne réinterprète plus des nombres déjà convertis en cm à l’insu de l’utilisateur. Les contours sans cotes suffisantes ne sont pas tous cochés par défaut. L’utilisateur contrôle les lectures, déductions et cloisons, puis crée le plan. Une contradiction, une cloison hors pièce ou plus de huit cloisons bloque la création avec une explication. Les positions et épaisseurs de cloisons, mesurées sur le dessin, restent des estimations proposées ; elles sont modifiables dans Mes pièces.

La création masque l’original. Un contrôle permet de le réafficher pour comparaison. L’export image/PDF d’un plan converti exclut cet original même s’il est réaffiché dans l’éditeur : il contient les tracés et cloisons, sans le mobilier photographié. La sauvegarde conserve séparément l’original et les vecteurs. Les cloisons participent à la surface nette, aux plinthes et au calepinage. L’export natif utilise `room.partitions`, déjà pris en charge par STUDIO ONE et RANDAL Général ; il ne crée aucun équipement à partir du mobilier du document. Les faces et dispositions des parois sont conservées dans le format natif.

## Vérifications

- 36 tests Node passent : calculs existants, unités équivalentes, milliers espacés, exclusion du bord de feuille et du mobilier, porte interrompant l’enveloppe, cloison conservée, déduction de sol, plinthes, calepinage, sauvegarde et relecture des exports par les véritables fonctions natives de validation des cloisons des deux moteurs.
- Plan technique meublé fourni : une enveloppe de 3 595 × 2 230 mm, soit 8,01685 m² avant cloisons ; quatre cloisons proposées ; aucun meuble créé. Les quatre rotations retrouvent une enveloppe et quatre cloisons. Les exports des quatre cloisons passent les validateurs natifs des deux moteurs.
- Photo manuscrite fournie, après le même encodage PNG que l’import : 249 / 455 / 344 / 218 cm, 95 et 237 cm déduits ; 13,4005 m². Agrandissement et seuil supplémentaires pour la cote 455 très fine. La petite cote ambiguë reste signalée à contrôler.
- Trois images de plans à la règle, cotées respectivement 4500/3000 mm, 450/300 cm et 4.50/3.00 m : même reconstruction 450 × 300 cm, 13,50 m² ; unités reconnues.
- Véritable dialogue de conversion testé dans un DOM local : mm présélectionné sur le plan meublé, une seule pièce, quatre cloisons, création active après vérification, changement en m avec valeurs correspondantes conservant la géométrie ; données invalides et contradictoires bloquées.
- Navigateur de contrôle : application chargée, projet existant repris, ajout d’une cloison par l’interface et surface nette actualisée. Le parcours d’import de fichier n’a pas été retenté après le refus d’autorisation précédent : la reconnaissance des images est vérifiée localement, pas par un nouvel envoi de fichier dans ce navigateur.

## Limites

Il s’agit d’une reconnaissance locale par contours, bandes et OCR, pas d’une compréhension architecturale exhaustive. Les dessins obliques, courbes, très déformés, les limites ouvertes et les scans complexes peuvent nécessiter une correction ; le lecteur ne peut garantir chaque écriture. Les unités proposées et les cloisons doivent être vérifiées. Les portes, fenêtres et hauteurs restent à contrôler. Une pièce à la fois est transférée, avec les limites RANDAL existantes (12 angles, 8 cloisons, 10 × 10 m). Aucun service d’analyse externe ni clé API n’est ajouté.
