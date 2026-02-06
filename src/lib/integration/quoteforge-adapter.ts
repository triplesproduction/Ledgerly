import { IncomeCategory, IncomeStatus } from "../gemini";
import { z } from "zod";

/**
 * 🔗 quoteforge-adapter.ts
 * Implements Integration Logic (integration_spec.md).
 * Maps External QuoteForge Data -> Internal Ledgerly Events.
 */

// --- 1. The "Air Gap" Schema (Incoming Data) ---

export const IncomingIncomeEventSchema = z.object({
    external_id: z.string(),
    source_system: z.literal("QuoteForge"),
    amount_invoiced: z.number(),
    amount_received: z.number(),
    currency: z.string(),
    issue_date: z.string(), // ISO String
    due_date: z.string(),
    payment_date: z.string().nullable(),
    external_status: z.string(), // Raw QF Status
    client_name: z.string(),
    project_ref: z.string(),
});
export type IncomingIncomeEvent = z.infer<typeof IncomingIncomeEventSchema>;

// --- 2. Status Mapping Logic (The "Translator") ---

export function mapStatus(qfStatus: string, amountReceived: number, amountExpected: number): IncomeStatus {
    const status = qfStatus.toUpperCase();

    if (status === "PAID") {
        // CRITICAL: Even if QF says PAID, if amount is 0, it's weird. But we trust the status mapping.
        // However, Ledgerly requires "Unverified" step. 
        // This function returns the *Internal* status.
        // "PAID" in QF -> "RECEIVED" in Ledgerly (But UI will flag as Unverified)
        return "RECEIVED";
    }

    if (status === "PARTIAL") {
        return "PARTIAL";
    }

    if (status === "SENT" || status === "VIEWED" || status === "OVERDUE") {
        // Overdue in QF is still just "Pending" cashflow, but we might want to flag it.
        // Schema allows "OVERDUE".
        if (status === "OVERDUE") return "OVERDUE";
        return "PENDING";
    }

    return "PENDING"; // Default fallback
}

// --- 3. Transformation Logic ---

export interface LedgerlyIncomePayload {
    source_ref_id: string;
    amount_expected: number;
    amount_received: number;
    received_date: Date | null;
    status: IncomeStatus;
    category: IncomeCategory;
    client_name: string;
}

export function transformEvent(event: IncomingIncomeEvent): LedgerlyIncomePayload {
    const mappedStatus = mapStatus(event.external_status, event.amount_received, event.amount_invoiced);

    // Auto-categorize based on project ref? For now default to PROJECT_FEE.
    const category: IncomeCategory = "PROJECT_FEE";

    return {
        source_ref_id: event.external_id,
        amount_expected: event.amount_invoiced,
        amount_received: event.amount_received,
        received_date: event.payment_date ? new Date(event.payment_date) : null,
        status: mappedStatus,
        category: category,
        client_name: event.client_name,
    };
}
