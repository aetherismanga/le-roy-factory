# Logo officiel et accès aux tarifs — 27 octobre 2026

Base de travail : main c4b5e0707de3241b5dba340f8f8c16bce9a7d05c.

## Causes et corrections

- L'optimisation publique avait remplacé le monogramme rond par la signature texte. Le remplacement existait aussi dans `base.css` via `content: url(...)`, qui prenait le dessus sur `img.src`. Le logo existant `assets/img/logo03lrf.png` est restauré à la demande explicite de Jérôme, sans restaurer les anciens bandeaux décoratifs. Une priorité inline évite que le CSS ancien en cache remplace encore ses pixels.
- Le tarif intégré imposait `emailVerified === true`, contrairement à la politique des PDF protégés (`functions/auth.js`). Cela verrouillait les comptes agents existants dont le mot de passe était valide sans ce statut. Le navigateur et l'API utilisent désormais la même politique que les PDF : jeton Firebase, compte réel vérifié auprès de Google, UID et email autorisés concordants, expiration et révocation contrôlées. Aucun rôle local ne donne accès aux prix.
- Le chargement attend la restauration Firebase et renouvelle le jeton. Les clients continuent d'utiliser leur jeton opaque et les droits fabricants validés côté serveur. Un message distingue une panne de chargement d'une connexion absente ou refusée, avec un bouton Réessayer.
- Versions des ressources changées pour éviter les anciennes copies du navigateur. Les tarifs restent en mémoire après autorisation et ne sont pas enregistrés dans localStorage.

## Vérifications

- Installation reproductible : `npm ci --ignore-scripts --include=dev`.
- 58 tests ciblés réussis : autorisation client/agent, restauration Firebase, comptes existants sans emailVerified, révocation, déconnexion, absence d'exposition anonyme, reprise après panne, analyse JS des pages et recherche.
- `npm run check:core` : réussi.
- `npm run build:site` : réussi, 1001 fichiers publics et exclusions privées vérifiées.
- `npm run build:general` et `npm run check --workspace=randal-general-3d` : réussis.
- Lot élargi PLAN & POSE / sécurité : 305 réussites sur 306. Le test navigateur `tests/security/legacy-recovery-storage.test.mjs:127` dépasse son délai sur l'ancienne page de récupération. Aucune source de cette fonction n'est modifiée dans ce correctif ; cette vérification reste non concluante.
- Navigateur cloud, prévisualisation locale : logo chargé depuis le fichier officiel avec `content: normal`; prix fictifs Bavaria Stone visibles pour les fixtures Jérôme, Coryne et client LRF autorisé, puis verrouillés après passage visiteur. Les vrais scripts UI et handlers serveur sont exécutés ; Google/Firebase sont remplacés uniquement dans le harnais QA temporaire par des comptes et des montants fictifs. Aucun compte réel utilisateur n'a été utilisé pour cette QA.

Publication prévue : GitHub Pages pour le site et un seul déploiement du Général pour l'API. Aucun changement de données clients ni de configuration Firebase.
