
## Corrigir exibicao do endereco da pagina

O texto auxiliar abaixo do campo "Endereco da Pagina" sempre mostra `celebrei.com/{slug}`, mesmo quando a empresa possui um dominio customizado configurado. A correcao fara com que, quando houver dominio customizado, o texto exiba o dominio proprio.

### Logica

- Se `customDomain` (ou `currentCompany.custom_domain`) estiver preenchido, mostrar o dominio customizado como link principal
- Caso contrario, manter o fallback `celebrei.com/{slug}`

### Arquivo alterado

**`src/components/whatsapp/settings/CompanyDataSection.tsx`** (linhas 156-161)

Texto atual:
```
Esse e o nome usado no link da sua pagina.
celebrei.com/planeta-divertido
```

Novo comportamento:
- Com dominio customizado: mostra `buffetplanetadivertido.online` e uma nota secundaria com o link alternativo `celebrei.com/{slug}`
- Sem dominio customizado: mantem `celebrei.com/{slug}` como esta hoje

Exemplo visual com dominio:
```
Esse e o nome usado no link da sua pagina.
buffetplanetadivertido.online  (link principal)
Tambem acessivel via celebrei.com/planeta-divertido
```
