# Référence LRF des deux configurateurs — 25 octobre 2026

Base : `d238279752209aacf0474e673418af3cd752b3ce`.

La référence de composition est construite côté serveur à partir du numéro
renvoyé par la session client vérifiée et du total entier en centimes issu de la
grille privée. Son format est `LRF-NNNNN-montant.00`, avec deux décimales pour le
montant et le suffixe `.00` fixe. Le prix public reste inchangé et affiché en grand.
Le code et la ligne configurateur/client utilisent tous deux un élément `small`.
Aucune mention ni explication du montant n'est ajoutée à l'interface.

Seuls les comptes ayant un partenariat RANDAL validé par le serveur reçoivent
leur propre référence chiffrée. Les données de requête ne peuvent remplacer ni
le client vérifié, ni ses droits, ni les tarifs. Les réponses clients ne contiennent
aucune grille, aucun détail d'achat et aucun montant d'achat séparé. Les droits
agents existants restent distincts. Les changements de composition, de compte,
les erreurs de session et la déconnexion retirent les anciennes références.

Le calcul et l'affichage sont partagés ; les interfaces restent distinctes.
Les fichiers ELIOS/VIEW, les catalogues, le CRM et PLAN & POSE ne sont pas modifiés.
Les travaux des autres branches, notamment la PR CRM #141, ne sont pas fusionnés.

## Vérifications

- 326 tests Node réussis, zéro échec. Un ancien contrôle navigateur intégré est
  ignoré faute du Chromium par défaut ; les contrôles navigateur dédiés de
  récupération des projets et de rendu PLAN & POSE ont été exécutés et passent.
- Compilation des deux ateliers et du site public, noyau partagé et QA complète
  de chaque atelier réussis.
- Dix tests spécifiques : format, arrondis en centimes, droits, numéro propre au
  compte, changement de composition, doublons, tarifs incomplets, déconnexion,
  passerelles API réelles avec sessions et grilles chiffrées synthétiques.
- Douze scénarios navigateur : 1440/390/320 px, même corps de texte pour le code
  et sa signature, prix public conservé, droits, compte différent et expiration.
- Huit scénarios WebGL2 : import de plans, images officielles locales, export
  PNG 1920 px, conservation du projet/qualité et édition PC/mobile, pour les deux
  ateliers. Récupération des anciens projets également contrôlée.

## Données encore nécessaires

Un code avec montant n'est émis que si **toutes les lignes chiffrées de la
composition** possèdent un achat vérifié. Un total partiel n'est jamais présenté
comme complet. La grille actuelle du Général couvre les vasques céramiques ;
les achats des meubles et autres accessoires nécessitent encore le tarif officiel
correspondant. Les lignes Studio One absentes de sa grille ont la même protection.
Dans ces cas, seul le numéro client vérifié est conservé.

Les essais connectés utilisent exclusivement des comptes, sessions et prix
synthétiques locaux. Aucune authentification d'un compte réel ni aucun essai sur
téléphone physique n'a été effectué. Les grilles chiffrées et leurs clés Vercel
existantes sont conservées.
