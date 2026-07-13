# Deploy das edge functions sem a Lovable

Hoje quem publica as 40 edge functions no Supabase é a Lovable. Ao sair, isso
passa a ser você. **Isto precisa funcionar ANTES de cancelar a assinatura** —
senão você fica sem conseguir alterar o backend.

O Supabase CLI já vem instalado com o projeto (via `npx`). Não precisa instalar nada.

## Passo 1 — Login (só uma vez, por máquina)

```bash
npm run sb:login
```

Abre o navegador, você autoriza, e o CLI guarda um token na sua máquina.

## Passo 2 — Confirmar que o CLI enxerga o projeto

```bash
npm run sb:fn:list
```

Deve listar as 40 funções que estão hoje no ar. Se listar, o acesso está OK.

## Passo 3 — Deployar UMA função

⚠️ **Sempre deploye por nome.** O comando sem nome publica **as 40 de uma vez**,
o que é um risco desnecessário — se o código local divergir do que está no ar em
qualquer uma delas, você sobrescreve sem perceber.

```bash
npm run sb:fn:deploy -- campaign-ai
npm run sb:fn:deploy -- monthly-review
```

O `--` é obrigatório: é o que faz o npm repassar o nome da função pro CLI.

## As duas funções que precisam ser deployadas nesta migração

`campaign-ai` e `monthly-review` foram migradas do gateway de IA da Lovable
(`ai.gateway.lovable.dev` + `LOVABLE_API_KEY`) para a **OpenAI direta**
(`api.openai.com` + `OPENAI_API_KEY`, modelo `gpt-4o-mini`).

Não é preciso configurar secret novo: `OPENAI_API_KEY` **já existe e já funciona**
no seu Supabase — outras 6 funções usam ela em produção hoje (`wapi-webhook`,
`support-chat`, `lead-summary`, `daily-summary`, `fix-text`, `campaign-image`).

**Enquanto essas duas não forem deployadas, elas continuam rodando a versão
antiga (via Lovable) no servidor.** O código no git já está corrigido, mas o que
está no ar só muda com o deploy.

## Passo 4 — Testar depois do deploy

- **campaign-ai:** vá em Campanhas no app e gere variações de mensagem com IA.
  Devem vir 5 variações, com tons diferentes.
- **monthly-review:** essa tem *fallback* — se a IA falhar, ela gera um resumo
  padrão sem IA em vez de quebrar. Então o teste é olhar os logs:
  Supabase Dashboard → Edge Functions → monthly-review → Logs. Não pode haver
  erro de `OPENAI_API_KEY` nem chamada para `lovable`.

## Passo 5 — Só depois disso, remova o secret da Lovable

No Supabase Dashboard → Settings → Edge Functions → Secrets, apague
`LOVABLE_API_KEY`. Faça isso **por último**, e só depois de confirmar que as duas
funções estão respondendo. É o seu último fio de segurança.
