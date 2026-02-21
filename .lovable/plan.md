

## Clique no nome do usuario abre Perfil (/perfil)

Atualmente, apenas o avatar (bolinha) na area superior direita da Central de Atendimento tem acao de clique, e navega para `/configuracoes`. O nome do usuario ao lado nao e clicavel.

### O que sera feito

1. **Tornar toda a area clicavel** (nome + avatar) no header desktop da Central de Atendimento
2. **Alterar o destino** de `/configuracoes` para `/perfil` ao clicar nessa area
3. **Verificar outras paginas** que tenham o mesmo padrao (nome + avatar no header) e aplicar a mesma correcao para consistencia

### Detalhes tecnicos

**Arquivo principal**: `src/pages/CentralAtendimento.tsx` (linhas ~1105-1116)

- Envolver o `div` container (que contem o nome e o avatar) com `onClick={() => navigate("/perfil")}` e adicionar `cursor-pointer`
- Mover o `onClick` do `Avatar` para o container pai
- Garantir que o destino seja `/perfil` (pagina de perfil do usuario)

**Verificacao de consistencia**: Checar se paginas como `Configuracoes.tsx`, `WhatsApp.tsx`, `Inteligencia.tsx` e outras possuem o mesmo componente de nome+avatar no header, e aplicar o mesmo comportamento.

