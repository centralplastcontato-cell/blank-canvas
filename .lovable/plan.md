

## Plan: Fix conversation list "ghost" on instance switch + universal lead status

### Problem 1: Conversation list shows wrong data when switching units

When switching from Vendas 1 to Vendas 3, the old conversation list remains visible until the new data loads. The root cause is in `WhatsAppChat.tsx` line 330-333: when switching instances, only `selectedConversation` and `messages` are cleared, but **`conversations` is not reset**, so the previous instance's list stays visible.

**Fix**: Clear `conversations` immediately when `selectedInstance` changes, before the fetch begins.

- In the `useEffect` at line 327 (external unit sync), add `setConversations([])` alongside the existing clears.
- In the `useEffect` at line 1055 (fetch trigger), add `setConversations([])` at the top before calling `fetchConversations()`.

### Problem 2: Lead status must be universal across all units

Currently, `resolveBestLeadForConversation` filters leads by unit compatibility, hiding leads from other units. The user wants: if a lead is "fechado" in Vendas 1, when they message Vendas 3, their status should show as "fechado" there too. Same for "visita" and all other statuses.

**Fix**: Change the lead resolution logic to find the lead regardless of unit, but prioritize unit-compatible leads when multiple exist. The key change is that when only cross-unit leads are found, they should still be returned (not hidden), so their status is visible.

- In `resolveBestLeadForConversation` (line 267-294): Remove the fallback that discards incompatible leads. Instead, always use all candidates but sort unit-compatible ones higher in scoring.
- This means a lead marked "fechado" on Vendas 1 will correctly display as "fechado" when the same phone messages Vendas 3.

### Files to modify

1. **`src/components/whatsapp/WhatsAppChat.tsx`**
   - Line ~332: Add `setConversations([])` when switching instance
   - Line ~1056: Add `setConversations([])` before fetch
   - Line ~282-284: Remove unit filtering from `resolveBestLeadForConversation`, keep all candidates but prioritize compatible ones via scoring

