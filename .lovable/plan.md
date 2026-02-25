

## Deixar o site da Aventura Kids mais vibrante e impactante

### Problema
O site esta usando fundo branco puro (#FFFFFF), cards simples sem profundidade, sem elementos decorativos, e os componentes DLP (Dynamic Landing Page) sao muito "corporativos" para um buffet infantil. Falta energia visual.

### Melhorias propostas

**1. DLPHero - Mais impacto visual**
- Adicionar particulas/confetes animados (mesmo estilo do HeroSection do Castelo)
- Melhorar o overlay do gradiente para ser mais vibrante e menos "lavado"
- Adicionar glassmorphism no bloco de titulo para contraste com a imagem de fundo
- Scroll indicator animado no final

**2. DLPSocialProof - Cards com mais personalidade**
- Adicionar borda colorida com gradiente sutil nos cards
- Icones decorativos nos cards (estrela, coracao, festa)
- Fundo com gradiente sutil ao inves de branco puro
- Separador visual entre social proof e o resto da pagina

**3. DLPBenefits - Cards mais vivos**
- Hover com gradiente de fundo mais visivel (de 5% para 10-15%)
- Adicionar borda com cor primaria sutil nos cards
- Background da secao com gradiente mais marcante
- Icones dos trust badges preenchidos (fill) para dar mais destaque

**4. DLPGallery - Grid mais impactante**
- Hover com zoom mais pronunciado e sombra elevada
- Badge com contagem de fotos
- Fundo da secao com gradiente mais visivel

**5. DLPOffer - Mais urgencia e destaque**
- Glassmorphism cards com gradiente de fundo usando cores do tema (mais forte)
- Animacao de pulso mais intensa no botao CTA
- Badge "OFERTA ESPECIAL" maior e mais chamativo
- Borda com glow sutil

**6. DLPHowItWorks (novo componente a revisar)**
- Linha conectora entre passos mais visivel
- Icones com background mais vibrante

**7. DLPFooter - Mais presenca**
- Background com gradiente escuro mais rico

### Arquivos a editar

| Arquivo | Mudanca |
|---|---|
| `src/components/dynamic-lp/DLPHero.tsx` | Confetes animados, glassmorphism no titulo, scroll indicator, overlay mais vibrante |
| `src/components/dynamic-lp/DLPSocialProof.tsx` | Cards com borda gradiente, icones decorativos, fundo mais marcante |
| `src/components/dynamic-lp/DLPBenefits.tsx` | Hover mais visivel, bordas coloridas, trust badges preenchidos |
| `src/components/dynamic-lp/DLPGallery.tsx` | Hover mais impactante, fundo com gradiente |
| `src/components/dynamic-lp/DLPOffer.tsx` | Glassmorphism mais forte, CTA com pulso, borda glow |
| `src/components/dynamic-lp/DLPHowItWorks.tsx` | Linha conectora visivel, icones mais vibrantes |
| `src/components/dynamic-lp/DLPVideo.tsx` | Card com sombra mais forte, badge decorativo |

### Detalhes tecnicos

Todas as mudancas usam as cores do `theme` (primary_color, secondary_color), entao funcionam para qualquer buffet, nao apenas Aventura Kids.

Os confetes no Hero usam o mesmo padrao do `HeroSection.tsx` do Castelo: `motion.div` com animacao de `y` e `rotate` em loop infinito, cores derivadas do tema.

Nao ha mudancas de banco de dados -- tudo e visual nos componentes React.
