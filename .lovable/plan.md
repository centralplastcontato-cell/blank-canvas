

# Reorganizar "Formularios" para incluir Checklist

## Objetivo
Renomear o item de menu **"Formulários"** para **"Documentos"** (ou similar) e reorganizar a página para ter duas seções principais:
1. **Formulários** - com as abas existentes (Avaliações, Pre-Festa, Contrato, Cardapio)
2. **Checklist** - mover o gerenciador de templates de checklist que hoje fica em Configuracoes para ca

## O que muda para o usuario

- No menu lateral e mobile, o item **"Formularios"** passa a se chamar **"Documentos"**
- Ao acessar, aparecem **duas abas principais**: "Formularios" e "Checklist"
- Dentro de "Formularios", ficam as sub-abas ja existentes (Avaliacoes, Pre-Festa, Contrato, Cardapio)
- Dentro de "Checklist", fica o gerenciador de templates de checklist (que hoje esta escondido nas Configuracoes)
- A aba de Checklist e removida da pagina de Configuracoes

## Detalhes Tecnicos

### 1. Renomear no Sidebar e Mobile Menu
- `AdminSidebar.tsx`: trocar label "Formularios" para "Documentos" e icone para `FolderOpen` ou `FileStack`
- `MobileMenu.tsx`: mesma alteracao

### 2. Reestruturar a pagina `Formularios.tsx`
- Adicionar duas abas de nivel superior: **"Formularios"** e **"Checklist"**
- A aba "Formularios" contera as sub-abas existentes (Avaliacoes, Pre-Festa, Contrato, Cardapio)
- A aba "Checklist" renderizara o componente `ChecklistTemplateManager` que ja existe

### 3. Remover Checklist das Configuracoes
- Identificar onde o `ChecklistTemplateManager` e referenciado em Configuracoes e remover

### 4. Atualizar rota e titulo
- Manter a rota `/formularios` (sem quebrar links)
- Atualizar titulo da pagina para "Documentos"

### Arquivos a editar
- `src/pages/Formularios.tsx` - reestruturar com abas de nivel superior
- `src/components/admin/AdminSidebar.tsx` - renomear item do menu
- `src/components/admin/MobileMenu.tsx` - renomear item do menu
- `src/pages/Configuracoes.tsx` ou componente de config relacionado - remover referencia ao checklist

