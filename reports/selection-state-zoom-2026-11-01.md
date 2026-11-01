# Sélections : rubrique active et plein écran — 1 novembre 2026

## Corrections

Les rubriques Outillages/Bilt et Sanitaire/UPTREND étaient pilotées par des scripts qui modifiaient le contenu affiché sans mettre à jour la sélection mémorisée. Après un chargement différé ou un événement de session/tarifs, le contrôleur pouvait réafficher l’ancienne usine. Outillages/Bilt, UPTREND et le raccourci Piscine suivent désormais le contrôleur natif. Un clic périmé ne peut plus sélectionner une usine étrangère à la rubrique courante. Les anciens scripts de décoration ne rajoutent plus un second bouton Outillages ou Piscine. Le rendu UPTREND revalide le partenaire actif avant chaque callback ; le fallback Bilt vérifie aussi son contenu.

L’agrandissement artificiel ×2 est supprimé des galeries Petracer’s, Pecchioli, BULBO, Biopietra, La Fenice et VIEW, y compris le double-clic VIEW. Les visuels gardent leur définition native dans le plein écran. Flèches, clavier, vignettes et gestes tactiles sont conservés. Les lecteurs de PDF ne sont pas modifiés.

## Vérification

- 6 tests de régression d’état : Pierre → Outillages, événements tardifs de catalogue/session/tarif, connexion et déconnexion Bilt, retour Bilt, sélection sanitaire Petracer’s/UPTREND, Piscine, contrôles périmés et ancienne URL.
- 64 autres tests sélection/galeries/tactile/tarifs/recherche réussis : 70 tests ciblés au total, aucun échec.
- Contrôle navigateur desktop : Biopietra → Outillages/Bilt → Sanitaire/Petracer’s → UPTREND → Bilt → Piscine. Une seule rubrique active, contenu correspondant et 12 collections piscine.
- Contrôle responsive dans iframe 390 × 844 px avec univers-ios : Outillages/Bilt, retour Sanitaire/Petracer’s, ouverture Venetia et plein écran sans bouton de zoom. Ce contrôle ne vaut pas test sur téléphone physique.
- Construction du site public et protection des tarifs réussies ; syntaxe JS et git diff --check valides.
- Sources des configurateurs 3D, API privées, tarifs et règles commerciales inchangés. Les contrôles complets du noyau/PLAN & POSE/sécurité du lot précédent restent applicables à ces sources identiques.

Les ressources modifiées ont un nouveau paramètre de version sur les pages desktop/iOS et les chargeurs dynamiques.
