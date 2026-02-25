import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const EMOJI_NUMBERS: Record<number, string> = {
  1: "1️⃣", 2: "2️⃣", 3: "3️⃣", 4: "4️⃣", 5: "5️⃣",
  6: "6️⃣", 7: "7️⃣", 8: "8️⃣", 9: "9️⃣", 10: "🔟",
  11: "1️⃣1️⃣", 12: "1️⃣2️⃣", 13: "1️⃣3️⃣", 14: "1️⃣4️⃣", 15: "1️⃣5️⃣",
  16: "1️⃣6️⃣", 17: "1️⃣7️⃣", 18: "1️⃣8️⃣",
};

/** Parse "Março", "Março/27", "Março/2027" → { monthIndex, year } */
function parseMonthOption(opt: string): { monthIndex: number; year: number | null; fullYearFormat: boolean } | null {
  const trimmed = opt.trim();
  const match = trimmed.match(/^([A-Za-zÀ-ú]+)\s*(?:\/\s*(\d{2,4}))?$/);
  if (!match) return null;
  const name = match[1];
  const yearStr = match[2];
  const idx = MONTH_NAMES.findIndex(
    (m) => m.toLowerCase() === name.toLowerCase()
  );
  if (idx === -1) return null;
  let year: number | null = null;
  let fullYearFormat = false;
  if (yearStr) {
    const raw = parseInt(yearStr);
    if (yearStr.length === 4) {
      year = raw;
      fullYearFormat = true;
    } else {
      year = raw + 2000;
      fullYearFormat = false;
    }
  }
  return { monthIndex: idx, year, fullYearFormat };
}

/** Detect the year format used in the list */
function detectYearFormat(months: string[]): { alwaysShowYear: boolean; fullYear: boolean } {
  let hasYear = false;
  let fullYear = false;
  for (const m of months) {
    const parsed = parseMonthOption(m);
    if (parsed?.year !== null && parsed) {
      hasYear = true;
      if (parsed.fullYearFormat) fullYear = true;
    }
  }
  return { alwaysShowYear: hasYear, fullYear };
}

function formatMonth(monthIndex: number, year: number, currentYear: number, format: { alwaysShowYear: boolean; fullYear: boolean }): string {
  const name = MONTH_NAMES[monthIndex];
  if (format.alwaysShowYear) {
    return format.fullYear ? `${name}/${year}` : `${name}/${String(year).slice(-2)}`;
  }
  // Only add year suffix if it differs from the current year
  if (year !== currentYear) {
    return `${name}/${String(year).slice(-2)}`;
  }
  return name;
}

function rotateMonths(months: string[], now: Date): string[] {
  const currentMonthIndex = now.getMonth(); // 0-based
  const currentYear = now.getFullYear();
  const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
  const prevMonthYear = currentMonthIndex === 0 ? currentYear - 1 : currentYear;

  // Separate special options
  const specialOptions: string[] = [];
  const regularMonths: string[] = [];

  for (const m of months) {
    const parsed = parseMonthOption(m);
    if (!parsed) {
      specialOptions.push(m);
    } else {
      regularMonths.push(m);
    }
  }

  const yearFormat = detectYearFormat(regularMonths);

  // Remove previous month (any variant)
  const filtered = regularMonths.filter((m) => {
    const parsed = parseMonthOption(m);
    if (!parsed) return true;
    const effectiveYear = parsed.year ?? currentYear;
    if (parsed.monthIndex === prevMonthIndex && effectiveYear === prevMonthYear) {
      return false;
    }
    return true;
  });

  // Find last month to determine what to add
  let lastMonthIdx = currentMonthIndex;
  let lastYear = currentYear;

  if (filtered.length > 0) {
    const lastParsed = parseMonthOption(filtered[filtered.length - 1]);
    if (lastParsed) {
      lastMonthIdx = lastParsed.monthIndex;
      lastYear = lastParsed.year ?? currentYear;
    }
  }

  // Add next month after the last one
  let nextMonthIdx = (lastMonthIdx + 1) % 12;
  let nextYear = lastYear;
  if (nextMonthIdx === 0) nextYear++;

  const newMonth = formatMonth(nextMonthIdx, nextYear, currentYear, yearFormat);
  filtered.push(newMonth);

  return [...filtered, ...specialOptions];
}

