

## Novo Checklist: Acompanhamento de Festa

Criar um checklist completo para o gerente acompanhar a festa, seguindo exatamente o mesmo padrao do checklist de Manutencao (tabela, componente admin, pagina publica, rota).

### Estrutura

O novo checklist tera ~37 itens organizados em categorias logicas, baseados no exemplo enviado (clickfest.com.br). Cada item tera checkbox + campo de observacao quando marcado, igual ao de manutencao.

### Itens do Checklist (melhorados)

**Preparacao (antes da festa)**
1. Ler a ficha tecnica da festa
2. Identificar o tipo de cardapio e consultar a cozinha sobre falta de itens
3. Identificar o tipo de bebidas e consultar o bar sobre falta de itens
4. Verificar se foram contratados opcionais
5. Verificar energia do buffet, acender lampadas e testar brinquedos eletronicos
6. Verificar agua e coloracao, abrir torneiras e dar descargas
7. Verificar limpeza geral do buffet e providenciar se necessario
8. Verificar reposicao de descartaveis e produtos de higiene nos banheiros
9. Verificar cestos de lixo e lixeiras posicionados com sacos
10. Verificar presenca dos colaboradores freelancers e orientar horarios
11. Confirmar se todos os freelancers escalados estao presentes (substituir se houver faltas)
12. Conferir servicos terceirizados e se estao sendo executados
13. Solicitar que terceirizados assinem o termo de responsabilidade
14. Confirmar uniformes para todos os colaboradores
15. Definir horario de lanche dos colaboradores (prontos 15min antes)
16. Definir postos de trabalho para cada colaborador
17. Fazer ensaio dos monitores do parabens e recepcao
18. Ligar som ambiente e definir playlist conforme idade/solicitacao
19. Ligar ar-condicionado 30 min antes (em dias quentes)
20. Testar retrospectiva (quando houver)
21. Testar telao (quando houver)
22. Verificar mesas organizadas, alinhadas e com guardanapeiras
23. Reunir colaboradores, orientar postura e avaliar festa anterior

**Durante a festa**
24. Recepcionar anfitrioes, se colocar a disposicao e oferecer algo
25. Garantir cumprimento do cronograma da festa
26. Separar vela(s) do bolo com isqueiro/fosforo
27. Anunciar atividades programadas (piquenique, animacao, etc)
28. Passar nas mesas e perguntar se esta tudo bem
29. Manter pelo menos 1 monitor no salao de brinquedos durante parabens

**Encerramento**
30. Apresentar lista de presenca final (pagantes vs cortesias)
31. Fazer acerto de excedentes e opcionais em aberto
32. Supervisionar arrumacao dos setores (cozinha, bar, lanchonete, brinquedos)
33. Verificar armazenamento correto de sobras de alimentos (etiquetar)
34. Verificar devolucao de uniformes em bom estado
35. Desligar aparelhos eletronicos (brinquedos, som, TVs)
36. Desligar todos os ar-condicionados
37. Fechamento do buffet: desligar luzes e trancar portas

### Mudancas tecnicas

1. **Nova tabela `party_monitoring_entries`** - Mesma estrutura de `maintenance_entries` (id, company_id, event_id, items jsonb, notes text, filled_by uuid, created_at, updated_at)

2. **Novo componente `src/components/agenda/PartyMonitoringManager.tsx`** - Componente admin para gerenciar registros, copiar link, compartilhar. Segue o padrao exato do `MaintenanceManager.tsx` com os 37 itens default

3. **Nova pagina publica `src/pages/PublicPartyMonitoring.tsx`** - Formulario publico acessivel via link, mesmo padrao do `PublicMaintenance.tsx`. Icone de ClipboardCheck ao inves de Wrench. Titulo "Acompanhamento de Festa"

4. **Nova rota em `src/App.tsx`** - `/acompanhamento/:recordId` apontando para PublicPartyMonitoring

5. **Nova aba em `src/pages/Formularios.tsx`** - Adicionar aba "Acompanhamento" dentro da secao Checklist, ao lado de Equipe e Manutencao, com icone ClipboardCheck

6. **RLS** - Habilitar RLS na nova tabela com politicas identicas as de `maintenance_entries` (acesso publico para select/update por ID, insert/delete por empresa)

