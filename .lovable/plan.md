

## Diagnóstico

O código que envia o link do contratante (`sendClientLinkToLead` no `EventFormDialog.tsx`, linhas 1060-1066) seleciona a instância WhatsApp assim:

```typescript
const { data: instance } = await supabase
  .from("wapi_instances")
  .select("instance_id")
  .eq("company_id", currentCompany?.id)
  .order("connected_at", { ascending: false })
  .limit(1)
  .single();
```

**Problemas encontrados:**
1. **Não filtra por `status`** — pega a instância com `connected_at` mais recente, mesmo que esteja **desconectada**. Se "Vendas 1" foi a última conectada mas agora está offline, o envio falha.
2. **Não usa a unidade da festa** — ignora completamente o campo `unit` do evento. Deveria priorizar a instância da mesma unidade.
3. **Sem visibilidade** — o usuário não sabe por qual instância o link será enviado.

**Respondendo sua pergunta:** Tecnicamente o sistema *deveria* permitir enviar por qualquer instância conectada, mas hoje ele escolhe automaticamente (e mal). Não há restrição por unidade — o problema é que ele pode escolher uma instância desconectada.

## Plano de correção

### 1. Corrigir a seleção da instância para envio do link
No `EventFormDialog.tsx`, alterar a query para:
- Filtrar apenas instâncias com `status = 'connected'`
- Priorizar a instância da mesma unidade da festa (`form.unit`)
- Se não houver instância conectada na mesma unidade, usar qualquer outra conectada da empresa
- Se nenhuma estiver conectada, mostrar mensagem clara: "Nenhuma instância WhatsApp conectada"

### 2. Mostrar por qual instância o link será enviado
Após selecionar a instância, exibir um toast ou label indicando: "Link será enviado via Vendas X"

### 3. Adicionar informação de origem da festa
No `EventDetailSheet.tsx` e no cabeçalho do `EventFormDialog`, exibir a unidade da festa para o usuário saber de qual vendas ela veio.

### Arquivos a editar
- `src/components/agenda/EventFormDialog.tsx` — corrigir query de instância + mostrar qual unidade envia
- `src/components/agenda/EventDetailSheet.tsx` — exibir unidade de origem (já tem o campo `unit`, só garantir visibilidade)

