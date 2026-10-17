# Livraison 2A — ELIOS

Périmètre : revêtements uniquement dans les configurateurs RANDAL et STUDIO ONE existants. VIEW 2B non commencé.

## Catalogue et sources

50 collections référencées, 12 collections activées, 73 coloris sélectionnables : Quercia, Sedimenti, Brooklyn, Creta, Deco, Domus, Glow, Golden Hour, Marechiaro, Shell, Azuli Mood, Dynasty. Les références insuffisamment définies restent désactivées avec « Visuel en préparation ».

`catalogue.json` conserve les références et sources. `official-checks.json` consigne les formats par coloris extraits des pages fabricant et leur empreinte. `texture-integrity.json` décrit chaque fichier livré, sa source officielle, sa taille native et son empreinte SHA-256. Les catalogues PDF référencés proviennent du travail documentaire existant ; les collections activées ont été recoupées avec les pages officielles ELIOS.

Les sources natives utilisables font 1200 × 700 ou 1400 × 700 pixels. Aucune promesse de définition native 2K/4K. Conversion WebP, sans image générée ni modification artificielle des couleurs. Les échantillons sont recadrés selon le format et jamais étirés. Un échantillon unique ne restitue pas toutes les faces/variations d'une fabrication réelle.

Corrections documentaires : formats limités par coloris (notamment Creta Ginepro/Matcha et Brooklyn Almond/Gold). Skultura reste désactivé : ses modules sculpturaux ne doivent pas être assimilés à un carreau 40 × 120. Glow Washington, visuel blanc inexploitable, reste désactivé.

## Rendu et interface

Choix indépendants sol/mur, fabricant, collection, coloris, formats vérifiés, orientation, pose et joints. Textures à l'échelle métrique. Matériaux Three.js, espace sRGB, filtrage anisotrope, mipmaps et relief géométrique des joints. Pas de carte de relief matière fabriquée en l'absence de source. La rugosité est un réglage de visualisation, pas une mesure fabricant. Atlas adaptés à la largeur d'écran, caches bornés et chargement à la demande. Les exports attendent la fin du chargement des textures.

## Vérification

`browser-tests.json` : tests Chromium/SwiftShader en 1440 × 900 et 390 × 900, dans les deux configurateurs. Sélections réelles via interface, proportions métriques, indépendance sol/mur, prix inchangés, ouverture des tiroirs, plein écran, capture PNG, absence de débordement horizontal et d'erreurs JavaScript/shader/texture manquante.

`sample-loading.json` : les 73 coloris ont atteint l'état prêt dans le moteur Three.js.

`protected-files.json` : empreintes des fichiers commerciaux, géométriques et miroirs conservés identiques à la phase 1.

Limites de validation : viewport mobile simulé, pas de mesure de performances sur un téléphone physique. Le résultat est une visualisation 3D utilisant des échantillons officiels, pas une photographie contractuelle. La fidélité finale des teintes dépend aussi de l'écran et de l'éclairage de la scène.

Exécution : `SKIP_SAMPLES=1 node tests/elios-phase2a/browser.cjs` pour les scénarios fonctionnels ; omettre SKIP_SAMPLES pour le balayage des 73 échantillons. Playwright et Chromium sont nécessaires (chemin de navigateur ajustable dans le test).
