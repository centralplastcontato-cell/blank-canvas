// Temporary admin tool: re-process images applying EXIF orientation
// One-shot endpoint — safe to leave or delete after use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { decode as decodeJpeg } from "https://esm.sh/jpeg-js@0.4.4";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

interface Body {
  bucket: string;
  paths: string[]; // object paths inside bucket
}

// Apply EXIF orientation by rotating/mirroring the decoded pixel buffer
function applyOrientation(img: Image, orientation: number): Image {
  switch (orientation) {
    case 2: return img.flip(true, false);
    case 3: return img.rotate(180);
    case 4: return img.flip(false, true);
    case 5: return img.rotate(90).flip(true, false);
    case 6: return img.rotate(90);
    case 7: return img.rotate(270).flip(true, false);
    case 8: return img.rotate(270);
    default: return img;
  }
}

// Read EXIF orientation tag (0x0112) from JPEG bytes
function readOrientation(bytes: Uint8Array): number {
  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return 1;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xFF) return 1;
    const marker = bytes[offset + 1];
    if (marker === 0xE1) {
      // APP1 - check Exif
      if (
        bytes[offset + 4] === 0x45 && bytes[offset + 5] === 0x78 &&
        bytes[offset + 6] === 0x69 && bytes[offset + 7] === 0x66
      ) {
        const tiffStart = offset + 10;
        const little = view.getUint16(tiffStart) === 0x4949;
        const get16 = (o: number) => view.getUint16(o, little);
        const get32 = (o: number) => view.getUint32(o, little);
        const ifdOffset = tiffStart + get32(tiffStart + 4);
        const numTags = get16(ifdOffset);
        for (let i = 0; i < numTags; i++) {
          const entry = ifdOffset + 2 + i * 12;
          if (get16(entry) === 0x0112) return get16(entry + 8);
        }
        return 1;
      }
    }
    const size = view.getUint16(offset + 2);
    offset += 2 + size;
  }
  return 1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { bucket, paths } = await req.json() as Body;
    if (!bucket || !Array.isArray(paths)) {
      return new Response(JSON.stringify({ error: "bucket and paths required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: Array<{ path: string; status: string; orientation?: number; detail?: string }> = [];

    for (const path of paths) {
      try {
        const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(path);
        if (dlErr || !blob) { results.push({ path, status: "download_failed", detail: dlErr?.message }); continue; }

        const bytes = new Uint8Array(await blob.arrayBuffer());
        const orientation = readOrientation(bytes);

        if (orientation === 1) {
          results.push({ path, status: "skipped_no_rotation", orientation });
          continue;
        }

        const img = await Image.decode(bytes);
        const fixed = applyOrientation(img, orientation);
        const outBytes = await fixed.encodeJPEG(90);

        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(path, outBytes, { contentType: "image/jpeg", upsert: true, cacheControl: "3600" });

        if (upErr) { results.push({ path, status: "upload_failed", orientation, detail: upErr.message }); continue; }

        results.push({ path, status: "fixed", orientation });
      } catch (e) {
        results.push({ path, status: "error", detail: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
