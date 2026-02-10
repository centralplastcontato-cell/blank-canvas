

## Reordenar abas do WhatsAppConfig

Mover a aba "Fluxos" para ficar logo depois de "Automações" no array `allConfigSections` em `src/components/whatsapp/WhatsAppConfig.tsx`.

### Mudanca

**Arquivo**: `src/components/whatsapp/WhatsAppConfig.tsx`

Ordem atual:
1. Conexao
2. Mensagens
3. Materiais
4. Notificacoes
5. Automacoes
6. Avancado
7. Importar Dados
8. **Fluxos** (posicao 8)
9. Guia Visual

Nova ordem:
1. Conexao
2. Mensagens
3. Materiais
4. Notificacoes
5. Automacoes
6. **Fluxos** (movido para posicao 6)
7. Avancado
8. Importar Dados
9. Guia Visual

Isso envolve apenas mover o bloco do objeto "flows" (linhas ~75-82) para logo apos o objeto "automations" (apos linha ~64), sem alterar nenhum outro codigo.

