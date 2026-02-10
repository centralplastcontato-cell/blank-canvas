

## Bypass de modulos para admin global

O admin global (centralplast.contato@gmail.com) deve ver todas as abas de configuracao independente dos modulos habilitados na empresa ativa. Isso e consistente com o padrao existente onde `isAdmin` ja bypassa permissoes granulares.

### Mudanca

**Arquivo**: `src/hooks/useCompanyModules.ts`

Criar um novo hook alternativo ou modificar `useCompanyModules` para aceitar um parametro `isAdmin`. Porem, como o hook atual nao recebe esse parametro e e usado em varios lugares, a abordagem mais limpa e ajustar o filtro diretamente onde ele e aplicado.

**Arquivo**: `src/components/whatsapp/WhatsAppConfig.tsx`

No `useMemo` que filtra `configSections` (linha ~97), adicionar uma verificacao: se `isAdmin === true`, ignorar a restricao de modulos (`moduleEnabled` sera sempre `true`).

Codigo atual:
```
const configSections = useMemo(() => {
  return allConfigSections.filter(section => {
    const hasPermission = section.permissionKey === null || permissions[section.permissionKey];
    const moduleEnabled = section.moduleKey === null || modules[section.moduleKey];
    return hasPermission && moduleEnabled;
  });
}, [permissions, modules]);
```

Codigo novo:
```
const configSections = useMemo(() => {
  return allConfigSections.filter(section => {
    const hasPermission = section.permissionKey === null || permissions[section.permissionKey];
    const moduleEnabled = isAdmin || section.moduleKey === null || modules[section.moduleKey];
    return hasPermission && moduleEnabled;
  });
}, [permissions, modules, isAdmin]);
```

A unica alteracao e adicionar `isAdmin ||` antes da checagem de modulos. Como `isAdmin` ja e recebido como prop do componente e ja bypassa permissoes no `useConfigPermissions`, isso mantem o padrao consistente.

### Impacto

- Nenhuma mudanca de banco de dados
- Nenhum novo arquivo
- Apenas 1 linha alterada em 1 arquivo
- Admin global vera todas as abas (Fluxos, Importar Dados, Avancado, etc.) mesmo quando a empresa ativa nao tem esses modulos habilitados
- Usuarios comuns continuam vendo apenas os modulos habilitados para sua empresa

