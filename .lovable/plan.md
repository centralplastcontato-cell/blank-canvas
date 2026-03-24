

# ✅ Fix: Visit Confirmation — Messages Sent Together + Wrong "hoje" Reference

## Changes Applied

### Edge Function `visit-confirmation/index.ts`
1. **Added `{{dia_visita}}` variable** — auto-resolves to "hoje", "amanhã", or formatted date based on SP timezone
2. **Fixed dedup guard** — now checks per `message_type` (`meta?.type === messageType`) instead of blocking all confirmation types
3. **Added `sentFirstInThisRun` Set** — prevents sending both first and second messages in the same cron execution

### Frontend `VisitConfirmationSection.tsx`
1. Default second message template changed from "hoje" to `{{dia_visita}}`
2. Added `{{dia_visita}}` to variable badges and tooltip
