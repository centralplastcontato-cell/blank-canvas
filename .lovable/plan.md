

# Pre-definir texto de objetivo para cada sugestao de campanha

## O que sera feito

Transformar as sugestoes de nome de campanha em objetos que incluem tanto o nome quanto um texto de objetivo pre-definido. Ao clicar em um chip, alem do nome, o campo "Descreva o objetivo da campanha" tambem sera preenchido automaticamente.

## Estrutura de dados

Cada sugestao passara a ser um objeto com `name` e `description`:

```text
Mes do Consumidor -> "Aproveitar o mês do consumidor para oferecer condições especiais em pacotes de festa infantil com descontos exclusivos."
Mes das Criancas -> "Campanha especial de Dia das Crianças com pacotes promocionais e brindes para aniversariantes do período."
Oportunidade Relampago -> "Promoção relâmpago com vagas limitadas e desconto agressivo para fechar contratos esta semana."
Ultimos Contratos -> "Ultimas vagas disponíveis no mês, urgência para fechar os contratos restantes com condições diferenciadas."
Ferias de Julho -> "Promoção especial para festas nas férias de julho, com pacotes temáticos e preços promocionais."
Volta as Aulas -> "Aproveitar o período de volta às aulas para promover festas de aniversário com condições facilitadas."
Black Friday -> "Descontos imperdíveis de Black Friday em todos os pacotes de festa infantil por tempo limitado."
Natal Magico -> "Pacotes especiais de Natal com decoração temática e condições exclusivas para festas no período natalino."
Promocao de Natal -> "Promoção de fim de ano com descontos progressivos e brindes para quem fechar festa em dezembro."
Esquenta de Carnaval -> "Promoção pré-carnaval com descontos e convidados extras para festas realizadas no período."
Dia das Maes -> "Homenagem ao Dia das Mães com condições especiais para mamães que querem celebrar com os filhos."
Dia dos Pais -> "Promoção especial de Dia dos Pais com pacotes família e descontos para festas no período."
Promo Aniversario -> "Comemore o aniversário do buffet com descontos exclusivos e brindes para os primeiros contratos."
Feriado Prolongado -> "Aproveite o feriado prolongado para garantir sua festa com desconto especial e vagas limitadas."
Liquidacao de Verao -> "Liquidação de verão com os melhores preços do ano em pacotes de festa infantil."
Super Promocao -> "Super promoção com desconto especial, convidados extras e condições imperdíveis por tempo limitado."
Semana do Cliente -> "Semana exclusiva para clientes com ofertas especiais, upgrades de pacote e brindes."
Festival de Descontos -> "Festival de descontos com até 15% off em pacotes selecionados para festas nos próximos meses."
Ultima Chance -> "Última oportunidade de garantir sua festa com as condições promocionais antes do reajuste."
Especial Primavera -> "Promoção de primavera com pacotes floridos, decoração temática e preços especiais."
Queima de Estoque -> "Queima de datas disponíveis com descontos agressivos para fechar o calendário do mês."
Fecha em 25 -> "Condição exclusiva para quem fechar contrato com entrada de apenas R$25 por convidado."
Lote Promocional -> "Lote promocional com quantidade limitada de vagas com desconto especial para os primeiros."
Convite Especial -> "Convite personalizado para leads selecionados com oferta exclusiva e prazo curto."
Reativacao de Leads -> "Reativar leads antigos com uma oferta irresistível para quem já demonstrou interesse anteriormente."
```

## Detalhes tecnicos

**Arquivo unico**: `src/components/campanhas/CampaignContextStep.tsx`

1. Trocar o array de strings `CAMPAIGN_NAME_SUGGESTIONS` por um array de objetos `{ name: string; description: string }`
2. No `onClick` do Badge, preencher tanto `draft.name` quanto `draft.description`
3. Manter toda a estilizacao atual dos chips (tamanho, cores, hover, destaque ativo)
4. Exibir o `name` no chip como ja esta hoje

Nenhum outro arquivo precisa ser alterado.
