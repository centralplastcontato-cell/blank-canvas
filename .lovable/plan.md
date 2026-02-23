
# Suportar PDFs universais (sem faixa de convidados) nos Materiais de Venda

## Contexto

O Castelo da Diversao usa um PDF por faixa de convidados (50, 60, 70...). Ja o Planeta Divertido tem apenas 3 PDFs que devem ser enviados para TODOS os leads, independentemente da quantidade de convidados. Hoje o campo "Quantidade de Convidados" e obrigatorio para PDFs, impedindo esse modelo.

## Solucao

Adicionar a opcao "Todos (universal)" no seletor de convidados. Quando selecionada, o PDF sera salvo com `guest_count = null` e enviado para qualquer lead.

## Alteracoes

### 1. Frontend: `src/components/whatsapp/settings/SalesMaterialsSection.tsx`

**a) Adicionar opcao "Todos" no select de convidados**
- Inserir um `SelectItem` com valor `"all"` antes das opcoes numericas
- Ajustar o `onValueChange` para setar `guest_count = null` quando `value === "all"`
- Ajustar o `value` do Select para mostrar `"all"` quando `guest_count === null` e estiver editando

**b) Remover validacao obrigatoria de guest_count para PDF**
- A validacao na linha ~400 que impede salvar sem guest_count precisa permitir `null` (universal)
- A logica sera: se o usuario nao selecionou nada (nem "Todos" nem um numero), ai sim bloquear

**c) Ajustar exibicao no card**
- Quando `guest_count` for `null` em um PDF, mostrar "Todos os pacotes" em vez de "X pessoas"

### 2. Backend: `supabase/functions/wapi-webhook/index.ts`

**a) Flow Builder (`send_pdf`, linha ~1295)**
- Apos buscar PDFs ativos, considerar PDFs com `guest_count = null` como universais
- Se nao encontrar PDF para a faixa especifica, enviar todos os PDFs universais (`guest_count IS NULL`)
- Se houver PDFs universais, enviar TODOS eles (nao apenas 1)

**b) Bot original (linha ~2598)**
- Mesma logica: PDFs com `guest_count = null` sao enviados para qualquer lead
- Se nao encontrar match por faixa, enviar os universais

## Resultado esperado

- Planeta Divertido: cadastra 3 PDFs como "Todos (universal)", e os 3 sao enviados para qualquer lead qualificado
- Castelo da Diversao: continua funcionando igual, com PDFs por faixa de convidados
- Ambos os modelos coexistem na mesma plataforma
