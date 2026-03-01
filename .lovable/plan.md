

# Gestao de Materiais no Hub + Desativacao dos materiais quebrados

## Contexto
Os 18 materiais de venda do Castelo da Diversao (12 PDFs, 2 videos, 2 colecoes de fotos) apontam para um storage Supabase deletado (`knyzkwgdmclcwvzhdmyk.supabase.co`). Nao ha copias em nenhum bucket do projeto atual. Os arquivos precisam ser re-enviados manualmente.

## Parte 1: Desativar materiais quebrados (parar erros)

Executar UPDATE no banco para desativar os 18 registros com URLs mortas:

```text
UPDATE sales_materials 
SET is_active = false 
WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
AND file_url LIKE '%knyzkwgdmclcwvzhdmyk%'
```

Isso faz o bot pular o envio de midias em vez de gerar erro. O fluxo continua funcionando, apenas sem as midias.

## Parte 2: Nova pagina /hub/materiais

Criar uma pagina de gestao de materiais no Hub para que o administrador possa visualizar e corrigir materiais de todas as empresas.

### Funcionalidades da pagina

1. **Lista de materiais agrupados por empresa/unidade** com cards mostrando:
   - Nome, tipo (PDF, video, foto, colecao), unidade
   - Status visual: verde (URL acessivel) ou vermelho (URL quebrada/inacessivel)
   - Botao "Substituir arquivo" para upload direto

2. **Upload de substituicao**:
   - File picker para selecionar novo arquivo
   - Upload para bucket `sales-materials` (ja existe, publico)
   - Atualizacao automatica de `file_url` no banco
   - Para colecoes de fotos: upload multiplo com atualizacao de `photo_urls`

3. **Filtro por empresa** (dropdown com empresas filhas)

4. **Toggle ativar/desativar** materiais individualmente

### Arquivos a criar/editar

**Novo: `src/pages/HubMateriais.tsx`**
- Pagina principal com `HubLayout` wrapper
- Fetch de `sales_materials` com join em `companies`
- Cards por material com status, preview e botao de upload
- Filtro por empresa
- Upload via `supabase.storage.from('sales-materials').upload()`
- Atualizacao de `file_url` e `photo_urls` apos upload

**Editar: `src/components/hub/HubSidebar.tsx`**
- Adicionar item "Materiais" ao array `hubMenuItems`
- Icone: `Package` do lucide-react
- URL: `/hub/materiais`

**Editar: `src/components/hub/HubMobileMenu.tsx`**
- Adicionar item "materiais" ao array `menuItems` do menu mobile

**Editar: `src/components/hub/HubLayout.tsx`**
- Adicionar `"materiais"` ao union type de `currentPage`

**Editar: `src/App.tsx`**
- Import de `HubMateriais`
- Adicionar rota `<Route path="/hub/materiais" element={<HubMateriais />} />`

### Padrao de verificacao de URL
Verificar se a URL contem o dominio do projeto atual (`rsezgnkfhodltrsewlhz`) para determinar status. URLs com dominios diferentes sao marcadas como "quebrada".

### Materiais que o Castelo precisa re-enviar

**Manchester (9 itens):**
- 6 PDFs: pacotes 50, 60, 70, 80, 90, 100 pessoas
- 1 colecao de 10 fotos
- 2 videos (Promocao Carnaval + Apresentacao)

**Trujillo (9 itens):**
- 6 PDFs: pacotes 50, 60, 70, 80, 90, 100 pessoas
- 1 colecao de 10 fotos
- 2 videos (Apresentacao + Promocao Carnaval)

## Resultado esperado
- Erros param imediatamente apos desativacao (Parte 1)
- Administrador consegue ver quais materiais estao quebrados e fazer re-upload pelo Hub (Parte 2)
- Apos re-upload, basta ativar o material e o bot volta a enviar normalmente

