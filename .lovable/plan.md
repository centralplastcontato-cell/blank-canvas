

## Correcao: Delay de follow-up nao salvando para a instancia correta

### Diagnostico
O sistema possui **duas instancias WhatsApp** com configuracoes independentes (`wapi_bot_settings`):

- **LITE-I2660D** (9b846163): delay de inatividade = **6 min** (atualizado corretamente)
- **LITE-MY22EC** (3f39419e): delay de inatividade = **30 min** (nunca foi atualizado)

O lead "Vitor" pertence a instancia LITE-MY22EC, que ainda tem 30 min de delay. As alteracoes feitas na tela de Configuracoes so salvaram para a outra instancia.

### Causa Raiz
A tela de Automacoes (`AutomationsSection.tsx`) provavelmente busca/salva o `wapi_bot_settings` filtrando por `instance_id`, mas pode estar usando a instancia errada (a primeira encontrada, em vez da instancia selecionada pelo contexto da empresa atual).

### Solucao

1. **Investigar** como o `AutomationsSection` determina qual `instance_id` usar ao carregar e salvar as configuracoes
2. **Corrigir** para que o componente use o `instance_id` correto da empresa/instancia atualmente selecionada
3. **Atualizar imediatamente** o valor no banco para a instancia 3f39419e (LITE-MY22EC) de 30 para o valor desejado (ex: 6 min)
4. **Garantir** que a interface mostre/edite as configuracoes da instancia correta com base no contexto da empresa selecionada

### Detalhes Tecnicos

**Arquivos a verificar/modificar:**
- `src/components/whatsapp/settings/AutomationsSection.tsx` -- verificar como o `instance_id` e determinado no fetch/save
- Migracao ou query direta para corrigir o valor atual no banco

**Correcao imediata no banco:**
- UPDATE `wapi_bot_settings` SET `bot_inactive_followup_delay_minutes` = 6 WHERE `instance_id` = '3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7'

