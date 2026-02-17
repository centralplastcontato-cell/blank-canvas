

# Enviar Bot do WhatsApp para Convidados da Lista de Presenca

## Conceito

Adicionar um botao "Enviar Bot" nos cards da lista de presenca (AttendanceManager) que dispara o chatbot do WhatsApp para todos os convidados que marcaram "Quer info" e possuem telefone cadastrado. O bot inicia o fluxo de qualificacao automaticamente (lp_sent), enviando fotos, PDFs e videos dos pacotes.

## Fluxo do Usuario

1. Recepcionista registra convidados na lista publica, marcando quem "quer info"
2. Admin abre a lista de presenca no painel e ve o badge "X quer info"
3. Admin clica no botao "Enviar Bot" no card
4. Sistema confirma: "Enviar bot para X convidados?"
5. Sistema envia uma mensagem inicial personalizada para cada telefone via WhatsApp
6. O bot assume automaticamente a conversa (fluxo lp_sent)

## Detalhes Tecnicos

### 1. Arquivo: `src/components/agenda/AttendanceManager.tsx`

**Adicionar botao "Enviar Bot"** no header de cada card, visivel apenas quando ha convidados com `wants_info === true` e `phone` preenchido.

- Novo icone: `MessageCircle` do lucide-react (ou `Bot`)
- Botao fica ao lado dos botoes Share, Edit, Delete
- Badge com contagem de convidados elegiveis
- Ao clicar, abre um AlertDialog de confirmacao listando os nomes

**Nova funcao `handleSendBot`:**
1. Filtra convidados elegiveis (wants_info + phone)
2. Busca a instancia WhatsApp da empresa (`wapi_instances` com `company_id` e `status = connected`)
3. Para cada convidado, chama `supabase.functions.invoke('wapi-send')` com:
   - `action: 'send-text'`
   - `phone: guest.phone` (limpo de formatacao)
   - `message`: mensagem personalizada (ex: "Ola [nome]! Voce demonstrou interesse em nossos pacotes na festa. Vou te enviar algumas opcoes!")
   - `instanceId` e `instanceToken` da instancia
   - `lpMode: true` (para criar conversa com bot_step lp_sent)
4. Mostra toast de sucesso/erro com contagem

### 2. Estado e UX

- Estado `sendingBot` para loading no botao
- AlertDialog com lista dos nomes que vao receber
- Apos envio, marca no badge quais ja receberam (opcional: campo `bot_sent_at` no guest JSON)
- Tratamento de erro individual (se um falhar, continua para os outros)

### 3. Mensagem Inicial Configuravel

A mensagem enviada usa o nome do convidado e o nome do buffet:
```
Ola, {nome}! 👋

Que bom que voce se interessou pelos nossos pacotes durante a festa no {nome_buffet}!

Vou te enviar algumas opcoes especiais. 🎉
```

O bot (wapi-webhook) assume a partir dai no fluxo `lp_sent`, enviando materiais de venda automaticamente.

### 4. Validacoes

- So mostra o botao se a empresa tem instancia WhatsApp conectada
- So envia para convidados com telefone valido (minimo 10 digitos)
- Desabilita o botao apos envio para evitar duplicatas
- Nao envia se a lista ainda nao foi finalizada (opcional)

