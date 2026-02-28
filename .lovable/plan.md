

## Indicador de status do WhatsApp + Botao de reenvio no card do Freelancer

### Problema atual
Quando um freelancer e aprovado, a mensagem do WhatsApp e enviada mas nao ha nenhum registro permanente do resultado. O administrador nao tem como saber se a mensagem foi entregue ou falhou apos fechar o toast.

### Solucao

#### 1. Adicionar colunas na tabela `freelancer_responses`
Criar uma migration com duas novas colunas:
- `whatsapp_sent_at` (timestamptz, nullable) -- quando a mensagem foi enviada com sucesso
- `whatsapp_send_error` (text, nullable) -- mensagem de erro caso tenha falhado

Quando ambas sao `null`, significa que nenhuma mensagem foi tentada ainda. Se `whatsapp_sent_at` tem valor e `whatsapp_send_error` e `null`, a mensagem foi enviada. Se `whatsapp_send_error` tem valor, houve falha.

#### 2. Atualizar a logica de envio em `FreelancerManager.tsx`

Nos metodos `sendApprovalMessage` e `sendPhotoRequest`:
- Em caso de sucesso: gravar `whatsapp_sent_at = now()` e limpar `whatsapp_send_error = null`
- Em caso de erro: gravar `whatsapp_send_error = mensagem_do_erro` e limpar `whatsapp_sent_at = null`

#### 3. Exibir indicador visual no card (linha do nome)

Na linha onde aparece o nome + badge de status (ex: "Victor - Pendente"), adicionar um pequeno icone ao lado:
- **Sucesso**: Icone de check verde com tooltip "Mensagem enviada em dd/mm/yyyy HH:mm"
- **Erro**: Icone vermelho de alerta com tooltip mostrando o erro
- **Nenhum envio**: Nada exibido (comportamento atual)

#### 4. Botao de reenviar em caso de falha

Quando `whatsapp_send_error` tem valor:
- Mostrar um botao pequeno "Reenviar" (icone de refresh + texto) ao lado do indicador de erro
- Ao clicar, reutiliza o fluxo existente (`resolveInstanceAndSend` com tipo "approval")
- Apos reenvio, atualiza os campos normalmente

### Secao tecnica

**Migration SQL:**
```sql
ALTER TABLE freelancer_responses
  ADD COLUMN whatsapp_sent_at timestamptz,
  ADD COLUMN whatsapp_send_error text;
```

**Arquivos modificados:**
- `supabase/migrations/` -- nova migration
- `src/integrations/supabase/types.ts` -- atualizar tipos gerados
- `src/pages/FreelancerManager.tsx`:
  - `sendApprovalMessage`: capturar resultado do `wapi-send` e fazer UPDATE no `freelancer_responses`
  - `sendPhotoRequest`: idem
  - Card do freelancer (area do nome): renderizar icone condicional + botao de reenvio
  - Novo handler `handleResend(response)` que chama `resolveInstanceAndSend("approval", ...)`

**Fluxo do indicador no card:**
```text
whatsapp_sent_at != null  -->  icone check verde + tooltip com data
whatsapp_send_error != null  -->  icone alerta vermelho + botao "Reenviar"
ambos null  -->  nada exibido
```

