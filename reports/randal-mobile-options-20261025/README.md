# Correctifs RANDAL — 25 octobre 2026

Base initiale : `925e802aefbd94af927efdd3b47ad8a90ac380eb`.

Consolidation avec `a8bcc9c9d2105aedce357350c9fb0a72e6408278` : nouvelles collections ELIOS Stone Icon/Terraforma, décors Dynasty, tampons Yosemite, apparences et contrôles HD conservés. Le contrôle par carreau respecte aussi les formats compatibles des décors ; le devis conserve la finition et résout la référence du coloris sélectionné (Stone Icon R10 B vérifié).

- Les modes un carreau/rangée/colonne activent réellement la sélection. État actif visible, cibles tactiles de 44 px, sélection sur joint et axes physiques conservés. Le mode reste disponible dans l’inspecteur du carreau ; fin de modification sans contour résiduel.
- Quercia : 4 faces en qualité basse, 6 en moyenne, 8 en qualité haute mobile ; HD : tous les 13/15 originaux de la référence. Les choix remplacés sont annulés, y compris les téléchargements et les travaux en attente. Les tampons, couleurs, SKU, formats, 118 originaux et 354 URL du catalogue sont inchangés.
- Tiroir supérieur plein pour plateau seul ou Neris/Torne : vraie géométrie sans découpe, option guidée et atelier, duplication, reprise, JSON et visuel conservés. Retour automatique au passage siphon pour les vasques intégrées incompatibles. Récapitulatif et texte de commande incluent le choix. Aucun supplément ni référence inventé.
- Général : prix publics des vasques visibles dès le choix. Les prix existants étaient déjà présents dans le récapitulatif ; les achats manquants évoqués précédemment concernaient les meubles/accessoires. 1 655 combinaisons prix/format/couleur/implantation contrôlées. Les données de tarifs sont inchangées.
- L’entrée officielle Studio One et l’accès direct à l’atelier ouvrent la pièce vide. Le projet précédent et son identifiant sont conservés pour Reprendre ; un projet explicitement ouvert reprend aussi après rechargement. Les imports, compositions guidées et projets enregistrés restent accessibles.

## Validation

- Installation verrouillée, builds Studio/Général/site réussis ; noyau et QA complète des deux ateliers réussis.
- 332 tests Node réussis, aucun échec. Un ancien test navigateur intégré est ignoré faute de Chromium par défaut ; sa vérification dédiée est maintenue dans la CI.
- 11 cas de géométrie et 6 cas de persistance tiroirs ; 4 tests de file mémoire/annulation ; 1 655 combinaisons vasques.
- 34 scénarios Chromium WebGL2 : sélection souris/touch (8), entrée vide/reprise (2), tiroirs PC/mobile (4), Quercia mobile/HD/changements rapides (2), rendu natif/import/export HD et édition PC/mobile et nouvelles collections ELIOS (18).
- Les épreuves anciennes qui supposaient le chargement de toutes les faces à l’édition ont été remplacées par des contrôles comportementaux des limites de travail et de la restitution HD complète. Les changements de format utilisent un vrai SKU source ; une référence inconnue est explicitement refusée.
- Aucune modification des grilles privées, du service LRF, du CRM, de PLAN & POSE, des catalogues ELIOS/VIEW ni des fichiers originaux.

Les essais mobiles utilisent une fenêtre tactile émulée et WebGL logiciel. Aucun téléphone physique n’a été utilisé ; la baisse du nombre de décodages et textures réduit la charge mais ne constitue pas une mesure de mémoire sur le téléphone de Jérôme. Aucun compte réel ni message n’a été utilisé/envoyé pendant les essais.
