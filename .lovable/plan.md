
## Adicionar campo de Observações editável no card do Lead (popover do WhatsApp)

### O que muda
Atualmente o popover do lead na Central de Atendimento só **mostra** as observações se já existirem, sem possibilidade de editar. A proposta é transformar essa seção em um campo editável (Textarea) que:

1. **Sempre aparece** -- mesmo quando vazio, para incentivar o preenchimento
2. **Permite editar inline** -- o usuário clica no ícone de editar (ou no texto), escreve as informações e salva
3. **Salva no banco** -- atualiza `campaign_leads.observacoes` e registra no `lead_history`

### Como vai funcionar
- A seção "Observações" será exibida sempre (não mais condicional)
- Quando não está editando: mostra o texto atual ou um placeholder "Adicione observações sobre este lead..."
- Botão de editar (lápis) ao lado do título abre um Textarea
- Botões de confirmar (check) e cancelar (X) para salvar ou descartar
- Ao salvar, atualiza `campaign_leads.observacoes` via Supabase e insere registro em `lead_history`
- Callback `onLeadObsChange` notifica o componente pai para atualizar o estado local

### Detalhes técnicos

**Arquivo: `src/components/whatsapp/LeadInfoPopover.tsx`**
- Adicionar estados: `isEditingObs`, `editedObs`, `isSavingObs`
- Adicionar função `saveObservacoes()` que faz UPDATE em `campaign_leads` e INSERT em `lead_history`
- Substituir a seção condicional de observações (linhas 448-457) por uma seção fixa com modo leitura/edição
- Adicionar prop `onLeadObsChange?: (newObs: string) => void` na interface
- Importar `Textarea` de `@/components/ui/textarea`

**Arquivo: `src/components/whatsapp/WhatsAppChat.tsx`**
- Passar a nova prop `onLeadObsChange` para o `LeadInfoPopover`, atualizando o estado local do lead quando as observações mudarem

Nenhuma migration necessária -- o campo `observacoes` já existe em `campaign_leads`.
