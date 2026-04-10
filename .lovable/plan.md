

## Problema

Quando um opcional (ex: "Cobertura Fotográfica R$500") é adicionado a uma festa que já tinha parcelas criadas, o `total_value` do evento é atualizado e o resumo financeiro mostra o valor pendente correto (R$500). Porém, **não é criada uma parcela para esse valor adicional**, então o usuário não tem como dar baixa nesse pendente pelo card lateral.

## Solução

Criar automaticamente uma parcela pendente quando o `EventFormDialog` salva um evento com valor total maior do que a soma das parcelas existentes.

### 1. Detectar diferença ao salvar evento (EventFormDialog.tsx)

Após o `onSubmit` bem-sucedido (na edição, não na criação), verificar:
- Buscar parcelas existentes em `event_payments` para o evento
- Calcular: `diferença = novo grandTotal - soma das parcelas existentes`
- Se `diferença > 0`, inserir automaticamente uma nova parcela do tipo `parcela` com:
  - `amount = diferença`
  - `status = 'pending'`
  - `due_date = hoje`
  - `payment_method = null`
  - `notes = "Adicional - [nome do opcional adicionado]"` (quando possível identificar)
- Registrar na timeline financeira: "Parcela de R$ X criada (adicional)"

### 2. Lógica de detecção inteligente

Para evitar criar parcelas duplicadas, a lógica só dispara quando:
- O evento já existia (edição, não criação)
- O novo `grandTotal` é maior que a soma de todas as parcelas (pagas + pendentes)
- A diferença é > R$0,01

### Arquivos a editar
- `src/components/agenda/EventFormDialog.tsx` — adicionar lógica pós-save para criar parcela do diferencial

### Resultado esperado
Ao adicionar "Cobertura Fotográfica R$500" e salvar, uma parcela pendente de R$500 aparecerá automaticamente no card lateral financeiro, pronta para o usuário dar baixa.

