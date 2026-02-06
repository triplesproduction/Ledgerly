# 🧭 Layer 2 SOP: Navigation & Routing

> **Scope**: UI Flow and User Journey.
> **Rule**: No Business Logic in this layer.

## 1. The Global Dashboard (Home)
*   **Default View**: "The Health Check".
*   **Primary Action**: `Add Transaction` (Access to Manual Income/Expense).
*   **Widgets**:
    1.  **Runway Meter**: Big number (Months left). Color coded (Red < 3m, Green > 6m).
    2.  **Cashflow Chart**: Line graph (Past 3m + Future 3m).
    3.  **Recent Activity**: List of last 5 transactions.

## 2. The Ledger Views
*   **Route**: `/income`
    *   **Default Filter**: `Current Month`.
    *   **Sort**: `Date Descending`.
    *   **Action**: `Sync from QuoteForge` button prominently displayed.
*   **Route**: `/expenses`
    *   **Tabs**: `All`, `Fixed`, `Variable`, `Salary`.
    *   **Action**: `Quick Add` modal.

## 3. The Decision Support View
*   **Route**: `/forecast`
    *   **Interactive Mode**: "What If" scenarios.
    *   **Controls**: Sliders for "Hire 1 Dev", "Lose 1 Client".
    *   **Output**: Reruns `Runway Calculation` instantly visually (Local state only, no DB save).

## 4. Navigation Guard Rails
*   **Rule**: If `Runway < 2 Months`, Dashboard shows a persistent "Low Cash Warning" banner.
*   **Rule**: If `Unverified Income > $0`, Sidebar shows a notification badge on "Income".
