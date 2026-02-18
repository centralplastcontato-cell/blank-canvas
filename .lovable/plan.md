

## Adicionar campo de Data de Nascimento no cadastro de freelancer

### O que sera feito

Adicionar um novo tipo de campo "date" (data) ao sistema de formularios de freelancer, e incluir por padrao uma pergunta "Data de nascimento" no template. O freelancer vera um seletor de data no formulario publico, e o admin vera a data formatada nas respostas.

### Mudancas

**Arquivo: `src/pages/PublicFreelancer.tsx`**

1. Adicionar `"date"` ao union type da interface `FreelancerQuestion` (`type: "text" | "textarea" | "yesno" | "select" | "multiselect" | "photo" | "date"`)
2. Adicionar um novo bloco no `renderQuestion` para o tipo `"date"` -- renderiza um campo `<Input type="date">` com estilo consistente
3. Adicionar validacao no `canAdvance` para campos `date` obrigatorios (igual ao `text`: se vazio, bloqueia)

**Arquivo: `src/pages/FreelancerManager.tsx`**

1. Adicionar `"date"` ao union type da interface `FreelancerQuestion`
2. Adicionar `date: "Data"` no objeto `TYPE_LABELS` (linha 318)
3. Adicionar a pergunta padrao no `DEFAULT_QUESTIONS`:
   ```
   { id: "data_nascimento", type: "date", text: "Data de nascimento", step: 1, required: true }
   ```
   (apos o campo "nome" e "foto")

### Detalhes tecnicos

- O campo `date` usa um `<Input type="date" />` nativo do HTML, que funciona bem em mobile e desktop
- O valor e armazenado como string ISO (`"2000-05-15"`) no array de `answers`
- Na visualizacao de respostas (`FreelancerResponseCards`), a data ja sera exibida corretamente pelo bloco generico `String(a.value)`, mas sera formatada para `dd/MM/yyyy` para melhor leitura
- Templates existentes nao serao afetados -- o novo campo so aparece em novos templates ou se o admin editar e adicionar manualmente

