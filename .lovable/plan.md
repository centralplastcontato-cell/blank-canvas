

# Adicionar explicacoes por passo no Wizard de Campanhas

## O que sera feito

Adicionar um texto explicativo abaixo dos indicadores de etapa no Wizard, mostrando uma descricao clara do que o usuario deve fazer em cada passo. O texto muda dinamicamente conforme o passo ativo.

## Textos por passo

- **Passo 1 - Contexto**: "Escolha um nome para sua campanha, descreva o objetivo e gere as variacoes de mensagem com a IA. Voce tambem pode anexar uma imagem."
- **Passo 2 - Audiencia**: "Filtre e selecione os leads que receberao a campanha. Use os filtros de status, unidade e mes para refinar sua lista."
- **Passo 3 - Configuracao**: "Revise o resumo da campanha, ajuste o intervalo entre envios e confira a previa da mensagem antes de criar."

## Detalhes tecnicos

**Arquivo unico**: `src/components/campanhas/CampaignWizard.tsx`

1. Adicionar um array `STEP_DESCRIPTIONS` com os 3 textos explicativos
2. Renderizar um paragrafo com `STEP_DESCRIPTIONS[step]` logo abaixo do bloco de step indicators (dentro do header, antes do content area)
3. Estilo: texto pequeno (`text-xs`), cor suave (`text-muted-foreground`), com padding inferior para separar do conteudo, e um icone de info (`Info` do lucide) ao lado

Nenhum outro arquivo precisa ser alterado.

