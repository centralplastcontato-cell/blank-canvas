

## Adicionar modulo "Bot Festa" ao painel de modulos do Hub

### Problema
O "Bot Festa" (mensagens automaticas para convidados durante festas) nao possui um toggle no dialog de modulos do Hub, impossibilitando o admin do Hub de desativar essa funcionalidade para empresas especificas.

### Solucao
Adicionar `bot_festa` como um novo modulo no sistema de modulos da empresa, com toggle no Hub e filtragem na aba de Automacoes.

### Mudancas

#### 1. `src/hooks/useCompanyModules.ts`
- Adicionar `bot_festa: boolean` na interface `CompanyModules`
- Default: `false` (opt-in, igual flow_builder/inteligencia/agenda)
- Adicionar no `parseModules`: `bot_festa: modules.bot_festa === true`
- Adicionar no `MODULE_LABELS`: label "Bot Festa", descricao "Mensagens automaticas para convidados em festas"

#### 2. `src/components/hub/CompanyModulesDialog.tsx`
- Nenhuma mudanca necessaria - o dialog ja itera sobre `MODULE_LABELS` automaticamente, entao o novo modulo aparecera automaticamente.

#### 3. `src/components/whatsapp/settings/AutomationsSection.tsx`
- Importar `useCompanyModules` (ja importado)
- Condicionar a exibicao da tab "Bot Festa" ao modulo `bot_festa` estar habilitado
- Se desabilitado, ocultar a tab e seu conteudo

### Arquivos modificados
1. `src/hooks/useCompanyModules.ts` - Nova chave `bot_festa` na interface, defaults e labels
2. `src/components/whatsapp/settings/AutomationsSection.tsx` - Condicionar tab "Bot Festa" ao modulo habilitado

