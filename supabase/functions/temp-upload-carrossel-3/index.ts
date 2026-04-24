import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const body = await req.arrayBuffer();
  const path = "b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/videos/carrossel-externa-3.mp4";
  const { error } = await supabase.storage
    .from("landing-pages")
    .upload(path, body, { contentType: "video/mp4", upsert: true });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  const { data } = supabase.storage.from("landing-pages").getPublicUrl(path);
  return new Response(JSON.stringify({ url: data.publicUrl }));
});
