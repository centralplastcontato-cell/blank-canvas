
Problema real

Você está certa: o problema não foi resolvido antes. O bug não é “só visual”. O fluxo da Central de Atendimento está inconsistente e pode sobrescrever os dados do contratante/aniversariante depois que eles já foram preenchidos.

Reformulando o erro de forma exata

Quando a festa é criada/editada pelo atalho da Central de Atendimento:
1. os dados do contratante podem até ser gravados em `client_data_requests`;
2. mas o estado local do formulário principal nem sempre é atualizado com esses dados;
3. ao clicar no botão azul “Salvar” do rodapé, o fluxo do WhatsApp salva novamente a festa com campos vazios/placeholder;
4. isso apaga ou mantém vazio em `company_events` o que deveria aparecer depois na Agenda.

Do I know what the issue is?

Sim.

O que eu revisei

Arquivos principais isolados:
- `src/components/agenda/EventFormDialog.tsx`
- `src/components/agenda/ManualClientDataForm.tsx`
- `src/components/whatsapp/LeadInfoPopover.tsx`
- `src/pages/Agenda.tsx`

Evidência encontrada no banco:
- existem eventos com `client_data_requests.status = completed` e `client_data` preenchido;
- mas o mesmo `company_events` está com `child_name`, `child_age`, `child_birthdate` e `birthday_children` vazios.

Isso prova que o dado do contratante foi salvo em um lugar e perdido/sobrescrito no outro.

O que está acontecendo tecnicamente

1. O fluxo da Agenda e o fluxo da Central de Atendimento salvam a festa de formas diferentes.
   - Em `Agenda.tsx`, o payload normaliza corretamente:
     - deriva `child_name/child_age/child_birthdate` de `birthday_children[0]`
     - filtra arrays vazios
   - Em `LeadInfoPopover.tsx`, o payload é mais frágil:
     - usa `data.child_name` direto
     - envia `birthday_children: data.birthday_children || null`
     - não aplica a mesma normalização da Agenda

2. No `EventFormDialog.tsx`, há mais de um caminho de “preencher manualmente”.
   - Em alguns caminhos, o `onSaved` sincroniza `birthday_children` de volta para o `form`.
   - Em pelo menos um caminho, isso não acontece.
   - Resultado: o formulário pai continua com estado vazio, mesmo após o formulário manual ter salvo.

3. Depois disso, o botão global “Salvar” persiste esse estado vazio no evento.
   - Esse é o motivo mais forte para o comportamento “preenchi, salvei, mas depois sumiu”.

4. Há um segundo problema no fluxo do WhatsApp:
   - ao criar festa via `LeadInfoPopover.tsx`, o insert não retorna o `id` do novo evento;
   - isso deixa o fluxo de auto-save/contratante frágil para eventos criados por ali.

5. Há também diferença de status/hidratação:
   - a seção “Dados do Contratante” depende de consulta em `client_data_requests`;
   - se o evento/local state não é reidratado corretamente, a tela volta mostrando “Dados não solicitados”, mesmo com informação já preenchida.

Plano de correção

1. Unificar o payload de salvamento do WhatsApp com o da Agenda
- aplicar no `LeadInfoPopover.tsx` a mesma normalização usada em `Agenda.tsx`;
- sempre derivar:
  - `child_name`
  - `child_age`
  - `child_birthdate`
  - `birthday_children` filtrado
- impedir envio de arrays placeholder como `[{"name":"","age":"","birthdate":""}]`.

2. Corrigir todos os caminhos de retorno do formulário manual
- em `EventFormDialog.tsx`, padronizar TODOS os `onSaved` do `ManualClientDataForm`;
- sempre sincronizar para o estado pai:
  - `birthday_children`
  - `child_name`
  - `child_age`
  - `child_birthdate`
  - e, se necessário, sinalizar `clientRequest` como concluído no mesmo momento.

3. Blindar o botão “Salvar” para não sobrescrever dados válidos com vazio
- antes de submeter, se houver `clientRequest.completed/reviewed`, o dialog deve priorizar os dados já salvos do contratante;
- se o estado local estiver vazio mas existir `client_data_requests.client_data`, reidratar antes do submit;
- isso evita perder dado quando o usuário clica no “Salvar” do rodapé por hábito.

4. Corrigir a criação de festa via Central de Atendimento
- no insert de `LeadInfoPopover.tsx`, usar retorno do evento criado (`select("id").single()` ou equivalente);
- devolver o `id` ao `EventFormDialog`;
- isso estabiliza os fluxos de auto-save, link e preenchimento manual para festas novas.

5. Reforçar a hidratação ao abrir festa existente
- ao abrir uma festa pela Agenda/WhatsApp, carregar:
  - `company_events`
  - último `client_data_requests` concluído
- se `company_events` estiver vazio mas `client_data_requests` tiver aniversariante/contratante, usar isso para preencher a UI e evitar exibir “não solicitado” incorretamente.

6. Revisar a sincronização do formulário manual com `company_events`
- hoje ele atualiza só os campos do aniversariante no evento;
- vou manter a fonte principal do contratante em `client_data_requests`, mas garantir que os campos espelhados do evento nunca sejam apagados por um save posterior.

Validação que vou fazer depois da aprovação

1. Criar/editar festa pelo atalho da Central de Atendimento.
2. Preencher manualmente contratante + aniversariante.
3. Clicar em “Salvar dados”.
4. Clicar no botão azul “Salvar”.
5. Fechar e reabrir pela própria Central.
6. Abrir a mesma festa na Agenda.
7. Confirmar:
   - seção não mostra “Dados não solicitados”;
   - aniversariante permanece;
   - dados do contratante continuam acessíveis;
   - `company_events` e `client_data_requests` ficam coerentes.

Detalhe técnico importante

O motivo de isso continuar acontecendo é que há dois fluxos diferentes para salvar a mesma entidade:
- Agenda: mais completo
- Central de Atendimento: incompleto/inconsistente

Enquanto esses dois fluxos não forem alinhados, o problema vai reaparecer de forma intermitente.

Implementação prevista
- `src/components/whatsapp/LeadInfoPopover.tsx`
- `src/components/agenda/EventFormDialog.tsx`
- possivelmente pequeno ajuste em `src/components/agenda/ManualClientDataForm.tsx`

Sem necessidade, neste momento, de nova migration para corrigir a causa principal do atalho da Central de Atendimento.
