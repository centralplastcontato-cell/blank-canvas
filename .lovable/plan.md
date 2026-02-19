
# Controle da Festa — Plano Completo de Implementação

## Respondendo suas perguntas antes de tudo

### Quais módulos incluir e como lidar com empresas que querem apenas alguns?

A solução é usar o mesmo sistema que já existe no projeto — o `CompanyModules` que fica em `companies.settings.enabled_modules`. Hoje ele controla quais abas aparecem no menu lateral. Vamos estender esse sistema para controlar também quais módulos aparecem no Controle da Festa.

Cada módulo do controle terá um toggle on/off, e o sistema já tem a tela de configuração (o `CompanyModulesDialog` no Hub) onde o admin habilita/desabilita. Só precisamos adicionar os novos módulos lá.

### Lista dos módulos do Controle da Festa

Todos esses já existem como páginas públicas — só precisamos agrupá-los:

| Módulo | Tabela usada | Link público |
|---|---|---|
| Checklist | `event_checklist_items` | integrado (inline) |
| Equipe / Financeiro | `event_staff_entries` | `/equipe/:id` |
| Manutenção | `maintenance_entries` | `/manutencao/:id` |
| Acompanhamento | `party_monitoring_entries` | `/acompanhamento/:id` |
| Lista de Presença | `attendance_entries` | `/lista-presenca/:id` |
| Informações | `event_info_entries` | `/informacoes/:id` |
| Pré-Festa | formulário existente | `/pre-festa/:slug` |
| Cardápio | formulário existente | `/cardapio/:slug` |
| Avaliação | formulário existente | `/avaliacao/:slug` |

### Onde configurar o que aparece no controle de cada empresa?

**No painel lateral do evento (EventDetailSheet), já no card da festa no calendário.** Esta é a abordagem mais elegante:

1. O admin abre o evento no calendário
2. No painel lateral já aparece um botão **"Controle da Festa"** para copiar o link
3. Logo abaixo aparece um toggle de quais módulos ficam visíveis no controle

Isso mantém tudo centralizado no contexto do evento, sem criar uma aba nova no menu lateral.

---

## Arquitetura da Solução

### Configuração por empresa (sem banco de dados novo)

Os módulos do controle serão salvos dentro do campo `companies.settings` que já existe, seguindo o mesmo padrão dos módulos do sistema:

```json
{
  "enabled_modules": { "agenda": true, ... },
  "party_control_modules": {
    "checklist": true,
    "staff": true,
    "maintenance": true,
    "monitoring": true,
    "attendance": true,
    "info": true,
    "prefesta": false,
    "cardapio": false,
    "avaliacao": false
  }
}
```

Isso significa:
- Zero migrações de banco de dados
- Admin Hub pode configurar por empresa no mesmo dialog de módulos existente
- Configuração padrão ativa os módulos mais usados (checklist, equipe, manutenção, acompanhamento, presença, informações)
- Formulários (pré-festa, cardápio, avaliação) ficam off por padrão — empresa ativa se quiser

### Como o link do controle chega ao gerente

O fluxo é simples:

```
Admin abre o calendário
  → Clica no dia da festa
  → EventDetailSheet abre (painel lateral)
  → Vê botão "🎮 Controle da Festa"
  → Clica → link copiado: /festa/{eventId}
  → Cola no WhatsApp e envia para o gerente
  → Gerente abre no celular (sem login necessário)
```

---

## Arquivos a criar e editar

### 1. Criar `src/pages/PublicPartyControl.tsx` (nova página)

A página central que o gerente abre no celular. Ela:
- Lê `eventId` da URL
- Busca dados do evento na tabela `company_events`
- Busca configuração de módulos em `companies.settings.party_control_modules`
- Busca em paralelo todos os registros vinculados ao `event_id`
- Calcula KPIs (checklist % completo, total de convidados, etc.)
- Renderiza o painel dark com os botões dos módulos habilitados

### 2. Editar `src/App.tsx`

Adicionar a rota:
```tsx
<Route path="/festa/:eventId" element={<PublicPartyControl />} />
```

### 3. Editar `src/components/agenda/EventDetailSheet.tsx`

Adicionar abaixo das informações do evento um novo bloco:

