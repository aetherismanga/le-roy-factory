# Segmento dans Neobath Anima

Version privée : 20261107-neobath-anima-studio-one-segmento-19

Le build Anima reprend les entrées Studio One et le moteur partagé Segmento : 16 références, 12 motifs et 48 compositions officielles, sols et murs, textures et quantités par référence. Les deux ateliers Randal servent déjà les bundles du lot bfcfae3, contrôlés par leurs empreintes publiques.

Validation Anima : 88 tests réussis (85 existants et 3 régressions Segmento). Les 48 compositions restent cohérentes après export/reprise des sols et murs. Le bundle privé gzip contient les données canoniques. L’accès reste réservé aux jetons Firebase vérifiés de Jérôme et Coryne ; la version est vérifiable par un en-tête non sensible sans révéler l’application à un utilisateur anonyme.

La compilation et la livraison des nouveaux bundles se font uniquement dans le workflow Firebase authentifié. Aucun nouveau bundle privé n’est inclus dans ce commit public.

Empreinte du bundle local vérifié app.js : fd9ce30072fe19d715ce388882106852341290b421690fc5bbdecffaa1e930b8

Le navigateur de QA ne prend pas en charge WebGL 2 ; validation visuelle du rendu GPU indisponible. Aucun changement aux données ou projets utilisateurs.

Le contrôle exhaustif des médias a détecté et remplacé la preview vide S05-D par le crop officiel 740 × 740 px, sans agrandissement. Les tests rejettent dorénavant tout aperçu vide ou invalide et vérifient les empreintes des 32 textures/originaux.
