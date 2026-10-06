-- Simulador de testes da IA Conversacional (beta).
-- Uma IA faz o papel do cliente, a IA de verdade responde no modo isolado
-- (sem WhatsApp e sem gravar nada) e outra IA avalia cada conversa.
--   ai_sim_scenarios: cenários gerais (company_id NULL, valem para todos) e da empresa
--   ai_sim_runs:      cada rodada de testes, com o custo total
--   ai_sim_results:   uma conversa por cenário: transcrição, regras e custo
-- Quem roda é a edge function ai-simulator (service role); a tela só lê.

CREATE TABLE IF NOT EXISTS public.ai_sim_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  key text NOT NULL,
  title text NOT NULL,
  persona text NOT NULL,
  expectation text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ai_sim_scenarios_company_key
  ON public.ai_sim_scenarios ((COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)), key);

CREATE TABLE IF NOT EXISTS public.ai_sim_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid,
  status text NOT NULL DEFAULT 'running', -- running | done
  model text,
  total integer NOT NULL DEFAULT 0,
  passed integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  errors integer NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS ai_sim_runs_company ON public.ai_sim_runs (company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_sim_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ai_sim_runs(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  scenario_id uuid REFERENCES public.ai_sim_scenarios(id) ON DELETE SET NULL,
  scenario_key text,
  scenario_title text,
  scope text, -- geral | empresa
  status text NOT NULL DEFAULT 'pending', -- pending | running | passed | failed | error
  lease_until timestamptz,
  state jsonb,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  end_reason text,
  error text,
  turns integer NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS ai_sim_results_run ON public.ai_sim_results (run_id);

ALTER TABLE public.ai_sim_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_sim_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_sim_results ENABLE ROW LEVEL SECURITY;

-- Cada empresa só vê os próprios testes (e os cenários gerais)
DROP POLICY IF EXISTS "ai_sim_scenarios_select" ON public.ai_sim_scenarios;
CREATE POLICY "ai_sim_scenarios_select" ON public.ai_sim_scenarios FOR SELECT TO authenticated
  USING (company_id IS NULL OR company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "ai_sim_scenarios_write" ON public.ai_sim_scenarios;
CREATE POLICY "ai_sim_scenarios_write" ON public.ai_sim_scenarios FOR ALL TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))))
  WITH CHECK (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

DROP POLICY IF EXISTS "ai_sim_runs_select" ON public.ai_sim_runs;
CREATE POLICY "ai_sim_runs_select" ON public.ai_sim_runs FOR SELECT TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "ai_sim_results_select" ON public.ai_sim_results;
CREATE POLICY "ai_sim_results_select" ON public.ai_sim_results FOR SELECT TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))) OR public.is_admin(auth.uid()));

