

# Corrigir Knowledge Base do Chatbot de Suporte

## Problema
A base de conhecimento do chatbot direciona usuarios para o "Flow Builder" quando perguntam como alterar respostas do bot. Na pratica, o Flow Builder esta desativado para os usuarios, e a configuracao real das mensagens do bot fica em **Configuracoes > WhatsApp > Automacoes** (aba Perguntas).

## Mudanca

### Arquivo: `supabase/functions/support-chat/index.ts`

Atualizar a secao `KNOWLEDGE_BASE` nos seguintes pontos:

**1. Secao "WhatsApp" (linha ~27-31)**
- Remover a mencao ao "Flow Builder visual para fluxos personalizados" como recurso principal
- Substituir por: "Configuracao do bot de qualificacao em Configuracoes > WhatsApp > Automacoes"
- Mencionar que o Flow Builder existe mas e um recurso avancado (nao e o caminho padrao)

**2. Secao "Problemas Comuns" - item 3 (linha ~98)**
- Trocar de: "Verificar se ha um fluxo ativo no Flow Builder"
- Para: "Verificar se o bot esta ativado e as perguntas estao configuradas em Configuracoes > WhatsApp > Automacoes"

**3. Adicionar novo item nos "Problemas Comuns"**
- "Como alterar respostas do bot": Ir em Configuracoes > WhatsApp > Automacoes. Na aba "Perguntas" voce pode editar as mensagens, ativar/desativar perguntas e reordenar a sequencia. Na aba "Geral" voce altera as mensagens de boas-vindas, qualificacao e conclusao.

**4. Secao "Configuracoes" (linha ~71-78)**
- Detalhar que WhatsApp inclui: conexao, automacoes (bot de qualificacao, perguntas, follow-ups, VIPs), materiais de venda, e configuracoes avancadas

### Resumo das correcoes na knowledge base

```text
ANTES                                          DEPOIS
─────                                          ──────
"Flow Builder visual para fluxos"           -> "Bot de qualificacao em Automacoes"
"Verificar fluxo ativo no Flow Builder"     -> "Verificar perguntas em Automacoes"
Sem instrucao de como editar respostas      -> Item especifico com passo-a-passo
```

### Apenas 1 arquivo modificado
| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/support-chat/index.ts` | Atualizar KNOWLEDGE_BASE com caminhos corretos |

Nenhuma mudanca de logica, apenas conteudo textual da base de conhecimento.
