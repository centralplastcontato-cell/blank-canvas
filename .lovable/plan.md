

## Plan: Add Edit Button for Contractor Data (Dados do Contratante)

### Problem
When client data has been submitted (status "completed" or "reviewed"), the data is displayed as read-only with no way to correct mistakes.

### Solution
Add an "Editar" (Edit) button next to the completed client data that opens the `ManualClientDataForm` pre-filled with the existing data, allowing the user to make corrections.

### Changes

**File: `src/components/agenda/EventFormDialog.tsx`**
- Add a local state `editingClientData` (boolean, default false)
- In the "completed/reviewed" block (around line 1269), add an edit button (pencil icon) next to the status badge
- When clicked, show `ManualClientDataForm` with `initialClientData={clientData}` and `requestId={clientRequest.id}` instead of the read-only grid
- On save or cancel, toggle back to the read-only view and refresh `clientRequest`

**File: `src/components/agenda/ManualClientDataForm.tsx`**
- Ensure `initialClientData` prop correctly pre-fills all form fields (nome, cpf, rg, nascimento, email, cep, endereco, numero, complemento, bairro, cidade, estado)
- The existing update logic (line 95-112) already handles updating an existing request by `requestId`, so no changes needed there

### UI Result
The completed data card will show a small "Editar" button. Clicking it swaps the read-only display for the editable form, pre-filled with all current values. Saving updates the existing `client_data_requests` row and returns to the read-only view.

