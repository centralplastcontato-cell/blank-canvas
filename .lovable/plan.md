

# Resumo IA dentro do card do lead

## Problema atual
O "Resumo IA" aparece como um elemento separado, fora do card do lead (como mostra o screenshot). Isso causa uma quebra visual -- parece desconectado.

## Solucao
Mover o componente `InlineAISummary` para **dentro** do card/borda do lead, logo abaixo das informacoes (nome, score, temperatura, status).

## Alteracoes

### 1. PrioridadesTab.tsx -- componente `LeadRow`
Atualmente o `InlineAISummary` esta como irmao (sibling) do div com borda. Mover para **dentro** do div `.rounded-lg.border`, abaixo do conteudo do lead.

Estrutura atual:
```text
<>
  <div class="border rounded-lg p-3">  -- card do lead
    ...info do lead...
  </div>
  <InlineAISummary />                   -- fora do card
</>
```

Estrutura nova:
```text
<div class="border rounded-lg p-3">    -- card do lead
  ...info do lead...
  <InlineAISummary />                   -- dentro do card
</div>
```

O Fragment (`<>...</>`) deixa de ser necessario.

### 2. LeadsDoDiaTab.tsx
Mover o `InlineAISummary` para dentro da mesma `TableRow` do lead (na ultima celula ou como conteudo extra na primeira celula), em vez de usar um `TableRow` separado com `colSpan`. Alternativa: manter o TableRow extra mas remover o padding superior para que visualmente fique colado ao row do lead.

### Arquivos modificados
| Arquivo | Mudanca |
|---------|---------|
| `src/components/inteligencia/PrioridadesTab.tsx` | Mover `InlineAISummary` para dentro do div do card |
| `src/components/inteligencia/LeadsDoDiaTab.tsx` | Integrar `InlineAISummary` visualmente ao row do lead |

Nenhum arquivo novo. Sem mudancas de logica, apenas reposicionamento de componente no JSX.

