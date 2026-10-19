# Nettoyage de l’historique des catalogues publics — 19 octobre 2026

La réécriture autorisée a été appliquée et vérifiée sur les 120 branches de `aetherismanga/le-roy-factory`. Elle retire uniquement les 34 chemins exacts de PDF déjà migrés vers Firebase. Les répertoires de redirection `nom.pdf/index.html` sont conservés.

## Résultat vérifié

- Les fichiers actuels de `main` sont identiques avant et après la réécriture (arbre `26b726563cc04ffed90f66935c25674345708072`). L’outillage de cette opération a été ajouté avant la réécriture ; le présent rapport est ajouté ensuite.
- Sur chacune des 120 branches, tous les fichiers hors des 34 chemins autorisés ont le même mode et le même identifiant de contenu. Le travail de `work/view-phase2b` est conservé.
- Une nouvelle copie Git ordinaire, avec branches et tag, a été téléchargée après l’opération : son pack contient **701 333 196 octets**, soit environ **701 Mo**. L’ordre de grandeur avant nettoyage était **906 Mo**. La comparaison locale de paquets construits avec les mêmes paramètres mesure **205 399 546 octets** économisés, environ **205 Mo**.
- Les 34 pages de redirection du site et les tailles des 34 PDF Firebase ont été vérifiées en ligne. L’intégrité du nouveau dépôt a été contrôlée avec `git fsck --full`.
- Aucune règle Firebase, donnée Firestore, donnée Auth ou ressource des autres dépôts n’a été modifiée pendant cette opération.

## Pourquoi le compteur GitHub peut rester élevé

La simulation qui réécrivait toutes les références locales indiquait un potentiel d’environ 502 Mo. L’application distante porte sur les 120 branches autorisées. Le tag `fenice-general-2026-2027` est conservé inchangé et retient encore une partie de l’ancien historique. Les références des anciennes demandes de modification, gérées par GitHub, sont également conservées. Le compteur du dépôt n’est donc pas une mesure immédiate du nouveau téléchargement Git ; il indiquait encore 884 421 Kio lors du contrôle.

## Sauvegardes et exécution

Les sauvegardes antérieures téléchargées sur le PC ne sont pas modifiées. Avant tout envoi forcé, une sauvegarde Git complète a été créée, validée et déposée dans l’exécution GitHub Actions. L’archive `original-history-before-pdf-compaction` est disponible jusqu’au **26 octobre 2026 à 00:49 UTC**. C’est une copie temporaire supplémentaire, distincte des archives conservées sur le PC.

Exécution et archives : https://github.com/aetherismanga/le-roy-factory/actions/runs/39182429264

L’envoi des 120 branches a utilisé une transaction atomique et une vérification de chaque ancien identifiant de branche (`--force-with-lease`). Les identifiants distants après envoi correspondent au plan vérifié. Le fichier JSON associé conserve les correspondances avant/après et les mesures.

Les anciennes copies de travail devront être remplacées par un nouveau clone pour repartir de l’historique allégé. Conserver séparément toute modification locale non publiée avant de remplacer une copie de travail.
