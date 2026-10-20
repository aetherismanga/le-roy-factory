# Contrôle correctif — 20 octobre 2026

## Erreur identifiée et correction

Les 25 références de miroirs avaient été converties par la formule des meubles C1 (base d’achat × 2 × 1,20), alors que leurs valeurs source étaient déjà des prix publics HT. L’erreur existait dans l’affichage de l’ancien configurateur ; la reprise à l’identique et les anciens tests de concordance l’avaient reproduite. Le contrôle compare désormais les valeurs au PDF fabricant, indépendamment de cet affichage historique.

Le Cápsula LED 45 × 90 cm, réf. 12741, est imprimé à 347 € HT public dans `assets/pdf/RANDAL%20V04.pdf`, page 36. Le prix affiché correct est **416,40 €**, au lieu de 832,80 €. Le meuble 13692 80@ROBLE reste à 528,00 € et la Sella 2171 à 163,20 € : la composition de la capture totalise **1 107,60 €**.

Les anciennes valeurs publiques des miroirs ne constituent pas des prix d’achat. Faute de grille d’achat miroir ou de condition professionnelle documentée, les 25 références sont retirées de la grille privée. Le prix d’achat affiche « Prix sur demande » avec la référence à confirmer. Aucune remise n’est extrapolée. Les codes LRF, comptes et conditions existantes ne sont pas modifiés.

## Étendue de la vérification

**328 références publiques distinctes :**

- 256 variantes de meubles : 4 modèles × 4 tranches de largeur × 8 finitions × avec/sans plan, concordantes avec C1 du 25/09/2026 dans `assets/js/studio-one/catalog.js`.
- 8 références de colonne : même grille C1, concordantes.
- 21 références de vasques encastrées et 18 de vasques à poser : contrôlées par extraction indépendante du PDF fabricant pages 38 et 41, concordantes.
- 25 références de miroirs : contrôlées dans la page 36 et corrigées.

La source C1 des meubles/colonnes reste le fichier commercial existant du dépôt, commit 233ab6dda7fb71c5048ac1f983a67ceb3fe0b0c9. Aucun document C1 indépendant plus récent n’a été retrouvé ; cette concordance ne signifie pas une validation d’un tarif usine 2026 actualisé. Les références du catalogue PDF sont vérifiées dans le document d’origine, non dans le PDF public déjà converti.

Le script `tools/extract-verified-prices.py` lit les références et montants par leur position dans les tableaux du PDF, dont l’empreinte est enregistrée dans `randal-pdf-prices.json`. Le test `qa/verified-prices-check.mjs` compare toutes les références Bêta à ces valeurs et à la grille C1. Le détail des 25 corrections et références d’achat manquantes figure dans `verified-prices-check.json`.

Les plans assortis sont compris une seule fois dans les variantes C1 avec plan ; aucun supplément de finition non documenté n’est ajouté. Les quantités sont représentées par les éléments réels de la composition. Les équipements, robinets et revêtements non tarifés restent hors montant mobilier ; aucun prix fictif ne remplit les lacunes.

## Finitions et rendu

- Un seul jeu de finitions, léger, fournit les pastilles et les deux vues 3D.
- Les couleurs unies sont réalignées sur `StudioOneCatalog` : notamment Biscuit `#c9b29a` et Gris Tórtora `#5e5559`, auparavant éclaircis.
- Les deux moteurs utilisent le même traitement de couleur neutre et une sortie sRGB explicite. L’éclairage de l’aperçu est réduit ; l’atelier conserve ses ambiances et son réglage de luminosité avec une intensité par défaut recalibrée.
- Aucun fichier de texture, aucune photographie et aucune géométrie 3D n’est remplacé ou modifié.

## Vérification

- 328 références publiques contrôlées, dont 64 par le PDF ; 303 prix d’achat documentés conservés et 25 miroirs exclus de la grille privée.
- 8 393 comparaisons commerciales et 5 184 placements ; le test des miroirs utilise désormais public HT × 1,20, au lieu de reproduire l’erreur historique.
- 18 suites de régression : géométrie, navigation, compositions, matériaux, sauvegarde et outils existants.
- Navigateur réel WebGL2 : huit finitions rendues avec les vrais modèles et textures ; contrôle des tons sombres, Biscuit et Azul ; absence d’erreur de shader. Mesures dans `finish-rendering.json`.
- Parcours complet sur cinq tailles d’écran, récapitulatif, sauvegarde/reprise, client/administrateur synthétiques, impression et préparation de message, transfert vers le véritable atelier WebGL2 puis retour au devis avec le même montant. Aucun message envoyé.
- Aucune ressource 3D, HDR ou API commerciale n’est chargée sur l’accueil avant son utilisation. L’aperçu ne charge toujours pas les HDR ni les catalogues lourds de l’atelier.

Les comptes réels LRF/administrateurs et les performances sur les appareils physiques de Jérôme/Coryne restent à essayer. Les tests de connexion sont synthétiques ; l’amélioration de validation WebGL2 ne remplace pas ces essais de comptes.
