
# Permitir administradores de empresa gerenciar materiais de venda

## Problema

O botao de adicionar/editar/excluir materiais de venda so aparece para administradores da plataforma (`isAdmin` vindo de `useUserRole`). Administradores e donos de empresa (`admin`/`owner` na tabela `user_companies`) nao conseguem ver essas opcoes, mesmo tendo acesso a pagina de Configuracoes.

## Causa raiz

O componente `SalesMaterialsSection` usa a prop `isAdmin` (que e `true` apenas para admins da plataforma) para controlar a exibicao dos botoes de gerenciamento. Precisamos tambem considerar o papel do usuario na empresa.

## Solucao

Adicionar verificacao do papel do usuario na empresa dentro do `SalesMaterialsSection`. Se o usuario for `admin` ou `owner` da empresa atual, ele tambem pode gerenciar materiais.

### Alteracoes

**Arquivo: `src/components/whatsapp/settings/SalesMaterialsSection.tsx`**

1. Importar `useCompany` do contexto
2. Obter `currentRole` do contexto da empresa
3. Criar variavel `canManage` que e `true` se `isAdmin` (plataforma) OU se `currentRole` e `admin`/`owner`
4. Substituir todas as verificacoes `{isAdmin && (...)}` por `{canManage && (...)}`

Pontos afetados (4 ocorrencias no arquivo):
- Botao "+" no header do card (linha ~637)
- Botao "Adicionar" no estado vazio (linha ~692)
- Switch de ativar/desativar material (nos cards de material)
- Botoes de editar/excluir material (nos cards de material)

Nenhum outro arquivo precisa ser alterado. A prop `isAdmin` continua existindo para manter compatibilidade, mas agora o acesso e expandido para incluir admins da empresa.
