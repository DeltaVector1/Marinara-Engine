# Interrupteurs de fonctions

Certains comportements du serveur sont facultatifs. Active-les dans **Settings > Advanced > Features** (paramètres > avancé > fonctions). Tous les interrupteurs sont initialement désactivés : un serveur où personne n'ouvre cette section se comporte comme avant.

Les changements s'appliquent immédiatement, sans redémarrage du serveur ni rechargement de la page.

<a id="overview"></a>

## Vue d'ensemble

| Interrupteur | Clé du réglage | Valeur par défaut | Variable d'environnement |
| --- | --- | --- | --- |
| **Stable lorebook picks** (sélections stables du lorebook) | `stableLorebookGroupPicks` | Désactivé | `LOREBOOK_STABLE_GROUP_WINNERS` |
| **Retry failed provider calls** (réessayer les appels fournisseur échoués) | `providerRetry` | Désactivé | `PROVIDER_RETRY_TRANSIENT_ERRORS` |

Recherche `features` dans les réglages pour ouvrir cette section.

<a id="where-the-settings-are-stored"></a>

## Stockage des réglages

Tous les interrupteurs sont enregistrés ensemble dans le réglage d'application `features`, un objet JSON de booléens. Seuls les écarts au défaut sont enregistrés. Une clé absente, un objet vide ou une valeur illisible signifient tous le défaut : tout désactivé.

Le serveur garde une copie en mémoire pour éviter tout coût de lecture sur les chemins fréquents, comme les appels fournisseur et scans de lorebooks. Un enregistrement dans Settings, ou toute autre écriture de la ligne `features`, actualise cette copie immédiatement.

L'API est `GET` et `PUT /api/app-settings/features`. `PUT` remplace l'objet entier et refuse les clés inconnues ou valeurs non booléennes.

<a id="switches"></a>

## Interrupteurs

<a id="stable-lorebook-picks"></a>

### Sélections stables du lorebook

Clé : `stableLorebookGroupPicks`. Variable d'environnement : `LOREBOOK_STABLE_GROUP_WINNERS`.

Activé : un groupe d'inclusion de lorebook conserve le même gagnant dans un chat tant que les candidats correspondants restent identiques. D'autres chats ou ensembles de candidats peuvent choisir autrement.

Désactivé : le gagnant est tiré à nouveau à chaque génération.

<a id="retry-failed-provider-calls"></a>

### Réessayer les appels fournisseur échoués

Clé : `providerRetry`. Variable d'environnement : `PROVIDER_RETRY_TRANSIENT_ERRORS`.

Activé : connexion refusée ou inaccessible, ou erreur de passerelle 502/503, réessayée au plus deux fois après une courte attente à variation aléatoire, uniquement avant la réception du moindre texte. Une 504 ou une connexion interrompue n'est jamais réessayée. Si la connexion possède un fallback, celui-ci est essayé immédiatement à la place.

Désactivé : seules les limites de fréquence sont réessayées, comme avant.

<a id="precedence"></a>

## Priorité

1. **Variable d'environnement.** Si elle est définie, elle l'emporte sur le réglage enregistré, pour activer comme désactiver. Settings affiche l'interrupteur verrouillé avec le nom de la variable. Une valeur vide compte comme non définie.
2. **Interrupteur enregistré.** La valeur de Settings > Advanced > Features.
3. **Défaut.** Désactivé.

| Variable | Contrôle | Valeurs |
| --- | --- | --- |
| `LOREBOOK_STABLE_GROUP_WINNERS` | Sélections stables du lorebook | `true`, `1`, `yes` ou `on` activent. Toute autre valeur désactive. |
| `PROVIDER_RETRY_TRANSIENT_ERRORS` | Réessais des appels fournisseur échoués | `true`, `1`, `yes` ou `on` activent. Toute autre valeur désactive. |

Les variables sont lues à chaque vérification ; les changements de `.env` ne nécessitent donc pas de redémarrage.

<a id="for-developers"></a>

## Pour les développeurs

Le registre est `packages/shared/src/schemas/feature-settings.schema.ts` : noms et valeurs par défaut. Ajoute un interrupteur dans `FEATURE_SWITCH_NAMES`, `FEATURE_SWITCH_DEFAULTS` et `featureSettingsSchema`, fournis libellé et aide sous `settings.features.<key>` dans le catalogue anglais, puis ajoute-le à `SERVER_SWITCHES` dans `packages/client/src/components/panels/settings/FeatureSwitchesSettings.tsx` pour l'afficher dans Settings. Côté serveur, vérifie-le avec `isFeatureEnabled("<key>")` de `packages/server/src/services/features/feature-settings.ts`. Côté client, utilise `useFeatureEnabled("<key>")` de `packages/client/src/hooks/use-feature-settings.ts`.
