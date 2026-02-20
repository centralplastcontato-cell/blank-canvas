
## Situação Atual

O nó "Período – Sábado" foi criado via SQL direto no banco e está com estas conexões:

- **Proposta de Visita** → (opção "No sábado") → **Período – Sábado** ✅ (edge existe)
- **Período – Sábado** → **Confirmação de Visita** ✅ (edge existe)

Porém o nó foi inserido de forma "invisível" — sem passar pela interface do Flow Builder — e você quer remover tudo isso do banco para poder criar o nó manualmente pela UI.

---

## O que será removido do banco

Serão deletados via SQL direto (sem migração de schema):

1. **Edge** `c3d4e5f6-a7b8-9012-cdef-123456789012` → Período–Sábado → Confirmação de Visita
2. **Edge** `f5699b9e-ce18-4367-8db9-385a0868b3c0` → Proposta de Visita → Período–Sábado (duplicata)
3. **Edge** `e70ee266-7aa6-48b0-a2b3-1e5b71acdc18` → Proposta de Visita → Período–Sábado
4. **Opção** `b2c3d4e5-f6a7-8901-bcde-f12345678901` → "Manhã (até meio-dia)" do nó Período–Sábado
5. **Nó** `a1b2c3d4-e5f6-7890-abcd-ef1234567890` → "Período – Sábado"

## O que ficará intacto

A opção "No sábado" do nó **Proposta de Visita** ficará sem conexão — você poderá conectá-la manualmente ao novo nó que criar no Flow Builder.

---

## O que você fará no Flow Builder (manualmente após a limpeza)

1. Abrir o **Fluxo Comercial V2** no Flow Builder
2. Adicionar um novo nó do tipo **Pergunta** com o título "Período – Sábado"
3. Configurar a mensagem: *"Ótimo! Aos sábados o buffet atende até às 12h. 😊 Sua visita seria no período da manhã, combinado?"*
4. Adicionar a opção: **"Manhã (até meio-dia)"**
5. Conectar a saída **"No sábado"** do nó "Proposta de Visita" → novo nó "Período – Sábado"
6. Conectar a opção "Manhã (até meio-dia)" → nó "Confirmação de Visita"

---

## Técnico

- DELETE em `flow_edges` (3 registros)
- DELETE em `flow_node_options` (1 registro)
- DELETE em `flow_nodes` (1 registro)
- Nenhuma migração de schema — apenas limpeza de dados
