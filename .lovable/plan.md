

## Redirect apos envio do formulario de Escala

### O que sera feito

Apos o freelancer enviar a disponibilidade na pagina publica de escalas (`/escala/...`), a tela de confirmacao vai mostrar um botao "Conhecer o espaco" e redirecionar automaticamente apos 5 segundos para a Landing Page da empresa (`/lp/{slug}`), seguindo o mesmo padrao que ja existe no formulario de cadastro de freelancer.

### Mudancas

**Arquivo: `src/pages/PublicFreelancerSchedule.tsx`**

1. Buscar o `slug` da empresa junto com `name` e `logo_url` na query de carregamento
2. Adicionar o campo `company_slug` ao estado `ScheduleData`
3. Adicionar um `useEffect` que, apos `submitted === true`, redireciona automaticamente para `/lp/{company_slug}` em 5 segundos (mesmo comportamento do `PublicFreelancer.tsx`)
4. Adicionar um botao "Conhecer o espaco" na tela de confirmacao para redirecionamento imediato

### Detalhes tecnicos

- Na query `supabase.from("companies").select(...)`, incluir o campo `slug` alem de `name` e `logo_url`
- Adicionar `company_slug: string | null` na interface `ScheduleData`
- O `useEffect` de redirect sera identico ao existente em `PublicFreelancer.tsx`:
  ```
  useEffect(() => {
    if (!submitted || !schedule) return;
    const timer = setTimeout(() => {
      if (schedule.company_slug) window.location.href = `/lp/${schedule.company_slug}`;
    }, 5000);
    return () => clearTimeout(timer);
  }, [submitted, schedule]);
  ```
- Na tela de sucesso, adicionar texto "Redirecionando..." e um botao para ir imediatamente

