import {
    IncomeEntry,
    ExpenseEntry,
    validateIncomeInvariant,
    validateExpenseInvariant,
    CashAccount
} from "../gemini";
import { v4 as uuidv4 } from 'uuid';

/**
 * ⚙️ ledger.ts
 * Implements Layer 1 SOPs (architecture/layer1_operations_sops.md).
 * The Transactional Engine.
 */

// --- 1. Operations Interface ---

export interface TransactionResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    events: string[]; // Side effects to trigger
}

// --- 2. Income Operations ---

export function ingestIncome(
    payload: Omit<IncomeEntry, "id" | "status" | "received_date">,
    isVerification: boolean = false
): TransactionResult<IncomeEntry> {

    // 1. Transform / Defaulting
    const record: IncomeEntry = {
        id: uuidv4(),
        ...payload,
        received_date: null,
        status: "PENDING"
    };

    if (isVerification) {
        record.status = "RECEIVED"; // In Ledgerly, "RECEIVED" usually implies unverified unless strictly verified.
        // But per SOP: PENDING -> RECEIVED (UNVERIFIED).
        // If the ingestion payload IS the verification (e.g. from bank), handle that.
        // For simplistic ingestion: Default to PENDING.
    }

    // 2. Validate
    try {
        validateIncomeInvariant(record); // Will throw if status mismatch
    } catch (e: any) {
        return { success: false, error: e.message, events: [] };
    }

    // 3. Return Logic (Persistence to be handled by caller/DB layer)
    return {
        success: true,
        data: record,
        events: []
    };
}

export function verifyIncome(
    record: IncomeEntry,
    receivedDate: Date,
    destinationAccount: CashAccount,
    verifiedAmount?: number
): TransactionResult<IncomeEntry> {

    // 1. State Transition
    // Use the confirmed amount, or default to what was expected.
    // This fixes the invariant where status=RECEIVED requires amount_received > 0.
    const finalAmount = verifiedAmount ?? record.amount_expected;

    const updated: IncomeEntry = {
        ...record,
        status: "RECEIVED",
        received_date: receivedDate,
        amount_received: finalAmount
    };

    // 2. Validate
    try {
        validateIncomeInvariant(updated);
    } catch (e: any) {
        return { success: false, error: e.message, events: [] };
    }

    // 3. Return
    return {
        success: true,
        data: updated,
        events: ["RECALCULATE_LIQUID_CASH"]
    };
}

// --- 3. Expense Operations ---

export function postExpense(
    payload: Omit<ExpenseEntry, "id" | "status" | "paid_date">
): TransactionResult<ExpenseEntry> {

    const record: ExpenseEntry = {
        id: uuidv4(),
        ...payload,
        status: "PLANNED",
        paid_date: null
    };

    return {
        success: true,
        data: record,
        events: []
    };
}

export function payExpense(
    record: ExpenseEntry,
    paidDate: Date
): TransactionResult<ExpenseEntry> {

    const updated: ExpenseEntry = {
        ...record,
        status: "PAID",
        paid_date: paidDate
    };

    try {
        validateExpenseInvariant(updated);
    } catch (e: any) {
        return { success: false, error: e.message, events: [] };
    }

    return {
        success: true,
        data: updated,
        events: ["RECALCULATE_LIQUID_CASH"]
    };
}
