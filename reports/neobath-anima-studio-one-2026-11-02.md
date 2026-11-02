# Neobath Anima — adaptation du configurateur Studio One

## Implémentation active

La variante reprend les véritables entrées `studio-one/src/commerce/home.js` et
`studio-one/src/app.js`, leurs gabarits, feuilles de style, gestionnaire de projets
et moteur 3D. Les sources Randal et partagées restent inchangées. Le build Anima
applique des adaptations contrôlées aux données, modèles et références fabricant.
Le manifeste conserve les empreintes des sources réellement utilisées.

L’ancienne interface autonome n’est plus servie. Ses projets restent conservés
dans leur espace historique ; aucune migration automatique n’est annoncée.

## Données et visuels

- 257 articles du catalogue Anima, 42 modules, façades Pura et Ribelle, six finitions.
- 155 images WebP ; photos sources disponibles pour chaque choix de meuble,
  plan, vasque et miroir. Les 16 compositions disposent de photographies natives
  de 1243 ou 2485 pixels ; aucune miniature n’est artificiellement agrandie.
- Les vues isolées conservent la résolution réellement disponible dans le PDF.
  Certaines vasques utilisent une photographie de famille explicitement documentée.
- Rovere Alba : fil horizontal en façade, vertical sur les joues ; Ribelle :
  cannelures géométriques verticales. Les six échantillons proviennent du fabricant.
- Dimensions extérieures et références fabricant contrôlées. Les courbes intérieures
  des vasques sont reconstruites à partir des photographies, sans prétendre disposer
  des fichiers CAO industriels.
- Les plans continus de 140/160 cm reposent sur plusieurs caissons de dimensions
  réelles ; leur tarif est compté une seule fois.
- Prix publics HT convertis en TTC. Deux références ambiguës et cinq variantes
  sans prix documenté restent signalées, sans valeur inventée.

## Accès et projets

Le serveur vérifie l’identité Firebase et la révocation du jeton pour chaque
livraison de l’application. Seules les identités Jérôme et Coryne sont autorisées.
Les huit ressources privées sont vérifiées par SHA-256 et livrées sans cache.
Les bundles gzip restent sous `functions/`, exclu de Pages et du build public.

Les projets Studio One Anima utilisent une collection partagée séparée. Le serveur
contrôle le format, les références, les révisions et les suppressions. Les tests
d’envoi utilisent un transport simulé : aucun projet ni commande n’a été envoyé
pendant les contrôles.

## Vérification

Le navigateur a parcouru le modèle Pura, les dimensions et finitions, les plans et
vasques, les colonnes, les miroirs, le récapitulatif et le transfert vers l’atelier.
Pura 80 APUR-PL8052 + TK80 blanc brillant : 681,60 + 240,00 = 921,60 € TTC.
La photo TK80 est chargée et visible. La sauvegarde avec le formulaire Studio One
est confirmée sur le transport de test. Le format mobile 390 × 844 affiche les
cartes et permet de sélectionner Ribelle H26 avec les six finitions.

Limite : WebGL est désactivé dans le navigateur de contrôle. La géométrie, les
animations et dimensions sont testées par code ; le rendu 3D matériel n’a pas pu
être validé visuellement dans cet environnement. L’atelier affiche son message
WebGL explicite. La session Firebase réelle des deux agents n’a pas été ouverte
dans le navigateur de test ; les accès autorisés/refusés sont vérifiés par tests.

Les tests couvrent les 42 modules, les plans et vasques compatibles, les projets,
les contrôles Studio One conservés, la provenance, les tarifs et les accès. Les
contrôles du noyau partagé et de non-régression PLAN & POSE/tarifs sont réussis.

Contrôle consolidé final : 100 tests réussis. Les vrais handlers de sélection de
plans/couleurs sont exécutés sur 128 modes et 247 variantes, avec sauvegarde
stricte, lien de reprise et prix TTC source exact. Le paquet déployable est aussi
chargé depuis ses seuls bundles gzip et vérifié par le manifeste des huit fichiers.
