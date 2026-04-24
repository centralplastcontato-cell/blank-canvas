import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const form = await req.formData();
  const file = form.get("file") as File;
  const filename = form.get("filename") as string;
  if (!file) return new Response(JSON.stringify({ error: "no file" }), { status: 400, headers: corsHeaders });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const path = `espaco-carrossel/${filename}`;
  const { error } = await supabase.storage.from("landing-pages").upload(path, bytes, {
    contentType: "video/mp4",
    upsert: true,
  });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

  const { data } = supabase.storage.from("landing-pages").getPublicUrl(path);
  return new Response(JSON.stringify({ url: data.publicUrl }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