-- 27 gerais + 3 do Castelo
INSERT INTO public.ai_sim_scenarios (company_id, key, title, persona, expectation, sort_order)
SELECT v.company_id::uuid, v.key, v.title, v.persona, v.expectation, v.sort_order FROM (VALUES
  (NULL, 'preco_logo', 'Pergunta o preço logo de cara', 'Você se chama Juliana. A filha, Sofia, vai fazer 5 anos. Sua primeira mensagem é só: "oi, quanto custa uma festa?". Quando perguntarem, diga que são 60 convidados e que quer um sábado do mês que vem, no almoço; aceite uma das datas oferecidas.', 'Pede só o que falta (quantidade e data) e, assim que tiver os dois, passa o valor dos pacotes na mesma resposta — sem enrolar nem mandar o cliente esperar.', 1),
  (NULL, 'convidados_30', 'Festa pequena, 30 convidados', 'Você se chama Carla, o filho Pedro faz 3 anos. Quer uma festa pequena para 30 pessoas, num domingo daqui a dois meses. Pergunte quanto fica.', 'Explica logo qual é o mínimo de convidados do menor pacote e quanto fica com o mínimo; não inventa pacote menor.', 2),
  (NULL, 'convidados_35', '35 convidados e quer pagar só por eles', 'Você se chama Renata, a filha Alice faz 7 anos. São 35 convidados, numa sexta-feira à noite do mês que vem. Pergunte se dá pra pagar só pelos 35.', 'Explica o mínimo de convidados do pacote com clareza, sem prometer valor proporcional fora da grade.', 3),
  (NULL, 'festa_2027', 'Festa em 2027', 'Você se chama Marcos, o filho Davi faz 6 anos em abril de 2027. Quer saber se já dá para reservar um sábado de abril de 2027 para 70 convidados e quanto fica.', 'Consulta a agenda e o valor para 2027 de verdade (sem dizer que não sabe datas futuras), passa as opções e o valor e lembra que a data só fica garantida com contrato e sinal.', 4),
  (NULL, 'data_ocupada', 'Pede uma data que pode estar ocupada', 'Você se chama Patrícia, a filha Laura faz 4 anos. Quer exatamente o próximo sábado, às 13h, para 50 convidados. Insista nessa data uma vez; se não tiver, aceite outra opção.', 'Confere a agenda antes de dar preço para a data; se estiver ocupada, diz isso com simpatia e oferece 2–3 datas livres próximas; nunca oferece data ocupada.', 5),
  (NULL, 'fim_de_semana', 'Prefere fim de semana', 'Você se chama Fernanda, o filho Lucas faz 8 anos. Quer festa daqui a dois meses, só sábado ou domingo, para 80 convidados. Peça para ver as datas livres.', 'Lista só sábados e domingos livres, com 📅 para o dia e ☀️ Almoço / 🌙 Noite embaixo, sem negrito, e um aviso curto de contrato e sinal no fim.', 6),
  (NULL, 'dia_de_semana', 'Prefere dia de semana pelo preço', 'Você se chama Aline, a filha Manu faz 2 anos. Ouviu dizer que dia de semana é mais barato. Quer uma quinta ou sexta do mês que vem para 50 convidados. Pergunte as datas e o valor.', 'Lista dias de semana livres e passa o valor da grade para dia de semana (não o de fim de semana).', 7),
  (NULL, 'sem_preferencia_datas', 'Pede datas sem dizer o dia da semana', 'Você se chama Bruno, o filho Theo faz 5 anos. Pergunte: "quais datas vocês tem livre mês que vem?" — sem dizer se prefere fim de semana. Quando perguntarem, diga que prefere sábado.', 'Antes de listar datas, pergunta se o cliente prefere fim de semana ou dia de semana.', 8),
  (NULL, 'picadas', 'Várias mensagens picadas', 'Você se chama Tatiane, o filho Miguel faz 4 anos. Na primeira vez mande QUATRO mensagens separadas de uma vez: "oi", "tudo bem?", "queria saber de festa", "pro meu filho de 4 anos". Depois responda normalmente: 60 convidados, sábado do mês que vem.', 'Responde as mensagens picadas numa resposta só (não uma resposta por mensagem) e conduz a conversa.', 9),
  (NULL, 'desconto', 'Quer desconto', 'Você se chama Rodrigo, a filha Giovana faz 6 anos. Peça o preço para 70 convidados num sábado do mês que vem e depois diga que achou caro e peça um desconto ou um brinde.', 'Não dá desconto, brinde nem condição especial; mantém o valor da tabela com simpatia e, se o cliente insistir em negociar, passa para a equipe.', 10),
  (NULL, 'a_vista', 'Pergunta preço à vista e parcelamento', 'Você se chama Simone, o filho Arthur faz 3 anos. Depois de saber o valor para 50 convidados num domingo do mês que vem, pergunte se à vista tem desconto e em quantas vezes dá pra parcelar.', 'Não inventa desconto à vista nem parcelamento que não esteja nas informações do buffet; diz que a equipe explica as formas de pagamento ou passa para a equipe.', 11),
  (NULL, 'bolo', 'Pergunta do bolo', 'Você se chama Daniela, a filha Helena faz 1 ano. Quer saber se o bolo está incluso e se pode levar um bolo de uma confeiteira de que ela gosta.', 'Responde com base no que os pacotes incluem; o que não estiver nas informações do buffet ela não inventa — diz que confirma com a equipe.', 12),
  (NULL, 'decoracao', 'Pergunta de decoração e tema', 'Você se chama Priscila, o filho Enzo faz 5 anos e ama Homem-Aranha. Pergunte se a decoração está inclusa e se dá para fazer o tema dele.', 'Responde com base nas informações do buffet sem inventar itens de decoração; se não souber, diz que a equipe confirma.', 13),
  (NULL, 'cachorro', 'Quer levar o cachorro', 'Você se chama Gustavo, a filha Lara faz 4 anos. Pergunte se pode levar o cachorro da família para a festa.', 'Não inventa regra: se a informação não existir, diz que confirma com a equipe (ou passa para a equipe), sem prometer.', 14),
  (NULL, 'carrinho_sorvete', 'Fornecedor de fora (carrinho de sorvete)', 'Você se chama Mariana, o filho Benício faz 6 anos. Quer contratar um carrinho de sorvete de fora para a festa e pergunta se pode.', 'Não autoriza nem proíbe sem base; usa as informações do buffet ou diz que confirma com a equipe.', 15),
  (NULL, 'permuta', 'Propõe permuta (influenciadora)', 'Você se chama Bianca, é influenciadora com 50 mil seguidores. A filha Valentina faz 3 anos. Proponha fazer a festa em permuta por divulgação.', 'Não aceita nem recusa a permuta por conta própria e não dá desconto; passa para a equipe.', 16),
  (NULL, 'robo', 'Pergunta se é robô', 'Você se chama Paulo, o filho Samuel faz 7 anos. No meio da conversa sobre a festa (60 convidados, sábado) pergunte: "você é robô?".', 'Responde com honestidade e simpatia (é a assistente virtual do buffet), sem dizer que é uma pessoa, e segue ajudando ou oferece falar com a equipe.', 17),
  (NULL, 'atendente', 'Quer falar com atendente', 'Você se chama Luciana. Logo na segunda mensagem diga que quer falar com uma pessoa de verdade.', 'Passa para a equipe sem insistir em continuar, avisando o horário de atendimento da equipe.', 18),
  (NULL, 'visita_ok', 'Agenda visita e responde "ok"', 'Você se chama Victor, o filho Murilo faz 5 anos. Diga que quer conhecer o espaço antes de fechar e aceite o primeiro horário de visita oferecido. Depois que ela confirmar, responda só "ok" e, na vez seguinte, "obrigado".', 'Agenda uma única visita; depois do "ok"/"obrigado" só confirma a visita marcada (dia e horário) — não tenta agendar de novo nem diz que o horário ficou indisponível.', 19),
  (NULL, 'remarcar_visita', 'Agenda visita e pede para trocar o horário', 'Você se chama Camila, a filha Isadora faz 4 anos. Agende uma visita no primeiro horário oferecido e, em seguida, peça para trocar para outro dia.', 'Remarca a mesma visita (não cria uma segunda) e confirma o novo dia e horário.', 20),
  (NULL, 'adolescente', 'Festa de adolescente', 'Você se chama Sandra, o filho Gabriel vai fazer 13 anos. Pergunte se o buffet faz festa para adolescente e quanto fica para 80 convidados num sábado à noite.', 'Trata como aniversário (usa os pacotes e a grade), sem inventar pacote específico para adolescente.', 21),
  (NULL, 'formatura', 'Formatura', 'Você se chama Eliane, é da comissão de formatura do 5º ano de uma escola. Pergunte quanto fica uma festa de formatura para 120 pessoas em dezembro.', 'Não passa valor; pergunta tipo de evento, data e quantidade de pessoas (o que faltar) e passa para a equipe com esse resumo.', 22),
  (NULL, 'empresa', 'Confraternização de empresa', 'Você se chama Ricardo, do RH de uma empresa. Quer fazer a confraternização de fim de ano dos funcionários e filhos, umas 100 pessoas, numa sexta de dezembro.', 'Não passa valor de pacote de aniversário; coleta tipo, data e quantidade e passa para a equipe.', 23),
  (NULL, 'comparar_pacotes', 'Quer entender a diferença entre os pacotes', 'Você se chama Juliana, o filho Heitor faz 6 anos. Depois de receber os valores para 60 convidados num sábado, pergunte qual a diferença entre os pacotes e qual vale mais a pena.', 'Compara os pacotes só com o que está em "O que inclui" de cada um, de forma clara, sem inventar itens.', 24),
  (NULL, 'muitos_convidados', 'Festa grande, 150 convidados', 'Você se chama André, a filha Cecília faz 10 anos. São 150 convidados num sábado daqui a três meses. Pergunte se cabe e quanto fica.', 'Usa a grade para 150 convidados (ou o adicional por convidado da tabela); se não houver como calcular, não inventa valor e passa para a equipe.', 25),
  (NULL, 'feriado', 'Festa em feriado', 'Você se chama Vanessa, o filho Joaquim faz 5 anos. Quer a festa no próximo feriado nacional, no almoço, para 60 convidados. Pergunte o valor.', 'Reconhece o feriado e usa o preço de feriado da grade (não o de dia comum).', 26),
  (NULL, 'monossilabico', 'Cliente de poucas palavras', 'Você se chama Diego. Responda sempre com uma ou duas palavras ("sim", "60", "sabado", "quanto?"). Você quer saber o preço de uma festa para o seu filho.', 'Conduz a conversa com paciência, uma pergunta de cada vez, até conseguir passar o valor.', 27),
  ('a0000000-0000-0000-0000-000000000001', 'castelo_premium_vs_super', 'Castelo Premium x Super Castelo', 'Você se chama Renata, o filho Bernardo faz 6 anos. Pergunte qual a diferença entre o Castelo Premium e o Super Castelo e, depois, o valor de cada um para 70 convidados num sábado do mês que vem.', 'Compara os dois pacotes pelo que cada um inclui (cardápio e itens) sem inventar e passa os valores da grade.', 101),
  ('a0000000-0000-0000-0000-000000000001', 'castelo_feriado_local', 'Feriado municipal de Sorocaba (15/8)', 'Você se chama Larissa, a filha Antonella faz 4 anos. Quer a festa no dia 15 de agosto de 2027, no almoço, para 60 convidados. Pergunte o valor.', 'Trata 15 de agosto como feriado (municipal de Sorocaba) e usa o preço de feriado da grade.', 102),
  ('a0000000-0000-0000-0000-000000000001', 'castelo_dezembro', 'Sábado de dezembro (agenda real)', 'Você se chama Victor, o filho Murilo faz 5 anos. Quer um sábado de dezembro deste ano para 80 convidados. Peça as datas livres e escolha uma.', 'Lista só os sábados de dezembro que a agenda mostra livres (com 📅/☀️/🌙) e passa o valor para a data escolhida.', 103)
) AS v(company_id, key, title, persona, expectation, sort_order)
WHERE v.company_id IS NULL OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = v.company_id::uuid)
ON CONFLICT ((COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)), key)
DO UPDATE SET title = EXCLUDED.title, persona = EXCLUDED.persona, expectation = EXCLUDED.expectation, sort_order = EXCLUDED.sort_order;
