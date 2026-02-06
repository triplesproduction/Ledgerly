# 🛡️ Layer 4: Stabilization & Resilience

> **Scope**: Validation, Integrity, and Disaster Recovery.
> **Philosophy**: "Better to fail loudly than to corrupt silently."

## 1. Universal Validation Rules

### 1.1 Input Sanitization
*   **Currency**: Must be `USD` or convertible (Error if rate missing).
*   **Amounts**: Must be `>= 0` (Negative amounts handled via `Refund` type, not negative numbers).
*   **Dates**: `YYYY-MM-DD` ISO format.
*   **Text**: No HTML/SQL injection chars (Standard/Low priority for internal tool).

### 1.2 Domain Logic Validation
*   **Timeline**: `PaymentDate` >= `InvoiceDate`.
*   **State**: Cannot Modify `PAID` record without `AdminOverride`.
*   **Payroll**: `TotalSalary` <= `LiquidCash` (Soft Warning).

## 2. Failure States & Recovery

### 2.1 The "QuoteForge Down" State
*   **Trigger**: API Timeout / 500 Error during Sync.
*   **System Action**:
    1.  Log Error to `sync_event` (Status: `FAILURE`).
    2.  Enter **Manual Mode**.
    3.  Show Banner: "QuoteForge Sync Offline. Income may be outdated."
*   **Recovery**:
    *   Exponential Backoff Retry (1m, 5m, 15m).
    *   Resume from last successful `since_timestamp`.

### 2.2 The "Insolvency" State
*   **Trigger**: `Liquid Cash < 0` (Impossible physically, but possible in ledger if data missing).
*   **System Action**:
    1.  **CRITICAL ALERT**: "Books are broken OR You are bankrupt."
    2.  Block all `Expense` creation.
    3.  Prompt: "Reconcile Bank Balance immediately."

### 2.3 The "Drift" State
*   **Trigger**: `Calculated Balance` != `Manual Bank Audit`.
*   **System Action**:
    1.  Create `system_adjustment` record.
    2.  Tag as `UNEXPLAINED_LOSS` or `UNEXPLAINED_GAIN`.
    3.  Force Founder Review.

## 3. Data Consistency & Reconciliation

### 3.1 The "Golden" Equation
Must hold true at end of every transaction block:
```
Previous_Balance + Income - Expenses = New_Balance
```
*   **Check Frequency**: Pre-commit hook (Ideal) or Nightly Job.

### 3.2 Manual Reconciliation Strategy (Phase 1)
*   **Frequency**: Weekly (Friday).
*   **Process**:
    1.  Founder opens `Bank Logic`.
    2.  Founder opens `Ledgerly`.
    3.  Founder clicks `Reconcile: [Account Name]`.
    4.  Input: "Real Bank Balance".
    5.  Ledgerly output: "Match" (Green) or "Drift $X" (Red).

## 4. Error Codes (Backend)

| Code | Meaning | Action |
| :--- | :--- | :--- |
| `ERR_FUTURE_DATE` | Transaction date is in future (non-forecast). | User must fix date. |
| `ERR_LOCKED_PERIOD` | Attempt to edit closed month. | User must use Adjustment. |
| `ERR_SYNC_CONFLICT` | QuoteForge vs Ledgerly mismatch on Verified item. | Admin Intervention. |
| `ERR_NEGATIVE_CASH` | Account balance dipped below zero. | Deposit funds or fix error. |
