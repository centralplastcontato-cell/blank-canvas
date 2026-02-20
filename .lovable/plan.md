
# Correção dos 3 bugs do Fluxo Comercial V2

## Diagnóstico Técnico

### Bug 1: `{Vitor}` com chaves
O template do nó "Tipo de Contato" usa `{{nome}}` (chaves duplas). A função `replaceVars` no webhook usa regex `\{nome\}` que localiza `{nome}` *dentro* de `{{nome}}`, substituindo apenas a parte interna e deixando a chave exterior — produzindo `{Vitor}`.

### Bug 2: `{{mes}}`, `{{dia}}`, `{{convidados}}` não substituídos
Os templates usam nomes de variáveis como `{{mes}}`, `{{convidados}}`, mas os dados coletados usam as chaves técnicas `event_date` e `guest_count`. Não há mapeamento entre eles. Além disso, `{{dia}}` referencia um campo que nenhum nó captura.

### Bug 3: Sábado sem restrição de horário
A opção "No sábado" vai direto para o nó "Melhor Período" que exibe Manhã, Tarde e Noite — mas aos sábados o buffet só atende até ao meio-dia. Falta um ramo exclusivo para sábado.

---

## Solução

### Parte 1 — Corrigir `replaceVars` no webhook

**Arquivo:** `supabase/functions/wapi-webhook/index.ts` (função `replaceVars` linha ~706)

A nova função irá:
1. Suportar **chaves duplas** `{{chave}}` além de `{chave}`
2. Adicionar um **mapa de aliases** que traduz os nomes dos templates para as chaves reais dos dados coletados:

```
nome        → customer_name
mes         → event_date
convidados  → guest_count
dia         → (removido do template — ver abaixo)
```

Lógica nova:
```typescript
const replaceVars = (text: string) => {
  const aliasMap: Record<string, string> = {
    nome: data.customer_name || contactName || contactPhone,
    mes: data.event_date || '',
    convidados: data.guest_count || '',
    dia: data.visit_day || '',
  };

  let result = text;

  // Replace {{key}} and {key} for collected data + aliases
  const allVars = { ...data, ...aliasMap };
  for (const [key, value] of Object.entries(allVars)) {
    const safeValue = String(value ?? '');
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), safeValue);
    result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), safeValue);
  }
  return result;
};
```

### Parte 2 — Ajustar template da "Confirmação do Resumo"

O template atual usa `{{dia}}` que não é capturado por nenhum nó. A correção remove essa linha ou a substitui por algo que faz sentido (ex: o dia da semana escolhido para a visita). Como o fluxo captura o período da visita mas não um dia específico, o `{{dia}}` será removido do template de confirmação via SQL UPDATE.

**Template corrigido para "Confirmação do Resumo":**
```
Perfeito, {nome}! 🎊

Deixa eu confirmar o que você me disse:

📅 *Mês:* {mes}
👥 *Convidados:* {convidados}

Agora vou te mostrar nosso espaço incrível! 😍
```

### Parte 3 — Novo ramo para Sábado no Flow Builder

**Estrutura atual:**
```
Proposta de Visita → [No sábado] → Melhor Período (Manhã/Tarde/Noite)
```

**Estrutura após correção:**
```
Proposta de Visita → [Durante a semana] → Melhor Período (Manhã/Tarde/Noite) → Confirmação de Visita
Proposta de Visita → [No sábado]        → Período Sábado (só Manhã)          → Confirmação de Visita
```

**Mudanças no banco de dados (SQL):**

1. Criar novo nó `Período – Sábado` (tipo `question`, `extract_field: preferred_slot`) com a mensagem:
   > "Ótimo! Aos sábados o buffet atende até às 12h. 😊 Sua visita seria no período da manhã, combinado?"

2. Criar opção única para esse nó: `Manhã (até meio-dia)`

3. Redirecionar a aresta "No sábado" → `Período – Sábado` (em vez de "Melhor Período")

4. Criar aresta de `Período – Sábado` → `Confirmação de Visita` (mesmo nó de destino do "Melhor Período")

---

## Arquivos / Recursos Alterados

| Recurso | Tipo de mudança |
|---|---|
| `supabase/functions/wapi-webhook/index.ts` | Corrigir `replaceVars` (chaves duplas + aliases) |
| Banco: `flow_nodes` (Confirmação do Resumo) | Remover `{{dia}}` do template |
| Banco: `flow_nodes` | Inserir nó "Período – Sábado" |
| Banco: `flow_node_options` | Inserir opção "Manhã (até meio-dia)" |
| Banco: `flow_edges` | Redirecionar "No sábado" + nova aresta para confirmação |
| Deploy | Re-deploy de `wapi-webhook` |
