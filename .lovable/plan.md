

## Atualizar e Melhorar o Visual da Landing Page do Hub

### Problemas Identificados (via screenshots mobile)

1. **Espacamento excessivo** entre secoes - gaps enormes entre Features e AI, e entre AI e Stats
2. **Cards de funcionalidades** ocupam muito espaco vertical no mobile (1 coluna) - poderiam ser 2 colunas compactas
3. **Header** poderia ter mais destaque com efeito glassmorphism mais refinado
4. **Hero** tem bom layout mas os botoes ficam muito largos no mobile (full-width)
5. **Secao de AI** tem muito padding vertical desnecessario
6. **Footer** muito simples e sem links uteis
7. **Falta secao de depoimentos/prova social** - apenas os circulos "C M B R" que sao genericos

### Melhorias Planejadas

#### 1. HubHeader - Header mais premium
- Adicionar efeito de blur mais forte e borda mais sutil
- Botao "Comecar agora" com destaque visual (gradiente ou glow sutil)
- Esconder "Saiba mais" no mobile para ganhar espaco

#### 2. HubHero - Hero mais impactante
- Reduzir padding no mobile (pt-20 em vez de pt-24)
- Melhorar o social proof: trocar circulos genericos "C M B R" por dados mais convincentes (ex: "10+ buffets", "milhares de leads")
- Adicionar badge animado com pulso mais visivel

#### 3. HubFeatures - Cards mais compactos e visualmente ricos
- **Mobile**: grid de 2 colunas para os 6 cards de funcionalidades (em vez de 1 coluna)
- Reduzir padding dos cards no mobile (p-5 em vez de p-8)
- Reduzir gap entre secao Features e secao AI (py-16 em vez de py-24 no mobile)
- Adicionar hover com gradiente sutil no background dos cards

#### 4. AI Features - Secao mais compacta
- Mobile: 2 colunas para os AI cards tambem
- Reduzir padding vertical geral (py-16 mobile, py-24 desktop)
- Cards mais compactos com texto menor

#### 5. HubStats - Reducao de espaco
- Reduzir padding vertical no mobile
- Cards de metricas mais compactos

#### 6. HubCTA - Secao final mais forte
- Adicionar gradiente de fundo mais vibrante
- Badge de "Sem compromisso" mais destacado

#### 7. HubFooter - Footer mais completo
- Adicionar links para Instagram da Celebrei
- Texto de valor ("Plataforma #1 para buffets infantis")

### Arquivos a Editar

1. `src/components/hub-landing/HubHeader.tsx` - Header mais polido
2. `src/components/hub-landing/HubHero.tsx` - Hero otimizado para mobile
3. `src/components/hub-landing/HubFeatures.tsx` - Cards em grid 2-col mobile, padding reduzido
4. `src/components/hub-landing/HubStats.tsx` - Padding ajustado
5. `src/components/hub-landing/HubCTA.tsx` - CTA mais impactante
6. `src/components/hub-landing/HubFooter.tsx` - Footer mais completo

### Detalhes Tecnicos

Principais ajustes CSS/Tailwind:
- Features cards: `grid-cols-2` no mobile (sem prefixo sm), `lg:grid-cols-3` desktop
- Padding de secoes: `py-16 sm:py-24` em vez de `py-24 sm:py-32`
- Cards mobile: `p-4 sm:p-8` para compactar
- AI cards: mesma logica de 2 colunas
- Reducao de `mb-20` para `mb-12` nos headers de secao no mobile
- Textos menores no mobile: `text-xs` para descricoes em grid 2-col

