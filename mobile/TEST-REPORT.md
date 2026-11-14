# Rapport de livraison Android — LE ROY FACTORY
Date : 14 novembre 2026. Version : 1.0.0 (2026111401). Package : fr.leroyfactory.crm.
Branche : codex/android-play-release-20261114, issue de main e3a99258142cd23431810276fd4ee397e4af3d81.

## Décision de livraison
**AAB et APK signés produits, contrôlés et disponibles pour recette. La publication Google Play n’est pas encore validée.** Les blocages ci-dessous exigent les accès du propriétaire, des comptes de test ou une autorisation de modification technique du site. Aucun déploiement web, Firebase, Vercel ou Play ; aucune commande ni donnée client modifiée.

Travail isolé dans .local-release/android-play, sans reprendre les modifications préexistantes du dossier de travail principal. Le lot contient mobile/ et son workflow Android uniquement. Aucun fichier métier, catalogue, règle commerciale, écran web ou donnée de production modifié.

## Application livrée
Le conteneur Android ouvre le véritable site HTTPS via Android Browser Helper / Trusted Web Activity. Les pages et rôles restent servis par le site, sans copie de ses données ni réécriture des interfaces. Les anciennes injections Capacitor ne participent plus au build. L’application reste dépendante du réseau et du navigateur compatible ; les mises à jour du site restent visibles dans l’application.

Logo officiel strictement identique à assets/img/logo03lrf.png : SHA-256 d7845443a842cb73f26f41b999b878c56d7673ce4c6d01ed93fb28b8b320fada. Écran natif crème/anthracite/doré, icône adaptative, accueil système et écran hors connexion. Aucun autre décor floral ajouté.

SDK cible 36, minimum 24, JDK 21, Gradle 8.14.3, AGP 8.13.1, Android Browser Helper 2.7.4. Release minifiée, ressources réduites, HTTP interdit, sauvegarde native désactivée. Liens entrants limités aux véritables origines HTTPS autorisées ; extras et permissions de fichiers entrants supprimés.

## Résultats constatés
Environnement : émulateur Android 16 / API 36, Chrome 133.0.6943.137 livré avec cette image SDK, écran 1080 × 1920 / 412 pixels CSS, GPU logiciel SwiftShader. Les preuves détaillées se trouvent dans release-output/qa/. Une recette sur Chrome à jour et téléphone physique reste nécessaire.

| Contrôle | Résultat et limite |
|---|---|
| Compilation release AAB + APK | Réussie, signature release obligatoire ; aucune signature debug de secours |
| Tests unitaires de liens entrants | 3 tests réussis, aucun échec : origines, paramètres, URL malformées, taille, schémas et hôtes interdits |
| Android lint release | 0 erreur, 5 avertissements non bloquants, détaillés plus bas |
| AAB | Structure validée par bundletool 1.18.3 et signature vérifiée par jarsigner |
| APK | Signature v2 vérifiée par apksigner, installation et lancement réussis sur API 36 |
| Démarrage natif à froid | 497 ms dans le passage enregistré ; ne mesure pas le chargement complet du site |
| Retour Android | Retour de Catalogues vers Accueil réussi dans la véritable Custom Tab de l’application |
| Hors connexion | Écran natif dédié, bouton Réessayer et reprise réseau réussis |
| Stabilité native | Aucun crash du processus fr.leroyfactory.crm dans la recette native finale |
| Permissions | INTERNET, ACCESS_NETWORK_STATE et permission interne AndroidX de niveau signature ; aucune permission Android dangereuse demandée |
| Pages publiques | 13 routes : HTTP 200, 0 erreur JavaScript observée, 0 débordement horizontal à 412 px |
| Catalogue interactif RANDAL | PDF rendu ; passage Couverture page 1 → Harmony page 3 / 43 et zoom réussis |
| Téléchargement PDF | VIEW_CATALOGO_PHURA_2026.pdf réellement enregistré dans Download par Chrome : 660 876 octets, en-tête PDF vérifié |
| Studio One public | Atelier chargé, scène rendue, caméra Face et Visite 3D fonctionnelles, contexte WebGL présent et non perdu ; 412 / 412 px |
| Firebase / Google | Projet et application Firebase web existante vérifiés en lecture ; origine réelle conservée pour OAuth. Connexion réelle non effectuée |
| Logo / médias | Identité du logo vérifiée par SHA-256 ; icône 512 × 512, visuel 1024 × 500, trois captures APK 1080 × 1920 |

Routes publiques : accueil, carrelage-particuliers.html, carrelage-professionnels.html, tarifs-pro.html, agent.html, dashboard.html (redirigé vers accès agent), catalogues.html, configurateurs.html, studio-one-configurateur.html, lrf-plan-pose.html, neobath-anima-configurateur.html, commande-bilt.html et politique-confidentialite.html.

DOMContentLoaded observé : 193 à 1 742 ms selon la route, avec cache et conditions réseau de cette session. Ce ne sont ni des temps de rendu final ni un benchmark universel. Dans la scène Studio One, 181 callbacks requestAnimationFrame en environ 3 secondes (médiane 16,7 ms), sur GPU logiciel : **ce n’est pas une mesure du débit réel de rendu 3D**. Composition lourde, chauffe, autonomie et mémoire sur téléphone restent à mesurer.

