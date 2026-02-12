
# Correção dos botões de status no WhatsApp

## Problema
Existem 4 arrays de status no `WhatsAppChat.tsx`. Dois deles (mobile, linhas ~3832 e ~3904) usam labels errados ("Contato" e "Aguard." em vez de "Visita" e "Negoc."). Alem disso, **todas as 4 arrays** estao sem o status **"Transferência"** (`transferido`).

## Alterações

**Arquivo:** `src/components/whatsapp/WhatsAppChat.tsx`

### 1. Mobile - Lead vinculado (linhas 3832-3840)
- `em_contato`: "Contato" -> **"Visita"**
- `aguardando_resposta`: "Aguard." -> **"Negoc."**
- Adicionar `{ value: 'transferido', label: 'Transf.', color: 'bg-cyan-500' }`
- Incluir `"transferido"` no type cast da linha 3851

### 2. Mobile - Lead nao vinculado (linhas 3904-3912)
- `em_contato`: "Contato" -> **"Visita"**
- `aguardando_resposta`: "Aguard." -> **"Negoc."**
- `orcamento_enviado`: "Orçam." -> **"Orçam."** (manter abreviado)
- Adicionar `{ value: 'transferido', label: 'Transf.', color: 'bg-cyan-500' }`

### 3. Desktop - Lead vinculado (linhas 3119-3127)
- Adicionar `{ value: 'transferido', label: 'Transferência', color: 'bg-cyan-500' }`
- Incluir `"transferido"` no type cast da linha 3138
- Adicionar `transferido: 'Transferência'` no `statusLabels` (linha 3156)

### 4. Desktop - Lead nao vinculado (linhas 3189-3197)
- Adicionar `{ value: 'transferido', label: 'Transferência', color: 'bg-cyan-500' }`

### 5. statusLabels do mobile (linhas 3869-3877)
- Corrigir `em_contato: 'Em Contato'` -> **`em_contato: 'Visita'`**
- Corrigir `aguardando_resposta: 'Aguardando Resposta'` -> **`aguardando_resposta: 'Negociando'`**
- Adicionar `transferido: 'Transferência'`

Nenhuma alteracao em banco de dados e necessaria — o enum `lead_status` ja inclui `transferido`.
