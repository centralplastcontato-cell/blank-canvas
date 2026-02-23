

## Usar a mesma miniatura dos baloes no segundo video do Planeta Divertido

### Contexto
O segundo video (Promocional) do Planeta Divertido esta usando a foto `1771618697238.jpg` como poster. O usuario quer trocar para a mesma foto dos baloes/fachada (`1771618696306.jpg`) que ja e usada no primeiro video.

### Solucao

Executar um UPDATE no campo JSONB `video` da tabela `company_landing_pages`, alterando o `poster_url` do segundo video (indice 1 do array `videos`) para apontar para a foto `1771618696306.jpg`.

### Detalhes tecnicos

**Operacao**: UPDATE via ferramenta de dados (nao migration, pois e alteracao de dados, nao de schema)

```sql
UPDATE company_landing_pages
SET video = jsonb_set(
  video,
  '{videos,1,poster_url}',
  '"https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618696306.jpg"'
),
updated_at = now()
WHERE id = '19e28a5f-bb86-4e48-89a2-d48fde9ae8ad';
```

Nenhuma alteracao de codigo necessaria -- apenas a URL do poster muda no banco de dados e o componente `DLPVideo` ja renderiza o poster automaticamente.
