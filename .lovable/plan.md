

# Formulário de Seleção de Monitor para Prospecção

## O que será construído

Um formulário público com 15 perguntas (organizadas em 7 seções) que você poderá compartilhar via link no grupo de WhatsApp dos monitores. As respostas ficam salvas e visíveis numa nova página do Hub para análise do perfil comercial de cada monitor.

## Estrutura

### 1. Banco de dados (Supabase)
Nova tabela `hub_recruitment_responses` para armazenar as respostas:
- `id`, `respondent_name`, `age`, `answers` (JSONB com todas as respostas), `created_at`
- RLS aberta para INSERT (formulário público) e restrita para SELECT (apenas admins do Hub)

### 2. Página pública do formulário
- **Rota**: `/recrutamento-comercial`
- Multi-step animado (mesmo padrão visual do formulário de freelancer)
- 7 seções: Informações básicas, Comunicação, Perfil comercial, Iniciativa, Motivação, Disponibilidade, Pergunta chave
- As 15 perguntas com os tipos: text, number, select, textarea, e campo condicional ("Se sim, onde?")
- Tela de agradecimento após envio
- Logo do Castelo da Diversão no topo

### 3. Página no Hub para ver respostas
- **Rota**: `/hub/recrutamento`
- Dentro do `HubLayout`
- Tabela com todas as respostas recebidas
- Possibilidade de expandir cada resposta para ver detalhes completos
- Contador de respostas e busca por nome

### 4. Navegação
- Novo item "Recrutamento" no sidebar do Hub (`HubSidebar.tsx` e `HubMobileMenu.tsx`)
- Nova rota em `App.tsx`

## Arquivos a criar/editar

| Ação | Arquivo |
|------|---------|
| Criar | `src/pages/PublicRecruitmentForm.tsx` (formulário público) |
| Criar | `src/pages/HubRecruitment.tsx` (painel de respostas no Hub) |
| Editar | `src/App.tsx` (adicionar rotas) |
| Editar | `src/components/hub/HubSidebar.tsx` (novo item menu) |
| Editar | `src/components/hub/HubMobileMenu.tsx` (novo item menu mobile) |
| Migration | Nova tabela `hub_recruitment_responses` |

## Fluxo do usuário
1. Você copia o link `/recrutamento-comercial` e envia no grupo do WhatsApp
2. O monitor abre, preenche as 15 perguntas step-by-step e envia
3. Você acessa `/hub/recrutamento` e vê todas as respostas para avaliar perfil comercial

