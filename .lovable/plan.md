

## Adicionar botão "Abrir Conversa" no card de detalhes da visita

### Problema
O card de detalhes da visita não tem um botão visível/prominente para abrir a conversa do lead na Central de Atendimento.

### Solução
Adicionar um botão primário "Abrir Conversa" no topo do card (na área do header, logo abaixo das informações do lead), que navega diretamente para `/atendimento?phone=...`.

### Arquivo: `src/pages/Visitas.tsx` (~linha 668, após o fechamento do header)

- Adicionar um `Button` com variante `default` (primário) logo após a seção de informações do lead, dentro da área de conteúdo
- O botão terá ícone `MessageSquare` e texto "Abrir Conversa"
- Usará `navigate(\`/atendimento?phone=\${phone}\`)` — mesma lógica já existente no botão WhatsApp das ações
- Ficará em largura total (`w-full`) para destaque visual
- Condição: só aparece se `detailVisit.lead_phone` existir

### Resultado
Um botão azul prominente no topo do card de detalhes, facilitando o acesso rápido à conversa do lead sem precisar rolar até a seção de ações.

