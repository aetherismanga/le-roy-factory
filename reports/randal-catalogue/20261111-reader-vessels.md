# RANDAL — couverture, logo et vasques à poser

Le lecteur charge désormais la bibliothèque PDF.js et son worker de même version
depuis les ressources LRF existantes. Si la lecture par plages HTTP échoue, il
retente automatiquement une lecture en streaming. Le bouton Réessayer reste
disponible après deux échecs.

Le logo rond officiel est affiché en haut à gauche du catalogue, de l'accueil du
configurateur Général et de son atelier, en conservant ses proportions.

Le parcours guidé recalcule l'implantation quand le plan ou la largeur change.
Une ancienne implantation « double » de Sella/Tampa ne bloque plus le passage à
Neris/Torne sur un meuble de 120 cm, y compris après « Meuble seul ». Les trois
implantations déjà prises en charge pour les vasques à poser sont sélectionnables.

Validation :

- Construction du Général et du site public réussie.
- `npm run check:core` et `npm run check --workspace=randal-general-3d` réussis.
- 10 tests de régression réussis, dont 108 transitions de vasques sur 120 cm et
  1 655 contrôles des prix des vasques et des devis.
- Suites PLAN & POSE / sécurité : 307 réussites, 1 ignoré, 1 échec préexistant.
  Ce dernier est l'attente textuelle `/analyse-clients-lrf\|lrf-plan-pose/` dans
  `agent.html` ; aucun des fichiers de ce contrôle n'est modifié par ce lot.
- Navigateur : couverture et page Harmony rendues, logo visible ; parcours Aruba
  120 cm Azul Acero vers Neris puis Torne et devis final à 1 375,20 € vérifiés.
  L'implantation à droite est conservée dans le récapitulatif.
- WebGL indisponible dans le navigateur distant : aucune validation visuelle du
  rendu mobilier 3D n'est revendiquée. Les tests Node de géométrie des vasques,
  perçages et robinetteries réussissent.

Publication limitée à GitHub Pages et au projet Vercel du Général. Studio One,
Anima, les grilles tarifaires et les protections d'accès ne sont pas modifiés.
