"use client";

import NextDynamic from "next/dynamic";
import { Suspense } from "react";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

// Use dynamic import with ssr: false to ensure this component only runs on the client
// and prevents prerendering issues with hooks like useSearchParams
const ExpensesPageContent = NextDynamic(
    async () => {
        const mod = await import("@/components/expenses/expenses-page-content");
        return mod.default;
    },
    {
        ssr: false,
        loading: () => (
            <div className="min-h-screen p-6">
                <div className="h-8 w-48 bg-white/5 rounded-xl animate-pulse mb-8" />
                <div className="h-10 w-full bg-white/5 rounded-xl animate-pulse mb-6" />
                <div className="h-96 w-full bg-white/5 rounded-2xl animate-pulse" />
            </div>
        )
    }
);

export default function ExpensesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen p-6">
                <div className="h-8 w-48 bg-white/5 rounded-xl animate-pulse mb-8" />
                <div className="h-10 w-full bg-white/5 rounded-xl animate-pulse mb-6" />
                <div className="h-96 w-full bg-white/5 rounded-2xl animate-pulse" />
            </div>
        }>
            <ExpensesPageContent />
        </Suspense>
    );
}
