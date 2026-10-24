# LE ROY FACTORY — règles permanentes de modification

Ces règles s'appliquent à toute nouvelle page, tout nouveau module, tout correctif et toute refonte du site ou du CRM.

## Interdiction absolue des motifs floraux

- Ne jamais utiliser de fleurs, motifs floraux, cadres fleuris, fonds fleuris ou illustrations florales dans l'interface LE ROY FACTORY.
- Ne jamais recréer, restaurer ou réintroduire les anciens assets `assets/img/bandeau01.png` et `assets/img/bandeau02.png`.
- Ne jamais utiliser un ancien décor floral comme fond de `header`, `footer`, `.crm-topbar`, carte, bannière ou écran de module.
- Pour les bandeaux et surfaces décoratives, privilégier un design LRF sobre et premium : crème, anthracite/noir, blanc, doré, avec dégradés ou textures non florales.
- Si une ancienne règle CSS ou une ancienne page référence encore un décor floral, la supprimer ou la remplacer par une solution non florale lors de sa prochaine modification.

Cette règle ne doit être contournée que si Jérôme demande explicitement, dans une nouvelle instruction, de réintroduire un élément floral précis.

## Sources actives de la suite de configurateurs

Depuis la livraison du 24 octobre 2026, les trois applications sont regroupées
sur `main` sans fusion de leurs interfaces :

- PLAN & POSE : `assets/js/lrf-plan-pose/`, page `lrf-plan-pose.html`.
- RANDAL Studio One : `studio-one/`.
- RANDAL Catalogue Général : `randal-general/`.
- Calculs, interactions et catalogues communs : `shared/lrf-3d/`.
- Services serveur des tarifs agents : `shared/lrf-server/`.

L'ancienne branche `feature/studio-one-beta-v2-commerce-accueil` et les dossiers
`review-studio-source` sont des références historiques, pas les sources à
publier. Les wrappers `src/` des ateliers gardent les anciens imports ; modifier
l'implémentation commune plutôt que recréer des copies divergentes. Les meubles,
façades et règles commerciales propres à chaque atelier restent spécifiques.

Les catalogues fabricants et commerciaux canoniques sont les deux JSON de
`shared/lrf-3d/`. Ne pas réintroduire des copies `src/*-surfaces.json`. Préserver
les SKU, formats, finitions, boîtages et originaux HD ; un profil léger ne doit
pas dégrader les exports HD. Ne pas remplacer un coloris inconnu par le premier.

Le domaine principal est servi par GitHub Pages avec les exclusions
`_config.yml`. Les deux ateliers sont sur Vercel, racines `studio-one` et
`randal-general`, avec accès aux sources du parent. Les clés restent des Secrets
Vercel. Aucune grille d'achat en clair dans le client, le dépôt ou un export.

Les publications Vercel Git automatiques sont désactivées. Suivre `RELEASE.md`,
construire les workspaces avant leurs QA, vérifier le noyau et PLAN & POSE, puis
publier uniquement les applications concernées par le lot testé. Les tests
Playwright 1.55 utilisent Ubuntu 24.04, pas `ubuntu-latest` devenu incompatible.
