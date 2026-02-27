

## Melhorar NotificationBell com abas por tipo

Adicionar abas no popover do sino para organizar as notificacoes por categoria, alem de adicionar icones especificos para todos os 10 tipos.

### Layout proposto

```text
+-----------------------------------------------+
|  Notificacoes                    Marcar lidas  |
+-----------------------------------------------+
| Todos | Visitas | Clientes | Transf. | Outros |
+-----------------------------------------------+
|  [lista filtrada pela aba selecionada]         |
+-----------------------------------------------+
```

### Abas

| Aba | Tipos incluidos | Icone |
|---|---|---|
| Todos | todos os tipos | -- |
| Visitas | `visit_scheduled` | CalendarCheck |
| Clientes | `existing_client` | Crown |
| Transferencias | `lead_transfer`, `lead_assigned` | ArrowRightLeft |
| Outros | `lead_questions`, `lead_analyzing`, `follow_up_sent`, `lead_lost`, `stale_reminded`, `lead_risk` | Bell |

Cada aba mostra o contador de nao-lidas daquele grupo (badge pequeno no tab).

### Icones especificos para todos os tipos

Atualizar o `getNotificationIcon` para cobrir todos os 10 tipos:

| Tipo | Icone | Cor |
|---|---|---|
| `lead_transfer` | ArrowRightLeft | primary |
| `lead_assigned` | UserPlus | green |
| `existing_client` | Crown | amber |
| `visit_scheduled` | CalendarCheck | blue |
| `lead_questions` | MessageCircle | orange |
| `lead_analyzing` | Search | purple |
| `follow_up_sent` | Send | teal |
| `lead_lost` | UserX | red |
| `stale_reminded` | Clock | gray |
| `lead_risk` | AlertTriangle | red |

### Detalhes tecnicos

**Arquivo editado:** `src/components/admin/NotificationBell.tsx`

- Adicionar estado `activeTab` (default "todos")
- Usar componente `Tabs`/`TabsList`/`TabsTrigger` do shadcn (ja existe em `src/components/ui/tabs.tsx`)
- Filtrar `notifications` pelo tab ativo antes de renderizar a lista
- Calcular contadores por grupo para os badges das abas
- Importar icones adicionais do lucide-react: `MessageCircle`, `Search`, `Send`, `UserX`, `Clock`, `AlertTriangle`
- As abas usam scroll horizontal no mobile para caber na tela
- O badge de cada aba so aparece se houver nao-lidas naquele grupo

Nenhum arquivo novo, nenhuma dependencia adicional.

