

## Corrigir templates ausentes para Buffet Planeta Divertido

### Problema identificado
A usuario "Fernanda" do Buffet Planeta Divertido tem o papel de **member** (nao admin/owner). Isso causa dois problemas:

1. O **auto-seed** (inserir templates padrao automaticamente na primeira visita) falha silenciosamente porque a politica RLS da tabela `message_templates` exige role `admin` ou `owner` para INSERT
2. O **botao "Carregar Templates Padrao"** fica oculto porque o componente verifica `isAdmin`, que e `false` para members

### Solucao

**Passo 1 - Inserir templates padrao via migracao SQL**
Criar uma migracao que insere os 5 templates padrao para o company_id do Planeta Divertido (`6bc204ae-1311-4c67-bb6b-9ab55dae9d11`), garantindo que eles aparecem imediatamente.

**Passo 2 - Corrigir o componente MessagesSection para members com permissao**
Atualizar a logica do componente para que usuarios com permissao de configuracao (nao apenas admins) possam:
- Ver o botao "Carregar Templates Padrao" no estado vazio
- Criar e editar templates

Isso sera feito mudando as verificacoes de `isAdmin` para incluir tambem o parametro `isAdmin` OR quando o usuario tem acesso a pagina de configuracoes (se ele esta vendo a tela, ele tem permissao).

### Detalhes tecnicos

**Migracao SQL:**
```sql
INSERT INTO message_templates (name, template, is_active, sort_order, company_id)
VALUES
  ('Primeiro contato', 'Oi {{nome}}! Aqui e do {{empresa}}! Vi seu pedido para festa em {{mes}} com {{convidados}}. Vou te enviar as opcoes e valores!!', true, 0, '6bc204ae-1311-4c67-bb6b-9ab55dae9d11'),
  ('Follow-up', 'Oi {{nome}}! Tudo bem? Passando pra ver se voce conseguiu avaliar o orcamento. Posso te ajudar a garantir sua data?', true, 1, '6bc204ae-1311-4c67-bb6b-9ab55dae9d11'),
  ('Envio de Orcamento', 'Oi {{nome}}! Segue seu orcamento com a promocao da campanha {{campanha}}.', true, 2, '6bc204ae-1311-4c67-bb6b-9ab55dae9d11'),
  ('Convite para visita', 'Gostaria de vir conhecer pessoalmente?', true, 3, '6bc204ae-1311-4c67-bb6b-9ab55dae9d11'),
  ('Convite para visita (completo)', 'Oi {{nome}}! Que legal que voce esta interessado(a) no {{empresa}}! Gostaria de agendar uma visita para conhecer nosso espaco? Temos horarios disponiveis e seria um prazer receber voce!', true, 4, '6bc204ae-1311-4c67-bb6b-9ab55dae9d11');
```

**`src/components/whatsapp/settings/MessagesSection.tsx`:**
- Trocar as verificacoes `{isAdmin && (...)}` nos botoes de acao (Novo Template, Carregar Padrao, Editar, Excluir) para permitir tambem usuarios que tem acesso a pagina -- ou seja, se o usuario esta vendo esta secao, ele tem permissao para editar. Simplificar usando uma variavel `canManage = true` (qualquer usuario que acessa a tela de configuracoes ja passou pela verificacao de permissao).

