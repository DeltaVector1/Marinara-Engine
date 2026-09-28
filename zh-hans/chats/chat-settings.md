# 聊天设置总览

本指南介绍 **Chat Settings**(聊天设置) 面板，也就是单独调整某一个聊天的地方。这里先讲最基础的几项：聊天名称、连接，以及保存下来的设置组合，再指向面板里其他功能各自的详细指南。

面板里的每一项设置都只对当前聊天生效，改了不会影响别的聊天。

## 打开 Chat Settings 面板

面板要在已经打开的聊天里调出来。

1. 打开任意一个聊天。
2. 点击聊天工具栏上的齿轮按钮（悬停提示是 **Chat Settings**）。
3. **Chat Settings** 面板从侧边滑出。

面板顶部会显示带齿轮图标的 **Chat Settings** 标题。新建聊天时，这个面板会自动打开，可以立刻把设置配好。

## Chat Name

**Chat Name**(聊天名称) 这一节放的是聊天列表里显示的名字。这个名字只有自己看得到，不会发给 AI，也不会对聊天内容产生任何影响。

1. 在 **Chat Name** 这一节点击当前名字。
2. 名字变成输入框。
3. 输入新名字。
4. 按 Enter，或者点击对勾按钮确认。

## Connection

**Connection**(连接) 这一节决定这个聊天由哪家 AI 服务商的哪个模型来回复。连接就是保存下来的一套 AI 服务接入信息，包含 API 密钥和选好的模型。API 密钥是一串秘密字符，Marinara Engine 靠它来使用你在那家服务商的账号。

从下拉菜单里选一个保存好的连接。也可以选 **Random**(随机)，它每次都会从标记进随机池的连接里换一个来用。

连接本身怎么创建，见[连接 AI 服务商](../connections/connecting-to-a-provider.md)。

## 设置方案

面板最上方是 **Profile**(设置方案) 控件。设置方案就是一组保存下来的聊天设置，可以套用到别的聊天上。从下拉菜单里选一个方案，就会应用到当前聊天。

一个方案打包的是当前聊天的连接、提示词预设、智能体、工具、翻译、记忆功能、高级参数等设置。它不会动角色、用户角色、世界书、立绘、摘要、标签和场景提示词，这些始终跟着聊天本身走。

这一栏还有一排只有图标、没有文字的小按钮，鼠标悬停时会显示各自的名称：

- 磁盘图标（**Save current chat settings into this profile**）把当前聊天的设置写入选中的方案。
- 铅笔图标（**Rename profile**）给选中的方案改名。
- 文件加号图标（**Save current chat settings as a new profile**）把当前聊天的设置存成一个新方案。
- 向下箭头图标（**Import settings profile (.json)**）从 `.json` 文件载入方案。
- 向上箭头图标（**Export settings profile (.json)**）把选中的方案存成 `.json` 文件。
- 垃圾桶图标（**Delete profile**）删除选中的方案。

下拉菜单旁边是一个星标按钮。点它可以把某个方案设为当前模式下新建聊天的默认方案。以后在这个模式里新建聊天，Marinara 就会自动套用加星的方案。每个模式只能有一个默认方案。

支持这项功能的模式都自带一个 **Default**(默认) 方案。**Default** 方案不能改名、不能写入、也不能删除。套用它会把受方案控制的那些设置恢复成应用的默认值。

Game Mode 里没有方案控件。

在 Marinara 里，**预设**一词专指提示词预设。提示词预设决定系统提示词的结构和生成参数；设置方案打包的则是上面列出的那些可复用的聊天配置。完整规则见[设置方案](settings-profiles.md)。

## 聊天变量

**Chat Variables**(聊天变量)部分可以让你为一段文本命名，再把这个名字放进双大括号里重复使用。添加一个名为 `char1`、值为 `Mary` 的变量，然后在消息里输入 `{{char1}} walks in.`，AI 读到的就是 "Mary walks in."。

每一行都有 **name**(名称)和 **value**(值)。名字可以包含字母、数字和下划线，而且必须以字母或下划线开头。正好 21 个字符的名字保留给角色引用。`char` 或 `user` 这样的内置宏名称会被拒绝，因为内置宏始终优先。按 Enter 或点击输入框外部即可保存。垃圾桶按钮会删除变量。

有三点需要知道。

- 你的消息仍然显示输入的标签，只有 AI 会看到值。因此，以后修改这个值时，之前所有用过这个标签的回合也会随之改变。
- 变量只属于当前聊天。其他聊天有各自的列表，当前列表会在重启后保留。
- 它和 `{{setvar}}` 使用同一份存储。提示词章节或世界书条目设置的值也会在这里显示为可编辑的行。如果条目使用同一个名字，就会覆盖你手动输入的值。

双大括号的其他用法见[提示词宏](../prompts/macros.md)。

## 面板中的其他部分

**Chat Settings** 面板同时也是许多单聊天功能的入口，每一项都有自己的指南：

- **Persona**(用户角色) 决定你在这个聊天里扮演谁，出现在 Conversation(对话模式) 和 Roleplay(角色扮演) 聊天中。见[在聊天里选择用户角色](../characters/choosing-your-persona.md)。
- **Characters**(角色) 管理 Conversation 和 Roleplay 聊天里的角色。两个及以上角色的聊天见[群聊与 Conversation 模式群聊](group-chats.md)。
- **Party**(队伍) 只出现在 Game Mode(游戏模式) 聊天里，它取代 **Persona** 和 **Characters** 两节，把两者合并在一处。
- **Lorebooks**(世界书) 给这个聊天挂上世界设定。见[世界书总览](../lorebooks/overview.md)。
- **Agents**(智能体) 为这个聊天开启 AI 帮手。见[智能体：聊天里的 AI 帮手](../agents/agents-overview.md)。
- **Translation**(翻译) 配置消息自动翻译。见[消息翻译](../integrations/message-translation.md)。
- **Advanced Parameters**(高级参数) 为这个聊天单独覆盖温度、最大 Token 数之类的生成设置。见[生成参数](../prompts/generation-parameters.md)。

具体能看到哪几节取决于聊天模式，有些只在 Roleplay、Conversation 或 Game Mode 聊天里出现。

## 相关指南

- [管理聊天列表](managing-chats.md)
- [在聊天里选择用户角色](../characters/choosing-your-persona.md)
- [世界书总览](../lorebooks/overview.md)
- [智能体：聊天里的 AI 帮手](../agents/agents-overview.md)
- [设置方案](settings-profiles.md)
- [生成参数](../prompts/generation-parameters.md)
