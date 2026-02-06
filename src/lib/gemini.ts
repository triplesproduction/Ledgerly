import { z } from "zod";

/**
 * 📜 gemini.ts
 * The Code Representation of the Project Constitution (gemini.md).
 * Strict Typing for Financial Invariants.
 */

// --- 1. Enums ---

export const IncomeStatusSchema = z.enum(["PENDING", "RECEIVED", "PARTIAL", "OVERDUE"]);
export type IncomeStatus = z.infer<typeof IncomeStatusSchema>;

export const IncomeCategorySchema = z.enum(["RETAINER", "PROJECT_FEE", "ONE_OFF"]);
export type IncomeCategory = z.infer<typeof IncomeCategorySchema>;

export const ExpenseCategorySchema = z.enum([
  "SALARY",
  "TOOLS",
  "OFFICE",
  "MARKETING",
  "SERVER",
  "MISC",
]);
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;

export const ExpenseTypeSchema = z.enum(["FIXED", "VARIABLE", "ONE_OFF"]);
export type ExpenseType = z.infer<typeof ExpenseTypeSchema>;

export const ExpenseStatusSchema = z.enum(["PLANNED", "PENDING_PAYMENT", "PAID"]);
export type ExpenseStatus = z.infer<typeof ExpenseStatusSchema>;

// --- 2. Entities ---

export const IncomeEntrySchema = z.object({
  id: z.string().uuid(),
  source_ref_id: z.string().optional(), // QuoteForge Invoice ID
  amount_expected: z.number().positive(),
  amount_received: z.number().min(0),
  received_date: z.date().nullable(), // CRITICAL: Only set if Status == RECEIVED/PARTIAL
  status: IncomeStatusSchema,
  category: IncomeCategorySchema,
  client_name: z.string(),
});
export type IncomeEntry = z.infer<typeof IncomeEntrySchema>;

export const ExpenseEntrySchema = z.object({
  id: z.string().uuid(),
  amount: z.number().positive(),
  incurred_date: z.date(),
  paid_date: z.date().nullable(), // CRITICAL: Only set if Money left bank
  category: ExpenseCategorySchema,
  type: ExpenseTypeSchema,
  status: ExpenseStatusSchema,
  description: z.string().optional(),
  vendor: z.string(),
  is_tax_deductible: z.boolean(),
});
export type ExpenseEntry = z.infer<typeof ExpenseEntrySchema>;

export const CashAccountTypeSchema = z.enum(["BANK", "PETTY_CASH", "DIGITAL_WALLET"]);
export type CashAccountType = z.infer<typeof CashAccountTypeSchema>;

export const CashAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: CashAccountTypeSchema,
  currency: z.literal("INR"),
  is_active: z.boolean(),
  last_reconciled_at: z.date().nullable(),
  // current_balance is derived, usually not stored in the canonical model input, but maybe in the output types. 
  // We'll keep it simple for the schema definition.
});
export type CashAccount = z.infer<typeof CashAccountSchema>;

export const PayrollRecordSchema = z.object({
  id: z.string().uuid(),
  employee_id: z.string(),
  role: z.string(),
  base_salary: z.number(),
  bonus: z.number(),
  total_cost_to_company: z.number(),
  payment_status: z.enum(["SCHEDULED", "DISBURSED"]),
  month_reference: z.date(),
});
export type PayrollRecord = z.infer<typeof PayrollRecordSchema>;

export const MonthlyPLSnapshotSchema = z.object({
  month: z.date(),
  total_revenue: z.number(),
  total_expenses: z.number(),
  net_profit: z.number(),
  burn_rate_snapshot: z.number(),
  runway_months_snapshot: z.number(),
});
export type MonthlyPLSnapshot = z.infer<typeof MonthlyPLSnapshotSchema>;

// --- 3. Invariants (Validators) ---

/**
 * INVARIANT: Conservation of Money.
 * Ensures that if an item is marked "RECEIVED", it must have a receive date and amount > 0.
 */
export function validateIncomeInvariant(entry: IncomeEntry) {
  if (entry.status === "RECEIVED" && (!entry.received_date || entry.amount_received <= 0)) {
    throw new Error("INVARIANT VIOLATION: Income marked RECEIVED without valid date or amount.");
  }
}

/**
 * INVARIANT: Reality Principle.
 * Ensures that if an item is marked "PAID", it must have a paid date.
 */
export function validateExpenseInvariant(entry: ExpenseEntry) {
  if (entry.status === "PAID" && !entry.paid_date) {
    throw new Error("INVARIANT VIOLATION: Expense marked PAID without payment date.");
  }
}
