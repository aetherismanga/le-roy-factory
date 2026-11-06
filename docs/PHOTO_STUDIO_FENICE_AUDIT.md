# Audit ciblé La Fenice — Photo Studio

Audit du 6 novembre 2026, dépôt de départ `1588feb544be112b57612151e704824c52c95d71`. Sources lues : catalogue JSON existant, données de boîtage, PDF fabricant local et pages officielles du fabricant. Aucune source commerciale modifiée.

## Résultat

Aucune des variantes auditées n’est promue en texture de dalle Photo Studio. Le catalogue actuel contient des visuels d’ambiance et des nuanciers fabricant, mais ne documente pas de façon suffisante les tampons complets à la référence. Les formats et couleurs globaux d’une collection ne doivent pas être croisés automatiquement.

## Preuve concrète : Allure

Le PDF fabricant `assets/pdf/LA_FENICE_CERSAIE_2026.pdf`, page PDF 12 (page imprimée 10), comporte une matrice coloris/formats et une seule finition : **semi-gloss soft touch**, épaisseur 9 mm. La matrice a été lue et sa page rendue visuellement contrôlée.

| Coloris | 120 × 120 | 60 × 120 | 90 × 90 |
|---|---|---|---|
| Diamante | Oui | Oui | Oui |
| Perla | Oui | Oui | Oui |
| Ambra | Oui | Oui | Oui |
| Quarzo | **Cellule vide** | Oui | Oui |

Les mentions F30/F58 sont des codes de grille du catalogue ; elles ne sont pas des références produit uniques. Aucun SKU n’est inventé à partir de ces codes. Une simple multiplication des quatre couleurs par les trois formats créerait un Quarzo 120 × 120 non documenté.

Les pages PDF 6, 8, 9 et 10 indiquent explicitement des sols Allure Diamante/Ambra 120 × 120. L’usage sol est donc établi pour ces références de coloris/format. Il ne suffit pas à qualifier leurs nuanciers comme tampons complets.

La page PDF 13 (imprimée 11) contient les visuels de matière. Les fichiers existants sont des bandes de matière :

| Coloris | Fichier existant | Définition native | Rapport |
|---|---|---|---|
| Diamante | `allure-diamante.webp` | 1123 × 359 px | 3.128:1 |
| Perla | `allure-perla.webp` | 1123 × 359 px | 3.128:1 |
| Ambra | `allure-ambra.webp` | 1123 × 359 px | 3.128:1 |
| Quarzo | `allure-quarzo-hd.webp` | 718 × 2245 px | 3.127:1 |

Ces rapports sont incompatibles avec les carreaux carrés ou 60 × 120 (2:1). Ils ne sont ni recadrés arbitrairement ni étirés pour créer une fausse face fabricant.

## Autres candidats examinés

| Collection | Formats du site | Constat des visuels existants |
|---|---|---|
| Calacatta Gold, Imperial Grey, Marfil Creme, Supreme | 60 × 120 | Nuanciers carrés 400 × 400 px ; pas un tampon 2:1. |
| Glowood | 20 × 120 | Nuanciers 400 × 200 px ; rapport 2:1 au lieu de 6:1. |
| Rovere, Shabby Wood, Tendance | 15 × 60 | Nuanciers aux rapports variables ; ne reproduisent pas le carreau 4:1. |
| Woodland | 15 × 90 | Nuanciers 400 × 217 px ; pas un tampon 6:1. |
| Apache, Fiordi, Touch Evo | Un seul format rectangulaire | Ratio de certains nuanciers compatible, mais absence de documentation du tampon complet et de rapprochement à la référence usine ; aucune promotion fondée sur le ratio seul. |

## Sources primaires

- PDF fabricant local : `assets/pdf/LA_FENICE_CERSAIE_2026.pdf`.
- PDF d’origine : https://lafenicegc.com/wp-content/uploads/pdf/Fenice_Catalogo_Cersaie_2026_MR.pdf .
- Page officielle Calacatta Gold : https://lafenicegc.com/collezioni/calacatta-gold/ (usage FLOOR TILE, coloris Calcatta Gold, format 60 × 120 confirmés).
- Page officielle Imperial Grey : https://lafenicegc.com/collezioni/imperial-grey/ (usage FLOOR TILE, coloris et format 60 × 120 confirmés).
- Index officiel des catalogues : https://lafenicegc.com/cataloghi/ .

Empreinte SHA-256 du PDF local : `8f766d197410b2292770b193cdeac46ff696abf4ebfaf64a03c348c99f936285`.

Pour lever le blocage, il faut des tampons fabricant complets (ou un catalogue technique identifiant clairement chaque face) et la correspondance référence usine/coloris/format/finition. L’audit ne déclenche aucun e-mail fournisseur et n’ajoute aucun service externe.
