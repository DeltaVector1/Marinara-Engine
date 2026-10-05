# Se connecter à un fournisseur d'IA

Ce guide explique comment relier Marinara Engine à un fournisseur d'IA pour que tes personnages puissent répondre. Au programme : créer une connexion, coller une clé API, choisir un modèle et vérifier que tout marche.

## Ce qu'est une connexion

Une connexion, c'est une configuration enregistrée qui indique à Marinara Engine comment joindre un service d'IA. Chaque connexion retient quatre éléments : le fournisseur, la clé API ou les identifiants, l'URL de base (l'adresse web du service) et le modèle.

Une clé API est un code secret fourni par le fournisseur d'IA. Elle fonctionne un peu comme un mot de passe. Elle autorise Marinara à dialoguer avec le service d'IA et à utiliser le compte que tu y possèdes. Marinara chiffre la clé avant de l'enregistrer, et elle n'est jamais incluse dans l'export d'une connexion.

Marinara Engine n'est livré ni avec une connexion toute prête, ni avec une clé de démarrage gratuite. Une installation neuve compte zéro connexion. Il faut donc créer au moins une connexion avant de pouvoir démarrer un chat (une conversation enregistrée).

## Ouvrir le panneau Connections

Les connexions se gèrent dans le panneau **Connections** (Connexions), à droite de l'application.

Si aucune connexion n'existe encore et que tu essaies de démarrer un chat, Marinara affiche la fenêtre **Set Up** (configuration). Cette fenêtre contient un bouton **Open Connections**. Clique dessus pour arriver directement dans le panneau **Connections**.

En haut du panneau, trois boutons t'attendent. Ils n'affichent que des icônes, sans texte.

- Le bouton **New** (Nouveau, une icône plus) ouvre la fenêtre **Create Connection**.
- Le bouton **Import** (Importer, une icône de flèche de téléchargement) charge des connexions depuis un fichier.
- Le bouton **Select** (Sélectionner, une icône de coche) active la sélection multiple, pour exporter ou supprimer plusieurs connexions d'un coup.

## Créer une connexion

Voici la marche à suivre pour ajouter ton premier fournisseur.

1. Dans le panneau **Connections**, clique sur le bouton **New** (l'icône plus).
2. Dans la fenêtre **Create Connection**, saisis un **Name** (Nom) pour la connexion. Choisis quelque chose que tu reconnaîtras plus tard, par exemple `GPT-4o Main`.
3. Sous **Provider** (Fournisseur), clique sur le bouton du service voulu, par exemple **OpenAI**, **Anthropic** ou **OpenRouter**.
4. Clique sur **Create**. Marinara crée la connexion et ouvre pour elle l'éditeur complet, **Connection Editor**.
5. Repère le champ **API Key** (clé API). Colle ici la clé obtenue chez le fournisseur. Si tu n'as pas encore de clé, clique sur le lien **Get your {Provider} API key** sous le champ. Ce lien ouvre la page des clés du fournisseur dans le navigateur.
6. Ouvre le menu déroulant **Model** (Modèle) et choisis un modèle. Le champ **Search models…** permet de filtrer la liste. Si la liste est vide, clique sur **Fetch Models from API** pour charger les modèles accessibles avec ton compte. Marinara enregistre la liste récupérée avec la connexion, pour que le menu des modèles de la zone de saisie du chat puisse l'afficher plus tard sans la récupérer à nouveau.
7. Clique sur **Save** (Enregistrer). Le texte d'état, près du haut, passe à **Saved**.

Plus tard, tu peux changer de modèle sans ouvrir l'éditeur : passe par le Quick Connection Switcher (l'icône de lien dans la zone de saisie du chat) ou par le champ **Model** dans **Chat Settings → Connection** (réglages du chat → connexion). Voir [Le pool aléatoire et le Quick Connection Switcher](organizing-connections.md#the-random-pool-and-quick-connection-switcher).

En général, le champ **Base URL** (URL de base) n'a pas besoin d'être modifié. Marinara le remplit pour les fournisseurs connus. Ne le change que si tu passes par un proxy ou par un serveur local.

Pour la liste de tous les fournisseurs pris en charge, leurs réglages par défaut et l'endroit où récupérer chaque clé, consulte [Fournisseurs d'IA pris en charge](providers-reference.md).

Certains fournisseurs utilisent une identification locale au lieu d'une clé API. Dans ce cas, il n'y a pas de champ **API Key**. Voir [Connexions par abonnement Claude, ChatGPT et Grok](subscription-clis.md).

Pour te connecter à un modèle qui tourne sur ton propre ordinateur, consulte [Connecter un modèle local ou auto-hébergé](local-self-hosted.md).

## Tester la connexion

En bas de l'éditeur **Connection Editor** se trouve une carte **Connection Tests** (tests de connexion). Elle sert à confirmer que tout fonctionne avant de discuter.

1. Clique sur **Test Connection**. Marinara vérifie alors la clé API auprès du fournisseur. En cas de réussite, une ligne verte **Connection Test: Success** apparaît avec le temps de réponse.
2. Clique sur **Send Test Message**. Le mot "hi" part vers le modèle choisi, et la réponse s'affiche. En cas de réussite, une ligne verte **Test Message: Success** apparaît, avec la réponse du modèle en dessous.

Le bouton **Send Test Message** reste désactivé tant qu'aucun modèle n'est choisi. Quand un test échoue, la ligne devient rouge et affiche l'erreur. Ce message indique en général quoi corriger : une clé erronée, un modèle inconnu, etc.

## Choisir une connexion pour un chat

Une connexion ne fait rien toute seule. Chaque chat désigne la connexion qu'il utilise.

1. Ouvre un chat, puis ouvre ses **Chat Settings** (réglages du chat).
2. Repère la section **Connection**.
3. Choisis ta connexion dans le menu déroulant.

Le menu déroulant propose aussi deux options spéciales. **None** signifie qu'aucune connexion n'est encore choisie. **🎲 Random** (une icône de dé devant le mot Random) pioche à chaque fois une connexion différente dans ton lot aléatoire. En Game Mode, la section s'appelle toujours **Connection**, mais le menu déroulant qu'elle contient porte l'étiquette **GM / Party Model**.

À la création d'un chat tout neuf, la fenêtre **Set Up** demande d'abord de choisir une connexion. Sélectionnes-en une, puis clique sur **Create Chat**.

## Erreurs fréquentes

Si un test ou un message échoue, commence par vérifier ces points :

- Une **API Key** erronée ou expirée. Ouvre la connexion, colle à nouveau la clé, puis clique sur **Save**.
- Aucun modèle choisi. Le bouton **Send Test Message** reste désactivé tant que tu n'as pas sélectionné de **Model**.
- Une clé venant du mauvais fournisseur. Chaque fournisseur exige sa propre clé. Changer de **Provider** vide volontairement le champ **API Key**.
- Une **Base URL** bloquée ou injoignable. Laisse-la vide pour utiliser la valeur par défaut du fournisseur, sauf si tu fais tourner un serveur local ou un proxy.

Pour d'autres solutions aux erreurs de connexion et de génération, consulte [Résoudre les problèmes de Marinara Engine](../TROUBLESHOOTING.md).

## Guides associés

- [Fournisseurs d'IA pris en charge](providers-reference.md)
- [Connexions par abonnement Claude, ChatGPT et Grok](subscription-clis.md)
- [Connecter un modèle local ou auto-hébergé](local-self-hosted.md)
- [Résoudre les problèmes de Marinara Engine](../TROUBLESHOOTING.md)
