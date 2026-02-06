"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Download, Upload, Settings, ChevronRight, Check, ShieldCheck, Database, LayoutGrid } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface AppOption {
    id: string;
    label: string;
    value: string;
    group_name: string;
}

export default function SettingsPage() {
    const [options, setOptions] = useState<AppOption[]>([]);
    const [selectedGroup, setSelectedGroup] = useState("expense_category");
    const [newOption, setNewOption] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const fetchOptions = async () => {
        const { data } = await supabase.from("app_options").select("*").eq("group_name", selectedGroup);
        if (data) setOptions(data);
    };

    useEffect(() => {
        fetchOptions();
    }, [selectedGroup]);

    const handleAddOption = async () => {
        if (!newOption) return;
        const val = newOption.toLowerCase().replace(/\s+/g, '_');
        const { error } = await supabase.from("app_options").insert([
            { group_name: selectedGroup, label: newOption, value: val }
        ]);

        if (error) {
            alert("Error adding option: " + error.message);
        } else {
            setNewOption("");
            fetchOptions();
        }
    };

    const handleDeleteOption = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        const { error } = await supabase.from("app_options").delete().eq("id", id);
        if (!error) fetchOptions();
    };

    const handleExport = async () => {
        setIsLoading(true);
        const { data: clients } = await supabase.from("clients").select("*");
        const { data: income } = await supabase.from("income").select("*");
        const { data: expenses } = await supabase.from("expenses").select("*");

        const exportData = { clients, income, expenses };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ledgerly_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-transparent text-foreground font-sans p-8 py-12 space-y-12">
            <div className="flex items-center gap-4 mb-12">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-white/5 flex items-center justify-center shadow-2xl shadow-black/50">
                    <Settings className="text-zinc-400" size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                        <span>System Configuration</span>
                        <ChevronRight size={12} />
                        <span>Preferences</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-7xl">
                {/* Custom Vertical Tabs Container */}
                <Tabs defaultValue="data_controls" className="w-full lg:col-span-4 flex flex-col lg:flex-row gap-8">

                    {/* Sidebar Navigation Style Tabs List */}
                    <TabsList className="flex lg:flex-col items-start justify-start w-full lg:w-64 h-auto bg-transparent p-0 gap-2">
                        <TabsTrigger
                            value="general"
                            className="w-full justify-start px-4 py-3 rounded-xl data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-500 data-[state=active]:border-orange-500/20 border border-transparent font-medium transition-all group"
                        >
                            <ShieldCheck size={18} className="mr-3 text-zinc-500 group-data-[state=active]:text-orange-500 transition-colors" />
                            General
                        </TabsTrigger>
                        <TabsTrigger
                            value="data_controls"
                            className="w-full justify-start px-4 py-3 rounded-xl data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-500 data-[state=active]:border-orange-500/20 border border-transparent font-medium transition-all group"
                        >
                            <LayoutGrid size={18} className="mr-3 text-zinc-500 group-data-[state=active]:text-orange-500 transition-colors" />
                            System Data
                        </TabsTrigger>
                        <TabsTrigger
                            value="backup"
                            className="w-full justify-start px-4 py-3 rounded-xl data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-500 data-[state=active]:border-orange-500/20 border border-transparent font-medium transition-all group"
                        >
                            <Database size={18} className="mr-3 text-zinc-500 group-data-[state=active]:text-orange-500 transition-colors" />
                            Backup & Restore
                        </TabsTrigger>
                    </TabsList>

                    {/* Content Area */}
                    <div className="flex-1 space-y-6">

                        <TabsContent value="general" className="mt-0 focus-visible:outline-none">
                            <Card className="bg-[#0e0e11] border-white/5 shadow-xl">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle>Organization Details</CardTitle>
                                    <CardDescription>Configure how your organization appears in reports.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 pt-4 space-y-4">
                                    <div className="p-12 text-center border border-dashed border-white/10 rounded-xl">
                                        <div className="h-10 w-10 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <ShieldCheck size={20} className="text-zinc-500" />
                                        </div>
                                        <h3 className="text-sm font-medium text-white">Organization Settings Locked</h3>
                                        <p className="text-xs text-zinc-500 mt-1">These settings are managed by your administrator.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="data_controls" className="mt-0 space-y-8 focus-visible:outline-none">
                            {/* Dropdown Manager */}
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">Dropdown Management</h2>
                                    <p className="text-sm text-zinc-500">Customize the options available in forms across the application.</p>
                                </div>

                                <Card className="bg-[#0e0e11] border-white/5 shadow-xl overflow-hidden rounded-2xl">
                                    <div className="p-1 bg-gradient-to-r from-orange-500/20 to-transparent opacity-20 h-1 w-full absolute top-0 left-0" />
                                    <CardHeader className="p-8 pb-4">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="space-y-1">
                                                <CardTitle className="text-xl">System Values</CardTitle>
                                                <CardDescription>Manage active categories and types.</CardDescription>
                                            </div>
                                            <div className="w-full md:w-[240px]">
                                                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                                                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 px-4">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#16171D] border-white/10 text-white">
                                                        <SelectItem value="expense_category">Expense Categories</SelectItem>
                                                        <SelectItem value="payment_mode">Payment Modes</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-8 pt-2 space-y-5">
                                        {/* Add New Input */}
                                        <div className="flex gap-4">
                                            <Input
                                                placeholder={`Add new ${selectedGroup.replace('_', ' ')}...`}
                                                className="bg-zinc-900/50 border-white/10 h-12 focus-visible:ring-orange-500/50"
                                                value={newOption}
                                                onChange={(e) => setNewOption(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                                            />
                                            <Button
                                                onClick={handleAddOption}
                                                className="h-12 px-8 bg-orange-500 hover:bg-orange-600 text-white shadow-[0_0_15px_-3px_rgba(249,115,22,0.4)] transition-all active:scale-95 font-semibold"
                                            >
                                                <Plus size={18} className="mr-2" /> Add
                                            </Button>
                                        </div>

                                        {/* Options List */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {options.length === 0 ? (
                                                <div className="col-span-2 py-8 text-center text-sm text-zinc-600 border border-dashed border-white/5 rounded-xl bg-white/[0.02]">
                                                    No options defined for this group yet.
                                                </div>
                                            ) : (
                                                options.map((opt) => (
                                                    <div
                                                        key={opt.id}
                                                        className="group flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all"
                                                    >
                                                        <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors pl-1">{opt.label}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                                            onClick={() => handleDeleteOption(opt.id)}
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="backup" className="mt-0 focus-visible:outline-none">
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">Data Management</h2>
                                    <p className="text-sm text-zinc-500">Securely export or import your financial data.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className="bg-[#0e0e11] border-white/5 shadow-xl group hover:border-orange-500/20 transition-all cursor-default">
                                        <CardHeader className="p-8 pb-4">
                                            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                                                <Download size={24} className="text-emerald-500" />
                                            </div>
                                            <CardTitle>Export JSON</CardTitle>
                                            <CardDescription>Download a complete snapshot of your data.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-8 pt-2">
                                            <Button
                                                onClick={handleExport}
                                                disabled={isLoading}
                                                variant="outline"
                                                className="w-full h-12 border-white/10 bg-transparent hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/20 transition-all"
                                            >
                                                {isLoading ? "Generating..." : "Download Backup"}
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-[#0e0e11] border-white/5 shadow-xl group hover:border-blue-500/20 transition-all cursor-default relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3">
                                            <div className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">Coming Soon</div>
                                        </div>
                                        <CardHeader className="p-8 pb-4">
                                            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                                                <Upload size={24} className="text-blue-500" />
                                            </div>
                                            <CardTitle>Import Data</CardTitle>
                                            <CardDescription>Migrate data from other platforms via CSV.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-8 pt-2">
                                            <Button disabled className="w-full h-12 bg-white/5 border-dashed border-white/10 text-zinc-500">
                                                Select File
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
