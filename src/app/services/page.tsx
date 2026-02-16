"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Check, MoreHorizontal } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";


export default function ServicesPage() {
    const [services, setServices] = useState<any[]>([]);
    const [rawIncome, setRawIncome] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>("Lifetime");
    const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [newService, setNewService] = useState({ name: "", status: "Active" });
    const [isEditing, setIsEditing] = useState(false);
    const [currentServiceId, setCurrentServiceId] = useState<string | null>(null);
    const [validationError, setValidationError] = useState("");

    const fetchServices = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from("services")
            .select("*")
            .order("name", { ascending: true }); // Ordered by name for better UX

        if (error) {
            // Error fetching services
        } else {
            setServices(data || []);
        }
        setIsLoading(false);
    };

    const fetchIncomeTotals = async () => {
        // Fetch ALL income entries that have a service_id (Lifetime Totals)
        const { data, error } = await supabase
            .from("income")
            .select("service_id, amount, description, date, client_id, clients(name)")
            .not("service_id", "is", null)
            .in("status", ["RECEIVED", "PAID"]);

        if (!error && data) {
            setRawIncome(data);
        }
    };

    // Derived Statistics
    const availableYears = useMemo(() => {
        return Array.from(new Set(rawIncome.map((item: any) => new Date(item.date).getFullYear())))
            .filter(year => !isNaN(year))
            .sort((a, b) => b - a);
    }, [rawIncome]);

    const serviceStats = useMemo(() => {
        const stats: Record<string, { income: number, clients: Set<string> }> = {};

        const filteredData = selectedYear === "Lifetime"
            ? rawIncome
            : rawIncome.filter((item: any) => new Date(item.date).getFullYear().toString() === selectedYear);

        filteredData.forEach((item: any) => {
            if (!stats[item.service_id]) {
                stats[item.service_id] = { income: 0, clients: new Set() };
            }

            // Add income
            stats[item.service_id].income += parseFloat(item.amount) || 0;

            // Count unique clients
            // Prioritize client_id, fallback to description parsing if necessary (for legacy data)
            if (item.client_id) {
                stats[item.service_id].clients.add(item.client_id);
            } else {
                // Legacy fallback: Extract client name from description
                let clientName = "";
                if (item.description && item.description.includes(":")) {
                    clientName = item.description.split(":")[0].trim();
                } else {
                    clientName = item.description ? item.description.split(":")[0].trim() : "Unknown";
                }

                if (clientName && clientName !== "Unknown") {
                    stats[item.service_id].clients.add(clientName.toLowerCase()); // Case insensitive count
                }
            }
        });

        // Convert Sets to numbers
        const finalStats: Record<string, { income: number, clients: number }> = {};
        Object.keys(stats).forEach(id => {
            finalStats[id] = {
                income: stats[id].income,
                clients: stats[id].clients.size
            };
        });

        return finalStats;
    }, [rawIncome, selectedYear]);

    // Initial load and real-time subscription
    useEffect(() => {
        fetchServices();

        // Subscribe to changes in services (names, etc)
        const serviceSubscription = supabase
            .channel('public:services')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, fetchServices)
            .subscribe();

        return () => {
            supabase.removeChannel(serviceSubscription);
        };
    }, []);

    // Fetch totals when income updates
    useEffect(() => {
        fetchIncomeTotals();

        // Subscribe to income changes to update totals in real-time
        const incomeSubscription = supabase
            .channel('income_totals_update')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'income' }, fetchIncomeTotals)
            .subscribe();

        return () => {
            supabase.removeChannel(incomeSubscription);
        };
    }, []);

    const handleAddService = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError("");

        // Trim and normalize the service name
        const trimmedName = newService.name.trim();

        if (!trimmedName) {
            setValidationError("Service name is required");
            return;
        }

        // Check for duplicate service name (case-insensitive)
        let duplicateQuery = supabase
            .from("services")
            .select("id, name")
            .ilike("name", trimmedName);

        if (isEditing && currentServiceId) {
            duplicateQuery = duplicateQuery.neq("id", currentServiceId);
        }

        const { data: existing } = await duplicateQuery;

        if (existing && existing.length > 0) {
            setValidationError(`Service "${existing[0].name}" already exists`);
            return;
        }

        if (isEditing && currentServiceId) {
            // Update existing service
            const { error } = await supabase
                .from("services")
                .update({
                    name: trimmedName,
                    status: newService.status
                })
                .eq("id", currentServiceId);

            if (error) {
                setValidationError("Error updating service: " + error.message);
                return;
            }
        } else {
            // Insert new service
            const { error } = await supabase.from("services").insert([{
                name: trimmedName,
                status: newService.status || "Active"
            }]);

            if (error) {
                setValidationError("Error adding service: " + error.message);
                return;
            }
        }

        // Success for both add and edit
        setIsAddServiceOpen(false);
        setNewService({ name: "", status: "Active" });
        setValidationError("");
        setIsEditing(false);
        setCurrentServiceId(null);
        fetchServices();
    };

    return (
        <div className="min-h-screen bg-transparent text-foreground font-sans p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Services</h1>
                    <p className="text-muted-foreground mt-1 text-[13px]">Manage your service offerings and pricing models.</p>
                </div>

                <div className="flex items-center gap-4">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[120px] bg-white/5 border-white/10 text-white rounded-full h-10 px-4 text-xs font-medium">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1c1c21] border-white/10 text-white min-w-[120px]">
                            <SelectItem value="Lifetime">Lifetime</SelectItem>
                            {availableYears.map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
                        <DialogTrigger asChild>
                            <Button
                                onClick={() => {
                                    setIsEditing(false);
                                    setNewService({ name: "", status: "Active" });
                                    setIsAddServiceOpen(true);
                                }}
                                className="rounded-full bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 px-6 font-semibold text-[13px]"
                            >
                                <Plus size={18} className="mr-2" /> Add Service
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle className="text-foreground">{isEditing ? "Edit Service" : "Add Service Category"}</DialogTitle>
                                <p className="text-xs text-muted-foreground mt-2">Create a main service category that your business offers (e.g., Graphic Design, Video Production, Social Media Management)</p>
                            </DialogHeader>
                            <form onSubmit={handleAddService} className="grid gap-5 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="service-name" className="text-sm font-medium text-foreground">Service Name *</Label>
                                    <Input
                                        id="service-name"
                                        value={newService.name}
                                        onChange={(e) => {
                                            setNewService({ ...newService, name: e.target.value });
                                            setValidationError("");
                                        }}
                                        placeholder="e.g., Social Media Management, Video Production"
                                        className="bg-white/5 border-white/10 text-foreground h-11"
                                        required
                                        autoFocus
                                    />
                                    <p className="text-xs text-muted-foreground">This will appear in income entry forms and reports</p>
                                </div>



                                <div className="space-y-2">
                                    <Label htmlFor="service-status" className="text-sm font-medium text-foreground">Status</Label>
                                    <Select
                                        value={newService.status}
                                        onValueChange={(val) => setNewService({ ...newService, status: val })}
                                    >
                                        <SelectTrigger className="bg-white/5 border-white/10 text-foreground h-11">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1c1c21] border-white/10 text-foreground">
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Inactive">Inactive</SelectItem>
                                            <SelectItem value="Archived">Archived</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {validationError && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                                        <p className="text-sm text-red-500">{validationError}</p>
                                    </div>
                                )}
                                <DialogFooter className="gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                            setIsAddServiceOpen(false);
                                            setNewService({ name: "", status: "Active" });
                                            setValidationError("");
                                        }}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                                    >
                                        {isEditing ? "Update Service" : "Create Service"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Service Grid - premium redesign */}
            <div className="rounded-3xl border border-white/5 bg-card overflow-hidden shadow-xl">
                <Table>
                    <TableHeader className="bg-white/5 hover:bg-white/5">
                        <TableRow className="border-white/5">
                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-6 h-12">Service Category</TableHead>
                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">
                                {selectedYear === "Lifetime" ? "Lifetime Income" : `${selectedYear} Income`}
                            </TableHead>
                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Total Clients</TableHead>
                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Status</TableHead>
                            <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground pr-6 h-12"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading services...</TableCell>
                            </TableRow>
                        ) : services.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No services found.</TableCell>
                            </TableRow>
                        ) : (
                            services.map((service) => (
                                <ServiceRow
                                    key={service.id}
                                    name={service.name}
                                    status={service.status}
                                    totalIncome={serviceStats[service.id]?.income || 0}
                                    totalClients={serviceStats[service.id]?.clients || 0}
                                    onEdit={() => {
                                        setNewService({ name: service.name, status: service.status });
                                        setCurrentServiceId(service.id);
                                        setIsEditing(true);
                                        setIsAddServiceOpen(true);
                                    }}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

function ServiceRow({ name, status, totalIncome, totalClients, onEdit }: { name: string, status: string, totalIncome: number, totalClients: number, onEdit: () => void }) {
    return (
        <TableRow className="border-white/5 hover:bg-white/5 group transition-colors">
            <TableCell className="font-medium text-foreground pl-6 py-4 text-[13px]">{name}</TableCell>
            <TableCell>
                <span className="font-mono text-[13px] text-emerald-500 font-medium">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalIncome)}
                </span>
            </TableCell>
            <TableCell className="text-[13px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                        <span className="text-[10px] font-bold text-zinc-400">{totalClients}</span>
                    </div>
                    <span className="text-xs">Clients</span>
                </div>
            </TableCell>
            <TableCell>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <Check size={10} className="mr-1" /> {status}
                </span>
            </TableCell>
            <TableCell className="text-right pr-6">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={onEdit}>
                    <MoreHorizontal size={16} />
                </Button>
            </TableCell>
        </TableRow>
    )
}
