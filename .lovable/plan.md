

## Plano: Sistema de Proteção Anti-Burst para Reativação

### Problema
Mesmo com a constraint UNIQUE já aplicada (que protege contra duplicatas por stage), ainda faltam camadas de proteção contra cenários como: execuções concorrentes do cron, bugs futuros, ou falhas na lógica que possam causar rajadas de mensagens.

### Proteções a Implementar

#### 1. Circuit Breaker Global por Empresa (Edge Function)
Antes de processar qualquer lead de uma empresa, contar quantas mensagens de reativação já foram enviadas **nas últimas 24h**. Se ultrapassar um limite configurável (ex: 30), abortar o ciclo inteiro para aquela empresa e logar um alerta.

#### 2. Rate Limit por Lead (Edge Function)
Verificar a última mensagem enviada (qualquer tipo) para cada lead. Se foi enviada há menos de 24h, pular. Isso impede que o lead receba mensagens em sequência mesmo de stages diferentes.

#### 3. Limite Global por Execução (Edge Function)
Adicionar um cap máximo de mensagens por execução da function (ex: 50). Ao atingir, interromper o processamento e retornar. Protege contra loops descontrolados.

#### 4. Tabela de Execution Log (Migration)
Criar uma tabela `reactivation_execution_log` que registra cada execução do cron com: timestamp, company_id, total_sent, total_skipped, total_errors. Permite auditoria e detecção de anomalias.

#### 5. Notificação Automática de Anomalia
Se em uma execução forem enviadas mais de 10 mensagens, inserir uma notificação para os admins da empresa alertando sobre volume alto.

### Mudanças Técnicas

**Migration SQL:**
```sql
CREATE TABLE public.reactivation_execution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  executed_at timestamptz DEFAULT now(),
  total_sent integer DEFAULT 0,
  total_skipped integer DEFAULT 0,
  total_errors integer DEFAULT 0,
  details jsonb DEFAULT '{}'
);

ALTER TABLE public.reactivation_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view logs"
  ON public.reactivation_execution_log FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));
```

**Edge Function (`reactivation-engine/index.ts`):**

Adicionar 3 guards no início do loop por empresa:

```text
┌─────────────────────────────────────┐
│  Para cada empresa:                 │
│                                     │
│  1. Circuit Breaker 24h             │
│     → SELECT count(*) FROM          │
│       lead_reactivation_history     │
│       WHERE sent_at > now()-24h     │
│       AND company_id = X            │
│     → Se > 30: SKIP empresa         │
│                                     │
│  2. Para cada lead:                 │
│     → Checar last sent_at           │
│     → Se < 24h atrás: SKIP lead    │
│                                     │
│  3. Cap global por execução         │
│     → if (totalSent >= 50) break    │
│                                     │
│  4. Ao final: INSERT execution_log  │
│     + notificação se volume alto    │
└─────────────────────────────────────┘
```

**Campos novos em `automation_reactivation_settings`:**
- `max_daily_sends` (integer, default 30) — limite 24h por empresa
- `max_per_execution` (integer, default 50) — cap por execução

### Resumo
- 3 camadas de proteção: por empresa/dia, por lead, e por execução
- Log de auditoria para cada execução
- Notificação automática em caso de volume anormal
- Tudo configurável pelo admin na tela de Reativação

