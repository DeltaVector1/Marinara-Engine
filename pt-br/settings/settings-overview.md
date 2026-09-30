# Visão geral das configurações

Este guia mostra o painel **Settings** (Configurações) do Marinara Engine: as seis abas e o que cada uma controla. A aba **General** é explicada em detalhes, junto com as **Text Rules**, que formatam o texto do chat, e com o modo como as configurações são sincronizadas entre os dispositivos.

## O painel Settings e suas seis abas

Abra **Settings** pelo ícone de engrenagem na barra superior. No topo do painel fica a caixa **Search settings** (buscar nas configurações). Digite qualquer palavra (como `delete`, `streaming` ou `quotes`) e Marinara leva você direto para a seção correspondente.

O painel tem seis abas. A tabela abaixo mostra o que cada aba controla.

| Aba | O que você configura ali |
| --- | --- |
| **General** | Comportamento do aplicativo, notificações, respostas, entrada de texto, regras de texto e leitura no Game Mode. |
| **Appearance** | Tema, cores, fontes, layout do chat, animações e planos de fundo. |
| **Generations** | Padrões de imagem e vídeo, além de modelos de prompt reutilizáveis. |
| **Addons** | Rascunhos de Personal Extension da Professor Mari em ambiente isolado, External Extensions liberadas por você e temas personalizados. |
| **Imports** | Restauração de perfis completos e importação a partir de outros aplicativos. |
| **Advanced** | Acesso de administrador, chaves de recursos opcionais, atualizações, ferramentas de mensagem, backups e ações destrutivas. |

Onde ler mais sobre cada aba:

- **General**: explicada nesta página (veja as seções abaixo).
- **Appearance**: veja [Configurações de aparência](../appearance/appearance-settings.md).
- **Generations**: veja [Perfis de estilo](../media/style-profiles.md) e [Vídeo de cena](../media/scene-video.md).
- **Addons**: veja [Extensões pessoais](../extending/personal-extensions.md) e [Temas de CSS personalizados](../appearance/custom-css-themes.md).
- **Imports**: veja [Importando do SillyTavern](../data/importing-from-sillytavern.md) e [Fazer backup e restaurar Marinara](../data/backup-and-restore.md).
- **Advanced**: veja a seção **Message Tools** abaixo, além de [Atualizando Marinara Engine](../UPGRADING.md), [Acesso remoto](../REMOTE_ACCESS.md) e [Limpar ou zerar os seus dados](../data/clearing-data.md). [Chaves de recursos](../configuration/features.md).

## Settings, aba General

A aba **General** tem seis seções. Duas delas são explicadas por completo nesta página: **App Behavior** e **Text Rules**. As outras aparecem aqui em resumo e têm guias próprios com todos os detalhes.

- **App Behavior**: idioma, proteção contra exclusão e botões liga/desliga que mostram ou escondem recursos. Explicada abaixo.
- **Notifications**: sons de notificação, com controles separados para o navegador e para o aplicativo Android. Faça upload de um **Custom sound** (som personalizado) em MP3, WAV, OGG, M4A/MP4 ou WebM (até 10 MB) para substituir o som padrão do Marinara em todos os dispositivos ligados a este servidor. Você pode ouvir, trocar ou remover o som quando quiser. Se o arquivo personalizado não puder ser lido, Marinara volta ao som padrão. O arquivo entra nos backups e nas exportações de perfil. As **Background Notifications** avisam sobre mensagens autônomas no Conversation Mode, e as **Generation Completion Notifications** avisam sobre respostas que você mesmo iniciou nos modos Conversation, Roleplay e Game. As duas funcionam enquanto Marinara continua aberto, mas sem o foco da tela, e o conteúdo das mensagens não aparece.
- **Responses**: como as respostas chegam em streaming, são salvas e divididas em páginas. Veja [Enviar mensagens e streaming](../chats/sending-and-streaming.md).
- **Input & Editing**: campo de mensagem e controles de edição rápida. Veja [Ações de mensagem](../chats/messages.md).
- **Text Rules**: formatação aplicada ao texto do chat. Explicada abaixo.
- **Game Playback**: leitura e navegação no Game Mode.

## App Behavior

Esta seção fica em **Settings** > **General** > **App Behavior**. Ela controla o comportamento do dia a dia e alguns botões liga/desliga que mostram ou escondem recursos.

