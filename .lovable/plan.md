

## Problem

The send button becomes disabled for several seconds after each message because `isSending` is set to `true` before the API call (`supabase.functions.invoke("wapi-send")`) and only reset to `false` after it completes. Since the Edge Function call takes 2-5 seconds, the user cannot send sequential messages rapidly.

## Solution

Move `setIsSending(false)` to immediately after the optimistic message is added to the UI, **before** the API call. The optimistic update already handles showing the message instantly, so there's no UX reason to block the input while the network request completes. Each send will still be self-contained — errors will restore the message to the input field independently.

## Changes

**File: `src/components/whatsapp/WhatsAppChat.tsx`**

1. Move `setIsSending(false)` from line 1879 (after API call) to right after line 1825 (after optimistic message is added)
2. Also move the textarea refocus (`setTimeout(() => messageTextareaRef.current?.focus(), 50)`) to the same early position
3. Remove the `setIsSending(false)` on line 1859 (SESSION_INCOMPLETE error path) since it will already be false
4. Remove the late `setIsSending(false)` on line 1879

This ensures the button re-enables instantly (~0ms) after each send, matching native WhatsApp behavior where you can type and send messages in rapid succession.

