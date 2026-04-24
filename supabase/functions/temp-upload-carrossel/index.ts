// Temporary one-shot uploader for Espaço Carrossel videos
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileName, base64 } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const path = `b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/videos/${fileName}`;

    const { error } = await supabase.storage
      .from("landing-pages")
      .upload(path, bin, { contentType: "video/mp4", upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from("landing-pages").getPublicUrl(path);
    return new Response(JSON.stringify({ url: data.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
