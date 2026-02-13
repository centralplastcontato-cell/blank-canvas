

# Adicionar Tooltips Explicativas nas Colunas de Prioridades

## O que sera feito
Adicionar um icone de informacao (i) ao lado do titulo de cada coluna com um tooltip que explica os criterios de classificacao dos leads.

## Alteracoes

### Arquivo: `src/components/inteligencia/PrioridadesTab.tsx`

Adicionar tooltips nos titulos das tres colunas usando o componente `Tooltip` ja existente no projeto (`@/components/ui/tooltip`).

**Atender Agora** - Tooltip:
"Leads com score acima de 60, ou com orcamento enviado/visita solicitada e score acima de 20. Leads frios sao excluidos."

**Em Risco** - Tooltip:
"Leads que pararam de responder (abandono detectado) mas nao sao prioritarios. Precisam de follow-up para nao serem perdidos."

**Frios** - Tooltip:
"Leads com score abaixo de 20, sem padrao de abandono e sem flag de prioridade. Baixo engajamento ate o momento."

### Detalhes tecnicos
- Importar `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` de `@/components/ui/tooltip`
- Importar `Info` icon de `lucide-react`
- Envolver cada `CardTitle` com um `Tooltip` contendo um botao com o icone `Info` (h-4 w-4, text-muted-foreground)
- Envolver o componente inteiro com `TooltipProvider` para garantir funcionamento

