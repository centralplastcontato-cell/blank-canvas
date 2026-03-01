import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OLD_DOMAIN = "knyzkwgdmclcwvzhdmyk.supabase.co";
const NEW_DOMAIN = "rsezgnkfhodltrsewlhz.supabase.co";
const COMPANY_ID = "a0000000-0000-0000-0000-000000000001";
const BUCKET = "sales-materials";

function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.substring(idx + marker.length));
}

async function migrateFile(
  supabase: ReturnType<typeof createClient>,
  url: string
): Promise<{ newUrl: string | null; error: string | null }> {
  if (!url.includes(OLD_DOMAIN)) {
    return { newUrl: url, error: null }; // already migrated
  }

  const storagePath = extractStoragePath(url);
  if (!storagePath) {
    return { newUrl: null, error: `Could not extract path from ${url}` };
  }

  console.log(`  Fetching: ${storagePath}`);
  const res = await fetch(url);
  if (!res.ok) {
    return { newUrl: null, error: `Fetch failed ${res.status} for ${storagePath}` };
  }

  const blob = await res.blob();
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, { contentType: blob.type || "application/octet-stream", upsert: true });

  if (uploadErr) {
    return { newUrl: null, error: `Upload failed for ${storagePath}: ${uploadErr.message}` };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  console.log(`  Uploaded OK -> ${data.publicUrl}`);
  return { newUrl: data.publicUrl, error: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: materials, error: fetchErr } = await supabase
    .from("sales_materials")
    .select("*")
    .eq("company_id", COMPANY_ID);

  if (fetchErr) {
    console.error("Query error:", fetchErr);
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Found ${materials.length} materials for Castelo da Diversão`);

  const results: Array<{ id: string; name: string; status: string; error?: string }> = [];

  for (const mat of materials) {
    console.log(`\nProcessing: ${mat.name} (${mat.material_type})`);

    // Migrate main file_url
    let newFileUrl = mat.file_url;
    if (mat.file_url && mat.file_url.includes(OLD_DOMAIN)) {
      const { newUrl, error } = await migrateFile(supabase, mat.file_url);
      if (error) {
        console.error(`  ERROR file_url: ${error}`);
        results.push({ id: mat.id, name: mat.name, status: "error", error });
        continue;
      }
      newFileUrl = newUrl;
    }

    // Migrate photo_urls array
    let newPhotoUrls = mat.photo_urls;
    if (mat.photo_urls && Array.isArray(mat.photo_urls)) {
      const migrated: string[] = [];
      let hasError = false;
      for (const photoUrl of mat.photo_urls) {
        if (photoUrl.includes(OLD_DOMAIN)) {
          const { newUrl, error } = await migrateFile(supabase, photoUrl);
          if (error) {
            console.error(`  ERROR photo: ${error}`);
            hasError = true;
            break;
          }
          migrated.push(newUrl!);
        } else {
          migrated.push(photoUrl);
        }
      }
      if (hasError) {
        results.push({ id: mat.id, name: mat.name, status: "partial_error", error: "Some photos failed" });
        continue;
      }
      newPhotoUrls = migrated;
    }

    // Update DB record
    const updatePayload: Record<string, unknown> = {};
    if (newFileUrl !== mat.file_url) updatePayload.file_url = newFileUrl;
    if (JSON.stringify(newPhotoUrls) !== JSON.stringify(mat.photo_urls)) updatePayload.photo_urls = newPhotoUrls;

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateErr } = await supabase
        .from("sales_materials")
        .update(updatePayload)
        .eq("id", mat.id);

      if (updateErr) {
        console.error(`  UPDATE error: ${updateErr.message}`);
        results.push({ id: mat.id, name: mat.name, status: "update_error", error: updateErr.message });
        continue;
      }
    }

    results.push({ id: mat.id, name: mat.name, status: "ok" });
    console.log(`  ✅ Done`);
  }

  const summary = {
    total: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    errors: results.filter((r) => r.status !== "ok").length,
    details: results,
  };

  console.log("\n=== SUMMARY ===", JSON.stringify(summary, null, 2));

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
