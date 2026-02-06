# 🧭 Layer 2: Decision & Navigation Logic

> **Scope**: The nervous system. Routing events to actions.
> **Rule**: No math here. Just "If X happens, do Y".

## 1. Event Triggers & Reaction Matrix

| Event Source | Event Type | Priority | Immediate Action | Deferred Action |
| :--- | :--- | :--- | :--- | :--- |
| **QuoteForge** | `Invoice Finalized` | High | `Ingest Income` | `Recalc Forecast` |
| **QuoteForge** | `Payment Recorded` | Critical | `Update Income` | `Recalc Liquid Cash` |
| **User** | `Add Expense` | Medium | `Persist Expense` | `Recalc Forecast` |
| **User** | `Confirm Payment` | Critical | `Mark Paid` | `Recalc Liquid Cash` |
| **System** | `Month End` | Low | `None` | `Prompt P&L Close` |

## 2. Guardrails (The "No-Go" logic)

### 2.1 Double Counting Prevention
*   **Logic**: If `income_record.external_id` exists:
    *   **Decision**: STOP. Check `sync_event` log.
    *   **Path A**: Duplicate hash -> Ignore.
    *   **Path B**: New hash -> Update Existing.

### 2.2 Insolvency Protection
*   **Logic**: If `Forecast Cash` drops below $0 in next 30 days:
    *   **Decision**: TRIGGER `System Alert`.
    *   **UI Routing**: Force redirect user to `Forecast Dashboard` on login.

### 2.3 Historical Integrity
*   **Logic**: User attempts to edit `Closed Month` data.
    *   **Decision**: BLOCK.
    *   **Message**: "Cannot edit closed period. Create a correction transaction instead."

## 3. Navigation State (Backend driven)

### 3.1 Dashboard State
*   **Condition**: `Runway < 3 Months`
    *   **State**: `DEFCON_3` (Yellow Warnings).
*   **Condition**: `Runway < 1 Month`
    *   **State**: `DEFCON_1` (Red Flashing, Block Non-Essential Expenses).

### 3.2 Setup State
*   **Condition**: `Cash Account Count == 0`
    *   **Route**: Force `/onboarding/setup-accounts`.
