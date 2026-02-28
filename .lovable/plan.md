
## Seletor de Unidade na Aprovacao do Freelancer

### Resumo

Ao clicar em "Aprovar", o sistema verificara quantas instancias WhatsApp conectadas a empresa possui. Se houver apenas 1, envia direto. Se houver 2+, exibe um dialog para o admin escolher por qual unidade enviar a mensagem.

### Alteracoes

**Arquivo: `src/pages/FreelancerManager.tsx`**

1. Adicionar estado para o dialog de selecao de unidade:
   - `unitDialogOpen` (boolean)
   - `connectedInstances` (array de instancias com `instance_id`, `instance_token`, `unit`)
   - `pendingApprovalResponse` (o response aguardando selecao de unidade)

2. Criar um componente `UnitSelectDialog` inline (dentro do mesmo arquivo, seguindo o padrao do `PasswordConfirmDialog` ja existente):
   - Lista as instancias conectadas com nome da unidade e numero de telefone
   - Botoes para selecionar a unidade desejada
   - Loading state durante o envio

3. Refatorar `handleApproval`:
   - Manter a logica de salvar aprovacao no banco (igual hoje)
   - Quando `status === "aprovado"` e tem telefone valido:
     - Buscar TODAS as instancias conectadas (remover `.limit(1).maybeSingle()`, usar `.select(...)` sem limit)
     - Se 0 instancias: aprovar sem envio (como hoje)
     - Se 1 instancia: enviar direto pela unica instancia (sem dialog)
     - Se 2+ instancias: abrir `UnitSelectDialog` com as opcoes
   - Extrair a logica de envio de mensagem + tag de conversa em uma funcao auxiliar `sendApprovalMessage(instance, phone, freelancerName)` para reusar tanto no envio direto quanto apos selecao no dialog

4. Atualizar tambem `handleRequestPhoto` para usar a mesma logica de selecao de unidade (consistencia), pois hoje tambem pega `.limit(1)`.

### Detalhes tecnicos

O `UnitSelectDialog` sera um `Dialog` simples com:
- Titulo: "Enviar por qual unidade?"
- Lista de cards/botoes com: nome da unidade + telefone conectado
- Ao clicar, chama `sendApprovalMessage()` com a instancia selecionada e fecha o dialog

A funcao `sendApprovalMessage(instance, phone, freelancerName)` contera toda a logica que hoje esta dentro do `if (instance)` no `handleApproval`:
- Carregar template customizado
- Substituir `{nome}`
- Enviar via `wapi-send`
- Atualizar conversa (`is_freelancer`, `is_equipe`, `bot_enabled`)
- Qualificar lead como `trabalhe_conosco`
- Mostrar toast de sucesso

Nenhuma alteracao no banco de dados necessaria.
