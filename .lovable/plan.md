

## Substituir "Castelo da Diversao" hardcoded por dados dinamicos da empresa

### Problema
Cerca de 10 paginas admin e alguns componentes usam `logoCastelo` (imagem fixa) e o texto "Castelo da Diversao" no header mobile, menu lateral e fallbacks. Quando outro buffet usa a plataforma, aparece o logo e nome errados.

### Escopo da mudanca

**Grupo 1 - Headers mobile das paginas admin (mesmo padrao repetido)**

Todas essas paginas tem o mesmo codigo: `import logoCastelo` + `<img src={logoCastelo} alt="Castelo da Diversao">` no header mobile. A correcao e trocar por `currentCompany?.logo_url` e `currentCompany?.name` do `useCompany()`.

Paginas afetadas:
- `src/pages/Admin.tsx` (header + menu Sheet lateral com nome hardcoded)
- `src/pages/CentralAtendimento.tsx`
- `src/pages/WhatsApp.tsx`
- `src/pages/Agenda.tsx`
- `src/pages/Inteligencia.tsx`
- `src/pages/Configuracoes.tsx`
- `src/pages/Formularios.tsx`
- `src/pages/Users.tsx`
- `src/pages/UserSettings.tsx`

Em cada arquivo:
1. Remover `import logoCastelo from "@/assets/logo-castelo.png"`
2. Importar `useCompany` (se ainda nao importado)
3. Adicionar `const { currentCompany } = useCompany()` (se ainda nao existir)
4. Trocar `src={logoCastelo}` por `src={currentCompany?.logo_url || '/placeholder.svg'}`
5. Trocar `alt="Castelo da Diversao"` por `alt={currentCompany?.name || 'Logo'}`
6. No `Admin.tsx` especificamente, trocar o `<SheetTitle>Castelo da Diversao</SheetTitle>` por `<SheetTitle>{currentCompany?.name || 'Menu'}</SheetTitle>`

**Grupo 2 - Fallbacks de autenticacao e chatbot**

- `src/pages/Auth.tsx` (linha 141): trocar fallback `"Castelo da Diversao"` por `"Entrar"` (texto generico quando nao ha empresa no slug)
- `src/components/landing/LeadChatbot.tsx` (linha 51): trocar fallback `"Castelo da Diversao"` por `"nosso buffet"` (texto generico para modo nao-dinamico)

**Grupo 3 - Landing page do Castelo (NAO ALTERAR)**

Os arquivos abaixo sao especificos da landing page estatica do Castelo da Diversao e devem permanecer como estao, pois sao conteudo institucional fixo desse buffet:
- `src/components/landing/Footer.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/InstagramSection.tsx`
- `src/components/landing/BenefitsSection.tsx`
- `src/config/campaignConfig.ts`
- `src/pages/LandingPage.tsx`
- `src/pages/RootPage.tsx`

**Grupo 4 - Backend (NAO ALTERAR)**

- `supabase/functions/wapi-webhook/index.ts`: as mensagens default ja sao fallback e o sistema ja usa `replaceVars` com dados da empresa
- `supabase/functions/og-preview/index.ts`: metadados OG por dominio, correto como esta
- `src/components/admin/DataImportSection.tsx`: template de exemplo para importacao, aceitavel manter

### Detalhes tecnicos

**Padrao de correcao para cada pagina do Grupo 1:**

```typescript
// ANTES
import logoCastelo from "@/assets/logo-castelo.png";
// ...
<img src={logoCastelo} alt="Castelo da Diversao" className="h-8 w-auto shrink-0" />

// DEPOIS
import { useCompany } from "@/contexts/CompanyContext";
// ...
const { currentCompany } = useCompany();
// ...
<img src={currentCompany?.logo_url || '/placeholder.svg'} alt={currentCompany?.name || 'Logo'} className="h-8 w-auto shrink-0" />
```

O `AdminSidebar.tsx` ja usa esse padrao corretamente (`currentCompany?.logo_url || logoCastelo`), servindo de referencia. Nesse componente, vamos apenas trocar o fallback de `logoCastelo` para `'/placeholder.svg'` e remover o import.

### Resultado esperado
Todas as paginas admin mostrarao automaticamente o logo e nome da empresa ativa, sem nenhum referencia hardcoded ao "Castelo da Diversao" na area logada.

