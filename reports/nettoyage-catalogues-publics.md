# Nettoyage des catalogues publics

Les 27 autres PDF publics déjà copiés dans Firebase sont retirés du dossier actuel de GitHub : **571 782 128 octets**. Avec les sept VIEW retirés précédemment, les 34 catalogues représentent **625 530 416 octets**. Les petites pages de compatibilité conservent les anciens chemins pour les favoris et liens partagés.

Les 27 copies sont contrôlées par taille, SHA256 et lecture de leur première page. Les 34 définitions de redirection sont vérifiées (JavaScript, meta refresh et lien de secours). Huit tests vérifient notamment le refus d’un téléchargement corrompu, le contrôle du cache et la conservation des sources locales privées.

Les outils de lecture de PDF récupèrent leurs sources migrées dans un cache temporaire en vérifiant l’empreinte du manifeste. Les tarifs privés et les règles d’accès ne sont pas modifiés.

## Générer de nouveaux PDF

Les cinq workflows de génération de PDF concernés (ELIOS général, ELIOS secondaires, KOIBATH, sections La Fenice, téléchargement UPTREND) restent disponibles par lancement manuel dans GitHub Actions. Ils enregistrent leurs résultats comme artefacts et ne réintroduisent plus les PDF binaires dans Git. Ces artefacts ont la durée de conservation configurée par GitHub Actions : ils doivent être récupérés pour une conservation durable. Leur publication dans Firebase, ainsi que la mise à jour des URL versionnées du site, sont des opérations distinctes ; elles ne sont pas automatiques. Les lecteurs du site continuent d’utiliser les copies validées déjà publiées.

Les scripts CLI prennent désormais en charge les entrées migrées via `tools/public_pdf_source.py`. Pour générer un nouveau PDF en ligne de commande, choisir un chemin de sortie temporaire hors des anciens dossiers de compatibilité `assets/pdf/nom.pdf/`.

## Espace réellement libéré

Ce lot réduit le contenu de la version actuelle et des nouvelles archives de cette version. **Il ne purge pas les anciens objets Git.** Les copies des anciens commits et branches restent présentes tant qu’un nettoyage d’historique distinct n’est pas validé et appliqué. Aucun historique n’est réécrit ici. Les sauvegardes avant et après migration restent conservées.

Les anciens liens sont préservés pour la navigation dans un navigateur. Un client HTTP qui attend directement les octets du PDF, sans interpréter une redirection HTML, doit employer son URL Firebase. Les données clients Firestore, comptes utilisateurs et parcours CRM connectés ne font pas partie de ces tests.
