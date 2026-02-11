

## Novos tipos de no no Flow Builder: Delay e Timer

### Resumo

Adicionar dois novos tipos de no ao editor visual de fluxos:

1. **Delay (Espera)** - Pausa configuravel entre mensagens (ex: aguardar 5 segundos antes de enviar a proxima)
2. **Timer (Timeout)** - Se o lead nao responder em X minutos, segue por um caminho alternativo

### Detalhes de cada no

**Delay:**
- Tipo: `delay`
- Configuracao: `delay_seconds` (numero de segundos para aguardar)
- Comportamento: apos a espera, segue automaticamente para o proximo no conectado
- Sem mensagem enviada, apenas uma pausa
- Icone: Clock (relogio)
- Cor: bg-cyan-500

**Timer:**
- Tipo: `timer`
- Configuracao: `timeout_minutes` (minutos de inatividade antes de disparar o caminho alternativo)
- Comportamento: aguarda resposta do lead. Se responder, segue pelo caminho "respondeu". Se nao responder no tempo, segue pelo caminho "timeout"
- Tem duas saidas (como um condition node): "Respondeu" e "Timeout"
- Icone: Timer (ampulheta/timer)
- Cor: bg-amber-500

### Alteracoes tecnicas

**1. `src/components/flowbuilder/types.ts`**
- Adicionar `'delay' | 'timer'` ao tipo `NodeType`
- Adicionar labels em `NODE_TYPE_LABELS`: Delay = "Espera", Timer = "Timer"
- Adicionar cores em `NODE_TYPE_COLORS`: delay = cyan, timer = amber

**2. `src/components/flowbuilder/FlowNodeComponent.tsx`**
- Adicionar icones para delay (Clock) e timer (Timer) no mapa `NODE_ICONS`
- Para nos do tipo `delay`: exibir badge com o tempo configurado (ex: "Espera: 10s")
- Para nos do tipo `timer`: exibir badge com o tempo de timeout e renderizar duas opcoes fixas ("Respondeu" / "Timeout") com handles de conexao

**3. `src/components/flowbuilder/FlowNodeEditor.tsx`**
- Quando `node_type === 'delay'`: mostrar campo numerico para `delay_seconds` (salvo em `action_config.delay_seconds`)
- Quando `node_type === 'timer'`: mostrar campo numerico para `timeout_minutes` (salvo em `action_config.timeout_minutes`), sem opcoes manuais (as duas saidas sao fixas)
- Esconder campo de mensagem para delay (nao envia nada)
- Mostrar campo de mensagem para timer (mensagem opcional a enviar quando timeout)

**4. `src/components/flowbuilder/FlowToolbar.tsx`**
- Adicionar os dois novos botoes na barra: Delay (Espera) e Timer na lista `NODE_BUTTONS`

**5. `src/components/flowbuilder/useFlowBuilder.ts`**
- Atualizar `addNode` para definir `action_config` padrao para delay (`{ delay_seconds: 5 }`) e timer (`{ timeout_minutes: 10 }`)
- Para nos timer, criar automaticamente duas opcoes fixas ("Respondeu" e "Timeout") ao adicionar o no

**6. `src/components/flowbuilder/FlowCanvas.tsx`**
- Garantir que nos timer renderizem as duas saidas com handles individuais (similar a question com opcoes)

**7. `src/components/flowbuilder/FlowEdgeComponent.tsx`**
- Adicionar label visual nas edges de timer: "Respondeu" ou "Timeout" (baseado em `condition_value`)

### Nenhuma migracao de banco necessaria

Os novos tipos usam as colunas existentes:
- `node_type` (string) aceita qualquer valor
- `action_config` (jsonb) armazena os parametros de delay/timer
- As saidas do timer usam `flow_node_options` + `flow_edges` ja existentes

