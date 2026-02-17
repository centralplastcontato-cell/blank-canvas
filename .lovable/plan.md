

## Customizar itens do Acompanhamento de Festa

### O que muda

Quando o usuario clicar em "Novo Acompanhamento", o dialog vai carregar os itens padrao **com a opcao de remover** (botao X ao lado de cada item) e **adicionar novos itens** (campo de texto + botao por categoria). Assim o admin personaliza o checklist antes de criar.

### Novos itens sugeridos para adicionar ao padrao

**Preparacao:**
- Verificar decoracao montada conforme contratado
- Conferir mesa do bolo e doces posicionada
- Verificar funcionamento de cameras de seguranca
- Testar microfone para parabens

**Durante a festa:**
- Monitorar quantidade de convidados vs contratado
- Verificar reposicao de comida e bebida
- Acompanhar horario do bolo/parabens
- Verificar limpeza dos banheiros durante a festa
- Monitorar seguranca dos brinquedos
- Registrar ocorrencias ou reclamacoes

**Encerramento:**
- Coletar feedback do cliente (como foi a festa)
- Registrar itens esquecidos pelos convidados
- Conferir se nao ficou nenhum convidado no espaco

### Mudancas tecnicas

**Arquivo: `src/components/agenda/PartyMonitoringManager.tsx`**

1. **Ampliar DEFAULT_ITEMS** com os ~13 novos itens listados acima

2. **Adicionar funcao `removeItem(idx)`** que remove o item do array `items` por indice

3. **Adicionar funcao `addItem(label, category)`** que insere um novo item no final da categoria correspondente

4. **No dialog de criacao/edicao**, para cada categoria:
   - Mostrar botao X (Trash2) ao lado de cada item para remover
   - No final de cada grupo de categoria, mostrar um campo Input + botao "Adicionar" para o usuario digitar um novo item customizado
   - O campo fica inline: `[__________________] [+ Adicionar]`

5. **Visual**: Os itens removidos somem do checklist. Itens adicionados aparecem no final da categoria. Tudo isso acontece antes de salvar, entao o usuario tem controle total do que vai no checklist final.

