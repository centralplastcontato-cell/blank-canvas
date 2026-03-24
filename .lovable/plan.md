

# Fix: Visit Confirmation — Messages Sent Together + Wrong "hoje" Reference

## Problems Identified

### Problem 1: Second message says "hoje" but visit is tomorrow
The default second message template contains the hardcoded word "hoje":
```
Só passando para lembrar da sua visita hoje às {{hora_visita}} no {{nome_buffet}}.
```
The first message is sent 24h before the visit (i.e., the day before). The second message is sent 2h after the first (still the day before). But it says "hoje" — the visit is actually tomorrow.

**Root cause:** The edge function doesn't calculate whether the visit is today or tomorrow relative to the send time. It just interpolates the template as-is.

### Problem 2: First and second messages sent at the same time
Looking at the chat screenshot: at 15:49, both the confirmation message AND the lembrete were sent in the same minute. The configured interval of "2 horas depois" was not respected.

**Root cause:** The dedup guard (line 211) checks for ANY `source === "visit_confirmation"` message in the last 4 hours, but it runs BEFORE the message type is determined. The flow is:
1. Determine message type (first or second) based on `visit_confirmation_history`
2. Check dedup in `wapi_messages`
3. If dedup finds the FIRST message (just sent), it blocks EVERYTHING — including the legitimate second message later

BUT the opposite can also happen: if the `visit_confirmation_history` has a stale "first" record from a previous attempt, the code thinks "first already sent" and jumps to checking the second message timing. If the timing check passes (e.g., stale record from hours ago), it sends the second immediately — even though the "real" first was just sent moments ago in the same cron run for a different history record scenario.

The core issue: the dedup guard doesn't differentiate by `message_type`, and the `visit_confirmation_history` can have records from previous failed/retry cycles that confuse the timing logic.

---

## Fix Plan

### 1. Edge Function `visit-confirmation/index.ts` — Add smart day reference variable

Add a new interpolation variable `{{dia_visita}}` that resolves to "hoje" or "amanhã" based on whether the visit date matches the current date in SP timezone.

```
Changes to interpolation (line ~226):
- Calculate nowDateSP (today's date string in SP timezone)
- Compare with visit.data_visita
- Set dia_visita = "hoje" if same day, "amanhã" if next day, or the formatted date otherwise
- Pass dia_visita to interpolateMessage along with existing variables
```

### 2. Edge Function — Fix dedup guard to be per-message-type

Change the dedup check (line 211) to also match on `message_type` in the metadata, so:
- Sending "first" only checks for recent "first" messages
- Sending "second" only checks for recent "second" messages

```
Changes to dedup (line ~211):
- Filter: meta?.source === "visit_confirmation" AND meta?.type === messageType
```

### 3. Edge Function — Prevent both messages in same cron run

After sending the first message for a visit, add the visit ID to a local `Set` of "just sent first" visits. Skip second message evaluation for any visit in that set. This prevents the edge case where the history record just inserted allows the second message check to pass.

```
Changes:
- Add sentFirstInThisRun: Set<string> before the visits loop
- After sending first message, add visit.id to the set
- In the second message branch, skip if visit.id is in sentFirstInThisRun
```

### 4. Frontend — Update default template and add `{{dia_visita}}` badge

In `VisitConfirmationSection.tsx`:
- Change the default second message from "hoje" to `{{dia_visita}}`
- Add `{{dia_visita}}` to the available variable badges for both message textareas
- Add tooltip explaining it auto-resolves to "hoje" or "amanhã"

### 5. Deploy

Deploy the updated `visit-confirmation` edge function.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/visit-confirmation/index.ts` | Add `dia_visita` variable, fix dedup per-type, prevent dual send in same run |
| `src/components/whatsapp/settings/VisitConfirmationSection.tsx` | Update default template, add `{{dia_visita}}` badge |

---

## Technical Detail

The smart day resolution logic:
```typescript
const todaySP = nowSP.toISOString().split("T")[0]; // "2026-03-24"
const visitDate = visit.data_visita;               // "2026-03-25"
let diaVisita: string;
if (visitDate === todaySP) {
  diaVisita = "hoje";
} else {
  const tomorrow = new Date(nowSP);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  diaVisita = visitDate === tomorrowStr ? "amanhã" : formatDateBR(visitDate);
}
```

This ensures the message always uses the correct temporal reference regardless of when the cron fires.

