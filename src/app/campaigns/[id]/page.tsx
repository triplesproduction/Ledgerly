"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { IndianRupee, ArrowLeft, Plane, Home, Coffee, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddCampaignExpenseDialog } from "@/components/campaigns/add-campaign-expense-dialog";
import { EditCampaignDialog } from "@/components/campaigns/edit-campaign-dialog";
import type { Campaign, CampaignExpense } from "@/types/general";
import React from "react";

export const dynamic = 'force-dynamic';

export default function CampaignDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [expenses, setExpenses] = useState<CampaignExpense[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCampaignData = async () => {
        setIsLoading(true);
        if (!id) return;

        try {
            const [campaignRes, expensesRes] = await Promise.all([
                supabase.from('campaigns').select('*').eq('id', id).single(),
                supabase.from('campaign_expenses').select('*').eq('campaign_id', id).order('date', { ascending: false })
            ]);

            if (campaignRes.error) throw campaignRes.error;
            if (expensesRes.error) throw expensesRes.error;

            setCampaign(campaignRes.data);
            setExpenses(expensesRes.data || []);
        } catch (error: any) {
            console.error("Failed to fetch campaign data:", error.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaignData();
    }, [id]);

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Loading campaign details...</div>;
    }

    if (!campaign) {
        return (
            <div className="p-8 text-center bg-card rounded-2xl m-6">
                <h2 className="text-xl font-bold mb-2">Campaign Not Found</h2>
                <Button variant="outline" onClick={() => router.push('/campaigns')}>Go Back</Button>
            </div>
        );
    }

    // Calculations
    const totalSpent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const remainingBudget = Number(campaign.budget) - totalSpent;

    const breakdown = expenses.reduce((acc, exp) => {
        const cat = exp.category;
        acc[cat] = (acc[cat] || 0) + Number(exp.amount);
        return acc;
    }, {} as Record<string, number>);

    // Define standard categories to always show them in the breakdown cards
    const categoryIcons: Record<string, React.ReactNode> = {
        'Travel': <Plane size={24} className="text-blue-500" />,
        'Accommodation': <Home size={24} className="text-purple-500" />,
        'Food': <Coffee size={24} className="text-amber-500" />,
        'Other Expense': <Package size={24} className="text-zinc-500" />
    };

    const categoriesList = ['Travel', 'Accommodation', 'Food', 'Other Expense'];

    return (
        <div className="min-h-screen bg-transparent text-foreground font-sans p-6 pb-24 lg:pb-6">
            <div className="mb-6">
                <Button variant="ghost" className="pl-0 text-muted-foreground hover:text-white mb-4" onClick={() => router.push('/campaigns')}>
                    <ArrowLeft size={16} className="mr-2" /> Back to Campaigns
                </Button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">{campaign.name}</h1>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${campaign.status === "Active"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                                }`}>
                                {campaign.status}
                            </span>
                        </div>
                        {campaign.client && (
                            <p className="text-muted-foreground mt-1">Client: <span className="text-white font-medium">{campaign.client}</span></p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(campaign.start_date), 'MMM dd, yyyy')} - {format(new Date(campaign.end_date), 'MMM dd, yyyy')}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <EditCampaignDialog campaign={campaign} onSuccess={fetchCampaignData} />
                        <AddCampaignExpenseDialog campaignId={campaign.id} onSuccess={fetchCampaignData} />
                    </div>
                </div>
            </div>

            {/* Budget Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-card border border-white/5 rounded-2xl p-6 shadow-lg shadow-black/20 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50"></div>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider relative z-10 flex items-center justify-between">
                        Total Budget
                    </p>
                    <div className="mt-4 flex items-baseline gap-1 relative z-10">
                        <IndianRupee size={24} className="text-zinc-500" />
                        <span className="text-4xl font-bold text-white tracking-tight">{Number(campaign.budget).toLocaleString("en-IN")}</span>
                    </div>
                </div>

                <div className="bg-card border border-white/5 rounded-2xl p-6 shadow-lg shadow-black/20 flex flex-col justify-between relative overflow-hidden">
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider relative z-10">
                        Total Spent
                    </p>
                    <div className="mt-4 gap-2 relative z-10">
                        <div className="flex items-baseline gap-1 text-rose-400">
                            <IndianRupee size={24} />
                            <span className="text-4xl font-bold tracking-tight">{totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1.5 mt-4 overflow-hidden">
                            <div
                                className="bg-orange-500 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, (totalSpent / campaign.budget) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-white/5 rounded-2xl p-6 shadow-lg shadow-black/20 flex flex-col justify-between relative overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br opacity-10 ${remainingBudget < 0 ? 'from-rose-500' : 'from-emerald-500'} to-transparent`}></div>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider relative z-10">
                        Remaining Budget
                    </p>
                    <div className={`mt-4 flex items-baseline gap-1 relative z-10 ${remainingBudget < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                        <IndianRupee size={24} />
                        <span className="text-4xl font-bold tracking-tight">
                            {remainingBudget.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Parameter Breakdown */}
            <h2 className="text-xl font-bold mb-4">Budget Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {categoriesList.map(cat => {
                    const amountDisp = breakdown[cat] || 0;

                    // Maps category name to campaign allocation column
                    let allocated = 0;
                    if (cat === 'Travel') allocated = campaign.budget_travel || 0;
                    if (cat === 'Accommodation') allocated = campaign.budget_accommodation || 0;
                    if (cat === 'Food') allocated = campaign.budget_food || 0;
                    if (cat === 'Other Expense') allocated = campaign.budget_other_expense || 0;

                    const percentage = totalSpent > 0 ? ((amountDisp / totalSpent) * 100).toFixed(1) : 0;

                    // Specific Progress logic if allocation exists
                    const hasAllocation = allocated > 0;
                    let capPercentage = 0;
                    if (hasAllocation) {
                        capPercentage = Math.min(100, (amountDisp / allocated) * 100);
                    }

                    return (
                        <div key={cat} className="bg-card border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                                    {categoryIcons[cat]}
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{cat}</p>
                                    <div className="flex items-baseline gap-1 mt-1 font-bold text-lg text-white">
                                        <IndianRupee size={14} className="text-zinc-500" />
                                        {amountDisp.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                                    </div>
                                    <span className="text-[10px] text-zinc-500">{percentage}% of total</span>
                                </div>
                            </div>

                            {hasAllocation && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Limit</span>
                                        <span className="text-xs font-semibold flex items-center text-zinc-300">
                                            ₹{allocated.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                    <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                                        <div
                                            className={`h-1 rounded-full ${capPercentage >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${capPercentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Expenses Table */}
            <h2 className="text-xl font-bold mb-4">Expense History</h2>
            <div className="rounded-2xl border border-white/5 bg-card overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader className="bg-white/5 hover:bg-white/5">
                        <TableRow className="border-white/5">
                            <TableHead className="w-[150px] text-xs font-bold uppercase tracking-wider text-muted-foreground pl-6">Date</TableHead>
                            <TableHead className="w-[150px] text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</TableHead>
                            <TableHead className="w-[120px] text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment</TableHead>
                            <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expenses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No expenses recorded yet.</TableCell>
                            </TableRow>
                        ) : (
                            expenses.map((expense) => (
                                <TableRow key={expense.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                    <TableCell className="font-medium text-foreground/80 pl-6">{format(new Date(expense.date), "MMM dd, yyyy")}</TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-white/5 text-zinc-400 border border-white/10 uppercase">
                                            {expense.category}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-semibold text-foreground">{expense.description}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border uppercase ${expense.payment_method === 'Cash'
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                            {expense.payment_method === 'Cash' ? '💵' : '💳'} {expense.payment_method || 'Online'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-foreground">
                                        <span className="flex items-center justify-end gap-1">
                                            <IndianRupee size={12} className="text-zinc-500" />
                                            {Number(expense.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
