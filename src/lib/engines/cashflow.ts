import { ExpenseEntry, IncomeEntry } from "../gemini";
import { differenceInMonths, addMonths, isBefore, isAfter } from "date-fns";

/**
 * 📐 cashflow.ts
 * Implements Layer 1 Financial Rules (layer1_financial_rules.md).
 * Pure functions for calculation.
 */

// --- 1. Liquid Cash Calculation ---

export function calculateLiquidCash(
    initialBalance: number,
    allIncome: IncomeEntry[],
    allExpenses: ExpenseEntry[]
): number {
    const totalReceived = allIncome
        .filter((i) => i.status === "RECEIVED" || i.status === "PARTIAL")
        .reduce((sum, i) => sum + i.amount_received, 0);

    const totalPaid = allExpenses
        .filter((e) => e.status === "PAID")
        .reduce((sum, e) => sum + e.amount, 0);

    return initialBalance + totalReceived - totalPaid;
}

// --- 2. Monthly Burn Rate (Trailing 3 Months) ---

export function calculateMonthlyBurn(allExpenses: ExpenseEntry[], referenceDate: Date = new Date()): number {
    // Filter for Operational Expenses (Exclude ONE_OFF as per SOP)
    const operationalExpenses = allExpenses.filter(
        (e) => e.status === "PAID" && e.type !== "ONE_OFF" && e.paid_date
    );

    const startPeriod = addMonths(referenceDate, -3);

    const recentExpenses = operationalExpenses.filter((e) =>
        e.paid_date && isAfter(e.paid_date, startPeriod) && isBefore(e.paid_date, referenceDate)
    );

    const totalRecentSpend = recentExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Simple average over 3 months. If strict, divide by 3. 
    // If data is less than 3 months old, divide by count of active months?
    // SOP says: "Average monthly burn". We'll default to 3.
    return totalRecentSpend / 3;
}

// --- 3. Runway Calculation ---

export function calculateRunway(liquidCash: number, monthlyBurn: number): number {
    if (monthlyBurn <= 0) return 999; // Infinite/Safe
    return liquidCash / monthlyBurn;
}

// --- 4. Forecasting (Simple Projection) ---

export function projectedCashBalance(
    liquidCash: number,
    pendingIncome: IncomeEntry[],
    pendingExpenses: ExpenseEntry[]
): number {
    const expectedIn = pendingIncome.reduce((sum, i) => sum + (i.amount_expected - i.amount_received), 0);
    const expectedOut = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

    return liquidCash + expectedIn - expectedOut;
}