```
[ 🎮 Controle da Festa ]  ← botão grande que copia o link
```

### 4. Editar `src/hooks/useCompanyModules.ts`

Adicionar tipo e função `parsePartyControlModules()` para ler `party_control_modules` das settings da empresa.

### 5. Editar `src/components/hub/CompanyModulesDialog.tsx`

Adicionar uma seção separada "Controle da Festa — Módulos" com os toggles dos módulos operacionais.

---

## Visual da Página (baseado na sua imagem)

### Layout geral

```text
┌─────────────────────────────────────────┐
│  [Logo empresa]                         │
│  🎉 Joãozinho & Maria                   │
│  Sáb 22/03 • 13h–17h • Unidade Centro   │
├─────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐    │
│  │ ✅ 8  │  │ 🟡 3  │  │ 🔴 1  │    │
│  │ Feitos │  │ Pend.  │  │ Alerta │    │
│  └────────┘  └────────┘  └────────┘    │
│                                         │
│  ⚠ 1 item crítico — Equipe incompleta  │
├─────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐    │
│  │  📋           │  │  👥           │    │
│  │  Checklist   │  │  Equipe      │    │
│  │  8/10 ✅     │  │  Criado ✅   │    │
│  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐    │
│  │  🔧           │  │  ✅           │    │
│  │  Manutenção  │  │  Presença    │    │
│  │  Criado ✅   │  │  42 guests   │    │
│  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐    │
│  │  📄           │  │  ℹ️            │    │
│  │  Formulários  │  │  Informações │    │
│  └──────────────┘  └──────────────┘    │
├─────────────────────────────────────────┤
│  [Início]  [Pendências 3]  [Checklist]  │
└─────────────────────────────────────────┘
```

### Detalhes do visual dark

- Fundo: `bg-slate-900` com gradiente suave para `bg-slate-800`
- Header: dados da festa com logo da empresa
- KPI cards: borda colorida (verde/amarelo/vermelho) com número grande
- Botões de módulo: grade 2×N, cada um com gradiente de cor próprio, ícone grande e status abaixo
- Bottom navigation: 3-4 abas fixas no rodapé
- Totalmente otimizado para celular (touch-friendly, botões grandes)

### Cores por módulo (igual ao mockup)

| Módulo | Gradiente |
|---|---|
| Checklist | `from-emerald-500 to-green-700` |
| Equipe | `from-blue-500 to-blue-800` |
| Manutenção | `from-slate-500 to-slate-700` |
| Presença | `from-orange-500 to-amber-600` |
| Formulários | `from-purple-500 to-violet-700` |
| Informações | `from-cyan-500 to-blue-700` |
| Pré-Festa | `from-pink-500 to-rose-700` |
| Cardápio | `from-yellow-500 to-orange-600` |
| Avaliação | `from-teal-500 to-emerald-700` |

---

## Status de cada módulo (o que aparece no botão)

Cada botão mostra um sub-status dinâmico:

- **Checklist**: "8 de 10 concluídos" ou "Vazio" se sem itens
- **Equipe**: "Registrado" ou "Não criado" (cinza/apagado)
- **Manutenção**: "Registrado" ou "Não criado"
- **Presença**: "42 convidados" ou "Não criado"
- **Acompanhamento**: "X itens marcados" ou "Não criado"
- **Informações**: "N blocos" ou "Não criado"
- **Formulários**: abre submenu com pré-festa / cardápio / avaliação

Se o módulo não foi criado ainda, o botão fica com opacidade reduzida mas ainda clicável (leva ao módulo correspondente para criação).

---

## Resumo das mudanças

| Arquivo | Ação |
|---|---|
| `src/pages/PublicPartyControl.tsx` | Criar — nova página pública |
| `src/App.tsx` | Editar — +1 rota `/festa/:eventId` |
| `src/components/agenda/EventDetailSheet.tsx` | Editar — botão "Controle da Festa" |
| `src/hooks/useCompanyModules.ts` | Editar — novo tipo `PartyControlModules` |
| `src/components/hub/CompanyModulesDialog.tsx` | Editar — seção de módulos do controle |

**Zero novas tabelas. Zero migrações de banco.**
