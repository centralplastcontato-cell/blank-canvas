

## Colapsar mensagens de Reativação no chat (mesmo tratamento dos follow-ups)

As mensagens destacadas em vermelho na sua screenshot são disparadas pelo **motor de Reativação Inteligente** e possuem o metadata `source: "reactivation_engine"`. Atualmente, apenas mensagens com `source: "auto_reminder"` são colapsadas em chips. A ideia e expandir a mesma logica para incluir reativacoes.

### O que muda

**1. Criar helper de identificacao de automacao**

Substituir as checagens espalhadas `=== 'auto_reminder'` por uma funcao utilitaria:

```text
isAutomationMessage(metadata) =>
  source === 'auto_reminder' OR source === 'reactivation_engine'
```

**2. Atualizar label do chip (FollowUpChip.tsx)**

Adicionar labels para reativacao no `getAutomationLabel`:
- `reactivation_stage_3` → "Reativação 3 meses"
- `reactivation_stage_2` → "Reativação 2 meses"
- `reactivation_stage_1` → "Reativação 1 mês"
- fallback `reactivation_engine` → "Reativação automática"

**3. Atualizar WhatsAppChat.tsx**

Trocar todas as ~6 ocorrencias de `=== 'auto_reminder'` pela funcao helper `isAutomationMessage()`, cobrindo:
- Condicional de renderizacao do chip vs bolha (mobile e desktop)
- Contagem do badge no botao do header
- Filtragem para o painel de timeline

**4. Atualizar AutomationTimelineSheet.tsx**

Usar o mesmo helper no filtro de mensagens para incluir reativacoes na timeline.

### Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/whatsapp/FollowUpChip.tsx` | Adicionar labels de reativacao |
| `src/components/whatsapp/WhatsAppChat.tsx` | Substituir checagens por helper |
| `src/components/whatsapp/AutomationTimelineSheet.tsx` | Incluir reativacoes no filtro |

Nenhuma alteracao de banco de dados necessaria -- os metadados ja existem.

