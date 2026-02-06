# ⚙️ Layer 1 SOP: Operational Workflows

> **Scope**: Standard Operating Procedures for data mutations.
> **Rule**: Logic here is atomic and deterministic.

## 1. Income Ingestion Workflow
> **Trigger**: `Sync Event` (QuoteForge) or `Manual Entry`.

1.  **Validate Input**:
    *   Check `external_id` deduplication (Idempotency).
    *   Ensure `amount` > 0.
    *   Ensure `date` is valid (per Timeline Invariant).
2.  **Transform**:
    *   Convert currency to USD (if applicable).
    *   Map status: `PAID` (QF) -> `RECEIVED_UNVERIFIED` (Ledgerly).
3.  **Persist**:
    *   Create `income_record`.
    *   Log `sync_event`.
4.  **Trigger Recalculation**:
    *   `Forecast Cash` (Immediate).
    *   `Liquid Cash` (Only if status is RECEIVED).

## 2. Expense Posting Workflow
> **Trigger**: User inputs a bill/expense.

1.  **Categorize**:
    *   Assign `Category` (e.g., SOFTWARE).
    *   Determine `Tax Deductibility`.
2.  **Date Stamping**:
    *   Set `Incurred Date` (Accrual).
    *   Set `Due Date` (Cashflow).
3.  **Persist**:
    *   Create `expense_record` (Status: `PENDING`).
4.  **Trigger Recalculation**:
    *   `Forecast Cash` (Immediate).

## 3. Salary Cycle Close (Monthly)
> **Trigger**: Founder action "Run Payroll".

1.  **Freeze**:
    *   Lock `payroll_record` roster for the month.
2.  **Calculate Totals**:
    *   Sum `Total Cost to Company`.
3.  **Generate Transaction**:
    *   Create single aggregate `expense_record` (Category: `SALARY`).
    *   Status: `PENDING` -> `PAID` (on confirmation).
4.  **Audit**:
    *   Log `approval_event`.

## 4. Monthly P&L Close
> **Trigger**: First day of Month M+1.

1.  **Validation**:
    *   Ensure all `MANUAL` income locked.
    *   Ensure all `PENDING` transactions resolved or carried over.
2.  **Snapshotting**:
    *   Calculate `Net Profit`.
    *   Calculate `Burn Rate`.
    *   Calculate `Runway`.
3.  **Persist**:
    *   Create `monthly_pl_snapshot`.
4.  **Lock**:
    *   Mark Month M as `CLOSED` (immutable).

## 5. Forecast Recalculation (The Brain)
> **Trigger**: Any financial event (Entity Created/Updated).

1.  **Fetch State**:
    *   Get `Liquid Cash`.
    *   Get Open Invoices (Incoming).
    *   Get Pending Bills (Outgoing).
2.  **Project**:
    *   `Day 0` = Liquid.
    *   `Day N` = Liquid + Sum(In) - Sum(Out).
3.  **Alert**:
    *   If `Day N < 0` -> **INSOLVENCY RISK**.
