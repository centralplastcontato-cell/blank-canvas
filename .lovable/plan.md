

# Plano: Processo de Contratacao Estruturado (Fases 1 e 2)

## Resumo da Analise

### Estado atual:
- **EventFormDialog.tsx**: Modal com 4 secoes (Cliente, Data/Horario, Festa, Comerciais). Campos de pagamento sao um simples Select (cartao/boleto/pix/dinheiro/misto). Nao tem dados pessoais do contratante.
- **company_events**: Tabela nao tem campos para dados do contratante (CPF, RG, endereco, etc.) nem para condicao de pagamento detalhada.
- **contrato_responses**: Ja existe tabela com `answers` (JSON), `event_id`, `company_id` — pode ser reaproveitada ou servir de referencia.
- **PublicContrato.tsx**: Formulario publico existente que usa `contrato_templates` — mas e voltado para templates genericos, nao para coleta de dados pessoais vinculada a uma festa.

### Decisao de arquitetura:
Criar uma nova tabela `client_data_requests` para gerenciar o fluxo de solicitacao/resposta de dados pessoais, vinculada a `company_events`. Adicionar coluna `payment_details` (JSONB) em `company_events` para condicao de pagamento estruturada. Criar nova pagina publica para formulario de dados pessoais.

---

## Fase 1 — Melhorar Modal de Nova Festa

### 1A. Migracao de banco

Adicionar a `company_events`:
- `payment_details` (jsonb, nullable) — estrutura: `{ entrada_valor, entrada_forma, saldo_valor, saldo_forma, parcelas, vencimentos, observacoes_pagamento }`

Criar tabela `client_data_requests`:
```
id uuid PK
company_id uuid FK companies
event_id uuid FK company_events
lead_id uuid FK campaign_leads (nullable)
token text UNIQUE NOT NULL
status text DEFAULT 'pending' (pending/sent/completed/reviewed)
client_data jsonb (nome, cpf, rg, nascimento, email, cep, endereco, numero, complemento, bairro, cidade, estado)
sent_at timestamptz
completed_at timestamptz
created_at timestamptz DEFAULT now()
```

RLS: empresa ve seus registros; acesso publico via RPC SECURITY DEFINER usando token.

### 1B. Reestruturar EventFormDialog.tsx

Reorganizar em 5 secoes visuais:

1. **Dados do Cliente** (existente — manter)
2. **Data e Horario** (existente — manter)
3. **Informacoes da Festa** (existente — manter)
4. **Pagamento** (reformular):
   - Forma de pagamento (Select existente + opcao "Transferencia")
   - Valor de entrada (Input monetario)
   - Forma da entrada (Select: pix/cartao/dinheiro/boleto/transferencia)
   - Valor do saldo (Input monetario)
   - Forma do saldo (Select)
   - Parcelas (Input numerico)
   - Observacoes de pagamento (Textarea)
5. **Dados do Contratante** (novo):
   - Status badge: "Nao enviado" / "Aguardando" / "Recebido"
   - Botao "Solicitar dados do contratante" (gera link)
   - Botao "Copiar link" quando ja gerado
   - Quando recebido: mostra dados preenchidos em modo read-only

### 1C. Atualizar handleFestaSubmit

Em `CentralAtendimento.tsx` e `Admin.tsx`: incluir `payment_details` no payload de insert/update.

---

## Fase 2 — Formulario Externo do Cliente

### 2A. RPC publica

Criar funcao `get_client_data_request_by_token(token)` SECURITY DEFINER que retorna dados da solicitacao + branding da empresa (logo, nome).

Criar funcao `submit_client_data_public(token, data)` SECURITY DEFINER que valida token, salva `client_data`, atualiza status para `completed`.

### 2B. Pagina publica

Criar `src/pages/PublicClientData.tsx`:
- Rota: `/dados-contratante/:token`
- Carrega dados via RPC
- Formulario com: nome, CPF (mascara), RG, data nascimento, email, CEP (auto-fill via ViaCEP), endereco, numero, complemento, bairro, cidade, estado
- Branding da empresa no topo
- Submit via RPC
- Tela de agradecimento

### 2C. Fluxo de envio no modal

No botao "Solicitar dados do contratante" do EventFormDialog (ou do EventDetailSheet na Agenda):
1. Cria registro em `client_data_requests` com token unico
2. Mostra link para copiar
3. Opcionalmente abre share (WhatsApp link se disponivel)

### 2D. Notificacao ao buffet

Quando cliente submete:
- Trigger no banco atualiza status
- No frontend: ao abrir modal/detalhe da festa, query `client_data_requests` pelo `event_id` para mostrar status atualizado e dados preenchidos

### 2E. Rota no App.tsx

Adicionar rota publica: `<Route path="/dados-contratante/:token" element={<PublicClientData />} />`

---

## Arquivos a criar/editar

| Arquivo | Acao |
|---|---|
| Migracao SQL | Criar tabela + coluna + RPCs + RLS |
| `src/components/agenda/EventFormDialog.tsx` | Reformular secao pagamento + adicionar secao contratante |
| `src/pages/CentralAtendimento.tsx` | Atualizar payload com payment_details |
| `src/pages/Admin.tsx` | Atualizar payload com payment_details |
| `src/pages/PublicClientData.tsx` | Criar pagina publica |
| `src/App.tsx` | Adicionar rota publica |

## Fora do escopo (conforme solicitado)
- Geracao de contrato final
- PDF / assinatura digital
- Automacao WhatsApp completa
- Impressao

