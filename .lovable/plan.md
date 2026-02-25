

# Corrigir {{empresa}} no webhook principal (wapi-webhook)

## Problema identificado

A mensagem "Otima escolha! Nossa equipe vai entrar em contato para agendar sua visita ao {{empresa}}!" aparece com o placeholder bruto porque:

1. O `next_step_visit_response` salvo no banco contem `{{empresa}}`
2. Na linha 2481, o `msg = responseMsg` e atribuido **sem** passar por `replaceVariables()`
3. O mesmo ocorre potencialmente com `next_step_questions_response` e `next_step_analyze_response`
4. No bloco de leads qualificados (linha 1949), o mapa de variaveis nao inclui `empresa`/`buffet`

## Pontos de correcao

### 1. Aplicar `replaceVariables` nas respostas de proximo_passo (problema principal)

**Arquivo**: `supabase/functions/wapi-webhook/index.ts`
**Linha ~2481**: onde `msg = responseMsg` e atribuido sem replace.

Alterar para:
```
msg = replaceVariables(responseMsg, updated);
```

Como `updated` ja contem as chaves `empresa`, `buffet`, `nome_empresa`, `nome-empresa` (injetadas nas linhas 2050-2053), isso resolve o bug da screenshot.

### 2. Adicionar suporte a espacos opcionais no `replaceVariables`

**Linhas 412-420**: a regex atual `\\{\\{key\\}\\}` nao suporta `{{ empresa }}` (com espacos).

Alterar para:
```typescript
function replaceVariables(text: string, data: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Suporta {{ key }}, {{key}} e {key}
    result = result.replace(new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, 'gi'), value);
    result = result.replace(new RegExp(`\\{${escaped}\\}`, 'gi'), value);
  }
  return result;
}
```

### 3. Injetar `empresa` no mapa de leads qualificados da LP

**Linhas 1949-1954**: o `leadData` para leads que ja vieram qualificados pela Landing Page nao inclui variaveis de empresa.

Adicionar:
```typescript
const leadData: Record<string, string> = {
  nome: existingLead.name,
  mes: existingLead.month || '',
  dia: dayDisplay,
  convidados: existingLead.guests || '',
  empresa: companyName,
  buffet: companyName,
  'nome-empresa': companyName,
  'nome_empresa': companyName,
};
```

Isso requer buscar `companyName` antes desse bloco (similar ao que ja e feito na linha 2039-2047).

### 4. Garantir que `transfer_message` e `work_here_response` tambem passem pelo replace

As mensagens de transferencia (linha 2131) e trabalho (linha 2201) ja usam `replaceVariables` -- esta OK.

A mensagem de conclusao (linha 2380) tambem ja usa -- esta OK.

O unico ponto faltante e o bloco de `proximo_passo` (linhas 2449-2481).

## Resumo das alteracoes

| Local | Problema | Correcao |
|-------|----------|----------|
| Linha 2481 | `msg = responseMsg` sem replace | `msg = replaceVariables(responseMsg, updated)` |
| Linhas 412-418 | Regex nao suporta espacos `{{ key }}` | Adicionar `\\s*` na regex |
| Linhas 1949-1954 | Mapa de lead qualificado sem `empresa` | Injetar aliases de empresa |

## Resultado esperado

- Toda mensagem configuravel que use `{{empresa}}`, `{empresa}`, `{{ empresa }}`, `{buffet}`, `{{nome_empresa}}` ou variacoes sera substituida corretamente pelo nome da empresa
- A mensagem "Otima escolha!" exibira "Planeta Divertido" ao inves de `{{empresa}}`
- Cobertura completa em todos os caminhos do bot (welcome, completion, proximo_passo, transfer, work_interest, leads qualificados)

