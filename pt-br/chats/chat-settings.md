# Visão geral do painel Chat Settings

Este guia explica o painel **Chat Settings** (configurações do chat), o lugar onde você ajusta um chat isoladamente. Aqui você vê o básico configurado nesse painel: o nome do chat, a conexão e os pacotes de configurações salvos. No fim, o guia indica os textos mais aprofundados sobre tudo o que o painel reúne.

Cada configuração desse painel vale só para o chat aberto. Mexer nela não altera os outros chats.

## Como abrir o painel Chat Settings

O painel é aberto de dentro de um chat.

1. Abra qualquer chat.
2. Clique no botão de engrenagem das configurações do chat, na barra de ferramentas do chat (a dica dele diz **Chat Settings**).
3. O painel **Chat Settings** desliza para dentro da tela.

Você vê um painel com o título **Chat Settings** e um ícone de engrenagem. Ao criar um chat novo, esse painel abre sozinho, para você já deixar tudo pronto.

## Chat Name

A seção **Chat Name** (nome do chat) guarda o nome que aparece na lista de chats. Esse nome só é visível para você. Marinara não envia esse nome para a IA, e ele não muda nada na conversa.

1. Na seção **Chat Name**, clique no nome atual.
2. O nome vira uma caixa de texto.
3. Digite um nome novo.
4. Pressione Enter ou clique no botão de visto para confirmar.

## Connection

A seção **Connection** (conexão) define qual provedor de IA e qual modelo respondem nesse chat. Uma conexão é um vínculo salvo com um provedor de IA, com a chave de API e o modelo escolhido. A chave de API é um código secreto, parecido com uma senha, que permite a Marinara Engine usar a sua conta naquele provedor.

Escolha uma conexão salva no menu suspenso. Outra opção: escolher **Random**. Assim, a cada vez uma conexão diferente é sorteada entre as que você marcou para o sorteio.

Para aprender a criar uma conexão do zero, veja [Conectando a um provedor de IA](../connections/connecting-to-a-provider.md).

## Perfis de configurações

No topo do painel fica o controle **Profile** (perfil). O perfil de configurações é um pacote salvo de configurações de chat que você reaproveita em outros chats. Escolha um perfil no menu suspenso para aplicá-lo ao chat atual.

O perfil reúne a conexão, o preset de prompt, os agentes, as ferramentas, a tradução, a memória, os parâmetros avançados e outras configurações do chat. Ele nunca mexe nos personagens, na persona, nos lorebooks, nos sprites, no resumo, nas tags nem no prompt de cena. Essas coisas ficam presas ao próprio chat.

A barra traz uma fileira de botões pequenos, só com ícones, sem texto. Passe o mouse por cima de cada botão e o nome dele aparece numa dica:

- O ícone de disquete (**Save current chat settings into this profile**) salva as configurações do chat atual no perfil selecionado.
- O ícone de lápis (**Rename profile**) renomeia o perfil selecionado.
- O ícone de arquivo com sinal de mais (**Save current chat settings as a new profile**) salva as configurações do chat atual como um perfil novo.
- O ícone de seta para baixo (**Import settings profile (.json)**) carrega um perfil a partir de um arquivo `.json`.
- O ícone de seta para cima (**Export settings profile (.json)**) salva o perfil selecionado num arquivo `.json`.
- O ícone de lixeira (**Delete profile**) exclui o perfil selecionado.

Ao lado do menu suspenso há um botão de estrela. Clique nele para tornar um perfil o padrão dos chats novos nesse modo. Quando você cria um chat novo naquele modo, Marinara aplica o perfil marcado com a estrela. Cada modo tem apenas um perfil padrão.

Todo modo compatível com esse recurso tem um perfil **Default** embutido. O perfil **Default** não pode ser renomeado, sobrescrito nem excluído. Ao aplicá-lo, as configurações controladas pelo perfil voltam aos valores padrão do aplicativo.

Os controles de perfil não aparecem no Game Mode.

Em Marinara, a palavra **preset** vale só para os presets de prompt. O preset de prompt define a estrutura do prompt de sistema e os parâmetros de geração; o perfil de configurações reúne as configurações de chat reaproveitáveis listadas acima. Para conhecer todas as regras, veja [Perfis de configurações](settings-profiles.md).

## Variáveis do chat

A seção **Chat Variables** (variáveis do chat) permite dar um nome a um trecho de texto e reutilizá-lo escrevendo esse nome entre chaves duplas. Adicione uma variável chamada `char1` com o valor `Mary` e escreva `{{char1}} walks in.` em uma mensagem. A IA lê "Mary walks in."

Cada linha tem um **name** (nome) e um **value** (valor). Os nomes aceitam letras, números e sublinhados, e precisam começar com uma letra ou sublinhado. Nomes com exatamente 21 caracteres são reservados para referências a personagens. O nome de uma macro embutida, como `char` ou `user`, é recusado porque a macro embutida sempre tem prioridade. Pressione Enter ou clique fora do campo para salvar. O botão da lixeira remove uma variável.

Vale saber três coisas.

- Sua mensagem continua mostrando a etiqueta que você digitou. Só a IA vê o valor. Por isso, alterar o valor depois também muda todos os turnos anteriores que usaram a etiqueta.
- As variáveis pertencem apenas a este chat. Outro chat tem sua própria lista, e a sua permanece depois de reiniciar o aplicativo.
- Elas usam o mesmo armazenamento de `{{setvar}}`. Um valor definido por uma seção do prompt ou entrada de lorebook aparece aqui como uma linha editável. Uma entrada que use o mesmo nome sobrescreve o valor que você digitou.

Para conhecer tudo o que pode ser escrito entre chaves duplas, veja [Macros de prompt](../prompts/macros.md).

## Outras seções do painel

O painel **Chat Settings** também abriga vários recursos que valem por chat. Cada um tem seu próprio guia:

- **Persona** define quem você interpreta nesse chat. Aparece nos chats de Conversation e de Roleplay. Veja [Escolhendo a persona de um chat](../characters/choosing-your-persona.md).
- **Characters** cuida dos personagens dos chats de Conversation e de Roleplay. Para chats com dois personagens ou mais, veja [Chats em grupo e conversas em grupo](group-chats.md).
- **Party** aparece só nos chats de Game. Essa seção substitui as seções **Persona** e **Characters** e junta as duas em um lugar só.
- **Lorebooks** anexa as informações do mundo a esse chat. Veja [Visão geral dos lorebooks](../lorebooks/overview.md).
- **Agents** liga os ajudantes de IA desse chat. Veja [Agentes: ajudantes de IA para os seus chats](../agents/agents-overview.md).
- **Translation** configura a tradução automática das mensagens. Veja [Tradução de mensagens](../integrations/message-translation.md).
- **Advanced Parameters** substitui as configurações de geração desse chat, como a temperatura e o máximo de tokens. Veja [Parâmetros de geração](../prompts/generation-parameters.md).

As seções visíveis dependem do modo do chat. Algumas aparecem só nos chats de Roleplay, de Conversation ou de Game.

## Guias relacionados

- [Como gerenciar a lista de chats](managing-chats.md)
- [Escolhendo a persona de um chat](../characters/choosing-your-persona.md)
- [Visão geral dos lorebooks](../lorebooks/overview.md)
- [Agentes: ajudantes de IA para os seus chats](../agents/agents-overview.md)
- [Perfis de configurações](settings-profiles.md)
- [Parâmetros de geração](../prompts/generation-parameters.md)
