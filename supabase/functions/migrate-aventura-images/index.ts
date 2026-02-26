import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const companyId = "eb1776f0-142e-41db-9134-7d352d02c5bd";
  const baseUrl = "https://naked-screen-charm.lovable.app/images";

  const imagesToMigrate = [
    { filename: "logo-aventura-kids.png", type: "logo" },
    { filename: "fachada-aventura-kids.jpg", type: "gallery" },
    { filename: "aventura-kids-buffet-1.jpg", type: "gallery" },
    { filename: "aventura-kids-buffet-2.jpg", type: "gallery" },
    { filename: "aventura-kids-buffet-3.jpg", type: "gallery" },
  ];

  const results: Record<string, string> = {};

  for (const img of imagesToMigrate) {
    const sourceUrl = `${baseUrl}/${img.filename}`;
    console.log(`Fetching ${sourceUrl}...`);

    const res = await fetch(sourceUrl);
    if (!res.ok) {
      console.error(`Failed to fetch ${img.filename}: ${res.status}`);
      continue;
    }

    const blob = await res.blob();
    const storagePath = `${companyId}/migrated/${img.filename}`;

    const { error } = await supabase.storage
      .from("onboarding-uploads")
      .upload(storagePath, blob, {
        contentType: blob.type,
        upsert: true,
      });

    if (error) {
      console.error(`Upload error for ${img.filename}:`, error.message);
      continue;
    }

    const { data: publicData } = supabase.storage
      .from("onboarding-uploads")
      .getPublicUrl(storagePath);

    results[img.filename] = publicData.publicUrl;
    console.log(`Uploaded ${img.filename} -> ${publicData.publicUrl}`);
  }

  // Update logo
  if (results["logo-aventura-kids.png"]) {
    await supabase
      .from("companies")
      .update({ logo_url: results["logo-aventura-kids.png"] })
      .eq("id", companyId);
    console.log("Updated logo_url");
  }

  // Update gallery - replace broken URLs
  const { data: lpData } = await supabase
    .from("company_landing_pages")
    .select("gallery")
    .eq("company_id", companyId)
    .single();

  if (lpData) {
    const gallery = lpData.gallery as { enabled: boolean; photos: string[]; title: string };
    const oldToNew: Record<string, string> = {
      [`${baseUrl}/fachada-aventura-kids.jpg`]: results["fachada-aventura-kids.jpg"],
      [`${baseUrl}/aventura-kids-buffet-1.jpg`]: results["aventura-kids-buffet-1.jpg"],
      [`${baseUrl}/aventura-kids-buffet-2.jpg`]: results["aventura-kids-buffet-2.jpg"],
      [`${baseUrl}/aventura-kids-buffet-3.jpg`]: results["aventura-kids-buffet-3.jpg"],
    };

    const newPhotos = gallery.photos.map((url: string) => oldToNew[url] || url);

    await supabase
      .from("company_landing_pages")
      .update({ gallery: { ...gallery, photos: newPhotos } })
      .eq("company_id", companyId);
    console.log("Updated gallery photos");
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
