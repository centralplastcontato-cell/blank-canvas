

## Customizar itens do checklist de Manutencao

Aplicar no `MaintenanceManager.tsx` o mesmo padrao de customizacao que ja existe no `PartyMonitoringManager.tsx`: adicionar/remover itens no dialog + mais itens padrao.

### Novos itens padrao (alem dos 10 existentes)

- Janela/vidro quebrado
- Goteira no telhado
- Interruptor com defeito
- Cadeira/mesa danificada
- Extintor vencido ou ausente
- Descarga com defeito
- Luminaria solta ou torta
- Portao/grade com problema
- Pintura descascando
- Cheiro de gas/vazamento
- Bebedouro com defeito
- Pia entupida

### Mudancas tecnicas

**Arquivo: `src/components/agenda/MaintenanceManager.tsx`**

1. **Ampliar `DEFAULT_ITEMS`** de 10 para ~22 itens, todos sem categoria (lista plana, como ja e hoje)

2. **Adicionar estado `newItemText`** (string) para o campo de adicionar item customizado

3. **Adicionar funcao `removeItem(idx)`** que remove o item do array `items` por indice

4. **Adicionar funcao `addItem(label)`** que insere um novo `MaintenanceItem` no final da lista com `checked: false`

5. **Modificar o dialog de criacao/edicao**:
   - Ao lado de cada item, mostrar botao X (Trash2) para remover (mesmo estilo do PartyMonitoringManager)
   - No final da lista de itens, mostrar campo Input + botao "Adicionar" inline
   - Suportar Enter para adicionar rapidamente

6. **Nao alterar a estrutura de dados** - os itens continuam sem categoria (lista plana), diferente do Acompanhamento que usa categorias

