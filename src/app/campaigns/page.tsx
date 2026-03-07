"use client";

import { useState, useEffect } from "react";
import { AddCampaignDialog } from "@/components/campaigns/add-campaign-dialog";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import Link from "next/link";
import { IndianRupee } from "lucide-react";
import type { Campaign } from "@/types/general";

export const dynamic = 'force-dynamic';

interface CampaignWithSpending extends Campaign {
    totalSpent: number;
    remainingBudget: number;
}

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<CampaignWithSpending[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCampaigns = async () => {
        setIsLoading(true);

        try {
            // Fetch campaigns
            const { data: campaignsData, error: campaignsError } = await supabase
                .from('campaigns')
                .select('*')
                .order('created_at', { ascending: false });

            if (campaignsError) throw campaignsError;

            // Fetch expenses to calculate spending
            const { data: expensesData, error: expensesError } = await supabase
                .from('campaign_expenses')
                .select('campaign_id, amount');

            if (expensesError) throw expensesError;

            // Calculate totals
            const expensesByCampaign = expensesData?.reduce((acc: Record<string, number>, exp) => {
                acc[exp.campaign_id] = (acc[exp.campaign_id] || 0) + Number(exp.amount);
                return acc;
            }, {}) || {};

            const formatted: CampaignWithSpending[] = campaignsData?.map(c => {
                const spent = expensesByCampaign[c.id] || 0;
                return {
                    ...c,
                    totalSpent: spent,
                    remainingBudget: Number(c.budget) - spent
                };
            }) || [];

            setCampaigns(formatted);
        } catch (error: any) {
            console.error("Failed to fetch campaigns:", error.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    return (
        <div className="min-h-screen bg-transparent text-foreground font-sans p-6 pb-24 lg:pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Campaign Expenses</h1>
                    <p className="text-muted-foreground mt-1">Manage marketing and launch campaigns, budgets, and spending parameters.</p>
                </div>
                <AddCampaignDialog onSuccess={fetchCampaigns} />
            </div>

            {isLoading ? (
                <div className="text-center py-20 text-muted-foreground">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-2xl border border-white/5 shadow-2xl">
                    <h2 className="text-xl font-bold mb-2">No Campaigns Found</h2>
                    <p className="text-muted-foreground">Get started by creating your first campaign.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                    {campaigns.map(campaign => (
                        <Link href={`/campaigns/${campaign.id}`} key={campaign.id} className="block group">
                            <div className="bg-card border border-white/5 rounded-2xl p-6 shadow-lg shadow-black/20 hover:shadow-orange-500/10 hover:border-orange-500/30 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden h-full flex flex-col">
                                {/* Subtle background glow on hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div>
                                        <h2 className="text-2xl font-bold text-foreground group-hover:text-orange-400 transition-colors line-clamp-2 pr-4">{campaign.name}</h2>
                                        {campaign.client && (
                                            <p className="text-sm text-muted-foreground mt-0.5">{campaign.client}</p>
                                        )}
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${campaign.status === "Active"
                                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                        : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                                        }`}>
                                        {campaign.status}
                                    </span>
                                </div>

                                <div className="space-y-4 mt-auto relative z-10 pt-4 border-t border-white/5">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Budget</span>
                                        <span className="font-semibold text-foreground flex items-center">
                                            <IndianRupee size={12} className="mr-0.5 text-orange-500" />
                                            {campaign.budget.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Spent</span>
                                        <span className="font-semibold text-rose-400 flex items-center">
                                            <IndianRupee size={12} className="mr-0.5" />
                                            {campaign.totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-orange-500 h-1.5 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min(100, (campaign.totalSpent / campaign.budget) * 100)}%` }}
                                        ></div>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Remaining</span>
                                        <span className={`font-bold flex items-center ${campaign.remainingBudget < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                                            <IndianRupee size={12} className="mr-0.5" />
                                            {campaign.remainingBudget.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
