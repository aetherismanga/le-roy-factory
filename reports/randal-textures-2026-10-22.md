# RANDAL — textures et performances · 22 octobre 2026

> Actualisation du 24 octobre 2026 : les sept échantillons manquants ont été reçus et intégrés. Alba reste identique au rendu approuvé. Voir [le rapport des huit finitions](randal-finishes-20261024.md). Le compte rendu ci-dessous décrit la situation historique du 22 octobre.

## Livré

Les moteurs, modèles paramétriques, dimensions et formats de projets sont conservés. Les modes existants Léger, Standard et Ultra HD, ainsi que l’adaptation automatique, sont réutilisés.

- Chargement des finitions et revêtements actifs à la demande.
- Ressources adaptées au niveau de travail et libération des textures devenues inutiles.
- Export PNG HD indépendant du niveau de travail : préparation des matières actives en définition maximale disponible, compilation, rendu, puis restauration des textures, de la caméra, du mode et des contrôles. Un échec annule la capture et restaure le travail.
- Impression du récapitulatif d’accueil : même préparation HD et attente du décodage de l’image avant impression.
- Les petites miniatures des cartes de projets restent adaptées au stockage.

## Ressources fabricant

Les douze liens WeTransfer reçus le 22 octobre fonctionnent ; aucun lien expiré lors du contrôle. Expiration annoncée : 25 octobre 2026. Les originaux ont été téléchargés et contrôlés par CRC et SHA-256.

Inventaire : 1 106 fichiers (977 PNG, 32 PSD, 8 JPG, 4 JPEG, 1 TIFF, 83 Thumbs.db et 1 fichier technique .smbdelete). Aucun modèle 3D. Les images et PSD de mise en scène ne sont pas utilisés comme textures planes.

Le meuble pilote est STUDIO ONE deux tiroirs de 80 cm. Les huit photographies fabricant existent. Une seule nouvelle texture plane est récupérable via l’accès Gmail disponible : Serenade_alba_acabado.jpg (1 292 × 2 800 pixels).

Serenade Alba utilise désormais cette source dans STUDIO ONE et dans les finitions du Général qui réutilisaient déjà explicitement la même source Serenade Alba. Variantes : Léger 118 × 256 (2 738 octets), Standard 473 × 1 024 (90 714 octets), HD 945 × 2 048 (662 954 octets). Le sélecteur reprend le même échantillon. Le grain reste horizontal en façade et vertical sur les joues.

Les sept autres nouvelles pièces jointes sont signalées comme non prises en charge par l’accès Gmail (application/octet-stream). Leurs finitions existantes sont conservées : Roble Amazona, Nogal Valentina, White Bolero, Azul Acero, Gris Tórtora, Biscuit et Muted Green. Elles ne sont pas présentées comme nouvellement validées à partir des échantillons reçus. Aucun coloris manquant n’est inventé.

Les dimensions physiques de l’échantillon, la brillance et la rugosité mesurées n’étaient pas fournies. Le rapport d’image est conservé ; la conformité colorimétrique et l’échelle physique exacte nécessitent les données fabricant ou un échantillon mesuré. Les caractéristiques de surface existantes sont maintenues.

## Vérifications

- STUDIO ONE : build et 24 scripts de contrôle réussis.
- Général : build et contrôles catalogue, matériaux, géométrie, tarifs, affichage et capture.
- Navigateur Chromium/WebGL : ordinateur 1 440 × 900 et smartphone simulé 390 × 844.
- Huit choix de finition du pilote STUDIO ONE, trois modes de qualité et retour au mode automatique.
- Exports atelier depuis chaque qualité : 1 920 × 1 539 sur ordinateur ; 1 920 × 3 318 sur smartphone simulé.
- Conservation des dimensions, finitions et contenu du projet ; export et réouverture JSON.
- Panne de chargement HD injectée : capture refusée, mode Léger et projet restaurés.
- Accueil : matières communes au sélecteur et au modèle, capture avant impression, arrêt en cas d’échec d’encodage.

Ces essais utilisent un GPU logiciel de test. Ils ne mesurent pas les performances d’un téléphone physique. La sauvegarde cloud sur un compte client connecté n’a pas été testée ; les flux d’identification et de synchronisation ne sont pas modifiés.

## Publication constatée

| Configurateur | Adresse publique | Commit du code servi | État Vercel |
| --- | --- | --- | --- |
| STUDIO ONE | https://studio-one-beta-test-v2.vercel.app/ | 4f199e2e7a97333fc1a0269ef8ab214f1e53953e | READY, environnement production |
| Général | https://randal-catalogue-general-3d.vercel.app/ | 4eefabdee2dfa45e7d103893e5534c166ae1c6b8 | READY, build preview publié par affectation de l’adresse habituelle |

La nouvelle compilation production du Général a été refusée par Vercel (402, quota gratuit de 100 déploiements/jour atteint, délai annoncé 24 heures). La promotion API a également été refusée (422). Le build preview déjà prêt et vérifié sert donc l’adresse habituelle du configurateur. Le code des API ne dépend pas de variables applicatives propres à un environnement ; aucun secret ou réglage de compte n’a été modifié.

Contrôle HTTP après publication : les deux adresses répondent 200. Les empreintes des bundles référencés correspondent aux builds locaux testés : Studio 5451e5cd919a, Général 75a0a3a013bc. Le contrôle navigateur distant Studio n’a pas confirmé l’initialisation dans les 90 secondes disponibles : les parcours fonctionnels décrits ci-dessus sont des tests locaux des mêmes bundles, et non une validation distante complète. Aucune entrée d’erreur fonction n’a été retournée pour ces deux déploiements dans la fenêtre contrôlée ; la présence de drains de surveillance n’a pas pu être confirmée.

Les 12 archives originales sont conservées intégralement et sans perte, avec inventaire, empreintes et reconstitution des volumes. La récupération alternative des sept pièces jointes par ouverture de Gmail a été refusée par le contrôle automatique en raison d’une redirection vers workspace.google.com. Les sept fichiers d’échantillons restent nécessaires pour terminer la validation fabricant.
