# Réduction du tag historique La Fenice — 19 octobre 2026

L’ancienne référence `fenice-general-2026-2027` retenait encore une grande partie des fichiers déjà migrés vers Firebase. Elle a été allégée en conservant son nom et tous les fichiers autres que les chemins de PDF et médias déjà traités.

## Mesure réelle

| Étape | Paquets d’une nouvelle copie Git ordinaire |
| --- | ---: |
| Avant les nettoyages | 906 209 494 octets, environ 906 Mo |
| Après les images et vidéos | 643 768 769 octets, environ 644 Mo |
| Après cette étape | **227 077 297 octets, environ 227 Mo** |

Cette étape retire environ **417 Mo supplémentaires** du téléchargement d’un nouveau clone. La baisse cumulée mesurée est d’environ **679 Mo**, soit **75 %** par rapport au départ. Les valeurs portent sur les paquets Git d’un clone standard avec les 120 branches et le tag ; elles ne représentent pas le stockage total facturé ou affiché par GitHub.

Le compteur de l’API GitHub indiquait encore 884 421 Kio lors du contrôle. Les références des anciennes demandes de modification, gérées par GitHub, restent présentes ; le compteur peut donc différer du téléchargement Git ordinaire mesuré. Aucune suppression de demande de modification ou de référence gérée par GitHub n’a été effectuée.

## Conservation vérifiée

- Le tag passe de `6acc26cbedfe3056d32615e436a705acdd4eba03` à `5c5d4e69d37ac81ab548cf29c567d821d9ffbb9d`.
- 653 fichiers migrés sont absents de l’arbre final du tag. Le filtre porte sur les 922 chemins exacts des étapes précédentes, y compris leur historique. Tous les autres fichiers du tag conservent leur mode et leur identifiant de contenu.
- Les 120 branches conservent leurs identifiants pendant la réécriture du tag. Les scripts applicatifs, données, tarifs, PDF restants, modèles 3D et travail VIEW sont inchangés.
- Le PDF complet de la publication La Fenice reste disponible : même publication, même fichier de 198 079 872 octets et même identifiant de pièce jointe. Son téléchargement répond avec HTTP 200.
- Un portrait Coryne historique dépendait d’une ancienne adresse GitHub liée à l’historique. Une copie de compatibilité de **6 838 octets**, strictement identique, est conservée dans `assets/compat/corynelogo-20260903.png`. Seule son adresse dans `assets/css/layout.css` change. L’image publiée et la feuille de style ont été vérifiées avant d’alléger le tag. Aucune image n’a été retravaillée ou recompressée.
- Aucune donnée, règle ou configuration de facturation Firebase n’est modifiée.

La publication GitHub Pages a réussi, l’accueil et ses médias ont été vérifiés dans le navigateur. Le nouveau dépôt a passé `git fsck --full`. Les tests des deux configurateurs sur ordinateur/mobile, effectués à l’étape précédente, ne sont pas relancés : leur code, leurs textures Firebase et leurs modèles sont inchangés. Les parcours CRM authentifiés et applications natives ne font pas l’objet d’une nouvelle validation.

## Sauvegarde avant l’envoi

L’historique complet de l’ancien tag a été sauvegardé dans un bundle Git, vérifié, puis déposé avant l’envoi forcé. Le déplacement du tag utilise une vérification de son ancien identifiant et une transaction atomique. Tous les identifiants distants ont été contrôlés après l’opération.

La copie supplémentaire `original-catalogue-tag-before-compaction` est disponible jusqu’au **26 octobre 2026 à 01:37 UTC** :
https://github.com/aetherismanga/le-roy-factory/actions/runs/39186138897

Les sauvegardes complètes déjà téléchargées sur le PC sont conservées. Les anciennes copies de travail doivent être remplacées par un nouveau clone pour obtenir le dépôt allégé ; conserver les archives et toute modification locale non publiée.
