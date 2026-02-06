# ♊ gemini.md - Project Map & State Tracking

> **Status**: Phase 5 (Deployment)
> **Principle**: This file is LAW. Code changes must reflect this schema.

## 1. Data Schema (The "Payload")

### Enums
- **IncomeStatus**: `PENDING`, `RECEIVED`, `PARTIAL`, `OVERDUE`
- **IncomeCategory**: `RETAINER`, `PROJECT_FEE`, `ONE_OFF`
- **ExpenseCategory**: `SALARY`, `TOOLS`, `OFFICE`, `MARKETING`, `SERVER`, `MISC`
- **ExpenseType**: `FIXED`, `VARIABLE`, `ONE_OFF`
- **ExpenseStatus**: `PLANNED`, `PENDING_PAYMENT`, `PAID`
- **CashAccountType**: `BANK`, `PETTY_CASH`, `DIGITAL_WALLET`

### Entities

#### `IncomeEntry` (Table: Implicit via Transactions/Invoices)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `amount_expected` | Number | Positive |
| `amount_received` | Number | >= 0 |
| `received_date` | Date? | **Required** if Status is RECEIVED |
| `status` | IncomeStatus | Current state |
| `client_name` | String | |

#### `ExpenseEntry` (Table: `expenses`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `amount` | Number | Cost to company |
| `incurred_date` | Date | When obligation started |
| `paid_date` | Date? | **Required** if Status is PAID |
| `category` | ExpenseCategory | Grouping |
| `status` | ExpenseStatus | |
| `vendor` | String | |

#### `MonthlyPLSnapshot` (Table: `monthly_snapshots` - Proposed)
| Field | Type | Description |
| :--- | :--- | :--- |
| `month` | Date | The 1st of the month |
| `net_profit` | Number | Revenue - Expenses |
| `burn_rate` | Number | Trailing 3-mo average |
| `runway_months` | Number | Liquid Cash / Burn Rate |

## 2. Tool Registry (Layer 3)

These tools are the "Engines" that manipulate the data.

| Tool Name | Description | Cloud Trigger |
| :--- | :--- | :--- |
| `recalculate_cashflow` | Generates 90-day cash forecast | Daily Cron |
| `close_month_pl` | Locks financial data for a month | Monthly Cron (1st of month) |
| `sync_quote_income` | Fetches latest invoices from QuoteForge | Hourly/Webhook |
| `verify_integrity` | Checks Accounting Equation (Assets=Liabilities+Equity) | Daily Cron |

## 3. Maintenance Log
*   **2026-02-06**: Initial creation of gemini.md. Mapping schema from `src/lib/gemini.ts`.
*   **2026-02-06**: Implemented Phase 5 (Deployment). Added Python tools for automation (`tools/`) and GitHub Actions workflows (`.github/workflows/`). Verified income table existence.

