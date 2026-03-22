

## Adicionar scroll no PopoverContent do LeadInfoPopover (mobile)

### Problema
No mobile, o conteúdo do popover de informações do lead ultrapassa a altura da tela e o usuário não consegue ver/acessar o final (observações, botões de ação, etc.).

### Solução
Adicionar `max-h-[70vh] overflow-y-auto` ao `PopoverContent` para limitar a altura e permitir scroll interno. Isso afeta apenas o container do popover, mantendo o layout desktop intacto.

### Alteração
**Arquivo:** `src/components/whatsapp/LeadInfoPopover.tsx` (linha 386-389)

Adicionar classes de altura máxima e overflow ao `PopoverContent`:
```typescript
className={cn(
  "p-0 rounded-2xl shadow-2xl shadow-black/10 border-border/30 overflow-hidden backdrop-blur-sm",
  mobile ? "w-[310px] max-h-[70vh] overflow-y-auto" : "w-[360px] max-h-[80vh] overflow-y-auto"
)}
```

Isso limita o popover a 70% da viewport no mobile (e 80% no desktop como segurança), habilitando scroll quando o conteúdo excede esse limite.

