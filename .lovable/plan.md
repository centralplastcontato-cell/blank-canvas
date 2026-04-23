

## Resumo da Festa como módulo no Controle da Festa (público)

### O que será feito

Adicionar uma nova aba "Resumo" no `PublicPartyControl.tsx` que exibe as informações consolidadas da festa (aniversariante, pais, pacote, convidados, opcionais, observações). Isso torna o resumo acessível diretamente na Central de Controle da Festa, não apenas no card lateral interno.

### Estrutura visual

A bottom nav passará de 3 para 4 abas:
```text
🏠 Início  |  📋 Resumo  |  ⏳ Pendentes  |  ✅ Checklist
```

A aba "Resumo" exibirá:
- Aniversariante(s) — nome e idade
- Pais / Contratante
- Pacote
- Convidados
- Horário
- Unidade
- Opcionais (nome + valor)
- Observações do evento

### Etapas técnicas

#### 1. Criar/atualizar RPC `get_event_public_info` (migração SQL)
Adicionar os campos que faltam na RPC pública:
- `child_name`, `child_age`, `birthday_children`, `parent_names`, `event_optionals`, `notes`

Isso permite que a página pública acesse esses dados sem RLS.

#### 2. Atualizar `PublicPartyControl.tsx`
- Expandir a interface `PartyEvent` com os novos campos.
- Adicionar tab type `"summary"` ao `TabType`.
- Adicionar a aba "Resumo" na bottom nav (entre Início e Pendentes).
- Renderizar a aba com as informações da festa no mesmo estilo visual dark/neon da página.
- Exibir cada campo com ícone/emoji e label, seguindo o padrão visual existente.

#### 3. Adicionar módulo "Resumo" na grid de módulos (Home)
- Adicionar um card "Resumo" na home que navega para a aba de resumo (como o Checklist faz).

### Arquivos alterados
- `src/pages/PublicPartyControl.tsx` — nova aba + card de módulo
- Nova migração SQL — expandir RPC `get_event_public_info`

### Resultado esperado
Ao abrir o Controle da Festa (público), o operador pode clicar em "Resumo" e ver todas as informações da festa consolidadas, sem precisar acessar o painel interno.

