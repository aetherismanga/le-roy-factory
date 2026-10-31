# Isolation des stocks ELIOS / fiches VIEW

Après l'ouverture d'une collection ELIOS, `elios-stock-roma-test.js` gardait son
slug en mémoire et réinjectait un bloc de stock dans la fiche suivante. Une
fiche VIEW pouvait ainsi afficher une action ELIOS malgré son propre bloc VIEW.
Le module iOS présentait un risque analogue avec l'identifiant de la dernière
carte sélectionnée.

Les deux modules vérifient désormais le fabricant courant, l'ouverture et la
structure de la fiche, puis résolvent la collection depuis son titre exact.
Les anciennes actions sont retirées hors du contexte ELIOS. Les callbacks
retardés et les clics relisent le contexte courant. Les observateurs sont bornés
et regroupés afin que le nettoyage reste stable. Les routes de stock ELIOS et
les contrôles d'accès iOS sont conservés.

Le bloc VIEW s'appelle « Demandes & commandes VIEW ». Il indique explicitement
qu'aucun stock en temps réel n'est disponible ; « Demander à VIEW » prépare une
demande à l'usine et « Commander » garde le parcours de commande VIEW.

Validation : check:core ; 485 tests de non-régression réussis, zéro échec et un
ancien test navigateur ignoré ; 15 tests publics/autorisations ; cinq nouvelles
régressions exécutant les deux injecteurs réels avec timers et mutations.
Elles couvrent ELIOS puis VIEW, identifiants anciens, homonymes, accès iOS,
changement de collection via lexique et suppression de blocs déjà injectés.

Parcours réel Chromium : ouverture de Roma ELIOS (action de stock conservée),
puis VIEW Ardenne (zéro bloc/lien de stock ELIOS), puis « Demander à VIEW » :
formulaire VIEW, collection ARDENNE et destinataire VIEW. Aucun envoi effectué.
Construction publique et vérification de syntaxe réussies. Les appareils
physiques et Safari ne sont pas couverts par ce contrôle.

Publication limitée à GitHub Pages. Marqueur public :
`20261031-view-stock-2`. Les versions des modules et des deux entrées standard /
iOS sont renouvelées. Aucun catalogue, tarif, projet ni configurateur n'est modifié.
