

## Exibir Observacoes na pagina publica da escala

### Problema
A coluna `notes` da tabela `freelancer_schedules` nao esta sendo carregada nem exibida na pagina publica que o freelancer acessa. O admin configura observacoes como "chegar com duas horas de antecedencia" mas o freelancer nao ve essa informacao.

### Solucao

Alterar apenas o arquivo `src/pages/PublicFreelancerSchedule.tsx`:

1. Adicionar `notes` ao select da query (linha 63)
2. Adicionar `notes` a interface `ScheduleData` 
3. Incluir o valor de `notes` no setState do schedule
4. Renderizar um card de observacoes entre o header e os campos de nome/telefone, apenas quando `notes` existir

O card de observacoes tera um estilo suave (fundo amarelado/amber) com um icone de informacao, similar ao visual do admin (imagem 2), mas adaptado para o layout publico mobile-first.

### Resultado visual esperado

```text
[Logo]
Escala Semana 1 marco

+------------------------------------------+
| (i) OBSERVACOES                          |
| chegar com duas horas de antecedencia.   |
+------------------------------------------+

[Seu nome *]
[WhatsApp *]
[Festas...]
```
