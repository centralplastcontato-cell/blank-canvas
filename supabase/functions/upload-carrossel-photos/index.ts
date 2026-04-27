// One-shot helper to upload Espaço Carrossel internal photos to storage.
// Accepts an array of { name, base64 } and uploads to landing-pages/<companyId>/gallery/internal/<name>.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMPANY_ID = "b81fca0b-6cd8-41c6-9cad-9590f1ed5f39";
const BUCKET = "landing-pages";

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { files } = await req.json() as { files: Array<{ name: string; base64: string }> };
    const uploaded: string[] = [];

    for (const f of files) {
      const path = `${COMPANY_ID}/gallery/internal/${f.name}`;
      const bytes = base64ToBytes(f.base64);
      const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (error) throw new Error(`${f.name}: ${error.message}`);
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }

    return new Response(JSON.stringify({ uploaded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
