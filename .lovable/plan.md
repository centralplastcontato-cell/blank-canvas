

## Auto-preencher funcao dos freelancers na escalacao

### O que muda
Quando o buffet escalar um freelancer (marcar o checkbox), o sistema busca automaticamente a(s) funcao(oes) cadastrada(s) desse freelancer no formulario de recrutamento e pre-preenche o campo de funcao. Se o freelancer tiver mais de uma funcao, o select fica aberto para o buffet escolher qual.

### Como funciona hoje
- O buffet marca o checkbox do freelancer
- O campo de funcao fica vazio (o buffet precisa escolher manualmente)
- Nao ha nenhuma informacao sobre quais funcoes o freelancer cadastrou

### Como vai funcionar
1. Ao expandir uma escala, buscar as funcoes cadastradas de cada freelancer disponivel (da tabela `freelancer_responses`)
2. Exibir a(s) funcao(oes) cadastrada(s) como texto discreto abaixo do nome/telefone
3. Ao marcar o checkbox (escalar), auto-preencher o role com a funcao cadastrada:
   - Se tem **1 funcao**: preenche automaticamente
   - Se tem **mais de 1 funcao**: deixa vazio para o buffet decidir, mas mostra as funcoes dele em destaque no select

### Exemplo visual

```text
[x] Ana  ·  (15) 98100-7979
    Cozinha                         [Cozinha v]  checkmark

[ ] Victor  ·  (15) 98112-1710
    Gerente
```

### Alteracoes

**Arquivo: `FreelancerSchedulesTab.tsx`**
- Novo estado: `freelancerRoles: Record<string, string[]>` (mapa nome do freelancer -> lista de funcoes)
- Em `loadScheduleDetails`, apos buscar availability, extrair os nomes unicos dos freelancers disponiveis
- Fazer query em `freelancer_responses` filtrando por `company_id` e `respondent_name` com `approval_status = 'aprovado'`
- Extrair o campo `funcao` do array `answers` (questionId === "funcao", value e um array de strings)
- Montar o mapa e passar como prop `freelancerRoles` para `ScheduleCard`
- Em `toggleAssignment`: receber o role pre-preenchido (da funcao cadastrada quando tem apenas 1) ao inves de string vazia

**Arquivo: `ScheduleCard.tsx`**
- Nova prop: `freelancerRoles: Record<string, string[]>`
- Abaixo do nome/telefone do freelancer, mostrar as funcoes em texto discreto (text-xs text-muted-foreground)
- Ao clicar no checkbox para escalar: se o freelancer tem exatamente 1 funcao, passar essa funcao como role; senao, passar vazio
- No select de funcao (quando escalado): se o freelancer tem funcoes cadastradas, mostrar essas primeiro com um label "Funcoes cadastradas", seguidas de um separador e as demais funcoes genericas

### Detalhes tecnicos

Query para buscar funcoes:
```sql
SELECT respondent_name, answers
FROM freelancer_responses
WHERE company_id = ? AND approval_status = 'aprovado'
```

Extracao do JSONB (ja confirmado na base):
```typescript
// answers e um array de { questionId, value }
const funcaoAnswer = answers.find(a => a.questionId === "funcao");
// funcaoAnswer.value = ["Cozinha"] ou ["Gerente", "Cozinha"]
const roles = Array.isArray(funcaoAnswer?.value) ? funcaoAnswer.value : [];
```

O mapa agrupa por nome (pode haver duplicatas se o freelancer se cadastrou mais de uma vez -- pega o mais recente ou merge as funcoes).

