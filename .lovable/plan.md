

# Protecao Anti-Bloqueio no SendBotDialog

## O que sera feito

Atualizar o componente `SendBotDialog.tsx` para incluir 3 camadas de protecao contra bloqueio do WhatsApp:

1. **10 mensagens rotativas** que ciclam automaticamente
2. **Delay editavel** entre envios (min/max em segundos)
3. **Progresso em tempo real** durante o envio

---

## Mudancas no arquivo `src/components/agenda/SendBotDialog.tsx`

### Pool de 10 mensagens

Array constante `BOT_MESSAGES` com 10 variacoes usando placeholders `{name}` e `{company}`:

```text
1. "Ola, {name}! Que bom que voce se interessou pelos nossos pacotes na festa no {company}! Vou te enviar opcoes especiais. "
2. "Oi {name}! Vi que voce curtiu nosso espaco durante a festa no {company}. Tenho novidades incriveis pra te mostrar! "
3. "E ai, {name}! Que legal que voce demonstrou interesse no {company}! Deixa eu te mostrar uns pacotes especiais "
4. "{name}, tudo bem? Soube que voce gostou do nosso espaco no {company}! Vou compartilhar umas opcoes com voce "
5. "Ola {name}! Fico feliz que tenha se interessado pelo {company}! Preparei algumas opcoes especiais pra voce "
6. "Oi {name}, aqui e do {company}! Vi que voce quer conhecer nossos pacotes. Vou te enviar tudo! "
7. "{name}, que bom ter voce por aqui! Vou te mostrar as opcoes do {company} que preparamos "
8. "Ola {name}! Do {company} aqui. Soube do seu interesse e quero te apresentar nossos pacotes! "
9. "Oi {name}! Voce demonstrou interesse durante a festa no {company}, ne? Tenho opcoes incriveis! "
10. "{name}, prazer! Aqui e do {company}. Vi que voce quer saber mais sobre nossos pacotes. Vamos la! "
```

Funcao `getNextMessage(index, name, company)` usa `index % 10` para ciclar.

### Delay editavel

- Dois campos numericos no dialog: **Min (s)** e **Max (s)**
- Padrao: min = 8, max = 15
- Validacao: min >= 5, max >= min, max <= 30
- Funcao `randomDelay(min, max)` gera espera aleatoria entre os valores

### Progresso em tempo real

- Novo estado `progress: { current: number, total: number } | null`
- Durante envio, o dialog mostra:
  - "Enviando 2 de 5..." com barra de progresso visual (componente Progress)
  - "Aguardando intervalo de seguranca..." entre envios
- A lista de convidados e substituida pelo progresso durante o envio
- Botao cancelar fica desabilitado durante o envio

### Novos imports

- `Input` de `@/components/ui/input`
- `Label` de `@/components/ui/label`
- `Progress` de `@/components/ui/progress`

### Layout do dialog atualizado

```text
Antes do envio:
  ┌─────────────────────────────────────┐
  │ Enviar Bot do WhatsApp              │
  │                                     │
  │ O bot sera enviado para 5 convid... │
  │ - Maria -- (11) 99999-9999          │
  │ - Joao -- (11) 88888-8888           │
  │ ...                                 │
  │                                     │
  │ Intervalo de seguranca (segundos)   │
  │ [Min: 8 ]  [Max: 15]               │
  │ Protege seu numero contra bloqueio  │
  │                                     │
  │ [Cancelar]  [Enviar para 5]         │
  └─────────────────────────────────────┘

Durante o envio:
  ┌─────────────────────────────────────┐
  │ Enviando mensagens...               │
  │                                     │
  │ Enviando 2 de 5...                  │
  │ [=========>                    ] 40%│
  │ Aguardando ~12s para o proximo...   │
  │                                     │
  │ [Cancelar desabilitado]             │
  └─────────────────────────────────────┘
```

## Resumo tecnico

| Item | Detalhe |
|---|---|
| Arquivo editado | `src/components/agenda/SendBotDialog.tsx` |
| Novos estados | `minDelay`, `maxDelay`, `progress` |
| Novas funcoes | `getNextMessage()`, `randomDelay()` |
| Nova constante | `BOT_MESSAGES` (10 templates) |
| Componentes adicionais | `Input`, `Label`, `Progress` |

