# Vue d'ensemble des Chat Settings

Ce guide explique le panneau **Chat Settings** (réglages du chat), l'endroit où tu règles un chat en particulier. Au programme, les bases que tu définis ici : le nom du chat, la connexion et les lots de réglages enregistrés. Pour tout le reste, il te renvoie vers les guides détaillés.

Chaque réglage de ce panneau ne vaut que pour le chat en cours. Le modifier ne touche pas tes autres chats.

## Ouvrir le panneau Chat Settings

Le panneau s'ouvre depuis un chat déjà ouvert.

1. Ouvre un chat.
2. Clique sur le bouton en forme d'engrenage dans la barre d'outils du chat (son infobulle indique **Chat Settings**).
3. Le panneau **Chat Settings** s'ouvre en glissant.

Un panneau intitulé **Chat Settings**, avec une icône d'engrenage, apparaît alors. Quand tu crées un chat tout neuf, ce panneau s'ouvre tout seul pour que tu puisses le configurer immédiatement.

## Chat Name

La section **Chat Name** (nom du chat) contient le nom affiché dans ta liste de chats. Ce nom n'est visible que par toi. Marinara ne l'envoie pas à l'IA, et il ne change rien à la conversation.

1. Dans la section **Chat Name**, clique sur le nom actuel.
2. Le nom se transforme en zone de texte.
3. Saisis un nouveau nom.
4. Appuie sur Enter, ou clique sur le bouton en forme de coche pour valider.

## Connection

La section **Connection** (connexion) détermine quel fournisseur d'IA et quel modèle répondent dans ce chat. Une connexion est un lien enregistré vers un fournisseur d'IA, avec sa clé API et le modèle choisi. Une clé API est un code secret, un peu comme un mot de passe, qui autorise Marinara Engine à utiliser ton compte chez ce fournisseur.

Choisis une connexion enregistrée dans le menu déroulant. Autre option : **Random**. Marinara pioche alors une connexion différente à chaque fois parmi celles que tu as ajoutées à ton tirage aléatoire.

