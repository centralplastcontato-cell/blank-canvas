

## Exibir lista de grupos com status de envio em tempo real

### O que muda

Substituir a tela de progresso genérica ("Enviando 2 de 4...") por uma **lista scrollable dos grupos selecionados**, onde cada grupo mostra seu status em tempo real:

- **Pendente**: icone cinza (relogio ou circulo vazio)
- **Enviando**: spinner animado
- **Enviado**: checkmark verde
- **Falha**: X vermelho

### Como funciona

1. Adicionar um novo estado `groupStatuses` (Map de group.id para "pending" | "sending" | "sent" | "error")
2. No loop `handleSend`, antes de enviar para cada grupo, setar status "sending"; apos resultado, setar "sent" ou "error"
3. Na tela de envio (onde hoje mostra apenas a barra de progresso), renderizar uma ScrollArea com a lista dos grupos selecionados, cada um com seu icone de status
4. Manter a barra de progresso no topo como resumo geral
5. O grupo sendo enviado no momento fica destacado visualmente

### Detalhes tecnicos

**Arquivo: `src/components/freelancer/SendScheduleToGroupsDialog.tsx`**

- Novo estado: `const [groupStatuses, setGroupStatuses] = useState<Map<string, "pending" | "sending" | "sent" | "error">>(new Map())`
- No inicio de `handleSend`: inicializar todos os grupos selecionados como "pending"
- No loop, antes do envio: setar o grupo atual como "sending"
- Apos sucesso/erro: setar como "sent" ou "error"
- Substituir o bloco `sending` (linhas 360-374) por:
  - Barra de progresso + texto no topo
  - ScrollArea com lista dos grupos mostrando nome + icone de status
  - Texto de intervalo de seguranca quando aguardando
  - Texto sobre minimizar

- Icones por status:
  - pending: `Clock` ou circulo cinza
  - sending: `Loader2` com animate-spin
  - sent: `CheckCircle2` verde
  - error: `XCircle` vermelho

### Layout visual

```text
+------------------------------------+
| Enviando 2 de 4...                 |
| [=========>          ] 50%         |
| Aguardando ~60s...                 |
+------------------------------------+
| [ ] Grupo Freelancers SP    [sent] |
| [o] Grupo Monitores RJ  [sending] |
| [ ] Grupo Equipe BH     [pending] |
| [ ] Grupo Staff Curitiba[pending] |
+------------------------------------+
| Voce pode minimizar...            |
+------------------------------------+
```

Nenhum arquivo novo necessario -- apenas alteracoes em `SendScheduleToGroupsDialog.tsx`.
