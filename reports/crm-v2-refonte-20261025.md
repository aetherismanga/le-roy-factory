# CRM LE ROY FACTORY V2 — proposition de test

Branche : `work/crm-v2-refonte-professionnelle-20261025` ; proposition en brouillon : https://github.com/aetherismanga/le-roy-factory/pull/141 . Ne pas fusionner ou publier en production.

## Présentation et fonctionnalités

L’interface reprend une identité plus affirmée : émeraude, touches ambrées, indicateurs colorés et cartes blanches. Le bandeau personnel de l’accueil affiche le planning et le portrait de l’agent. Le logo LRF original reste inchangé ; sa copie mobile est limitée à 40 × 40 px, y compris face aux anciens styles injectés après le chargement. La barre supérieure mesure 61 px hors zone de sécurité iOS.

Les portraits originaux Jérôme/Coryne sont restaurés, sélectionnés depuis la session authentifiée. Les dérivés locaux 256 px servent à l’interface ; les images ne sont pas recréées. Le clic sur le portrait ouvre le lecteur radio existant avec ses cinq stations et le réglage du volume. La radio ne démarre jamais automatiquement. Elle reste accessible au clavier, et Échap ferme le panneau.

Le bonjour quotidien par UID et date locale conserve ses 70 phrases. La navigation mobile garde Accueil, Clients, Carte, Tournées et Menu. Les outils ouverts directement disposent de la même navigation. Les liens publics Catalogues/Fabricants sont retirés ; les fabricants et leurs associations internes restent accessibles. Les titres devenus blancs sur fond clair à cause d’un ancien style sont corrigés dans toutes les rubriques.

Les 20 pages et leurs fonctions métiers sont conservées. Les sauvegardes transactionnelles de la PR 121 protègent les identifiants exacts, codes LRF et associations. La fiche client conserve les raccourcis téléphone, mail, GPS, rendez-vous, compte-rendu et partenaires. La carte filtre les véritables marqueurs par département et fabricant/partenaire. Le nettoyage automatique d’un code LRF dans les statistiques est désactivé. Les imports des statistiques depuis un Blob et l’erreur de guillemets du module Documents usines sont également corrigés.

## Prévisualisation isolée

Construire avec `npm run build:crm:preview`, puis déployer **uniquement** `crm-preview/`. Aucun backend, configurateur, catalogue, tarif ou texture n’entre dans ce paquet. Firebase réel est remplacé par un adaptateur local ; fiches, historique, statistiques et tournées sont fictifs. Les modifications de test restent dans le navigateur.

Les protections combinent liste de pages autorisées, absence du SDK Firebase réel, garde réseau et CSP `connect-src 'self'`. Mails, Calendar, téléversements et appels API externes restent bloqués. Seuls les médias radio existants et la redirection Fun Radio vérifiée vers `streaming-ice.audiomeans.fr` sont ajoutés à `media-src` ; cela n’autorise aucun appel Firebase ou envoi. Le bandeau test est compact et permet de choisir les deux comptes fictifs.

La protection SSO Vercel reste activée. Le lien courant de prévisualisation est fourni dans la PR et directement à Jérôme par un partage temporaire ; aucun domaine de production n’est assigné.

## Vérifications

- **133 tests unitaires réussis**, dont identité authentifiée, affichage quotidien, transactions et conflits, relations, codes, documents, exports, carte, portraits, radio sans lecture automatique et isolation.
- **695 contrôles navigateur directs réussis**, aucune exception JavaScript : 20 pages ouvertes directement, sans iframe, à 320, 360, 390, 430, 844 pixels en paysage et 1366 pixels.
- Logo 40 × 40 px, barre 61 px, titres visibles, absence de débordement horizontal, navigation accessible et portraits correspondants vérifiés dans la matrice.
- Fiche : partenaires conservés et panneau Infos effectivement masqué quand Partenaires est choisi. Carte : six marqueurs, deux après filtre Hérault, deux avec ELIOS. Tournée fictive native : deux visites, 77 km, deux identifiants clients exacts.
- Graphe de sortie : 101 modules analysés, 80 liés sans erreur. Les flux radio existants répondent HTTP 200 au contrôle des en-têtes ; le contrôle Chromium local ne confirme pas la lecture sonore BFM (`net::ERR_EMPTY_RESPONSE`). Le panneau et la demande volontaire du bon flux sont vérifiés.

Résultats détaillés : `reports/crm-v2/vivant-browser-results.json`. Scénario reproductible : `tests/crm-v2/browser-vivant.cjs`, instructions dans `tests/crm-v2/README.md`. Captures sans iframe dans `reports/crm-v2/captures/*vivant.png`.

## Limites et validation restante

Il s’agit d’émulation de tailles sous Chromium, pas de tests sur appareils physiques Android/iPhone ou Safari. Le clavier et le GPS matériels, l’authentification réelle, les règles Firestore effectivement déployées, les services de mails/Calendar/fichiers, les calculs d’itinéraires externes et la lecture audio sur téléphone restent à valider dans un environnement de recette approprié. Les logos de treize fabricants ne sont pas disponibles dans les sources locales du paquet ; leurs noms et associations sont conservés, les images manquantes ne montrent plus de pictogramme cassé.

Aucune donnée réelle, règle Firebase, fonction serveur, branche main ou publication du domaine officiel n’est modifiée. Les configurateurs, catalogues, textures et tarifs restent hors du périmètre des modifications.

## Retour arrière

La production conserve sa version actuelle : aucune restauration de données n’est nécessaire. Retirer ou révoquer le partage de la prévisualisation pour interrompre le test. La clé locale `lrf:crm-v2:fictional-store:v1` ne concerne que les données fictives de son origine ; ne pas effacer le stockage du site officiel. Conserver la branche sans la fusionner. Toute future mise en production exige une autorisation explicite et une nouvelle validation contre le main alors courant.

## Vérification de la prévisualisation hébergée

Déploiement de test READY : `dpl_6TwZhXf4hMranDh3zq8RSk97tsX3`, commit applicatif `c298d55ccb859271df90e786790f3197f71b3183`. URL : https://le-roy-factory-jb1b456wv-hugol-trading.vercel.app/dashboard.html . Les contrôles GitHub CRM et suite ont réussi.

Vérification complémentaire dans Cloud Chrome : le portrait ouvre les cinq radios ; un clic volontaire sur BFM lance la lecture avec `readyState=4`, `paused=false`, aucune erreur média. Pause et fermeture du panneau vérifiées, lecture arrêtée après le contrôle. Cette preuve complète la limitation réseau du navigateur Chromium local, sans constituer un test matériel iPhone/Android.
