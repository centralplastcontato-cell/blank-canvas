

## Plano: Corrigir responsivo das Configurações WhatsApp no mobile

### Problemas identificados

1. **Tabs de navegação sem texto no mobile**: A classe `hidden sm:inline` esconde todos os labels dos botões, deixando apenas ícones -- o usuário não sabe onde está.
2. **ScrollArea com altura fixa**: `h-[calc(100vh-340px)]` corta o conteúdo no mobile, especialmente com o header e as tabs ocupando espaço.
3. **Seção "Conteúdo" tem sub-tabs aninhadas** (Templates/Materiais) que adicionam mais uma camada de navegação desnecessária no mobile.

### Alterações

| Arquivo | Mudança |
|---|---|
| `src/components/whatsapp/WhatsAppConfig.tsx` | Mostrar labels nos tabs mobile (remover `hidden sm:inline`), reduzir tamanho do texto (`text-[10px]`), ajustar ScrollArea para altura mais generosa no mobile (`h-[calc(100vh-260px)]`), remover header da seção no mobile para economizar espaço |
| `src/components/whatsapp/settings/SalesMaterialsSection.tsx` | Remover Card wrapper desnecessário no mobile (padding extra), compactar type tabs |

### Resultado esperado
- Tabs com ícone + label visíveis em todas as telas
- Área de conteúdo usa mais espaço vertical
- Materiais visíveis sem scroll excessivo

