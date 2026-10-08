// rescue-orphan-leads — DESATIVADA (limpeza da plataforma, out/2026).
// Era uma ferramenta de uso único/sem uso e ficava aberta para qualquer um
// chamar. Agora só responde que está desativada; o código antigo fica no
// histórico do git. Próximo passo: apagar a função publicada no Supabase.

Deno.serve(() =>
  new Response(JSON.stringify({ error: "Função desativada" }), {
    status: 410,
    headers: { "Content-Type": "application/json" },
  })
);
