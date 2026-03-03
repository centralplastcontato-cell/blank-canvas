

## Diagnostico: Funcoes de Freelancers Nao Aparecendo

### Problema Identificado

No arquivo `FreelancerSchedulesTab.tsx` (linhas 186-206), a busca de funcoes usa `.in("respondent_name", uniqueNames)` que e **case-sensitive e sensivel a espacos**. Quando o freelancer preenche o formulario de cadastro com um nome ligeiramente diferente do que usa ao marcar disponibilidade (ex: "Andrea Patrícia G Ramos" vs "andrea patrícia g ramos", ou espacos extras), a query do Supabase nao retorna resultado e a funcao nao aparece.

Os freelancers destacados na screenshot (Andrea, Jamile, Mauricio, Solange) provavelmente tem pequenas diferencas de grafia entre o `respondent_name` na tabela `freelancer_responses` e o `freelancer_name` na tabela `freelancer_availability`.

### Solucao

Mudar a estrategia de busca: em vez de usar `.in()` com match exato, buscar **todas** as respostas aprovadas da empresa e fazer matching normalizado no client-side (trim + lowercase).

### Mudanca Tecnica

**Arquivo:** `src/components/freelancer/FreelancerSchedulesTab.tsx`

**Antes (linhas 184-206):**
```typescript
const { data: frData } = await supabase
  .from("freelancer_responses")
  .select("respondent_name, answers")
  .eq("company_id", companyId)
  .in("respondent_name", uniqueNames);
```

**Depois:**
```typescript
// Buscar TODAS as respostas da empresa (sem filtro de nome exato)
const { data: frData } = await supabase
  .from("freelancer_responses")
  .select("respondent_name, answers")
  .eq("company_id", companyId);

// Matching normalizado (trim + lowercase) no client
const normalize = (s: string) => s.trim().toLowerCase();
const uniqueNamesNorm = new Set(uniqueNames.map(normalize));

(frData || []).forEach((fr) => {
  const rawName = fr.respondent_name?.trim();
  if (!rawName) return;
  // Encontrar o nome original na lista de disponibilidade que bate normalizado
  const matchedOriginal = uniqueNames.find(n => normalize(n) === normalize(rawName));
  const key = matchedOriginal || rawName;
  // ... extrair roles normalmente
});
```

Isso garante que "Andrea Patrícia G Ramos" match com "andrea patrícia g ramos" ou "Andrea Patrícia G Ramos " (com espaco extra).

### Impacto

- Modificacao apenas no `loadScheduleDetails` de `FreelancerSchedulesTab.tsx`
- ~15 linhas alteradas
- Nenhuma dependencia nova

