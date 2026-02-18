
## Padronizar Layout dos Cards em Todas as Seções

### Problema
As seções de **Checklist** (Equipe, Manutencao, Acompanhamento, Presenca, Informacoes), **Pacotes** e **Escalas (Freelancer)** exibem seus cards ocupando toda a largura da tela. Ja as seções de **Formularios** (Avaliacoes, Pre-Festa, Contrato, Cardapio) e **Cadastro/Avaliacoes de Freelancer** usam `max-w-6xl mx-auto` para centralizar o conteudo com largura controlada.

### Solucao
Adicionar `max-w-6xl mx-auto` ao container raiz de cada componente que esta sem centralizacao, igualando ao padrao dos Formularios.

### Arquivos a Modificar

1. **`src/components/agenda/EventStaffManager.tsx`** (linha ~238)
   - De: `<div className="space-y-4">`
   - Para: `<div className="max-w-6xl mx-auto space-y-4">`

2. **`src/components/agenda/MaintenanceManager.tsx`** (linha ~204)
   - De: `<div className="space-y-4">`
   - Para: `<div className="max-w-6xl mx-auto space-y-4">`

3. **`src/components/agenda/PartyMonitoringManager.tsx`** (linha ~258)
   - De: `<div className="space-y-4">`
   - Para: `<div className="max-w-6xl mx-auto space-y-4">`

4. **`src/components/agenda/AttendanceManager.tsx`** (linha ~162)
   - De: `<div className="space-y-4">`
   - Para: `<div className="max-w-6xl mx-auto space-y-4">`

5. **`src/components/agenda/EventInfoManager.tsx`** (linha ~178)
   - De: `<div className="space-y-4">`
   - Para: `<div className="max-w-6xl mx-auto space-y-4">`

6. **`src/components/admin/PackagesManager.tsx`** (linha ~102)
   - De: `<div className="space-y-4">`
   - Para: `<div className="max-w-6xl mx-auto space-y-4">`

7. **`src/components/freelancer/FreelancerSchedulesTab.tsx`** (linha ~195)
   - De: `<div className="space-y-4">`
   - Para: `<div className="max-w-6xl mx-auto space-y-4">`

Sao 7 alteracoes simples e identicas, todas adicionando as mesmas classes de centralizacao usadas nos Formularios.
