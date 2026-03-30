

## Problem

Currently, clicking the external link icon (🔗) on a payment card in the **Financeiro** page navigates to `/agenda?event={id}`, forcing the user to leave the financial module. The user wants to see the event's full financial details (the same `EventFinancialTab` shown in the Agenda's event detail sheet) directly within the Financeiro page.

## Solution

Add a **Sheet (slide-over panel)** to the Financeiro page that opens when clicking the link icon on any payment card. This sheet will display:
- Event name, date, and status in the header
- The existing `EventFinancialTab` component (payments, extras, discounts, timeline)

This reuses the already-built component without duplicating logic.

## Changes

### 1. `src/pages/Financeiro.tsx`
- Add state for `selectedEventId` and `selectedEventOpen`
- Change `handleOpenEvent` to set state instead of `navigate()`
- Fetch the selected event's basic data (title, date, total_value, status) from `company_events`
- Render a `Sheet` containing `EventFinancialTab` with the event data
- On sheet close, refresh dashboard data to reflect any changes made inside

### 2. `src/components/financial/FinancialPaymentCard.tsx`
- No changes needed — already calls `onOpenEvent(eventId)` which will now open the sheet

### 3. `src/components/financial/PaymentsByClientView.tsx`
- No changes needed — already passes through `onOpenEvent`

## Technical Details

- The sheet will query `company_events` for the selected event to get `title`, `event_date`, `total_value`, `status`
- `EventFinancialTab` receives `eventId`, `companyId`, `baseValue` — all available
- On sheet close, call `dashboard.refresh()` to sync any payment status changes back to the list

