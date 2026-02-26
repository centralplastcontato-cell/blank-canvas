

## Adicionar Novas Perguntas ao Onboarding

### Objetivo
Coletar informações operacionais do novo cliente para facilitar o setup da plataforma: sistema de automacao anterior, formato de envio de orcamento (com anexo), e prints do atendimento atual.

### Alterações

#### 1. Novos campos no `OnboardingData` (interface + initialData)
**Arquivo:** `src/pages/Onboarding.tsx`

Adicionar 4 novos campos:
- `has_automation_system`: boolean (ja usou sistema automatico?)
- `automation_system_name`: string (qual sistema?)
- `budget_format`: string (como envia orcamento - "pdf", "imagem", "whatsapp_texto", "outro")
- `budget_file_urls`: string[] (anexos do orcamento - PDF ou imagem)
- `service_screenshots`: string[] (prints do atendimento atual)

#### 2. Novos campos na tabela `company_onboarding` (migracao SQL)
Adicionar as 5 colunas correspondentes na tabela do banco de dados.

#### 3. Step 3 - Expandir "Operacao Atual"
**Arquivo:** `src/pages/Onboarding.tsx` - funcao `Step3`

Apos a pergunta "Forma atual de atendimento", adicionar:

**Secao "Sistema de automacao":**
- Switch: "Ja utiliza ou utilizou algum sistema de atendimento automatico?"
- Se sim: campo de texto "Qual sistema?" (ex: "ManyChat", "Botconversa", etc.)

**Secao "Envio de orcamento":**
- Select: "Como voce envia o orcamento para o cliente?" (opcoes: PDF, Imagem, Texto no WhatsApp, Outro)
- Upload: area para anexar o PDF ou imagem do orcamento (reutilizando a logica de upload existente com o bucket `onboarding-uploads`)

**Secao "Prints do atendimento":**
- Upload multiplo de imagens: "Envie prints de como voce atende um lead novo" (ate 5 prints)
- Texto explicativo: "Isso nos ajuda a estruturar melhor as respostas do bot"

#### 4. Upload handlers
**Arquivo:** `src/pages/Onboarding.tsx`

Adicionar 2 novos handlers (seguindo o padrao existente de `handlePhotosUpload`):
- `handleBudgetUpload`: upload de PDF ou imagem do orcamento (aceita `image/*,.pdf`)
- `handleScreenshotsUpload`: upload de prints do atendimento (aceita `image/*`, max 5)

Adicionar estados: `uploadingBudget`, `uploadingScreenshots`

#### 5. Persistencia
Atualizar `saveProgress` e `handleSubmit` para incluir os novos campos. Atualizar o carregamento de dados existentes no `useEffect` para popular os novos campos.

#### 6. HubOnboarding - Exibicao dos novos dados
**Arquivo:** `src/pages/HubOnboarding.tsx`

Atualizar a tela de detalhes do onboarding no Hub para exibir os novos campos (sistema de automacao, formato de orcamento com preview dos anexos, e prints do atendimento com opcao de download).

### Detalhes Tecnicos

Migracao SQL:
```text
ALTER TABLE company_onboarding ADD COLUMN has_automation_system boolean DEFAULT false;
ALTER TABLE company_onboarding ADD COLUMN automation_system_name text;
ALTER TABLE company_onboarding ADD COLUMN budget_format text;
ALTER TABLE company_onboarding ADD COLUMN budget_file_urls text[] DEFAULT '{}';
ALTER TABLE company_onboarding ADD COLUMN service_screenshots text[] DEFAULT '{}';
```

Os uploads usarao o bucket `onboarding-uploads` ja existente, com pastas `budget/` e `screenshots/` dentro do diretorio do `companyId`.

