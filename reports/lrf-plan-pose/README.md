> Dernière correction : [portes ouvertes et cotes calculées](regressions-contours-calculs-20261022.md).

> Conversion mise à jour : [murs et cloisons sans mobilier, unités mm/cm/m](conversion-architecture-20261022.md).

# LRF PLAN & POSE — bêta, lecture des cotes

Application indépendante en HTML/CSS/JavaScript, accessible depuis `configurateurs.html`. Aucun moteur RANDAL, code CRM, compte client ou service Firebase n’est modifié.

## Lecture des cotes ajoutée

Un import lance maintenant la lecture locale des nombres en centimètres et propose une reconstruction des pièces à angles droits. Le bouton « Convertir le plan » reste visible sur le plan importé. Les cotes lues et les cotes déduites sont distinctes. Une lecture contradictoire peut être écartée dans une proposition, mais sa valeur et la déduction sont signalées explicitement. La vérification du contour et des cotes est obligatoire avant création. Une cote manquante sans solution algébrique bloque la création. Voir `reconnaissance-cotes-20261022.md`.

## Fonctionnement livré

- Fond de plan PDF multipage, JPG, PNG ou WebP, analysé sur l’appareil. Sélection d’une page PDF, extraction des textes numériques et calibration de deux points par une distance réelle.
- Proposition locale des espaces fermés, tracé manuel, contours polygonaux éditables, pièces nommables, portes/fenêtres/passages, zones exclues du sol, validation explicite des cotes.
- Surfaces nettes, périmètres, plinthes après union des intervalles d’ouvertures au sol, retraits manuels ; marge 5/8/10 % ou personnalisée, 8 % par défaut.
- Calepinage droit ou décalé après confirmation de compatibilité, rotation, joint, centrage équilibré et décalages. Les carreaux visibles et les quantités proviennent du même calcul. Les chutes ne sont pas supposées réutilisables.
- Catalogue repris des données existantes : 842 choix ELIOS/VIEW, dont 310 avec conditionnement renseigné ; accès aux PDF de 49 collections LA FENICE avec saisie du format et du conditionnement. Aucun prix d’achat professionnel n’est ajouté au module.
- Prix TTC saisis par l’utilisateur ; les références sans prix TTC rapproché restent sur demande. Le montant n’est pas présenté comme un total complet lorsque des pièces n’ont pas de prix.
- Sauvegarde IndexedDB, reprise locale, duplication, annuler/rétablir, sauvegarde JSON, image HD et dossier PDF.
- Export natif RANDAL v2, sous forme de JSON ou d’un fragment de lien ouvert via les wrappers actuels vers `atelier.html`. Une seule pièce modifiable est transmise. Les projets existants ne sont pas écrasés.

## Compatibilité RANDAL vérifiée

Les validateurs ont été lus dans `aetherismanga/le-roy-factory` :

- RANDAL Général : commit `5365af52fece0228c4ce5c5faab6d154999ca5bf`, `randal-general/src/projects.js` et `room.js`.
- STUDIO ONE : production Vercel sur le commit `6606d370172b63ac8a15e3df4248036183684d6c`, `src/projects.js` et `room.js`.

Limites reproduites : 3 à 12 angles, hauteur 180–400 cm, emprise 10 × 10 m, surface minimale 1 m², murs de 20 cm minimum, 32 éléments et perte limitée à 30 %. Un trou dans le sol ou un passage libre sans équivalent provoque un message explicite, sans suppression silencieuse. Les finitions sont rapprochées de la sélection connue. Sans transfert de revêtement, le sol de base transmis est Shell Beige 60 × 120 cm.

## Vérification

`node --test tests/lrf-plan-pose/*.test.mjs` : 31 tests réussis, dont relecture des exports par les deux validateurs natifs et contrôle du plan avec les fonctions de validation de pièce d’origine. Les instantanés d’origine sont conservés dans `tests/lrf-plan-pose/upstream/` pour ces tests ; aucun rendu 3D complet n’est simulé par les tests.

Parcours navigateur vérifié sur écran de bureau : création d’une pièce 450 × 450 × 260 cm, 20,25 m² et 18,00 ml ; ajout d’une porte de 83 cm, 17,17 ml de plinthes ; validation des cotes ; sélection Creta Caramello 60 × 120 ; 16 cartons de 1,44 m² dans le cas testé ; prix TTC **d’essai** 30 €/m², montant 691,20 €. Ce prix d’essai n’est pas enregistré dans le catalogue livré. Sauvegardes JSON et fichier natif RANDAL téléchargés et relus. PNG HD téléchargé. Reprise du projet après rechargement vérifiée.

Affichage smartphone vérifié dans un cadre 390 × 844 : navigation Plan/Réglages/Bilan, valeurs identiques, largeur de défilement égale à la largeur disponible (aucun débordement horizontal).

Lecture locale du lecteur PDF.js 5.6.205 **legacy** : PDF de deux pages, page 2 et cote 4,50 m retrouvées. Le build compatible a remplacé le build moderne après un échec lié à `Uint8Array.toHex` dans l’environnement de contrôle. Générateur du dossier PDF testé indépendamment avec les mêmes fonctions que l’application : deux pages, valeurs 20,25 m² / 17,17 ml / 691,20 € relues par pypdf.

### Vérifications non achevées dans le navigateur distant

- L’import du fichier d’essai a été refusé par la porte d’autorisation du navigateur ; aucune autre voie d’import n’a été tentée.
- Le téléchargement PDF n’a pas produit l’événement attendu dans le navigateur distant malgré la génération du dossier et l’exposition du lien. La génération du PDF est contrôlée localement ; son téléchargement depuis l’interface doit être confirmé sur un navigateur utilisateur.
- Le transfert n’a pas fait l’objet d’une visite complète des deux moteurs 3D en production. Les fichiers et les formats sont validés ; un contrôle visuel sur des plans réels reste utile.

## Limites explicites

La lecture automatique reconstruit les contours à angles droits à partir de cotes proposées ; elle ne constitue pas une reconnaissance architecturale exhaustive. Les écritures ambiguës doivent être corrigées ou les déductions vérifiées. Le repérage simple des espaces fermés reste disponible. Une photo en perspective ne permet pas de garantir une échelle uniforme. Aucun chiffre extrait d’un PDF n’est appliqué comme une cote certaine. Chaque pièce doit être contrôlée puis validée.

Les tarifs TTC ne sont pas automatiquement déduits d’un tarif professionnel ou d’un prix fournisseur. LA FENICE utilise les liens et noms de collection existants ; les variantes, conditionnements et tarifs doivent être renseignés à partir de la source choisie.

La version initiale ne transfère pas une maison multipièce complète dans RANDAL : l’ensemble est conservé dans le projet LRF, puis une pièce est exportée à la fois. Les zones exclues du sol sont conservées dans LRF et empêchent un transfert natif qui les perdrait.

## Maintenance

`node scripts/build-lrf-plan-catalogue.cjs` régénère le catalogue à partir des fichiers existants, sans appel réseau ni inclusion des prix professionnels. PDF.js 5.6.205 legacy est livré compressé dans `assets/vendor/lrf-plan-pose/`, avec sa licence Apache 2.0. Le décompresseur natif du navigateur est utilisé. jsPDF est repris du fournisseur déjà présent dans le dépôt.

- [Catalogues, plinthes et récapitulatif (22 octobre 2026)](catalogues-plinthes-recapitulatif-20261022.md)

- [Chiffrage des plinthes et tarif Shell vérifié - 23 octobre 2026](chiffrage-plinthes-tarif-shell-20261023.md)
