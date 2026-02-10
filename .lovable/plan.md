

# Gerador de Landing Page por IA

## Ideia
Ao invés de preencher campo por campo no editor, o admin do Hub terá um **botão "Criar com IA"** que abre um formulário simplificado. Nele, basta descrever o buffet em texto livre, enviar fotos e vídeo, informar o tema da promoção, e a IA gera toda a LP automaticamente -- textos profissionais, depoimentos realistas, oferta persuasiva, paleta de cores coerente.

O editor manual continua existindo para ajustes finos depois da geração.

## Fluxo do usuário

1. Acessa `/hub/landing-editor/:companyId`
2. Clica no botão **"Criar com IA"**
3. Preenche um formulário simples:
   - Descrição do buffet (texto livre)
   - URL do vídeo institucional (opcional)
   - Upload de fotos do espaço
   - Tema da promoção (ex: "Férias de Julho - 20% off")
   - Informações extras (diferenciais, endereço, etc.)
4. Clica em **"Gerar LP"**
5. A IA processa e preenche todos os campos JSONB automaticamente
6. O admin revisa no editor e publica

## Componentes do plano

### 1. Configurar API Key da OpenAI
- Adicionar o secret `OPENAI_API_KEY` ao projeto (via Lovable Secrets)

### 2. Nova Edge Function: `generate-landing-page`
- Recebe: `company_id`, `description`, `promo_theme`, `video_url`, `photo_urls[]`, `extra_info`
- Chama a OpenAI API (GPT-4o) com um prompt estruturado que gera um JSON com todas as seções:
  - `hero`: titulo impactante, subtitulo emocional, texto do CTA
  - `video`: titulo da seção, URL do vídeo
  - `gallery`: titulo da seção, array de URLs das fotos
  - `testimonials`: 3-4 depoimentos realistas com nomes e ratings
  - `offer`: titulo, descrição persuasiva, texto de destaque, CTA
  - `theme`: paleta de cores harmoniosa baseada na descrição
  - `footer`: configurações padrão
- Retorna o JSON completo para o frontend preencher o editor

### 3. Componente `AIGeneratorDialog`
- Dialog/modal no editor com o formulário simplificado
- Campo de texto para descrição livre
- Upload de fotos (reutiliza lógica do GalleryEditor)
- Campo para URL do vídeo
- Campo para tema da promoção
- Campo para informações extras
- Botão "Gerar LP" com loading state
- Ao receber resposta, preenche todos os campos do editor automaticamente

### 4. Integração no HubLandingEditor
- Botão "Criar com IA" na barra de ações (ao lado de Salvar e Preview)
- Quando a IA gera os dados, atualiza o state do `lpData` de uma vez
- O admin pode revisar e ajustar antes de salvar

---

## Detalhes Técnicos

### Edge Function `generate-landing-page`

```text
POST /generate-landing-page
Body: {
  company_id: string
  company_name: string
  description: string        // "Buffet infantil em SP, 3 salões..."
  promo_theme: string        // "Férias Julho - 20% desconto"
  video_url?: string
  photo_urls: string[]
  extra_info?: string        // "Estacionamento grátis, equipe bilíngue..."
}

Response: {
  hero: { title, subtitle, cta_text }
  video: { enabled, title, video_url, video_type }
  gallery: { enabled, title, photos }
  testimonials: { enabled, title, items[] }
  offer: { enabled, title, description, highlight_text, cta_text }
  theme: { primary_color, secondary_color, background_color, ... }
  footer: { show_address, show_phone, show_instagram, custom_text }
}
```

### Prompt da IA (resumo)
O system prompt instruirá o modelo a agir como um copywriter especializado em landing pages para buffets infantis, gerando textos persuasivos em português brasileiro, com paleta de cores coerente e depoimentos realistas.

### Arquivos a criar/editar
- `supabase/functions/generate-landing-page/index.ts` -- nova edge function
- `src/components/hub/landing-editor/AIGeneratorDialog.tsx` -- novo componente
- `src/pages/HubLandingEditor.tsx` -- adicionar botão "Criar com IA"

### Pré-requisito
- Secret `OPENAI_API_KEY` precisa ser configurada no projeto
