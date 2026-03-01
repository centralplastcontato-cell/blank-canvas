

## Cronometro Regressivo no Intervalo de Seguranca

### O que muda
Substituir o texto estatico "Aguardando ~60s de intervalo de seguranca..." por um **cronometro regressivo em tempo real** que conta os segundos restantes (ex: "Proximo envio em 47s").

### Como funciona

Hoje o `randomDelay` e uma Promise opaca -- nao da feedback do tempo restante. A solucao:

1. Substituir o `randomDelay` por uma logica que calcula o tempo total do delay e armazena em um estado `countdown` (numero de segundos restantes)
2. Um `useEffect` com `setInterval` de 1s decrementa o `countdown` enquanto `progress?.waiting === true`
3. O texto "Aguardando ~60s..." passa a mostrar o countdown real: "Proximo envio em 47s ⏳"
4. O banner flutuante (minimizado) tambem mostra o countdown

### Alteracoes

**Arquivo: `src/components/freelancer/SendScheduleToGroupsDialog.tsx`**
- Novo estado: `countdown` (number | null)
- No loop `handleSend`, antes do delay: calcular o tempo total (delaySeconds + random 0-2s), setar `countdown` com esse valor
- Novo `useEffect`: quando `countdown > 0`, decrementa a cada 1s; quando chega a 0, seta null
- Substituir texto "Aguardando ~{delaySeconds}s..." pelo countdown real no dialog e no banner flutuante
- Remover a funcao `randomDelay` isolada; integrar o delay com o countdown

**Arquivo: `src/components/freelancer/SendAssignmentsToGroupsDialog.tsx`**
- Mesmas alteracoes (mesmo padrao de codigo)

### Detalhes tecnicos

```text
Antes:  "Aguardando ~60s de intervalo de seguranca..."
Depois: "Proximo envio em 47s ⏳"
```

O delay continua sendo randomizado (delaySeconds + 0-2s), mas agora o usuario ve a contagem regressiva real. O `useEffect` com interval garante que o countdown atualiza a cada segundo sem interferir no loop de envio.

