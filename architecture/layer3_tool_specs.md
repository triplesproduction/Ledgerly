# 🛠️ Layer 3: Tools Specification

> **Scope**: Definitions of executable units (Functions/Tools).
> **Status**: Specification ONLY. Implementation later.

## 1. Core Calculators

### `tool:recalculate_cashflow`
*   **Input**: `account_id` (Optional, Global if null), `horizon_days` (default 90).
*   **Output**: `List<DailyBalance>`
*   **Logic**:
    *   Fetch latest `Liquid Cash`.
    *   Iterate Days 1..N.
    *   Apply `Expected Income` and `Pending Expenses` to date buckets.
    *   Return time-series.

### `tool:generate_forecast_snapshot`
*   **Input**: `scenario_name`, `params` (JSON).
*   **Output**: `snapshot_id`, `result_runway`.
*   **Logic**:
    *   Clone current state (in memory).
    *   Apply `params` (e.g., add dummy expenses).
    *   Run `recalculate_cashflow`.
    *   Save result to `forecast_snapshot`.

## 2. Operational Tools

### `tool:close_month_pl`
*   **Input**: `month` (Date), `force_override` (Boolean).
*   **Output**: `monthly_pl_snapshot_id`.
*   **Logic**:
    *   Validate all transactions for `month` are `FINAL`.
    *   Sum Revenue & Expenses.
    *   Write `monthly_pl_snapshot`.
    *   Lock period.

### `tool:sync_quote_income`
*   **Input**: `since_timestamp` (Optional).
*   **Output**: `sync_summary` (Added, Updated, Failed).
*   **Logic**:
    *   Mock QuoteForge API call (for Phase 2).
    *   Iterate results.
    *   Apply `Income Ingestion Workflow` (Layer 1).

## 4. API Layer Mapping (Server Actions)

> **Note**: UI interacts via these Server Actions in `src/app/actions/financial.ts`.

| Action Name | Wrapped Tool/Engine | Revalidation Paths |
| :--- | :--- | :--- |
| `action_ingestIncome` | `ingestIncome` | `/dashboard`, `/income` |
| `action_postExpense` | `postExpense` | `/dashboard`, `/expenses` |
| `action_getDashboardMetrics` | `recalculate_cashflow` | N/A (Data Fetch) |

## 3. Maintenance Tools

### `tool:verify_integrity`
*   **Input**: None.
*   **Output**: `HealthReport`.
*   **Logic**:
    *   Check `Total Assets` == `Liabilities + Equity` (Basic Accounting).
    *   Check `Balance` == `Sum(Transactions)`.
    *   Flag any anomalies.
