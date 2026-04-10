

## Plano: Assinatura Digital de Contratos (Desenho + OTP WhatsApp + Auditoria)

### Visão Geral

O cliente do buffet receberá um link público para visualizar e assinar o contrato digitalmente, usando:
1. **Desenho de assinatura** (Canvas — dedo no celular ou mouse)
2. **Código OTP via WhatsApp** (validação de identidade pelo número do lead)
3. **Registro de auditoria completo** (IP, hash SHA-256 do documento, user-agent, timestamp)

Base legal: MP 2.200-2 Art. 10 §2º — assinatura eletrônica válida quando aceita pelas partes.

### Fluxo do Usuário

```text
Buffet gera contrato → Clica "Enviar p/ Assinatura"
  → Sistema gera token único + salva no DB
  → Envia link via WhatsApp (wapi-send)

Cliente abre link público → Lê contrato completo
  → Clica "Assinar" → Desenha assinatura no canvas
  → Sistema envia OTP (6 dígitos) via WhatsApp
  → Cliente digita o código → Validado
  → Assinatura + hash + IP + timestamp salvos
  → Status do contrato muda para "assinado"
  → Buffet recebe notificação
```

### Alterações no Banco de Dados (1 migration)

**Nova tabela: `contract_signatures`**
- `id` uuid PK
- `contract_id` uuid FK → generated_contracts (NOT NULL)
- `company_id` uuid (NOT NULL)
- `signer_name` text
- `signer_phone` text
- `signature_image_url` text (base64 ou storage URL)
- `document_hash` text (SHA-256 do conteúdo no momento da assinatura)
- `otp_code` text (código de 6 dígitos, temporário)
- `otp_sent_at` timestamptz
- `otp_verified_at` timestamptz
- `ip_address` text
- `user_agent` text
- `signed_at` timestamptz
- `token` text UNIQUE (token público para acesso sem login)
- `status` text DEFAULT 'pending' (pending → otp_sent → signed → expired)
- `created_at` timestamptz DEFAULT now()

Adicionar coluna `signature_token` na `generated_contracts` para link rápido.

RLS: anon SELECT via RPC `get_contract_for_signing(token)` (SECURITY DEFINER).

### Alterações nos Arquivos

**1. Migration SQL**
- Criar tabela `contract_signatures`
- Criar RPC `get_contract_for_signing(_token text)` — retorna contrato + dados da empresa (sem dados sensíveis)
- Criar RPC `submit_contract_signature(_token, _otp, _signature_base64, _ip, _user_agent)` — valida OTP, salva assinatura, atualiza status
- RLS habilitada, acesso público apenas via RPCs

**2. Nova página pública: `src/pages/PublicContractSign.tsx`**
- Rota: `/assinar-contrato/:token`
- Busca contrato via RPC `get_contract_for_signing`
- Renderiza contrato completo (read-only, estilo `ContractDocumentViewer`)
- Componente `SignatureCanvas` (canvas HTML5 para desenho)
- Botão "Solicitar Código" → chama edge function → envia OTP via WhatsApp
- Input OTP (6 dígitos) → valida e finaliza

**3. Novo componente: `src/components/contracts/SignatureCanvas.tsx`**
- Canvas HTML5 com suporte a touch e mouse
- Botões: Limpar, Cor (preto/azul)
- Exporta como base64 PNG
- Responsivo (funciona bem no celular)

**4. Edge Function: `supabase/functions/contract-otp/index.ts`**
- POST com `{ token, action }` onde action = "send-otp" ou "verify-otp"
- **send-otp**: gera código 6 dígitos, salva na tabela, envia via `wapi-send` (reusa infraestrutura existente)
- **verify-otp**: valida código (expira em 10min), calcula hash SHA-256 do conteúdo, salva assinatura com IP/user-agent
- Atualiza `generated_contracts.status` para "assinado"
- Registra no `contract_audit_logs`
- Envia notificação ao buffet

**5. Atualizar `GeneratedContractsList.tsx`**
- Novo botão "Enviar p/ Assinatura" (ícone FileSignature)
- Gera token, cria registro em `contract_signatures`, envia link via WhatsApp
- Mostra badge "Aguardando Assinatura" / "Assinado ✅"

**6. Atualizar `ContractDocumentViewer.tsx`**
- Quando contrato está assinado, mostrar seção com:
  - Imagem da assinatura
  - Data/hora da assinatura
  - Hash do documento
  - IP do signatário
  - Badge "Assinado digitalmente"

**7. Rota no `App.tsx`**
- Adicionar `/assinar-contrato/:token` → `PublicContractSign`

### Segurança

- Token UUID v4 único e aleatório (impossível adivinhar)
- OTP expira em 10 minutos, máximo 3 tentativas
- Hash SHA-256 garante integridade do documento (qualquer alteração invalida)
- IP e user-agent registrados para rastreabilidade
- Acesso público apenas via RPCs SECURITY DEFINER (sem SELECT direto)
- Contrato renderizado é congelado (já é imutável na tabela `generated_contracts`)

### O Que NÃO Muda

- Infraestrutura WhatsApp intacta (usa apenas `wapi-send` para enviar OTP e link)
- Fluxo de geração de contratos existente permanece igual
- Nenhuma API externa necessária

