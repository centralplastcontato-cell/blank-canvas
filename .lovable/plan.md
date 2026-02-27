

## Adicionar "Outros" nos badges de status do chat (WhatsAppChat.tsx)

### Problema
O status "Outros" foi adicionado no popover de informacoes do lead e no dropdown de 3 pontos, mas faltou adicionar nos **badges de classificacao rapida** que aparecem diretamente no topo da conversa -- tanto na versao desktop quanto mobile. Sao 4 arrays hardcoded no `WhatsAppChat.tsx` que nao incluem "outros".

### O que sera feito

**Arquivo: `src/components/whatsapp/WhatsAppChat.tsx`** -- 4 alteracoes no mesmo arquivo:

1. **Desktop - Lead vinculado (linha ~3761)**: Adicionar `{ value: 'outros', label: 'Outros', color: 'bg-gray-500', textColor: 'text-gray-700', bgActive: 'bg-gray-500/15' }` ao array do stepper de classificacao

2. **Desktop - Contato nao qualificado (linha ~3847)**: Adicionar `{ value: 'outros', label: 'Outros', color: 'bg-gray-500' }` ao array de botoes de classificacao inicial

3. **Mobile - Lead vinculado (linha ~4693)**: Adicionar `{ value: 'outros', label: 'Outros', color: 'bg-gray-500' }` e incluir `"outros"` no type cast da linha 4705

4. **Mobile - Contato nao qualificado (linha ~4769)**: Adicionar `{ value: 'outros', label: 'Outros', color: 'bg-gray-500' }` ao array de botoes

Tambem atualizar o objeto `statusLabels` (linha ~4723) adicionando `outros: 'Outros'`.

### Resultado
O botao "Outros" (com bolinha cinza) aparecera em todos os locais de classificacao rapida, tanto para leads ja vinculados quanto para contatos nao qualificados, em desktop e mobile.

