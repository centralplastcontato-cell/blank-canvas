
## Tornar Templates de Mensagem editaveis por empresa e substituir "Castelo da Diversao"

### Problema
Os templates de resposta rapida na tabela `message_templates` estao com `company_id: null` (globais) e contem texto hardcoded "Castelo da Diversao". Todos os buffets veem os mesmos templates com o nome errado. Alem disso, o codigo nao filtra por empresa ao buscar nem ao inserir.

### Solucao

**1. Filtrar templates por empresa no frontend**

Alterar `MessagesSection.tsx` para:
- Importar `useCompany` e obter `currentCompanyId`
- Na query `fetchTemplates`, filtrar por `company_id = currentCompanyId`
- Ao inserir novo template, incluir `company_id: currentCompanyId`

**2. Auto-popular templates padrao por empresa**

Quando uma empresa ainda nao tem templates proprios, criar automaticamente uma copia dos templates padrao (com `{{empresa}}` no lugar de "Castelo da Diversao") vinculados ao `company_id` da empresa. Isso acontece dentro de `fetchTemplates`:
- Se a query retornar 0 templates para o `company_id`, inserir os defaults
- Os defaults usarao `{{empresa}}` em vez de nomes hardcoded

Templates padrao que serao copiados:
- **Primeiro contato**: "Oi {{nome}}! Aqui e do {{empresa}}! Vi seu pedido para festa em {{mes}} com {{convidados}}. Vou te enviar as opcoes e valores!!"
- **Follow-up**: "Oi {{nome}}! Tudo bem? Passando pra ver se voce conseguiu avaliar o orcamento. Posso te ajudar a garantir sua data?"
- **Envio de Orcamento**: "Oi {{nome}}! Segue seu orcamento com a promocao da campanha {{campanha}}."
- **Convite para visita**: "Gostaria de vir conhecer pessoalmente?"
- **Convite para visita (completo)**: "Oi {{nome}}! Que legal que voce esta interessado(a) no {{empresa}}! Gostaria de agendar uma visita para conhecer nosso espaco? ..."

**3. Filtrar templates no WhatsAppChat tambem**

Alterar `WhatsAppChat.tsx` para filtrar `message_templates` por `company_id` ao buscar templates ativos para o menu de resposta rapida.

### Arquivos alterados

| Arquivo | Alteracao |
|---|---|
| `src/components/whatsapp/settings/MessagesSection.tsx` | Importar `useCompany`, filtrar por `company_id`, incluir `company_id` no insert, auto-popular defaults |
| `src/components/whatsapp/WhatsAppChat.tsx` | Filtrar templates por `company_id` na query de fetch |

### Detalhes tecnicos

- A tabela `message_templates` ja tem a coluna `company_id` (nullable)
- As RLS policies ja permitem leitura de templates com `company_id IS NULL` ou do proprio company
- Os templates globais existentes (company_id=null) continuam no banco mas nao aparecerao mais para empresas que ja tiverem seus proprios
- A substituicao da variavel `{{empresa}}` ja e suportada pelo sistema de templates existente
