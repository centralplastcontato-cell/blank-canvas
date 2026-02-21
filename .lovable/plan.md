

## Reformulacao do Onboarding no Hub

### Problema atual
1. O formulario publico de onboarding (`/onboarding/:slug`) mostra tela de "concluido" quando o status e `completo`, impedindo qualquer edicao posterior
2. O painel de detalhes no Hub abre como Sheet lateral (estreita), ruim no desktop
3. O formulario de edicao no Hub nao permite upload de fotos, videos ou logo - apenas campos de texto

### Solucao proposta

#### 1. Formulario publico: permitir reedicao quando ja concluido
- Quando `status === 'completo'`, ao inves de mostrar apenas a tela de sucesso, carregar os dados existentes no formulario normalmente
- Adicionar um botao "Editar informacoes" na tela de concluido que recarrega o formulario com os dados preenchidos
- Ao salvar novamente, manter status `completo` e atualizar os dados

#### 2. Hub: trocar Sheet por Dialog responsivo
- **Desktop**: Usar `Dialog` com largura generosa (~900px) para mostrar os detalhes em duas colunas
- **Mobile**: Manter o comportamento de Sheet lateral (tela cheia)
- Usar o hook `useIsMobile()` para alternar entre Dialog e Sheet automaticamente

#### 3. Hub: adicionar upload de midias no formulario de edicao
- Adicionar secao de upload de logo (com preview e remocao)
- Adicionar secao de upload de fotos (grid com preview, limite de 10, botao remover)
- Adicionar secao de upload de videos (limite de 2, botao remover)
- Reutilizar a mesma logica de upload do Supabase Storage (`onboarding-uploads` bucket)

---

### Detalhes tecnicos

**Arquivos modificados:**

1. **`src/pages/Onboarding.tsx`** (linhas 100-103)
   - Remover o bloco `if (e.status === 'completo') { setSubmitted(true); }` 
   - Em vez disso, carregar os dados normalmente e permitir edicao
   - Adicionar um estado `wasCompleted` para mostrar um banner informativo ("Onboarding ja preenchido. Voce pode atualizar as informacoes abaixo.")
   - No `handleSubmit`, manter status `completo`

2. **`src/pages/HubOnboarding.tsx`** (linhas 151-185)
   - Importar `Dialog`, `DialogContent`, `useIsMobile`
   - No desktop: renderizar `Dialog` com `max-w-4xl` ao inves de `Sheet`
   - No mobile: manter `Sheet` com `SheetContent` full width
   - Criar componente wrapper `ResponsiveDetailPanel` que alterna entre os dois
   - Adicionar uploads de logo/fotos/videos no `OnboardingEditForm`:
     - Campos de upload com `<input type="file">` e upload para Supabase Storage
     - Grid de preview para fotos existentes com botao de remocao
     - Preview de logo com opcao de troca
     - Lista de videos com botao de remocao

**Fluxo do upload no Hub edit form:**
- Usar `supabase.storage.from("onboarding-uploads").upload(path, file)` (mesmo bucket do formulario publico)
- Ao salvar, incluir `logo_url`, `photo_urls` e `video_urls` no payload de update
- Preview imediato apos upload com URL publica