- **Language**: escolha o idioma da interface. Marinara já inclui árabe, chinês simplificado, inglês,
  francês, alemão, hindi, japonês, coreano, polonês, português do Brasil, russo e espanhol. O árabe usa
  layout da direita para a esquerda. Os textos de interface ainda não traduzidos aparecem em inglês. Essa configuração muda
  os controles e as orientações do Marinara, não os prompts enviados ao modelo nem o conteúdo do chat. Para melhorar uma tradução ou contribuir com outro
  idioma, veja [Localização da interface](../development/localization.md).
- **Documentation Language**: escolha o idioma dos guias internos do Marinara, separado do idioma da interface acima. O inglês já vem embutido e nunca precisa ser baixado. Ao escolher um idioma diferente do inglês, aparece o botão **Download & Replace** (baixar e substituir), que baixa aquele pacote de idioma uma vez e remove o pacote anterior, então só um idioma baixado fica guardado. Os guias ainda não traduzidos abrem em inglês com um pequeno selo `EN`, e a busca da documentação funciona no idioma ativo no momento. A sua escolha continua valendo depois das atualizações, e o pacote se renova sozinho depois de uma atualização, quando as traduções dele mudaram. Se os guias baixados sumirem ou ficarem danificados, aparece o botão **Fix documentation** (corrigir a documentação): ele baixa o pacote de novo e devolve os guias para o inglês quando a fonte do download não puder ser acessada.
- **Confirm before deleting**: ativado por padrão. Quando está ativo, Marinara pergunta antes de excluir para sempre um chat, um personagem ou outro item. Mantenha ativo para evitar exclusões por engano.
- **Achievements**: ativado por padrão. Quando está ativo, a tela inicial mostra o botão de conquistas e os avisos de conquista desbloqueada. Quando está desativado, o acompanhamento continua em silêncio. Veja [Conquistas](../home/achievements.md).
- **Music Player**: ativado por padrão. Quando está ativo, o player de música compacto aparece. Veja [Música](../media/music.md).
- **Mini Mari surprise visits**: ativado por padrão. Quando está ativo, uma mensagem rara da Chibi Professor Mari pode surgir enquanto você rola a tela. Desative se isso atrapalhar.

## Text Rules

Esta seção fica em **Settings** > **General** > **Text Rules**. Essas regras mudam o tratamento dado ao texto do chat. As opções **Bold dialogue in quotes** e **Convert LaTeX symbols** afetam só a exibição, ou seja, nunca alteram as mensagens salvas. A opção **Quote style** é diferente: ela reescreve as aspas de verdade no texto que você digita e salva.

### Bold dialogue in quotes

Ativado por padrão. Quando está ativo, o texto entre aspas aparece em negrito. Veja esta linha:

```
"I missed you," she said.
```

Com **Bold dialogue in quotes** ativo, as palavras `I missed you` aparecem em negrito. Desative para manter a cor do diálogo sem o negrito.

### Convert LaTeX symbols

Ativado por padrão. Alguns modelos escrevem fórmulas usando comandos LaTeX. Quando está ativo, comandos comuns como `\rightarrow`, `\neq`, `\times` e `\alpha` aparecem como os símbolos normais. Por exemplo, `\times` aparece como o sinal de multiplicação `×`, e `\alpha` aparece como a letra grega `α`. Os trechos de código ficam intactos.

### Quote style

Define como as aspas são padronizadas. Diferente das duas regras acima, esta muda o próprio texto: as mensagens que você digita e salva são reescritas no estilo escolhido. São duas opções:

- **Straight**: mantém as aspas retas de máquina de escrever, como em `"Hello," it's me.` É o padrão.
- **Typographic**: troca as aspas retas por aspas e apóstrofos curvos.

## Responses e Input & Editing

Essas duas seções da aba **General** ajustam como as respostas chegam e como você digita e edita. Veja os controles, com links para os guias completos.

A seção **Responses** controla:

- **Enable streaming**: mostrar o texto da IA palavra por palavra conforme ele é gerado.
- **Streaming speed**: a velocidade com que o texto em streaming aparece.
- **Trim incomplete model endings**: cortar uma frase inacabada no final antes de salvar.
- **Messages per page**: quantas mensagens são carregadas de uma vez.

Saiba mais em [Enviar mensagens e streaming](../chats/sending-and-streaming.md).

A seção **Input & Editing** controla:

