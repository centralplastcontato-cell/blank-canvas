

# Adicionar 25 sugestoes de nome de campanha

## O que sera feito

Adicionar **25 chips clicaveis** com sugestoes de nomes de campanha abaixo do campo "Nome da campanha" no componente `CampaignContextStep.tsx`. Ao clicar, o nome e preenchido automaticamente.

## Lista de 25 sugestoes

1. Mes do Consumidor
2. Mes das Criancas
3. Oportunidade Relampago
4. Ultimos Contratos
5. Ferias de Julho
6. Volta as Aulas
7. Black Friday
8. Natal Magico
9. Promocao de Natal
10. Esquenta de Carnaval
11. Dia das Maes
12. Dia dos Pais
13. Promo Aniversario
14. Feriado Prolongado
15. Liquidacao de Verao
16. Super Promocao
17. Semana do Cliente
18. Festival de Descontos
19. Ultima Chance
20. Especial Primavera
21. Queima de Estoque
22. Fecha em 25
23. Lote Promocional
24. Convite Especial
25. Reativacao de Leads

## Detalhes tecnicos

**Arquivo unico**: `src/components/campanhas/CampaignContextStep.tsx`

- Criar constante `CAMPAIGN_NAME_SUGGESTIONS` com os 25 nomes
- Renderizar logo abaixo do `Input` de nome como badges em `flex flex-wrap gap-1.5`
- Estilo: `text-[10px] cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-all`
- Ao clicar, seta `draft.name` com o valor
- Se `draft.name` ja e igual ao chip, destacar com `bg-primary/10 border-primary/30 text-primary`
- Nenhum outro arquivo precisa ser alterado

