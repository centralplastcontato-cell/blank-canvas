

# Correcao dos badges de status na lista de conversas do WhatsApp

## Problema
Os badges de status exibidos ao lado do nome do lead na lista de conversas (linhas 2940-2957 do `WhatsAppChat.tsx`) possuem labels inconsistentes e estao sem dois status.

## Alteracoes

**Arquivo:** `src/components/whatsapp/WhatsAppChat.tsx` (linhas 2940-2957)

### Labels a corrigir
- `em_contato`: "Contato" -> **"Visita"**
- `aguardando_resposta`: "Aguardando" -> **"Negociando"**

### Status a adicionar (cor + label)
- `transferido`: cor **bg-cyan-500**, label **"Transf."**
- `trabalhe_conosco`: cor **bg-teal-500**, label **"Trab."**

### Resultado final do bloco

```tsx
<Badge 
  className={cn(
    "text-[10px] h-4 px-1.5",
    linkedLead.status === 'novo' && "bg-blue-500",
    linkedLead.status === 'em_contato' && "bg-yellow-500 text-yellow-950",
    linkedLead.status === 'orcamento_enviado' && "bg-purple-500",
    linkedLead.status === 'aguardando_resposta' && "bg-orange-500",
    linkedLead.status === 'fechado' && "bg-green-500",
    linkedLead.status === 'perdido' && "bg-red-500",
    linkedLead.status === 'transferido' && "bg-cyan-500",
    linkedLead.status === 'trabalhe_conosco' && "bg-teal-500"
  )}
>
  {linkedLead.status === 'novo' && 'Novo'}
  {linkedLead.status === 'em_contato' && 'Visita'}
  {linkedLead.status === 'orcamento_enviado' && 'Orcamento'}
  {linkedLead.status === 'aguardando_resposta' && 'Negociando'}
  {linkedLead.status === 'fechado' && 'Fechado'}
  {linkedLead.status === 'perdido' && 'Perdido'}
  {linkedLead.status === 'transferido' && 'Transf.'}
  {linkedLead.status === 'trabalhe_conosco' && 'Trab.'}
</Badge>
```

Apenas 1 arquivo alterado, sem impacto em banco de dados.