- **Send on Enter**: escolha em quais modos a tecla Enter envia a mensagem.
- **Speech-to-text microphone**: mostrar um botão de microfone nos campos de mensagem.
- **Intuitive swipe navigation**: usar as setas do teclado ou o deslizar do dedo para alternar entre as respostas alternativas.
- **Reroll past the newest swipe**: gerar uma resposta nova ao passar do swipe mais recente.
- **Up Arrow edits last message**: pressionar Up Arrow com o campo vazio para editar a última mensagem.
- **Double-click edits messages**: dar um duplo clique em uma mensagem do Roleplay Mode para editá-la.

Saiba mais em [Ações de mensagem](../chats/messages.md).

## Message Tools

A seção **Message Tools** fica em **Settings** > **Advanced** > **Message Tools**. Ela reúne botões liga/desliga de exibição e de correção. Todos os botões abaixo vêm desativados por padrão. A tabela mostra o que cada um faz e onde ler mais.

| Botão liga/desliga | O que faz | Guia completo |
| --- | --- | --- |
| **Show message timestamps** | Mostra a data e a hora em cada mensagem. | [Ações de mensagem](../chats/messages.md) |
| **Show model name on messages** | Mostra qual modelo de IA escreveu cada resposta. | [Ações de mensagem](../chats/messages.md) |
| **Show token usage on messages** | Mostra a contagem de tokens de prompt e de resposta por mensagem. | [Ações de mensagem](../chats/messages.md) |
| **Show message numbers** | Mostra um número em cada mensagem do chat. | [Ações de mensagem](../chats/messages.md) |
| **Guide swipes/regens with chat input** | Usa o rascunho atual como direção quando você regenera. | [Geração guiada e Impersonate](../chats/guided-and-impersonate.md) |
| **Quick replies** | Acrescenta ações de rascunho alternativas ao lado do botão Send. | [Geração guiada e Impersonate](../chats/guided-and-impersonate.md) |
| **Include reasoning in exports** | Inclui o raciocínio oculto nas exportações de chat. | [Exportar e importar chats](../chats/export-import.md) |
| **Debug mode** | Registra no console do servidor o que é enviado ao modelo, para dar suporte. | [Solução de problemas do Marinara Engine](../TROUBLESHOOTING.md) |

O resto da aba **Advanced** é explicado em outros guias. Veja [Atualizando Marinara Engine](../UPGRADING.md) para **Updates**, [Acesso remoto](../REMOTE_ACCESS.md) para **Admin Access**, [Fazer backup e restaurar Marinara](../data/backup-and-restore.md) para **Backup & Export** e [Limpar ou zerar os seus dados](../data/clearing-data.md) para **Danger Zone**.

## Como as configurações são sincronizadas entre dispositivos

Marinara guarda a maior parte das configurações no servidor, então elas acompanham você entre navegadores e dispositivos. É assim que funciona a sincronização das configurações.

Veja como acontece:

1. Você muda uma configuração em qualquer lugar do painel **Settings**.
2. Cerca de um segundo depois, Marinara salva a mudança no servidor com a marca de data e hora.
3. Quando outro navegador abre o mesmo servidor do Marinara, ele carrega essas configurações salvas.

Cada dispositivo fica com a cópia mais recente. Vence a última gravação, de acordo com a marca de data e hora. Fique atento a uma consequência dessa regra. Se você abrir Marinara em um segundo dispositivo, a cópia dele pode sobrescrever em silêncio uma configuração que você acabou de mudar no primeiro. Dê um tempo para o aplicativo sincronizar antes de trocar de dispositivo.

Duas configurações nunca são sincronizadas. Elas ficam guardadas em cada navegador, no dispositivo em que você as definiu:

- **Display Size** (o tamanho do texto da interface)
- **Chat Font Size** (o tamanho do texto do chat)

As duas ficam em **Settings** > **Appearance** > **Text & Scale**. Ajuste de novo em cada dispositivo que você usa. Veja [Configurações de aparência](../appearance/appearance-settings.md).

Se o servidor estiver fora de alcance, o aplicativo continua funcionando com as configurações locais e tenta de novo na próxima vez que você mudar algo.

## Guias relacionados

- [Configurações de aparência](../appearance/appearance-settings.md)
- [Ações de mensagem](../chats/messages.md)
- [Enviar mensagens e streaming](../chats/sending-and-streaming.md)
- [Exportar e importar chats](../chats/export-import.md)
- [Onde Marinara salva os seus dados](../data/where-data-is-stored.md)
- [Atualizando Marinara Engine](../UPGRADING.md)
- [Solução de problemas do Marinara Engine](../TROUBLESHOOTING.md)
- [Conquistas](../home/achievements.md)
- [Extensões pessoais](../extending/personal-extensions.md)
- [Localização da interface](../development/localization.md)
