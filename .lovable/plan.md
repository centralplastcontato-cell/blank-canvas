

## Escalas de Freelancer - Sistema de Disponibilidade e Escala

### Visao geral do fluxo

O buffet cria uma "rodada de escala" selecionando festas de um periodo. O sistema gera um link publico onde freelancers informam nome, telefone e marcam em quais festas tem disponibilidade. No painel admin (nova aba "Escalas"), o buffet visualiza quem tem disponibilidade para cada festa, seleciona os escalados por funcao e gera um PDF bonito para compartilhar no WhatsApp.

### Fluxo passo a passo

1. **Admin cria rodada**: Seleciona periodo (data inicio/fim), sistema lista as festas do periodo. Admin confirma e gera o link.
2. **Freelancer acessa link**: Ve a lista de festas com data/horario/pacote. Preenche nome + telefone + seleciona as festas em que tem disponibilidade.
3. **Admin visualiza**: Na aba "Escalas", ve cada rodada com as festas e quem se candidatou. Pode filtrar por funcao (se o freelancer ja tem cadastro com funcao definida).
4. **Admin escala**: Seleciona os freelancers para cada festa.
5. **Admin gera PDF**: Botao "Gerar Escala" cria um PDF formatado com a lista dos escalados por festa, pronto para compartilhar.

### Novas tabelas no banco de dados

**freelancer_schedules** (rodada de escala)
- id (uuid, PK)
- company_id (uuid, FK)
- title (text) - ex: "Escala Janeiro Semana 3"
- start_date (date)
- end_date (date)
- event_ids (uuid[]) - festas selecionadas
- slug (text) - para URL amigavel
- is_active (boolean, default true)
- created_at, updated_at

**freelancer_availability** (respostas dos freelancers)
- id (uuid, PK)
- schedule_id (uuid, FK -> freelancer_schedules)
- company_id (uuid)
- freelancer_name (text)
- freelancer_phone (text)
- available_event_ids (uuid[]) - festas marcadas como disponivel
- created_at

**freelancer_assignments** (escalacao final feita pelo admin)
- id (uuid, PK)
- schedule_id (uuid, FK)
- event_id (uuid, FK -> company_events)
- company_id (uuid)
- freelancer_name (text)
- role (text) - funcao atribuida (Garcom, Monitor, etc.)
- created_at

### RLS

- freelancer_schedules: SELECT/INSERT/UPDATE/DELETE para usuarios da empresa + admins. SELECT publico (anon) para o formulario.
- freelancer_availability: INSERT publico (anon). SELECT para usuarios da empresa.
- freelancer_assignments: ALL para usuarios da empresa + admins.

### Novos componentes

1. **FreelancerSchedulesTab.tsx** - Nova aba "Escalas" dentro da secao Freelancer
   - Lista de rodadas criadas
   - Botao "Nova Escala" abre dialog para selecionar periodo e festas
   - Ao expandir uma rodada: mostra festas com contagem de disponiveis
   - Ao clicar em uma festa: mostra freelancers disponiveis, permite selecionar/escalar
   - Botao "Gerar PDF" usando jsPDF (ja instalado)

2. **CreateScheduleDialog.tsx** - Dialog para criar rodada
   - Date picker para inicio/fim
   - Lista de festas do periodo (de company_events) com checkbox
   - Campo titulo (auto-sugerido)

3. **PublicFreelancerSchedule.tsx** - Pagina publica (/escala/:slug ou /escala/:id)
   - Header com logo da empresa
   - Campos: nome e telefone
   - Lista de festas com data/horario/tipo - cada uma com checkbox
   - Botao enviar

4. **ScheduleAssignmentView.tsx** - Visao de escalacao por festa
   - Lista de festas da rodada
   - Para cada festa: freelancers disponiveis com checkbox de selecao
   - Dropdown para atribuir funcao
   - Botao gerar PDF

5. **SchedulePDFGenerator.ts** - Funcao que usa jsPDF para gerar documento
   - Logo da empresa no topo
   - Titulo da rodada + periodo
   - Para cada festa: data, horario, pacote, lista dos escalados com funcao
   - Design limpo e profissional

### Alteracoes em arquivos existentes

- **Formularios.tsx**: Adicionar sub-aba "Escalas" dentro da secao Freelancer (ao lado de "Cadastro" e "Avaliacoes")
- **App.tsx**: Adicionar rota `/escala/:scheduleId` e `/escala/:companySlug/:scheduleSlug` para a pagina publica
- **permission_definitions**: Adicionar `operacoes.escalas` (ou reutilizar `operacoes.freelancer`)

### Geracao do PDF

O PDF sera gerado com jsPDF + jspdf-autotable (ambos ja instalados). Formato:
- Cabecalho com logo + nome da empresa
- Titulo: "Escala - [Titulo da Rodada]"
- Periodo: DD/MM a DD/MM
- Para cada festa: tabela com colunas Nome | Funcao
- Rodape com data de geracao

### Detalhes da pagina publica

A pagina publica segue o mesmo padrao visual do formulario de cadastro de freelancer (gradiente suave, cards arredondados, animacoes com framer-motion). O freelancer ve:
- Nome da empresa + logo
- Campos nome e telefone (com mascara)
- Cards de cada festa mostrando: data (dia da semana + data), horario, tipo/pacote
- Checkbox em cada card para marcar disponibilidade
- Botao "Enviar disponibilidade"
- Tela de confirmacao

### Permissoes

Reutilizar a permissao `operacoes.freelancer` existente para controlar acesso a aba Escalas, ja que faz parte do mesmo modulo. Nao sera necessaria uma permissao separada.

