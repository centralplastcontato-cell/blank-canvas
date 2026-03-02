

## Separar Titulo e Tipo de Campanha

### Problema
Hoje o "Titulo da campanha" serve tanto como nome da campanha quanto como tema para orientar a geracao de imagem. Isso mistura duas funcoes diferentes. O usuario quer separar:
1. **Titulo** - nome livre da campanha (ex: "Promo Marco 2026")
2. **Tipo de campanha** - tema/ocasiao que orienta a IA na geracao de imagens e conteudo (ex: "Dia dos Pais", "Volta as Aulas")

### Solucao
Adicionar um campo **"Tipo da campanha"** (select dropdown) separado do titulo. O tipo selecionado sera persistido no draft e usado como `campaign_theme` em todas as chamadas de geracao de imagem, garantindo que mesmo ao regenerar a imagem, o tema seja mantido.

### Mudancas

**1. `CampaignWizard.tsx` - Atualizar o tipo CampaignDraft**

Adicionar campo `campaignType` ao tipo:

```text
export interface CampaignDraft {
  name: string;
  campaignType: string;   // <-- NOVO
  description: string;
  ...
}
```

Inicializar com string vazia no estado inicial.

**2. `CampaignContextStep.tsx` - Reestruturar a UI**

Separar a lista de sugestoes em duas partes:

- **Titulo da campanha**: Input de texto livre (sem a lista de sugestoes acoplada). Manter o placeholder "Ex: Promocao Abril 2026".

- **Tipo da campanha** (novo campo): Um `Select` dropdown com as opcoes extraidas da lista atual `CAMPAIGN_NAME_SUGGESTIONS`, agrupadas por categoria:
  - Datas comemorativas: Esquenta de Carnaval, Volta as Aulas, Dia das Maes, Dia dos Pais, Ferias de Julho, Mes das Criancas, Black Friday, Natal Magico, etc.
  - Sazonais: Liquidacao de Verao, Especial Primavera, Feriado Prolongado
  - Promocoes genericas: Mes do Consumidor, Super Promocao, etc.
  - Urgencia: Oportunidade Relampago, Ultima Chance, etc.
  - Reengajamento: Convite Especial, Reativacao de Leads

Ao selecionar um tipo, o campo `description` sera preenchido automaticamente com a descricao correspondente (comportamento similar ao atual, mas sem alterar o titulo).

**3. `CampaignContextStep.tsx` - Atualizar chamadas de IA**

Em `handleGenerateImage` e `handleEnhanceWithAI`, usar `draft.campaignType` em vez de `draft.name` como `campaign_theme`:

```text
// handleGenerateImage
campaign_theme: draft.campaignType || draft.name || null

// handleEnhanceWithAI  
context: [draft.campaignType, draft.description].filter(Boolean).join(" - ") || null
```

Isso garante que ao regenerar imagens, o tipo selecionado sempre sera mantido como referencia visual.

**4. Layout final do formulario**

A ordem dos campos sera:
1. Titulo da campanha (input livre)
2. Tipo da campanha (select dropdown com categorias)
3. Descreva o objetivo (textarea, preenchido automaticamente ao selecionar tipo)
4. Botao gerar variacoes
5. Imagem

### Arquivos Modificados

1. `src/components/campanhas/CampaignWizard.tsx` - adicionar `campaignType` ao CampaignDraft e ao estado inicial
2. `src/components/campanhas/CampaignContextStep.tsx` - separar titulo/tipo, novo Select, atualizar chamadas de IA
