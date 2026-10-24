# RANDAL — huit finitions officielles · 24 octobre 2026

Les sept finitions restantes de STUDIO ONE utilisent les échantillons plats fournis par Jérôme : Roble Amazona, Nogal Valentina, White Bolero, Azul Acero, Gris Tórtora, Biscuit et Muted Green. Serenade Alba conserve exactement les quatre fichiers précédemment approuvés, issus de son original 1 292 × 2 800 ; le nouvel envoi redimensionné ne le remplace pas.

## Préparation

| Finition | Source disponible (px) | Texture maximale (px) | Moyenne sRGB |
| --- | --- | --- | --- |
| Serenade Alba | 1292 × 2800 | 945 × 2048 | `#bfa386` |
| Roble Amazona | 567 × 963 | 567 × 963 | `#af9374` |
| Nogal Valentina | 567 × 1229 | 567 × 1229 | `#77513d` |
| White Bolero | 945 × 2048 | 945 × 2048 | `#f1f0ec` |
| Azul Acero | 945 × 2048 | 945 × 2048 | `#67757e` |
| Gris Tórtora | 567 × 1181 | 567 × 1181 | `#807768` |
| Biscuit | 945 × 2048 | 945 × 2048 | `#ebe2d9` |
| Muted Green | 945 × 2048 | 945 × 2048 | `#918c76` |

Conversion des profils ICC vers sRGB, notamment eciRGB v2 pour Roble Amazona ; orientation EXIF appliquée. Sans profil intégré, Gris Tórtora est interprété en sRGB. Trois budgets : Léger 256 px, Standard 1 024 px et HD 2 048 px de côté maximum, sans agrandissement des sources plus petites. Les rapports d’image et le veinage sont conservés. Les façades Studio ont le fil horizontal et les joues vertical ; le catalogue Général conserve le fil vertical sur les façades rainurées Aruba.

Les miniatures, les couleurs de repli, l’aperçu d’accueil, les caissons, les colonnes et l’atelier partagent les mêmes échantillons. Les réglages existants de rugosité et de brillance sont conservés : aucune mesure physique nouvelle n’a été fournie.

Le catalogue Général applique les nouvelles sources aux 21 finitions explicitement correspondantes : Roble (3), Nogal (5), Biscuit (6), Azul Acero (5), Gris Tórtora (2). White Bolero et Muted Green ne sont pas des finitions déclarées dans ces collections ; les autres blancs et verts gardent leur identité. Les neuf finitions Alba existantes restent inchangées. Les anciens recadrages de photographies de mise en scène sont retirés pour les seules références remplacées ; les rainures et poignées modélisées sont conservées.

Le tarif confirmé du deux tiroirs XL 100 cm avec plan reste 765 €. Les autres prix, modèles, dimensions, projets et les ressources ELIOS / VIEW restent inchangés. Les fichiers du configurateur proviennent des échantillons officiels ; l’aperçu White Bolero créé séparément avec imagegen ne sert pas de texture de production.

## Validation

Les rapports ciblés des deux configurateurs détaillent leurs essais. Le build de revue du site est reproductible et identique au standalone Studio. Les 115 contrôles de parité de calepinage, de préservation des catalogues et de confidentialité des exports passent. Les essais navigateur utilisent Chromium avec GPU logiciel sur ordinateur et smartphone simulé ; ils ne mesurent pas la vitesse d’un téléphone physique.

Sources, dimensions et empreintes : `review-studio/assets/finishes/20261022/sources.json` ; sélection Général : `randal-general/dist/assets/finishes/20261022/sources.json`.


Validation ciblée finale : STUDIO ONE, 264 prix vérifiés, 16 captures HD d’aperçu et 48 combinaisons finition/qualité sur ordinateur et smartphone ; Général, 42 combinaisons d’atelier et deux captures HD 1 920 px, sans erreur JavaScript ni débordement horizontal. Les captures depuis le mode Léger utilisent les textures maximales puis restaurent le mode et le projet. Audit indépendant : Alba identique, 79 actifs protégés Studio et 46 actifs existants Général inchangés, autres références et tarifs préservés.

## État de publication

Code Studio intégré par PR #133, commit de fusion `b26c8eaa829fd8a0e9aa8de3a0e7aad4013ce75e`. La demande de déploiement Vercel production a été refusée avec HTTP 402, code `api-deployments-free-per-day`, limite de 100 déploiements par jour et délai annoncé de 24 heures. Aucune nouvelle version Studio n’est donc encore servie par son alias Vercel habituel ; le déploiement précédent reste en place. Aucun réglage de facturation ou de compte n’a été changé.

Le build de revue Studio joint à cette version est identique au standalone testé. Le catalogue Général est compilable depuis `randal-general` avec `npm ci --ignore-scripts` puis `npm run build`. Les deux projets Vercel devront publier ces versions après renouvellement ou relèvement du quota ; le prix 765 € reste déjà en production.
