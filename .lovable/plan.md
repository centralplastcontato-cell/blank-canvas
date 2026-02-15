

## Melhorar header mobile e area de texto do chat

### Problema 1: Nome do lead cortado
O header mobile tem 7 botoes de icone (info, orcamento, calendario, freelancer, equipe, favorito, fechar) alem do avatar e botao voltar, deixando quase zero espaco para o nome do lead -- que aparece como "Th..." truncado.

### Problema 2: Caixa de texto pequena
O campo de mensagem usa `min-h-[40px]` com `rows={1}`, dando pouco espaco para digitar mensagens mais longas.

### Solucao

**1. Reorganizar o header mobile (linhas ~3858-4034)**
- Dividir o header em duas linhas:
  - **Linha 1**: Botao voltar + Avatar + Nome completo do lead + Telefone + Botao info (i) + Botao fechar (X)
  - **Linha 2**: Os demais icones de acao (OE, calendario, freelancer, equipe, favorito) agrupados horizontalmente
- Isso libera espaco para o nome aparecer por completo, mantendo todas as acoes acessiveis

**2. Aumentar a caixa de texto (linha ~4452)**
- Mudar `min-h-[40px]` para `min-h-[48px]` e `rows={2}` para dar mais espaco vertical inicial
- Manter `max-h-[50vh]` e `resize-y` para que o usuario possa expandir quando necessario

### Arquivos alterados

- `src/components/whatsapp/WhatsAppChat.tsx`
  - Reestruturar o bloco do header mobile (linhas 3858-4034) para usar layout de 2 linhas
  - Ajustar as classes CSS da Textarea (linha 4452)

