

# Corrigir caracteres corrompidos no PDF do Manual

## Problema

O jsPDF usa a fonte Helvetica que nao suporta emojis Unicode. Os emojis nas caixas de dica e alerta estao sendo renderizados como caracteres ilegíveis:
- `💡 Dica` aparece como `Ø=Ü¡ D i c a`
- `⚠️ Atenção` provavelmente tambem aparece corrompido

## Solucao

Substituir os emojis por texto puro no arquivo `src/lib/generateManualPDF.ts`:

**Arquivo**: `src/lib/generateManualPDF.ts`

| Linha | Antes | Depois |
|-------|-------|--------|
| 293 | `"💡 Dica"` | `">> Dica"` |
| 322 | `"⚠️ Atenção"` | `"!! Atencao"` |

As caixas ja tem cor de fundo e barra lateral colorida que diferenciam visualmente dica vs alerta, entao o emoji nao e necessario para a identificacao.

## Verificacao adicional

Buscar qualquer outro emoji no arquivo que possa causar o mesmo problema (bullet points, titulos, etc).

