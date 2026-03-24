

# Fix: Preview collapsing line breaks in contract editor

## Problem
In the contract model editor, the **Preview** tab shows all text running together as one block, even though the **Editor** tab has clear paragraph separations.

## Root Cause
Line 234 of `ContractModelEditor.tsx`:
```js
previewContent.replace(/\*\*([\s\S]+?)\*\*/g, (_m, inner) =>
  `<strong>${inner.replace(/\n+/g, ' ')}</strong>`
)
```

The regex `[\s\S]+?` matches across newline characters. If any `**` bold markers span multiple lines (or are mismatched), the regex captures a huge block of text and `inner.replace(/\n+/g, ' ')` collapses all paragraph breaks into spaces.

The same issue exists in `ContractDocumentViewer.tsx` which uses the identical `parseBoldMarkdown` function.

## Fix

**File: `src/components/contracts/ContractModelEditor.tsx`** (line ~234)
- Change the bold regex from `\*\*([\s\S]+?)\*\*` to `\*\*([^\n]+?)\*\*`
- This prevents bold markers from matching across line breaks, preserving paragraph structure
- Remove the now-unnecessary `inner.replace(/\n+/g, ' ')` call

**File: `src/components/contracts/ContractDocumentViewer.tsx`** (`parseBoldMarkdown` function)
- Apply the same fix to the `parseBoldMarkdown` helper so generated/printed contracts also render correctly

Both changes are single-line regex fixes. No other files affected.

