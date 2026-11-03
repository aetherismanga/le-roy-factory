# Anima — correction du démarrage de l’atelier

Release : `20261103-neobath-anima-studio-one-startup-6a`.

Le démarrage de Studio One attache le reflet au miroir du modèle initial, puis détache ce miroir pour en faire un objet indépendant de composition. L’adaptation Anima de l’appel initial créait ce modèle avec `includeMirror:false`. `attachLiveMirror(model.mirror)` recevait donc `null` et levait `TypeError: Cannot read properties of null (reading 'add')`, avant l’initialisation des contrôles et le préchargement des textures. Le message générique signalait à tort un problème de ressource ou de connexion.

La correction conserve le miroir catalogue pour cet appel initial seulement. Les caissons ajoutés, restaurés ou utilisés dans les aperçus conservent `includeMirror:false` : aucun miroir supplémentaire n’est ajouté à chaque caisson. Le parcours direct et le nettoyage de la scène initiale sont conservés.

Le nouveau test extrait l’appel réel de `start()` depuis le source adapté, l’exécute avec la véritable factory Anima, puis appelle les véritables `attachLiveMirror()` et `initializeComposition()` avec `Composition`, `makeRoom` et le réflecteur. Le résultat est vérifié par le validateur de projets : caisson bas APUR-BA8052 sans plan, miroir SP6070, identités et parents corrects. Une régression repassant le boot à `includeMirror:false` casse le test. Le second test reproduit exactement l’ancienne exception et vérifie que les caissons ajoutés restent sans miroir.

Les 237 tests Anima réussissent après correction, sans échec ni test ignoré. Le build public réussit et garde les fichiers privés exclus de Pages.

Un contrôle complémentaire de `makeUI()` contre les IDs du gabarit compilé vérifie l’installation des nouveaux contrôles de plans indépendants. Il n’a pas trouvé d’autre sélecteur requis manquant. Les contrôles CPU/DOM ne valident pas le rendu WebGL du navigateur, indisponible dans cet environnement.

La correction est compilée depuis les mêmes entrées Studio One. Les sources originales, les autres configurateurs et le moteur partagé ne changent pas. Les versions du chargeur sont renouvelées. L’accès reste réservé à Jérôme et Coryne.
