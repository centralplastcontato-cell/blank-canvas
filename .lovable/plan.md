

# Corrigir resetQuestions() para abordagem segura

## Problema

A funcao `resetQuestions()` atual faz DELETE primeiro e INSERT depois. Se o INSERT falhar (timeout, erro de rede, etc.), as perguntas personalizadas do buffet sao perdidas permanentemente -- exatamente o que aconteceu com o Aventura Kids.

## Solucao

Inverter a ordem: inserir as novas perguntas padrao primeiro, e so apagar as antigas apos confirmacao de sucesso da insercao. Usar os IDs das perguntas antigas (capturados antes) para o DELETE seletivo.

## Detalhes tecnicos

**Arquivo**: `src/components/whatsapp/settings/AutomationsSection.tsx`

**Logica atual (linhas 573-611)**:
1. DELETE todas as perguntas da instancia
2. INSERT perguntas padrao
3. Se o INSERT falhar, dados perdidos

**Nova logica**:
1. Capturar os IDs das perguntas atuais (`botQuestions.map(q => q.id)`)
2. INSERT das perguntas padrao novas (com `select()` para confirmar)
3. Se o INSERT teve sucesso, DELETE apenas os registros com os IDs antigos capturados no passo 1
4. Se o INSERT falhar, nao apaga nada -- perguntas antigas continuam intactas
5. Atualizar o estado local com as novas perguntas

Essa abordagem garante que, em caso de falha, as perguntas originais do buffet permanecem no banco.

