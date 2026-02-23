

# Corrigir: Variavel `{{empresa}}` nao substituida no bot

## Problema identificado

A mensagem de boas-vindas do Planeta Divertido mostra literalmente `{{empresa}}` ao inves do nome do buffet. Sao **3 bugs combinados**:

1. **A welcome message NAO passa pela funcao de substituicao de variaveis** - na linha 1951, o texto e concatenado diretamente sem processamento:
   ```
   msg = settings.welcome_message + '\n\n' + firstQ.question;
   // Nenhuma chamada a replaceVariables()
   ```

2. **A funcao `replaceVariables` so reconhece chaves simples `{key}`** - mas os templates usam chaves duplas `{{empresa}}`. O regex atual (`\{key\}`) nao casa com `{{empresa}}`.

3. **O nome da empresa nunca e injetado no mapa de variaveis** - a variavel `updated` contem apenas dados coletados do lead (`nome`, `mes`, `dia`, `convidados`), mas nao inclui `empresa` ou `buffet`.

Nota: o Flow Builder ja tem esse problema resolvido (linhas 1039-1079) com sua propria funcao `replaceVars` que busca o nome da empresa e suporta `{{chaves duplas}}`. A correcao consiste em alinhar o bot principal com essa mesma logica.

## Solucao

### Arquivo: `supabase/functions/wapi-webhook/index.ts`

**1. Atualizar `replaceVariables` (linha 366) para suportar chaves duplas:**

Adicionar um segundo passo de substituicao para `{{key}}` alem de `{key}`:

```text
function replaceVariables(text: string, data: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    // Primeiro tenta {{key}} (chaves duplas), depois {key} (chave simples)
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value);
    result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
  }
  return result;
}
```

**2. Buscar o nome da empresa e injetar no mapa de variaveis (antes da linha 1948):**

Buscar o nome da empresa via `companies` (mesmo padrao do FlowBuilder) e adicionar ao objeto `updated`:

```text
// Buscar nome da empresa para variaveis de template
let companyName = '';
try {
  const { data: companyData } = await supabase
    .from('companies')
    .select('name')
    .eq('id', instance.company_id)
    .single();
  companyName = companyData?.name || '';
} catch (_) { /* ignore */ }

// Injetar variaveis de empresa no mapa
updated.empresa = companyName;
updated.buffet = companyName;
updated['nome-empresa'] = companyName;
updated['nome_empresa'] = companyName;
```

**3. Processar a welcome message com replaceVariables (linha 1951):**

```text
// ANTES:
msg = settings.welcome_message + '\n\n' + (firstQ?.question || DEFAULT_QUESTIONS.nome.question);

// DEPOIS:
msg = replaceVariables(settings.welcome_message, updated) + '\n\n' + (firstQ?.question || DEFAULT_QUESTIONS.nome.question);
```

## Impacto

- Corrige `{{empresa}}` na mensagem de boas-vindas de TODAS as instancias
- Tambem corrige `{empresa}`, `{{buffet}}`, `{{nome-empresa}}`, `{{nome_empresa}}` em qualquer template do bot (completion, transfer, work_here)
- Retrocompativel: templates com chaves simples `{nome}` continuam funcionando
- Nenhuma alteracao no banco de dados necessaria
- 1 arquivo alterado + deploy da edge function

