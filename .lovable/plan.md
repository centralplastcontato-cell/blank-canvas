
# Adicionar capítulo de Campanhas ao Manual PDF

## Objetivo
Incluir um novo capítulo (ch17) sobre o módulo de Campanhas no PDF de treinamento, seguindo o mesmo padrão dos capítulos existentes.

## Alterações no arquivo `src/lib/generateManualPDF.ts`

### 1. Criar a função `ch17(doc)` — "Campanhas de Marketing"

O capítulo cobrirá:

- **O que são Campanhas**: disparo de mensagens em massa via WhatsApp para leads do CRM
- **Wizard de 3 etapas**: Contexto (nome, objetivo, geração de variações com IA), Audiência (filtros de status/unidade/mês), Configuração (delay, revisão)
- **Variações de mensagem (IA)**: o sistema gera 5 variações automáticas para reduzir risco de bloqueio
- **Filtros de audiência**: status, unidade e mês de interesse
- **Configuração de envio**: intervalo entre mensagens (delay), imagem anexa
- **Acompanhamento**: progresso em tempo real, status por destinatário, execução em segundo plano
- **Dica (TipBox)**: usar variações e delays adequados para evitar bloqueio do WhatsApp

### 2. Registrar `ch17` na função `generateManualPDF`

Adicionar a chamada `ch17(doc)` após `ch16(doc)` na sequência de capítulos.

---

### Detalhes técnicos

- A função `ch17` usará os mesmos helpers: `addChapterTitle`, `addSectionTitle`, `addParagraph`, `addBulletList`, `addTipBox`, `addAlertBox`
- O número do capítulo será 17
- Nenhuma outra alteração no arquivo