function rebuildWhatsAppMonthQuestion(originalText: string, newMonths: string[]): string {
  // Split intro from emoji options
  const lines = originalText.split("\n");
  const introLines: string[] = [];
  let foundFirstOption = false;

  // Detect emoji option lines: starts with emoji digit pattern
  const isEmojiLine = (line: string) => /^\s*[0-9️⃣🔟1]/.test(line.trim()) && /[A-Za-zÀ-ú]/.test(line);

  for (const line of lines) {
    if (!foundFirstOption && isEmojiLine(line)) {
      foundFirstOption = true;
    }
    if (!foundFirstOption) {
      introLines.push(line);
    }
  }

  if (!foundFirstOption) return originalText;

  // Trim trailing empty lines from intro
  while (introLines.length > 0 && introLines[introLines.length - 1].trim() === "") {
    introLines.pop();
  }

  const intro = introLines.join("\n");
  const optionLines = newMonths.map((m, i) => {
    const num = i + 1;
    const emoji = EMOJI_NUMBERS[num] || `${num}️⃣`;
    return `${emoji} ${m}`;
  });

  return `${intro}\n\n${optionLines.join("\n")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    console.log(`[rotate-months] Running at ${now.toISOString()}, month=${now.getMonth()}, year=${now.getFullYear()}`);

    // 1. Update lp_bot_settings
    const { data: lpSettings, error: lpErr } = await supabase
      .from("lp_bot_settings")
      .select("id, company_id, month_options");
    if (lpErr) throw lpErr;

    let lpUpdated = 0;
    for (const setting of lpSettings || []) {
      const oldMonths = (setting.month_options as string[]) || [];
      const newMonths = rotateMonths(oldMonths, now);
      console.log(`[rotate-months] LP company=${setting.company_id}: ${JSON.stringify(oldMonths)} → ${JSON.stringify(newMonths)}`);

      const { error } = await supabase
        .from("lp_bot_settings")
        .update({ month_options: newMonths })
        .eq("id", setting.id);

      if (error) {
        console.error(`[rotate-months] LP update error for ${setting.id}:`, error);
      } else {
        lpUpdated++;
      }
    }

    // 2. Update wapi_bot_questions (step = 'mes') using REST API directly
    const { data: wapiQuestions, error: wapiErr } = await supabase
      .from("wapi_bot_questions")
      .select("id, company_id, question_text")
      .eq("step", "mes");
    if (wapiErr) throw wapiErr;

    let wapiUpdated = 0;
    for (const q of wapiQuestions || []) {
      const text = q.question_text || "";

      // Extract current months from emoji lines
      const emojiLinePattern = /(?:[\d️⃣🔟]+)\s+(.+)/g;
      const currentMonths: string[] = [];
      let match;
      while ((match = emojiLinePattern.exec(text)) !== null) {
        const monthText = match[1].trim();
        if (parseMonthOption(monthText) || monthText.toLowerCase().includes("decid")) {
          currentMonths.push(monthText);
        }
      }

      if (currentMonths.length === 0) {
        console.log(`[rotate-months] WhatsApp ${q.id}: no months found, skipping`);
        continue;
      }

      const newMonths = rotateMonths(currentMonths, now);
      const newText = rebuildWhatsAppMonthQuestion(text, newMonths);

      console.log(`[rotate-months] WhatsApp company=${q.company_id}: ${currentMonths.length}→${newMonths.length} months`);

      // Use REST API directly to avoid potential supabase-js serialization issues
      const updateRes = await fetch(
        `${supabaseUrl}/rest/v1/wapi_bot_questions?id=eq.${q.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ question_text: newText }),
        }
      );

      if (!updateRes.ok) {
        const errBody = await updateRes.text();
        console.error(`[rotate-months] WhatsApp update error for ${q.id}: ${updateRes.status} ${errBody}`);
      } else {
        wapiUpdated++;
      }
    }

    const result = {
      success: true,
      timestamp: now.toISOString(),
      lp_settings_updated: lpUpdated,
      wapi_questions_updated: wapiUpdated,
    };

    console.log(`[rotate-months] Done:`, result);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[rotate-months] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
