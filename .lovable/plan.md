
# Snapshots de Score + Grafico de Evolucao Real

## Contexto
O grafico atual de tendencia mostra o score **atual** dos leads agrupado pela data de criacao. Isso nao reflete a evolucao real do score ao longo do tempo. Para isso, precisamos registrar snapshots diarios.

## Etapa 1: Criar tabela `lead_score_snapshots`

Migration SQL:

```text
CREATE TABLE public.lead_score_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  company_id uuid NOT NULL,
  score integer NOT NULL,
  temperature text NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (lead_id, snapshot_date)
);

-- Indices para queries rapidas
CREATE INDEX idx_score_snapshots_company_date 
  ON public.lead_score_snapshots (company_id, snapshot_date);
CREATE INDEX idx_score_snapshots_lead 
  ON public.lead_score_snapshots (lead_id, snapshot_date);

-- RLS
ALTER TABLE public.lead_score_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view snapshots from their companies"
  ON public.lead_score_snapshots FOR SELECT
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "System can insert snapshots"
  ON public.lead_score_snapshots FOR INSERT
  WITH CHECK (true);
```

## Etapa 2: Trigger para gravar snapshot automaticamente

Toda vez que `recalculate_lead_score` atualizar a tabela `lead_intelligence`, um trigger grava o snapshot do dia (upsert para nao duplicar no mesmo dia):

```text
CREATE OR REPLACE FUNCTION public.fn_snapshot_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.lead_score_snapshots (lead_id, company_id, score, temperature, snapshot_date)
  VALUES (NEW.lead_id, NEW.company_id, NEW.score, NEW.temperature, CURRENT_DATE)
  ON CONFLICT (lead_id, snapshot_date)
  DO UPDATE SET score = EXCLUDED.score, temperature = EXCLUDED.temperature;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_snapshot_score
  AFTER INSERT OR UPDATE ON public.lead_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.fn_snapshot_score();
```

Isso garante que, a partir do momento da implantacao, cada mudanca de score gera um registro historico.

## Etapa 3: Seed inicial dos snapshots

Usar INSERT para popular snapshots com os scores atuais (data de hoje) para todos os leads existentes:

```text
INSERT INTO lead_score_snapshots (lead_id, company_id, score, temperature, snapshot_date)
SELECT lead_id, company_id, score, temperature, CURRENT_DATE
FROM lead_intelligence
ON CONFLICT (lead_id, snapshot_date) DO NOTHING;
```

## Etapa 4: Hook `useScoreSnapshots`

Criar `src/hooks/useScoreSnapshots.ts`:
- Recebe `companyId` e `days` (padrao 30)
- Query na tabela `lead_score_snapshots` filtrando por `company_id` e `snapshot_date >= now() - days`
- Agrupa por data e calcula media do score por dia
- Retorna array `{ date: string, avgScore: number, totalLeads: number }`

## Etapa 5: Substituir grafico de tendencia no FunilTab

Alterar `src/components/inteligencia/FunilTab.tsx`:
- Importar `useScoreSnapshots`
- Substituir o `useMemo` de `scoreTrend` (que usa dados estaticos) pelo hook real
- Adicionar seletor de periodo (7d / 14d / 30d) acima do grafico
- O `AreaChart` continua igual, so muda a fonte de dados
- Adicionar linha pontilhada de "meta" (score medio ideal = 50) como referencia visual

## Arquivos modificados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar tabela + trigger + seed |
| `src/hooks/useScoreSnapshots.ts` | Novo hook para buscar snapshots |
| `src/components/inteligencia/FunilTab.tsx` | Substituir grafico fake por dados reais + seletor de periodo |

## Detalhes tecnicos

- A tabela usa `UNIQUE (lead_id, snapshot_date)` para garantir 1 registro por lead por dia
- O trigger usa `ON CONFLICT DO UPDATE` para sempre manter o ultimo score do dia
- O hook usa `useQuery` com `staleTime: 5min` para nao sobrecarregar
- Como a tabela e nova e nao existe em `types.ts`, o hook usara `.from('lead_score_snapshots' as any)` ate o tipo ser regenerado automaticamente
- RLS segue o padrao existente: filtragem por `company_id` via `get_user_company_ids`
