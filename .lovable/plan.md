

## Plano: Grade de preços customizável por empresa

### O que muda

Hoje a grade de preços usa colunas fixas (Seg-Qui, Sexta, Sab-Dom, Vespera, Feriado) e faixas fixas (50, 60, 70, 80, 90, 100). A infraestrutura já suporta configuração customizada via `company.settings.day_type_config` e `company.settings.guest_tiers`, mas não existe UI para o usuário configurar isso.

A solução é adicionar um editor inline diretamente na tela de Pacotes, permitindo que cada buffet defina suas próprias colunas de dias e faixas de convidados.

### Como vai funcionar

1. **Botão "Configurar Grade"** ao lado do título "Pacotes" — abre um dialog de configuração
2. **Seção "Tipos de Dia"** — lista editável onde o usuário pode:
   - Adicionar uma nova coluna (ex: "Terça", "Seg + Dom", qualquer combinação livre)
   - Editar o nome/label de cada coluna
   - Remover colunas que não usa
   - Reordenar arrastando (ou com setas)
   - Opções pré-definidas sugeridas para facilitar (Seg-Qui, Sexta, Sábado, Domingo, etc.)
3. **Seção "Faixas de Convidados"** — lista de números editável onde o usuário define as linhas (ex: 30, 40, 50 ou 100, 150, 200)
4. **Salvamento** — grava em `company.settings.day_type_config` e `company.settings.guest_tiers` via update na tabela `companies`

### Arquivos a editar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/PackagesManager.tsx` | Adicionar botão "Configurar Grade" + dialog de configuração com editor de day types e guest tiers |
| `src/components/admin/PackagePriceGrid.tsx` | Já funciona — lê de `settings`, sem mudanças necessárias |
| `src/lib/brazilian-holidays.ts` | Adicionar mais opções de keys pré-definidas (domingo, sabado, seg_ter, etc.) para o `getDayType` resolver corretamente |

### Detalhes da UI do dialog de configuração

- **Tipos de Dia**: cada item mostra um input de texto (label) + botão remover. Botão "+ Adicionar tipo de dia" no final. Um select com sugestões pré-definidas para facilitar.
- **Faixas de Convidados**: inputs numéricos em linha, com botão + para adicionar e X para remover.
- **Botão "Restaurar padrão"** para voltar à configuração original.
- Ao salvar, atualiza `companies.settings` com as novas configurações. Todos os pacotes da empresa passam a usar a nova grade automaticamente.

### Impacto

- A grade existente (`PackagePriceGrid`) já lê `day_type_config` e `guest_tiers` de settings — funciona automaticamente.
- O `EventFormDialog` também já lê essas configs — o cálculo automático de preço no evento continua funcionando.
- Dados de preço existentes em `package_price_tiers` com keys antigas continuam salvos; colunas removidas simplesmente não aparecem mais na grade.

