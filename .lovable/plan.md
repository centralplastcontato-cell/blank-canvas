
## Corrigir: conversas nao aparecem ao abrir pelo Lead

### Problema
Quando voce clica em "WhatsApp" na lista de leads, o sistema busca a conversa **apenas na instancia selecionada no momento**. Se a Amanda tem conversa na instancia Trujillo, mas voce esta com Manchester selecionada, o sistema nao encontra a conversa e cria uma nova vazia -- por isso aparece "Nenhuma mensagem ainda".

Pelo Chat direto funciona porque voce ja esta na aba/instancia correta.

### Solucao
Quando o chat recebe um numero de telefone via URL (vindo da lista de leads), buscar a conversa em **todas as instancias** antes de criar uma nova. Se encontrar em outra instancia, trocar automaticamente para ela.

### O que muda para o usuario
- Clicar em "WhatsApp" na lista de leads sempre abre a conversa correta, independente de qual instancia (Manchester/Trujillo) esta selecionada
- Nao cria mais conversas vazias duplicadas

### Detalhes tecnicos

**Arquivo: `src/components/whatsapp/WhatsAppChat.tsx`**

Na funcao `fetchConversations`, quando `selectPhone` e fornecido e nao encontra correspondencia na instancia atual:

1. Antes de chamar `createNewConversation`, fazer uma query em `wapi_conversations` **sem filtro de instance_id**, buscando pelo telefone
2. Se encontrar uma conversa existente em outra instancia, trocar o `selectedInstance` para a instancia correta e selecionar aquela conversa
3. So criar conversa nova se realmente nao existir em nenhuma instancia

Trecho da logica (linhas ~1245-1265):

```
// Atual: so busca na instancia selecionada
const matchingConv = data.find(...)

// Novo: se nao encontrou, buscar em todas as instancias
if (!matchingConv) {
  const { data: crossInstanceConv } = await supabase
    .from("wapi_conversations")
    .select("id, instance_id, contact_phone, contact_name, ...")
    .or(phoneVariants.map(p => `contact_phone.ilike.%${p}%`).join(','))
    .order("last_message_at", { ascending: false })
    .limit(1)
    .single();
    
  if (crossInstanceConv) {
    // Trocar para a instancia correta
    const targetInstance = instances.find(i => i.id === crossInstanceConv.instance_id);
    if (targetInstance) {
      setSelectedInstance(targetInstance);
      setSelectedConversation(crossInstanceConv);
      onPhoneHandled?.();
      return;
    }
  }
}
```

Nenhuma alteracao de banco de dados necessaria.
