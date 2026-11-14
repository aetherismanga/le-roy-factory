# LE ROY FACTORY — Android Google Play

L’application active est dans **mobile/android/**. Elle ouvre le site officiel à sa véritable origine HTTPS via Android Browser Helper / Trusted Web Activity. Accueil, accès particuliers et professionnels, CRM, catalogues, commandes, ateliers et contrôles d’accès restent ceux du site publié. Aucun HTML métier, catalogue privé, prix d’achat, jeton Firebase ou clé serveur n’est embarqué.

Cette architecture conserve les origines, CORS et sessions du site. Le navigateur fournit les sessions Firebase/Google, l’historique, WebGL, les PDF, les sélecteurs de fichiers et les autorisations web. Le conteneur natif n’attribue aucun droit métier.

## Identité et périmètre

- Package conservé : **fr.leroyfactory.crm** ; nom : **LE ROY FACTORY**.
- Version 1.0.0, code 2026111401 ; minimum API 24, cible/compilation API 36.
- Logo exact assets/img/logo03lrf.png pour icône, splash système et haut gauche de l’écran natif.
- JDK 21, Gradle 8.14.3 avec checksum officiel, AGP 8.13.1, Android Browser Helper 2.7.4.
- Internet et état du réseau seulement côté Android, plus une permission interne AndroidX de niveau signature. Les autorisations des fonctions web sont gérées par le navigateur.
- Pas de SDK natif Firebase/Google Auth : aucune nouvelle inscription Android Firebase nécessaire pour cette architecture. Le site continue d’utiliser son application Firebase web. Les connexions effectives doivent être recettées avec des comptes de test.
- Les anciennes sources Capacitor sont historiques. Le script sync-web.mjs refuse désormais leur ancien packaging. Les patchs d’alarmes, adaptations Jarvis et déverrouillages de tarifs ne sont pas inclus dans le build Play.

## Construire

Ouvrir mobile/android dans Android Studio. Installer le SDK platforms;android-36 et build-tools;36.0.0. Définir JAVA_HOME (JDK 21) et ANDROID_HOME.

    # Une fois seulement, pour une nouvelle clé :
    ./mobile/scripts/Initialize-Signing.ps1

    # Livraison : clé existante, tests, lint, AAB et APK :
    ./mobile/scripts/Build-Android.ps1

Le build release échoue sans signature ; il ne se rabat jamais sur une clé debug. Sur un autre système, fournir LRF_SIGNING_STORE_FILE, LRF_SIGNING_STORE_PASSWORD, LRF_SIGNING_KEY_ALIAS et LRF_SIGNING_KEY_PASSWORD depuis un coffre externe, puis lancer le wrapper Gradle avec testDebugUnitTest lintRelease bundleRelease assembleRelease.

Ne jamais mettre les mots de passe dans Git, les paramètres de ligne de commande ou les journaux. Les livrables sont dans mobile/release-output/, ignoré par Git. Le script Windows produit aussi le certificat public et les SHA-256. Il normalise l’ordre des entrées JAR pour une vérification cohérente de l’AAB. Les avertissements de certificat autosigné et non horodaté sont attendus pour une signature Android. Valider avec bundletool et apksigner.

## Clé pérenne et sauvegarde

Coffre par défaut : **%LOCALAPPDATA%/LE ROY FACTORY/AndroidSigning**, hors du dépôt. Il contient lrf-upload.p12 (RSA 4096, validité 10 000 jours), le certificat public, les métadonnées et un mot de passe chiffré par Windows DPAPI pour l’utilisateur courant. L’ACL limite l’accès à cet utilisateur. Aucun secret n’est envoyé à GitHub.

DPAPI dépend du profil Windows : ce coffre seul n’est pas une sauvegarde portable. Avant changement de PC/profil :

    $recovery = Read-Host 'Phrase secrète de sauvegarde (20 caractères minimum)' -AsSecureString
    ./mobile/scripts/Export-SigningBackup.ps1 -Destination 'X:/Coffre-LRF/lrf-upload-recovery.p12' -RecoveryPassword $recovery

Conserver le fichier chiffré sur un support indépendant et la phrase secrète dans un gestionnaire de mots de passe séparé. Le script vérifie la réouverture du fichier exporté et refuse l’écrasement. Le propriétaire doit confirmer cette sauvegarde externe : elle n’est pas annoncée comme effectuée.

Avec Play App Signing, la clé créée peut servir de **clé d’importation**. La clé de signature de distribution Google peut être différente. Si le package existe déjà dans Play Console, vérifier son certificat d’importation et son code de version avant toute soumission.

## Association de domaine — non publiée

Le 14 novembre 2026, https://leroyfactory.fr/.well-known/assetlinks.json répond 404. L’application utilise donc la Custom Tab sécurisée avec barre d’adresse. Aucune vérification de domaine n’est désactivée.

Récupérer dans Play App Signing l’empreinte SHA-256 du certificat **de signature de l’application**, puis préparer localement :

    cd mobile
    node scripts/prepare-assetlinks.mjs EMPREINTE_SHA256_COMPLETE release-output/domain-association/assetlinks.play.json

Après autorisation explicite, servir ce fichier JSON en réponse 200 sans redirection à /.well-known/assetlinks.json sur le domaine principal et, pour le plein écran multi-origines :

- https://studio-one-beta-test-v2.vercel.app
- https://randal-catalogue-general-3d.vercel.app

Préserver les associations préexistantes. Aucun site ni atelier n’est modifié/déployé dans ce lot. L’APK installé directement utilise le certificat d’importation, qui ne remplace pas celui de distribution Play. Google et les fabricants tiers restent des origines externes visibles dans le navigateur.

## QA et livraison

Les scripts qa-public-android.cjs et qa-native.cjs utilisent Playwright 1.55 installé à la racine du monorepo (npm ci --ignore-scripts). La compilation Android ne dépend pas de Node.

Le premier contrôle les pages publiques sur Chrome Android en bloquant toute requête autre que GET/HEAD/OPTIONS. Le second teste l’APK signé, le retour, le mode hors connexion et la reprise ; il exige un émulateur dédié. Les preuves sont dans release-output/qa/.

La CI de PR exécute les contrôles et produit une APK debug, sans clé release ni déploiement. La fiche est dans play-store/ et le rapport dans TEST-REPORT.md.

La recette authentifiée et les mesures GPU sur téléphone réel restent à faire avec comptes dédiés. Aucune commande, suppression, modification CRM, configuration Firebase ou changement de rôle en production n’est autorisé par ces scripts.

Références : [TWA](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start), [origines multiples](https://developer.chrome.com/docs/android/trusted-web-activity/multi-origin), [OAuth Google](https://developers.google.com/identity/protocols/oauth2/policies), [cible Android Play](https://support.google.com/googleplay/android-developer/answer/11926878).
