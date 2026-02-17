

# Botao "Copiar Lista" na pagina publica de presenca

## O que sera feito

Adicionar um botao "Copiar Lista" na pagina `PublicAttendance.tsx` que copia a lista de convidados formatada como texto para a area de transferencia. O anfitriao (ou recepcionista) pode entao colar em qualquer lugar - WhatsApp, notas, etc.

## Onde aparece

O botao ficara visivel quando houver convidados registrados, posicionado acima da lista de convidados (abaixo das estatisticas). Estilo outline com icone de copiar.

## Formato do texto copiado

```
Lista de Presenca - Castelo da Diversao
Festa: Aniversario do Joao
2 convidados

#1 Victor - 15981121710 - Quer info
#2 Ana - 15981007979 - Quer info
```

Incluira: numero, nome, idade (se informada), telefone (se informado), flag "Quer info" e dados de crianca desacompanhada quando aplicavel.

## Detalhes tecnicos

### Arquivo: `src/pages/PublicAttendance.tsx`

- Importar icone `Copy` do lucide-react
- Criar funcao `handleCopyList()` que monta o texto formatado a partir de `entry.guests`, `companyName` e `eventTitle`
- Usar `navigator.clipboard.writeText()` para copiar
- Exibir toast de confirmacao "Lista copiada!"
- Botao com variante `outline`, icone `Copy` e texto "Copiar Lista"
- Posicionado logo acima do label "Convidados registrados"

