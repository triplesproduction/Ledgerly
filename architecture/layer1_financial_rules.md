# 📐 Layer 1 SOP: Financial Calculation Rules

> **Scope**: Formulas and Logic ONLY. No code.
> **Purpose**: To ensure deterministic financial answers.

## 1. Cashflow Engine Logic

### 1.1 Liquid Cash (Actual)
```
LiquidCash_Today = (Previous_Day_Balance)
                 + (SUM(Income_Received_Today))
                 - (SUM(Expenses_Paid_Today))
```
*   **Constraint**: `Income_Received_Today` must be Status `RECEIVED (VERIFIED)`.

### 1.2 Forecast Cash (Projected)
```
Forecast_Cash_Day(N) = LiquidCash_Today
                     + (SUM(Income_Expected_Between_Now_And_N))
                     - (SUM(Expenses_Pending_Between_Now_And_N))
```
*   **Rule**: If `Forecast_Cash < 0` at any point, trigger **INSOLVENCY ALERT**.

### 1.3 Monthly Burn Rate (Trailing 3 Months)
```
Monthly_Burn = AVERAGE(
    Total_Expenses_Paid_Month_M-1,
    Total_Expenses_Paid_Month_M-2,
    Total_Expenses_Paid_Month_M-3
)
```
*   **Exclusion**: Exclude `Category = ONE_OFF` (e.g., buying a laptop) to get "Operational Burn".

### 1.4 Runway (Survival Time)
```
Runway_Months = LiquidCash_Today / Monthly_Burn
```
*   **Floor**: If `Monthly_Burn == 0`, Runway = `INFINITE` (Display as "Safe").

---

## 2. Profit & Loss Logic

### 2.1 Net Profit (Accrual Basis)
```
Net_Profit = (SUM(Invoiced_Income_This_Month))
           - (SUM(Expenses_Incurred_This_Month))
```
*   **Note**: Includes UNPAID invoices and UNPAID bills. It measures *performance*, not *cash*.

### 2.2 Profit Margin
```
Margin_% = (Net_Profit / Total_Revenue) * 100
```

---

## 3. Salary & Payroll

### 3.1 Total Cost to Company (CTC)
```
Employee_Cost = Base_Salary + Bonuses + Tools_Allowance + Employer_Taxes
```
*   **SOP**: We ignore individual tax withholdings for the *company* view. We only care about the total amount leaving the company bank account.
