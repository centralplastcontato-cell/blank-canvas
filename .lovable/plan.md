

## Botao "Solicitar Foto via WhatsApp" no painel de freelancers

### O que sera feito

Adicionar um botao no card de cada freelancer que nao tem foto, permitindo que o admin envie uma mensagem automatica via WhatsApp pedindo que o freelancer envie sua foto. O botao aparecera apenas para freelancers sem `photo_url` e que tenham telefone cadastrado.

### Mudancas

**Arquivo: `src/pages/FreelancerManager.tsx`**

1. Importar `MessageCircle` do lucide-react (icone do WhatsApp)
2. No componente `FreelancerResponseCards`, adicionar:
   - Estado `sendingPhotoRequest` para controlar loading por resposta
   - Funcao `handleRequestPhoto(response)` que:
     - Extrai o telefone do array de `answers` (questionId === "telefone")
     - Busca a instancia WhatsApp conectada da empresa (`wapi_instances` com status "connected")
     - Envia mensagem via `supabase.functions.invoke("wapi-send")` com texto personalizado pedindo a foto
   - Botao com icone `MessageCircle` ao lado do avatar placeholder (quando `photo_url` e null), com tooltip "Solicitar foto via WhatsApp"
3. A mensagem enviada sera algo como: "Ola {nome}! Precisamos da sua foto para completar seu cadastro na equipe. Pode nos enviar uma foto sua por aqui? Obrigado!"

### Detalhes tecnicos

- O telefone e extraido do array `answers` com `questionId === "telefone"`, limpo com `.replace(/\D/g, "")` para envio
- A instancia WhatsApp e buscada de `wapi_instances` filtrando por `company_id` e `status === "connected"`
- A chamada usa `supabase.functions.invoke("wapi-send", { body: { action: "send-text", phone, message, instanceId, instanceToken } })`
- O botao ficara dentro do card expandido, na area onde aparece o placeholder de foto (quando nao ha foto)
- Apos envio com sucesso, um toast confirma; em caso de erro, mostra toast de erro
- Se nao houver instancia conectada, mostra toast avisando que o WhatsApp nao esta conectado

