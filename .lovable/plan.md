

# Correcao de Seguranca -- Restringir SELECT Anonimo em Tabelas Sensiveis

## Resumo

Corrigir **7 erros criticos** e **5 avisos** de seguranca onde tabelas sensiveis estao com SELECT publico irrestrito (`USING(true)`). A estrategia e substituir politicas abertas por RPCs `SECURITY DEFINER` onde necessario, e restringir SELECT para usuarios autenticados da empresa.

**Zero risco para conexoes WhatsApp, bot ou formularios publicos** -- os formularios publicos que precisam de acesso anonimo serao atendidos por RPCs seguros que retornam apenas os campos necessarios.

---

## Tabelas a Corrigir (por prioridade)

### CRITICOS (dados sensiveis expostos)

#### 1. `event_staff_entries` -- Chaves PIX expostas
- **Problema**: `USING(true)` permite qualquer pessoa ler nomes, chaves PIX e valores de pagamento
- **Solucao**: Criar RPC `get_staff_entry_public(_entry_id uuid)` que retorna apenas campos nao-financeiros (id, event_id, company_id, staff_data SEM pix_key/value). Pagina `PublicStaff.tsx` usa o RPC. Remover politica anon SELECT.
- **Manter**: politica anon UPDATE (necessaria para formulario publico de preenchimento)

#### 2. `freelancer_evaluations` -- Avaliacoes de desempenho expostas
- **Problema**: `USING(true)` permite qualquer pessoa ler scores e observacoes de funcionarios
- **Solucao**: Criar RPC `get_evaluations_by_staff_entry(_entry_id uuid)` retornando dados necessarios para o formulario publico. Remover politica anon SELECT.

#### 3. `freelancer_availability` -- Telefones de freelancers expostos
- **Problema**: `USING(true)` permite harvesting de telefones
- **Solucao**: Restringir SELECT anonimo ao scope do schedule: `USING(schedule_id IN (SELECT id FROM freelancer_schedules WHERE is_active = true))`. A pagina `PublicFreelancerSchedule.tsx` ja filtra por schedule_id.

#### 4. `company_onboarding` -- Dados comerciais expostos
- **Problema**: `USING(true)` expoe emails, telefones, orcamentos, dados de agencia
- **Solucao**: Remover politica publica de SELECT. O acesso publico ja e feito via RPC `get_onboarding_public_fields()` que retorna apenas campos nao-sensiveis. Remover tambem politica publica de UPDATE.

#### 5. `lp_bot_settings` -- Estrategia de chatbot exposta
- **Problema**: `USING(true)` expoe toda configuracao do bot (mensagens, contexto AI, telefones de teste)
- **Solucao**: Criar RPC `get_lp_bot_settings_public(_company_id uuid)` retornando apenas campos necessarios para o chatbot da landing page (welcome_message, questions, bot_name, etc, SEM telefones de teste ou contexto AI). Atualizar `DynamicLandingPage.tsx`.

#### 6. `wapi_bot_settings` -- Estrategia WhatsApp exposta
- **Problema**: SELECT aberto a usuarios autenticados da empresa, MAS a policy usa `company_id IS NULL` que pode vazar dados
- **Solucao**: Remover `company_id IS NULL` da politica SELECT (nao ha registros sem company_id). Restringir a `company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid())`.

#### 7. `company_landing_pages` -- Conteudo nao-publicado exposto
- **Problema**: Politica SELECT ja filtra por `is_published = true` -- OK, mas verificar se RPCs tambem filtram
- **Acao**: Ja esta correto. Marcar como resolvido no scan.

### AVISOS (dados internos expostos)

#### 8. `wapi_bot_questions` -- Perguntas do bot expostas
- **Solucao**: Remover `company_id IS NULL` da politica SELECT. Restringir a empresa do usuario.

#### 9. `message_templates` -- Templates de vendas expostos
- **Solucao**: Remover `company_id IS NULL` da politica SELECT. Apenas empresa do usuario.

#### 10. `permission_presets` -- Configuracao de seguranca exposta
- **Solucao**: Alterar SELECT de `USING(true)` para `USING(auth.uid() IS NOT NULL)` (ja e `{public}` role, restringir para authenticated).

#### 11. `company_units` -- Unidades internas expostas
- **Solucao**: Manter acesso anonimo (necessario para landing pages e formularios publicos que mostram unidades), mas filtrar apenas `is_active = true` na politica anon.

#### 12. `attendance_entries` / `party_monitoring_entries` / `maintenance_entries`
- **Solucao**: Ja estao marcados como aceitos por design (acesso por UUID v4 nao-enumeravel para formularios publicos). Manter e documentar.

---

## Detalhes Tecnicos

### RPCs a Criar (3 novos)
1. `get_staff_entry_public(_entry_id uuid)` -- retorna staff_data com PIX mascarado
2. `get_evaluations_by_staff_entry(_entry_id uuid)` -- retorna avaliacoes para formulario
3. `get_lp_bot_settings_public(_company_id uuid)` -- retorna config publica do chatbot

### Politicas a Alterar (~10 alteracoes)
- DROP + CREATE de politicas SELECT em 7 tabelas
- Todas as alteracoes em uma unica migration SQL

### Codigo a Atualizar (3 arquivos)
- `src/pages/PublicStaff.tsx` -- usar RPC ao inves de query direta
- `src/components/public-staff/PublicStaffEvaluation.tsx` -- usar RPC para carregar avaliacoes
- `src/pages/DynamicLandingPage.tsx` -- usar RPC para lp_bot_settings

### O que NAO muda
- Formularios publicos continuam funcionando (RPCs retornam os mesmos dados necessarios)
- Bot WhatsApp nao e afetado (usa service role nas Edge Functions)
- Conexoes W-API intactas
- Dashboard admin intacto (politicas autenticadas nao mudam)