Les tests publics et natifs bloquent les requêtes non GET/HEAD/OPTIONS. Les essais complémentaires Studio One ont autorisé uniquement les actions session et quote en lecture/calcul de son API commerciale, après inspection du gestionnaire ; aucune identification, sauvegarde, commande ni écriture métier. Un premier essai bloquant également ces lectures affichait un refus de compte ; il a été remplacé par la recette autorisant ces lectures, qui rend correctement la scène. Le PDF a été téléchargé par une interaction Android réelle sans interception Playwright.

Les 5 avertissements lint : attribut de retour ignoré avant API 33 ; version Gradle plus récente disponible ; complément fullBackupContent suggéré avant API 31 (allowBackup=false déjà présent) ; icône monochrome absente pour conserver le logo officiel ; image dupliquée entre drawable et mipmap pour l’icône historique. Aucun avertissement n’a été masqué.

## Signature et conservation
Clé d’importation RSA 4096 / SHA-256, certificat valide jusqu’au 1er avril 2054.
Empreinte SHA-256 publique :
50:00:F0:71:BE:33:9C:96:06:05:54:8D:12:F2:2C:1E:78:3B:30:83:47:32:B5:22:BE:BA:D0:8E:F9:F6:05:7A

Coffre : %LOCALAPPDATA%/LE ROY FACTORY/AndroidSigning, hors de tout dépôt Git. Mot de passe aléatoire protégé par DPAPI utilisateur Windows, ACL du coffre limitée à l’utilisateur. Les scripts refusent les destinations situées dans un dépôt et l’écrasement de la clé. Aucun mot de passe ni clé privée dans GitHub ou le ZIP livré ; seul le certificat public y est admissible.

**Sauvegarde indépendante à effectuer par le propriétaire.** DPAPI seul ne protège pas contre la perte du PC/profil. Le script Export-SigningBackup.ps1 permet un export PKCS12 chiffré avec une phrase de récupération choisie et stockée séparément. Ne jamais transmettre cette phrase dans un chat ou un dépôt.

## Blocages avant publication
1. **Association de domaine absente** : /.well-known/assetlinks.json répond 404 sur leroyfactory.fr. Le fallback Custom Tab garde donc la barre d’adresse. Récupérer le certificat de distribution Play App Signing, puis autoriser explicitement la publication de l’association sur le domaine principal et les deux domaines d’ateliers pour le plein écran multi-origines. Le JSON local de sideload concerne seulement le certificat de l’APK ; il ne prouve pas l’association Play.
2. **Play Console** : accès indispensable pour vérifier disponibilité/existence du package, certificat d’importation attendu, code de version, identité éditeur, formulaires et exigences de tests propres au compte. Aucun téléversement effectué.
3. **Comptes de recette** : Google/Firebase, professionnel, agent et partenaire Neobath. Vérifier connexion, consentement OAuth, retour dans l’application, persistance après fermeture, déconnexion et séparation des rôles. Les protections anonymes affichées ne prouvent pas la matrice complète des autorisations.
4. **Parcours privés** : CRM réel, agenda Google, commandes, prix professionnels, projets Anima, calculs et exports privés non validés. Fournir un environnement de test ou des comptes avec données fictives ; toute action métier modifiante reste soumise à autorisation.
5. **Téléphone physique** : recette Android récente et ancien appareil compatible, rotation, clavier, reprise après pression mémoire, changements de réseau, gros projets, exports PDF/HD et permissions web. Minimum API 24 déclaré mais testé à l’exécution uniquement sur API 36.
6. **Fiche et confidentialité** : confirmer identité légale, e-mail support, déclarations de données, cible et distribution. La politique actuelle traite surtout le contact et doit être complétée pour l’application/CRM/Google. Si un parcours permet la création de compte, vérifier les exigences de suppression. Brouillon local fourni, rien publié.
7. **Sauvegarde clé** : confirmer l’export sur un support indépendant avec phrase séparée.

## Recette finale avec le propriétaire
- Installer une version issue de la piste interne Play après autorisation, contrôler certificat et plein écran.
- Se connecter avec chaque rôle de test ; vérifier les accès autorisés et refusés, puis se déconnecter et contrôler l’absence d’accès résiduel.
- Vérifier Google/Firebase et Calendar : consentement, annulation, retour, renouvellement de session.
- Exécuter sur données fictives les parcours CRM, brouillon de commande, devis et exports autorisés.
- Charger un projet représentatif dans chaque configurateur concerné ; contrôler caméra, tactile, finitions, sauvegarde locale et HD.
- Répéter téléchargement PDF, retour, fermeture/réouverture et coupure réseau sur téléphone réel.
- Approuver fiche, confidentialité, données Play et sauvegarde de clé avant toute demande de publication.

## Livrables
release-output/ contient AAB, APK, certificat public, SHA256.json, preuves QA et archive de livraison. play-store/ contient textes français, icône, visuel, captures et dossier de préparation. README.md documente compilation, signature, sauvegarde et association des domaines.

La clé privée, les mots de passe, le PDF fabricant téléchargé pour contrôle et les données client ne font pas partie de l’archive.
