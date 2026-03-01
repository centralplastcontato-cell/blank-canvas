

# Onboarding Guiado — com toggle por empresa no Hub

## Resumo

O checklist interativo de onboarding sera um **modulo novo** no sistema de modulos existente (`CompanyModules`). Por padrao vem **desligado** para todas as empresas. Voce ativa pelo Hub so para o Castelo da Diversao, testa, e quando estiver pronto libera para os outros buffets.

## Como funciona o toggle

O Hub ja tem o dialog "Modulos" para cada empresa (`CompanyModulesDialog`). O novo modulo aparece la como mais uma linha:

```text
+--------------------------------------------------+
| Modulos — Castelo da Diversao                     |
|--------------------------------------------------|
| WhatsApp                              [ON]        |
| CRM / Leads                           [ON]        |
| ...                                               |
| Onboarding Guiado                      [ON] <--   |
|   Checklist interativo de primeiros passos        |
+--------------------------------------------------+
```

## Alteracoes tecnicas

### 1. Registrar o modulo (`src/hooks/useCompanyModules.ts`)

- Adicionar `onboarding_checklist: boolean` na interface `CompanyModules`
- Default: `false` (desligado para todos)
- Parser: `onboarding_checklist: modules.onboarding_checklist === true`
- Label: `{ label: 'Onboarding Guiado', description: 'Checklist interativo de primeiros passos no painel' }`

### 2. Criar o hook de progresso (`src/hooks/useOnboardingProgress.ts`) ~100 linhas

Hook que verifica o progresso automaticamente via queries paralelas ao banco:

| Passo | Query |
|-------|-------|
| Conectar WhatsApp | `wapi_connections` com `status = connected` |
| Cadastrar unidades | `company_units` count > 1 |
| Preencher onboarding | `company_onboarding` com `status != pendente` |
| Personalizar landing page | `company_landing_pages` com `is_published = true` |
| Configurar fluxo de conversa | `conversation_flows` count > 0 |
| Enviar materiais de venda | Verifica `settings.sales_materials` |
| Convidar equipe | `user_companies` count > 1 |
| Assistir treinamento | Link direto (sem verificacao automatica) |

Retorna: `{ steps: Step[], completedCount: number, totalCount: number, isLoading: boolean }`

### 3. Criar o banner (`src/components/admin/OnboardingBanner.tsx`) ~80 linhas

- Card compacto no topo da Central de Atendimento
- Mostra barra de progresso (componente `Progress` existente) e texto "3 de 8 passos concluidos"
- Botao "Ver passos" abre o checklist lateral
- Botao X para dispensar (salva em `companies.settings.onboarding_checklist_dismissed`)
- Visivel apenas para `owner` ou `admin`

### 4. Criar o checklist lateral (`src/components/admin/OnboardingChecklist.tsx`) ~200 linhas

- Usa o componente `Sheet` existente (abre pela direita)
- Lista os 8 passos com icone de check verde (concluido) ou circulo vazio (pendente)
- Cada passo pendente tem botao "Ir para..." que navega para a pagina relevante
- Barra de progresso no topo
- Botao "Dispensar checklist" no rodape

### 5. Integrar na Central de Atendimento (`src/pages/CentralAtendimento.tsx`)

- Importar `OnboardingBanner`
- Verificar `modules.onboarding_checklist` antes de renderizar
- Renderizar `<OnboardingBanner />` no topo do conteudo, tanto no layout mobile quanto desktop
- So aparece para roles `owner` ou `admin`

### 6. Nao precisa de nada no Hub alem do toggle

O `CompanyModulesDialog` ja renderiza automaticamente todos os modulos de `MODULE_LABELS`. Ao adicionar a chave no passo 1, o toggle aparece sozinho no dialog do Hub.

## Fluxo do usuario (voce)

1. Acessa o Hub > Empresas > Castelo da Diversao > Modulos
2. Liga "Onboarding Guiado"
3. Faz login no painel do Castelo
4. Ve o banner no topo com o progresso
5. Clica "Ver passos" e navega pelo checklist
6. Quando aprovar, volta no Hub e liga para outros buffets

## O que NAO muda

- Nenhuma tabela nova no banco
- Nenhuma edge function nova
- Nenhuma dependencia nova
- Todos os outros buffets continuam sem ver o checklist ate voce ativar

