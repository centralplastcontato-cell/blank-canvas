

# Ajuste no Capitulo 15 -- Primeiros Passos

## Problema identificado

O Passo 4 original dizia "Criar primeira Landing Page", mas quem cria a LP e o administrador da Celebrei (Hub), nao o buffet. O manual e direcionado ao usuario do buffet, entao precisa refletir acoes que ele realmente executa.

## Alteracao

Substituir o **Passo 4** de "Criar primeira Landing Page" por **"Criar seu primeiro evento na Agenda"**, e mover o antigo Passo 5 (evento) para Passo 4. O novo Passo 5 sera **"Testar o fluxo de captura de leads"** -- verificar que leads da LP/WhatsApp chegam no Kanban.

### Nova sequencia do Capitulo 15:

1. **Passo 1**: Configurar dados da empresa (nome, logo, endereco, telefone)
2. **Passo 2**: Personalizar seu funil de vendas (etapas do Kanban)
3. **Passo 3**: Conectar WhatsApp (escanear QR Code, testar envio)
4. **Passo 4**: Criar primeiro evento na Agenda (testar fluxo operacional)
5. **Passo 5**: Testar o fluxo de captura de leads (verificar se leads chegam no CRM via LP ou WhatsApp)
6. **Passo 6**: Criar primeiro usuario da equipe (adicionar com permissoes corretas)

### TipBox atualizada

"A Landing Page do seu buffet e configurada pela equipe Celebrei durante o onboarding. Seu papel e garantir que o WhatsApp esteja conectado para que o bot funcione corretamente."

## Alteracao tecnica

No arquivo `src/lib/generateManualPDF.ts`, na funcao `ch15`:
- Reescrever os blocos de conteudo dos Passos 4, 5 e 6
- Atualizar as TipBox e AlertBox para refletir a nova sequencia
- Adicionar AlertBox: "A Landing Page e criada pela equipe Celebrei. Voce nao precisa se preocupar com isso -- apenas verifique se os leads estao chegando no seu painel."

## O que NAO muda

- Capitulos 1-14 e 16 permanecem intactos
- Nenhuma dependencia ou banco alterado
- Botoes de download continuam funcionando
