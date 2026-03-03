import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_url, company_id } = await req.json();

    if (!image_url || !company_id) {
      return new Response(
        JSON.stringify({ error: "image_url e company_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download original image
    const imgResponse = await fetch(image_url);
    if (!imgResponse.ok) {
      throw new Error(`Failed to fetch image: ${imgResponse.status}`);
    }

    const imgBuffer = new Uint8Array(await imgResponse.arrayBuffer());

    // Decode and resize using ImageScript
    const img = await Image.decode(imgBuffer);
    const TARGET_WIDTH = 400;
    const aspectRatio = img.height / img.width;
    const targetHeight = Math.round(TARGET_WIDTH * aspectRatio);
    img.resize(TARGET_WIDTH, targetHeight);

    // Encode as JPEG (quality 75 = level ~75/100)
    const jpegBytes = await img.encodeJPEG(75);

    // Upload thumbnail to Supabase Storage
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const filePath = `campaigns/thumb-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("sales-materials")
      .upload(filePath, jpegBytes, { contentType: "image/jpeg", upsert: false });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from("sales-materials").getPublicUrl(filePath);

    return new Response(
      JSON.stringify({ thumbnail_url: urlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("resize-image error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro ao redimensionar imagem" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
