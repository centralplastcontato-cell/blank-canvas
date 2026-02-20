
# Criar a Landing Page Completa do Planeta Divertido

## O que já temos (dados do onboarding)

Tudo o que precisamos já está no banco, enviado pela Fernanda durante o onboarding:

- **Identidade visual**: Azul e amarelo, linguagem simples e acolhedora, espaço familiar
- **Capacidade**: até 90 convidados, aconchegante e familiar
- **Endereço**: Avenida Mazzei, 692 — São Paulo/SP
- **Instagram**: @buffetplanetadivertido
- **WhatsApp**: 11987818460
- **10 fotos** já carregadas no storage do Supabase
- **1 vídeo** já carregado no storage
- **Logo** já disponível

## Conteúdo da LP que será criado

### Hero
- **Imagem de fundo**: A primeira foto do onboarding (foto do espaço)
- **Imagens múltiplas**: As 2 primeiras fotos em split-screen (desktop) / crossfade (mobile)
- **Título**: "A Festa dos Sonhos do Seu Filho Começa Aqui!"
- **Subtítulo**: "Espaço aconchegante para até 90 convidados, com atendimento personalizado e momentos que você nunca vai esquecer."
- **CTA**: "Quero fazer a festa!"

### Tema — Azul e Amarelo (identidade da marca)
- **Cor primária**: `#1E3A8A` (azul royal)
- **Cor secundária**: `#FBBF24` (amarelo vibrante)
- **Fundo**: `#0A1628` (azul escuro profundo)
- **Texto**: `#FFFFFF`
- **Fonte heading**: `Fredoka One` (lúdica, festiva)
- **Fonte body**: `Nunito` (amigável, legível)
- **Botão**: `pill` (arredondado — mais moderno para festas infantis)

### Galeria
- **Habilitada**: sim
- **Título**: "Nosso Espaço"
- **Fotos**: Todas as 10 fotos do onboarding (da Avenida Mazzei)

### Depoimentos — 3 depoimentos criados com base no perfil do buffet
- Depoimento 1: foco no atendimento personalizado da Fernanda
- Depoimento 2: foco no espaço aconchegante e familiar
- Depoimento 3: foco na organização e na festa das crianças

### Vídeo
- **Habilitado**: sim
- **Título**: "Conheça o Planeta Divertido"
- **Vídeo**: o MP4 do onboarding com poster sendo a primeira foto
- **Tipo**: upload

### Oferta
- **Habilitada**: sim
- **Título**: "Garanta a Data da Festa do Seu Filho!"
- **Descrição**: "Datas esgotam rápido! Entre em contato agora e garanta condições especiais para sua festa."
- **Texto de destaque**: "Atendemos até 90 convidados!"
- **CTA**: "Quero garantir minha data!"

### Rodapé
- Mostrar Instagram: sim (@buffetplanetadivertido)
- Mostrar WhatsApp: sim
- Texto personalizado: "Avenida Mazzei, 692 — São Paulo/SP"

## O que será feito tecnicamente

### 1. Migration SQL — UPDATE em `company_landing_pages`

Um único `UPDATE` no registro existente (ID `19e28a5f-bb86-4e48-89a2-d48fde9ae8ad`) com todo o conteúdo preenchido + `is_published = true`.

O conteúdo JSON completo com as 10 fotos reais, o vídeo real, 3 depoimentos criados, o tema azul/amarelo, e todos os textos profissionais já escritos.

### 2. Nenhum arquivo de código precisa ser alterado

O sistema de LP dinâmica já está completamente funcional. Só precisamos popular o banco com o conteúdo certo.

## Resultado Final

Assim que a migration rodar, `buffetplanetadivertido.online` (quando o DNS propagar completamente) vai servir uma LP profissional com:
- Hero com fotos reais do espaço
- Galeria com 10 fotos
- Vídeo do buffet
- 3 depoimentos
- Oferta com CTA
- Cores azul e amarelo da marca
- Logo da Fernanda

Também é possível ver já em `https://naked-screen-charm.lovable.app/lp/planeta-divertido` para validar o conteúdo antes de o domínio propagar.