Pour apprendre à créer une connexion, va voir [Se connecter à un fournisseur d'IA](../connections/connecting-to-a-provider.md).

## Profils de réglages

En haut du panneau se trouve le contrôle **Profile** (profil). Un profil de réglages est un lot de réglages de chat enregistré, que tu peux réutiliser sur d'autres chats. Choisis un profil dans le menu déroulant pour l'appliquer au chat en cours.

Un profil regroupe la connexion du chat, le preset de prompt, les agents, les outils, la traduction, la mémoire (**Memory Recall**), les paramètres avancés et d'autres réglages. Il ne touche jamais aux personnages, au persona, aux lorebooks, aux sprites, au résumé, aux tags ni au prompt de scène. Tout cela reste attaché au chat lui-même.

La barre comporte une rangée de petits boutons-icônes sans texte. Le nom de chaque bouton s'affiche dans une infobulle au survol :

- L'icône de disquette (**Save current chat settings into this profile**, enregistrer les réglages du chat en cours dans ce profil) écrit les réglages du chat en cours dans le profil sélectionné.
- L'icône de crayon (**Rename profile**) renomme le profil sélectionné.
- L'icône de fichier avec un plus (**Save current chat settings as a new profile**) enregistre les réglages du chat en cours dans un nouveau profil.
- L'icône de flèche vers le bas (**Import settings profile (.json)**) charge un profil depuis un fichier `.json`.
- L'icône de flèche vers le haut (**Export settings profile (.json)**) enregistre le profil sélectionné dans un fichier `.json`.
- L'icône de corbeille (**Delete profile**) supprime le profil sélectionné.

À côté du menu déroulant, un bouton en forme d'étoile désigne un profil comme profil par défaut des nouveaux chats de ce mode. Quand tu crées un chat dans ce mode, Marinara applique le profil étoilé à ta place. Un seul profil par mode peut être le profil par défaut.

Chaque mode compatible dispose d'un profil **Default** intégré. Le profil **Default** ne peut être ni renommé, ni écrasé, ni supprimé. L'appliquer ramène les réglages gérés par les profils aux valeurs par défaut de l'application.

Les contrôles de profil n'apparaissent pas en Game Mode.

Chez Marinara, le mot **preset** désigne uniquement les presets de prompt. Un preset de prompt façonne la structure du prompt système et les paramètres de génération ; un profil de réglages regroupe la configuration de chat réutilisable listée plus haut. Pour toutes les règles, va voir [Profils de réglages](settings-profiles.md).

## Variables du chat

La section **Chat Variables** (variables du chat) te permet de nommer un morceau de texte et de le réutiliser en écrivant son nom entre doubles accolades. Ajoute une variable nommée `char1` avec la valeur `Mary`, puis écris `{{char1}} walks in.` dans un message. L'IA lit "Mary walks in."

Chaque ligne a un **name** (nom) et une **value** (valeur). Les noms acceptent les lettres, les chiffres et les tirets bas, et doivent commencer par une lettre ou un tiret bas. Les noms de 21 caractères exactement sont réservés aux références de personnages. Le nom d'une macro intégrée, comme `char` ou `user`, est refusé, car la macro intégrée a toujours la priorité. Appuie sur Entrée ou clique hors du champ pour enregistrer. Le bouton de corbeille supprime une variable.

Trois points sont à connaître.

- Ton message continue d'afficher la balise saisie. Seule l'IA voit la valeur. Si tu modifies cette valeur plus tard, tous les tours précédents qui utilisaient la balise changent aussi.
- Les variables appartiennent uniquement à ce chat. Un autre chat possède sa propre liste, et la tienne est conservée après un redémarrage.
- Elles utilisent le même stockage que `{{setvar}}`. Une valeur définie par une section du prompt ou une entrée de lorebook apparaît ici sous forme de ligne modifiable. Une entrée qui utilise le même nom remplace la valeur que tu as saisie.

Pour les autres possibilités des doubles accolades, consulte [Macros de prompt](../prompts/macros.md).

## Les autres sections du panneau

Le panneau **Chat Settings** héberge aussi de nombreuses fonctionnalités propres à chaque chat. Chacune a son guide :

- **Persona** choisit le personnage que tu incarnes dans ce chat. Cette section apparaît dans les chats Conversation et Roleplay. Va voir [Choisir ton persona dans un chat](../characters/choosing-your-persona.md).
- **Characters** gère les personnages des chats Conversation et Roleplay. Pour les chats à deux personnages ou plus, va voir [Chats de groupe et conversations de groupe](group-chats.md).
- **Party** n'apparaît que dans les chats Game. Cette section remplace les sections **Persona** et **Characters** et réunit les deux au même endroit.
- **Lorebooks** rattache des World Info à ce chat. Va voir [Vue d'ensemble des lorebooks](../lorebooks/overview.md).
- **Agents** active les agents IA pour ce chat. Va voir [Agents : des aides IA pour tes chats](../agents/agents-overview.md).
- **Translation** met en place la traduction automatique des messages. Va voir [Traduction des messages](../integrations/message-translation.md).
- **Advanced Parameters** remplace les réglages de génération de ce chat, comme la température et le nombre maximal de tokens. Va voir [Paramètres de génération](../prompts/generation-parameters.md).

Les sections visibles dépendent du mode du chat. Certaines n'apparaissent que dans les chats Roleplay, Conversation ou Game.

## Guides associés

- [Gérer ta liste de chats](managing-chats.md)
- [Choisir ton persona dans un chat](../characters/choosing-your-persona.md)
- [Vue d'ensemble des lorebooks](../lorebooks/overview.md)
- [Agents : des aides IA pour tes chats](../agents/agents-overview.md)
- [Profils de réglages](settings-profiles.md)
- [Paramètres de génération](../prompts/generation-parameters.md)
