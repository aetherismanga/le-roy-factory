# Pages publiques — chargement sur PC

## Constats vérifiés

- L’accueil demandait un fond clair PNG de 2 450 508 octets et préchargeait le fond sombre de 2 324 476 octets, même sans changement de mode. Quatre coins décoratifs totalisaient encore 3 611 291 octets. Les téléchargements ont été observés dans Chromium sur le site publié.
- Sélections utilisait un fond de 2 673 239 octets, 48 scripts statiques, puis un groupe Elios de 16 scripts chargé séquentiellement au démarrage sur PC. Certains modules constituent des données nécessaires : le pont de prix reste chargé avant le contrôleur de produits.
- `base.css` cachait le corps public pendant l’initialisation du thème, avec une animation de secours à 1,2 seconde. Cinq feuilles du thème étaient découvertes tardivement par JavaScript.
- La recherche globale contenait deux séquences littérales `\n` entre instructions, invalides en JavaScript. Une apostrophe non échappée dans les données Biopietra invalidait le script intégré de Catalogues. Ces erreurs ont été reproduites par le navigateur et par Acorn.
- Les rafraîchissements de la barre PC se cumulaient sur les événements de défilement, de roue, de redimensionnement et de mutation.

## Correctif préparé

- Images WebP adaptées, originaux conservés. Fond clair PC : 110 216 octets ; mobile : 188 426. Fonds sombres : 288 748 et 254 054. Fond Sélections : 311 052. Le manifeste décrit les dimensions et recadrages.
- Les anciens coins décoratifs ne sont plus chargés. Les recadrages des fonds clairs et les signatures vectorielles existantes respectent la règle permanente sans motifs floraux.
- Le second fond se charge lors du changement de mode. Le thème essentiel est déclaré dans le HTML des trois pages, avec ses classes initiales ; le contenu reste visible pendant les améliorations JavaScript.
- Les galeries additionnelles sont demandées à l’utilisation sur PC aussi. Le lexique reste indépendant de `window.load`, et les activations au clavier et au pointeur partagent un chargement ordonné.
- Les erreurs de syntaxe sont corrigées ; les événements de défilement partagent un seul rafraîchissement par image.

## Validation et limites

Les neuf tests ciblés réussis vérifient la syntaxe des trois pages et de leurs scripts, les prix disponibles avant le contrôleur, l’ordre des modules, l’absence de chargement de galeries par le planificateur seul et les interactions de la barre PC. Les sept contrôles serveur d’accès aux achats passent également. Le parcours Android Chromium valide neuf univers, deux allers-retours entre fabricants, les observateurs au repos et la reprise des visuels Piscine après un échec. Il attend la fin effective des modules demandés avant de mesurer le repos. La construction du site public réussit. Les essais Chromium des pages locales gardent leurs vrais HTML, CSS, scripts et nouveaux médias ; les services et images externes sont remplacés par des réponses de test, sans accès aux données client.

Les durées du site publié ont été observées depuis un environnement distant avec proxy. Elles ne mesurent pas la fibre ou les performances du PC du client ; aucun pourcentage de gain de temps global n’est annoncé. Les images promotionnelles et certains logos de fabricants restent des ressources externes lourdes. Le moteur Reviglass de recherche de photos par essais d’URL mérite une correction distincte si les lenteurs concernent ces références.

Ce lot concerne les pages publiques. Aucune modification des configurateurs 3D, des règles d’accès ou des données commerciales.

Safari/WebKit et le PC Windows du client restent à valider ; aucune publication n’a été effectuée pour ce lot.
