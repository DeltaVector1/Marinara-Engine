# Conectando a um provedor de IA

Neste guia você aprende a conectar Marinara Engine a um provedor de IA para que os personagens consigam responder. Você vai criar uma conexão, colar a chave de API, escolher um modelo e testar se tudo funciona.

## O que é uma conexão

A conexão é uma configuração salva que ensina Marinara Engine a chegar até um serviço de IA. Cada conexão guarda quatro informações: o provedor, a chave de API ou o login, a URL base (o endereço do serviço na web) e o modelo.

A chave de API é um código secreto fornecido pelo provedor de IA. Ela funciona como uma senha. É o que permite Marinara conversar com o serviço de IA usando a sua conta lá. Marinara criptografa a chave antes de salvar, e ela nunca entra na exportação de uma conexão.

Marinara Engine não vem com uma conexão pronta nem com uma chave gratuita de teste. Uma instalação nova tem zero conexões. Crie pelo menos uma conexão antes de começar um chat.

## Como abrir o painel Connections

As conexões ficam no painel **Connections** (Conexões), no lado direito do aplicativo.

Se você ainda não tem nenhuma conexão e tenta começar um chat, Marinara mostra a janela **Set Up** (configuração inicial). Nela existe o botão **Open Connections**. Clique nele para ir direto ao painel **Connections**.

No topo do painel aparecem três botões. Eles mostram apenas ícones, sem texto.

- O botão **New** (um ícone de mais) abre a janela **Create Connection**.
- O botão **Import** (um ícone de seta para baixo) carrega conexões de um arquivo.
- O botão **Select** (um ícone de visto) liga a seleção múltipla, para exportar ou excluir várias conexões de uma vez.

## Como criar uma conexão

Siga estes passos para adicionar o primeiro provedor:

1. No painel **Connections**, clique no botão **New** (o ícone de mais).
2. Na janela **Create Connection**, digite um nome no campo **Name**. Escolha algo fácil de reconhecer depois, por exemplo `GPT-4o Main`.
3. Em **Provider**, clique no botão do serviço que você quer, por exemplo **OpenAI**, **Anthropic** ou **OpenRouter**.
4. Clique em **Create**. Marinara cria a conexão e abre o **Connection Editor** completo para ela.
5. Localize o campo **API Key**. Cole aqui a chave do provedor. Se você ainda não tem uma chave, clique no link **Get your {Provider} API key**, logo abaixo do campo. Esse link abre a página de chaves do provedor no navegador.
6. Abra o menu suspenso **Model** e escolha um modelo. Digite na caixa **Search models…** para filtrar a lista. Se a lista estiver vazia, clique em **Fetch Models from API** para carregar os modelos que a sua conta pode usar. Marinara salva a lista buscada junto com a conexão, então o menu de modelos da área de digitação do chat pode mostrá-la depois sem buscar tudo de novo.
7. Clique em **Save**. O texto de status perto do topo muda para **Saved**.

Depois, você pode trocar o modelo sem abrir o editor: use o Quick Connection Switcher (o ícone de elo na área de digitação do chat) ou o campo **Model** em **Chat Settings → Connection**. Veja [O conjunto aleatório e o Quick Connection Switcher](organizing-connections.md#the-random-pool-and-quick-connection-switcher).

Em geral não é preciso mexer no campo **Base URL**. Marinara preenche esse campo sozinho para os provedores conhecidos. Só altere se você usa um proxy ou um servidor local.

Para ver a lista completa de provedores compatíveis, as configurações padrão de cada um e onde conseguir cada chave, veja [Provedores de IA compatíveis](providers-reference.md).

Alguns provedores usam um login local no lugar da chave de API. Nesses casos, o campo **API Key** não aparece. Veja [Conexões por assinatura do Claude, do ChatGPT e do Grok](subscription-clis.md).

Para conectar um modelo que roda no seu próprio computador, veja [Conectar um modelo local ou auto-hospedado](local-self-hosted.md).

## Como testar a conexão

Na parte de baixo do **Connection Editor** fica o card **Connection Tests**. Use esses testes para confirmar que tudo está certo antes de conversar.

1. Clique em **Test Connection**. Marinara verifica a chave de API junto ao provedor. Se der certo, aparece a linha verde **Connection Test: Success** com o tempo de resposta.
2. Clique em **Send Test Message**. Marinara envia a palavra "hi" para o modelo escolhido e mostra a resposta. Se der certo, aparece a linha verde **Test Message: Success** com a resposta do modelo logo abaixo.

O botão **Send Test Message** fica desativado até você escolher um modelo. Quando um teste falha, a linha fica vermelha e mostra o erro. Essa mensagem normalmente já indica o que corrigir, como uma chave errada ou um modelo desconhecido.

## Como escolher a conexão de um chat

Sozinha, a conexão não faz nada. Cada chat escolhe qual conexão vai usar.

1. Abra um chat e depois abra a seção **Chat Settings** (configurações do chat).
2. Localize a seção **Connection**.
3. Escolha a conexão no menu suspenso.

O menu suspenso traz ainda duas opções especiais. **None** significa que nenhuma conexão foi escolhida. **🎲 Random** (um ícone de dado antes da palavra Random) sorteia uma conexão diferente a cada vez, dentro do grupo aleatório. No Game Mode, a seção continua se chamando **Connection**, mas o menu suspenso dentro dela aparece como **GM / Party Model**.

Ao criar um chat novo, a janela **Set Up** pede que você escolha uma conexão antes de tudo. Escolha uma e clique em **Create Chat**.

## Erros comuns

Se um teste ou uma mensagem falhar, comece verificando estes pontos:

- Uma chave errada ou vencida no campo **API Key**. Abra a conexão, cole a chave de novo e clique em **Save**.
- Nenhum modelo escolhido. O botão **Send Test Message** fica desativado até você selecionar um modelo em **Model**.
- Uma chave do provedor errado. Cada provedor precisa da própria chave. Trocar o **Provider** limpa o campo **API Key** de propósito.
- Um endereço **Base URL** bloqueado ou fora do ar. Deixe o campo em branco para usar o padrão do provedor, a não ser que você use um servidor local ou um proxy.

Para mais soluções de erros de conexão e de geração, veja [Solução de problemas do Marinara Engine](../TROUBLESHOOTING.md).

## Guias relacionados

- [Provedores de IA compatíveis](providers-reference.md)
- [Conexões por assinatura do Claude, do ChatGPT e do Grok](subscription-clis.md)
- [Conectar um modelo local ou auto-hospedado](local-self-hosted.md)
- [Solução de problemas do Marinara Engine](../TROUBLESHOOTING.md)
