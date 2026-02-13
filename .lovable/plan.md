

# Corrigir visibilidade do modulo Inteligencia no sidebar

## Diagnostico

O codigo esta 100% correto. O problema e que nos dados do banco, a empresa **Castelo da Diversao** tem `enabled_modules` sem o campo `inteligencia`:

```text
enabled_modules: {
  whatsapp: true, crm: true, dashboard: true, ...
  // inteligencia NAO EXISTE aqui
}
```

Como `useCompanyModules` usa `modules.inteligencia === true` (diferente dos outros modulos que usam `!== false`), quando o campo nao existe no JSON, retorna `false`.

## Causa raiz

Quando os modulos foram salvos anteriormente (antes do campo `inteligencia` existir no codigo), o JSON foi salvo sem esse campo. O toggle aparece no dialog, mas se voce nao clicou "Salvar" depois da atualizacao do codigo, o campo nao foi persistido.

## Solucao

Duas acoes simples:

### 1. Atualizar os dados no banco (imediato)

Executar uma query SQL para adicionar `inteligencia: true` ao JSON de `enabled_modules` da empresa Castelo da Diversao:

```sql
UPDATE companies
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{enabled_modules,inteligencia}',
  'true'::jsonb
)
WHERE id = 'a0000000-0000-0000-0000-000000000001';
```

### 2. Tornar o modulo resiliente (melhoria de codigo)

Nenhuma mudanca de codigo e estritamente necessaria -- basta re-salvar os modulos pelo dialog. Porem, se quiser que `inteligencia` apareca automaticamente para empresas que ja tinham modulos salvos, podemos mudar a logica de `=== true` para `!== false` (assim como os outros modulos). Isso faria o modulo aparecer por padrao para todos, o que pode nao ser desejado no MVP.

**Recomendacao**: manter `=== true` (opt-in) e apenas salvar via dialog ou SQL.

### Resultado esperado

Apos a query SQL, o item "Inteligencia" com icone Brain aparecera no sidebar do AdminSidebar automaticamente ao recarregar a pagina.

