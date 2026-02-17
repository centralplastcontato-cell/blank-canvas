

## Criar Formulário Público de Equipe (Staff) para Gerentes

### Problema
Atualmente, o preenchimento dos dados de equipe/financeiro só pode ser feito por um usuário logado dentro do painel admin. O gerente da festa precisa receber um link para preencher nomes, PIX e valores diretamente do celular, sem login.

### Solucao

Criar uma pagina publica `/equipe/:recordId` que permite ao gerente preencher os dados de staff de um evento especifico, seguindo o mesmo padrao das paginas publicas de Cardapio, Contrato e Pre-Festa.

### Fluxo do usuario

1. Admin cria um registro de "Nova Equipe" vinculado a uma festa (como ja faz hoje)
2. Apos salvar, aparece um botao "Compartilhar" no card do registro
3. Ao clicar, copia o link publico (ex: `seusite.com/equipe/abc-123`)
4. Admin envia o link via WhatsApp para o gerente da festa
5. Gerente abre no celular, ve o formulario com os cargos/slots vazios
6. Preenche nomes, dados PIX e valores
7. Clica em "Enviar" e os dados sao salvos no banco

### Mudancas tecnicas

#### 1. Politica RLS para acesso anonimo (migration SQL)
- Adicionar policy `SELECT` na tabela `event_staff_entries` para o role `anon`, permitindo leitura por `id` direto
- Adicionar policy `UPDATE` para `anon` no mesmo registro (para que o gerente possa salvar)
- Restringir o update apenas aos campos `staff_data` e `notes` (via trigger ou estrutura do update)

#### 2. Nova pagina: `src/pages/PublicStaff.tsx`
- Recebe `recordId` via `useParams`
- Carrega o registro de `event_staff_entries` pelo `id` (sem autenticacao)
- Enriquece com dados do evento (`company_events.title`, `event_date`)
- Exibe formulario mobile-friendly com os mesmos campos do dialog atual (nome, tipo PIX, chave PIX, valor)
- Cards por cargo (Gerente, Garcom, etc.) com campos editaveis
- Botao "Enviar" que faz `update` no registro existente
- Tela de sucesso apos envio
- Nao requer login

#### 3. Rota no App.tsx
- Adicionar `<Route path="/equipe/:recordId" element={<PublicStaff />} />`
- Posicionar junto das demais rotas publicas

#### 4. Botao de compartilhar no EventStaffManager.tsx
- Adicionar um botao com icone de link/share no card de cada registro
- Ao clicar, copia a URL `{origin}/equipe/{record.id}` para a area de transferencia
- Toast confirmando "Link copiado!"

#### 5. Arquivos afetados
- `src/pages/PublicStaff.tsx` — novo arquivo (pagina publica)
- `src/App.tsx` — nova rota
- `src/components/agenda/EventStaffManager.tsx` — botao de compartilhar
- Nova migration SQL — RLS para acesso anonimo

