"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Plus, Mail, Building, Search, Pencil, Trash2, AlertTriangle, Filter, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

import { Client } from "@/types/general";

export default function ClientsPage() {
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);

    // Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [industryFilter, setIndustryFilter] = useState("All");
    const [sortBy, setSortBy] = useState("newest");

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        industry: "",
        email: "",
        status: "Active"
    });

    const fetchClients = async () => {
        setIsLoading(true);

        try {
            // 1. Fetch Clients
            const { data: clientsData, error } = await supabase
                .from("clients")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            // 2. Fetch Income for LTV Calculation
            // We fetch all income. Note: Supabase restricts response rows (default 1000). 
            // Ideally we'd paginate or use an RPC. specific columns for smaller payload.
            const { data: incomeData } = await supabase
                .from("income")
                .select("amount, description, client_id");

            const ltvMap: Record<string, number> = {};

            if (incomeData && clientsData) {
                incomeData.forEach((inc: any) => {
                    let matchedClientId = inc.client_id;
                    const desc = inc.description ? inc.description.toLowerCase() : "";

                    // Fallback: Try to match by name
                    if (!matchedClientId && desc) {
                        // Check if description starts with client name (e.g. "Client X: Project Y" or "Client X Project Y")
                        const matchedClient = clientsData.find((c: any) => {
                            const cName = c.name.toLowerCase().trim();
                            // Exact match on parts or startsWith
                            return cName && (desc.startsWith(cName) || desc.includes(`${cName}:`));
                        });
                        if (matchedClient) matchedClientId = matchedClient.id;
                    }

                    if (matchedClientId) {
                        ltvMap[matchedClientId] = (ltvMap[matchedClientId] || 0) + Number(inc.amount);
                    }
                });
            }

            // 3. Merge & Auto-Update
            // We want to update the DB if the calculated value differs from the stored value, 
            // so the "Final Worth" is always accurate.
            const updates: Promise<any>[] = [];

            const mergedClients = clientsData.map((c: any) => {
                const calculatedValue = ltvMap[c.id] || 0;
                const storedValue = c.value || 0;

                // Priority: Calculated > Stored (if calculated > 0 or logic says it should be 0)
                // Actually, Calculation is Truth.

                // If calculated is different, queue an update (silent sync)
                if (calculatedValue !== storedValue) {
                    // Update DB asynchronously - wrap in explicit Promise
                    updates.push(
                        Promise.resolve(supabase.from('clients').update({ value: calculatedValue }).eq('id', c.id))
                    );
                }

                return {
                    id: c.id,
                    name: c.name,
                    industry: c.industry || "General",
                    email: c.email || "—",
                    value: calculatedValue,
                    status: c.status || "Active",
                    created_at: c.created_at
                };
            });

            // Execute silent updates in background
            if (updates.length > 0) {
                await Promise.all(updates);
            }


            setClients(mergedClients);

        } catch (error) {
            // Error fetching clients - silently fail in production
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const openAddModal = () => {
        setIsEditing(false);
        setFormData({ name: "", industry: "", email: "", status: "Active" });
        setIsModalOpen(true);
    };

    const openEditModal = (client: Client) => {
        setIsEditing(true);
        setCurrentId(client.id);
        setFormData({
            name: client.name,
            industry: client.industry,
            email: client.email === "—" ? "" : client.email,
            status: client.status
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            name: formData.name,
            industry: formData.industry,
            email: formData.email,
            status: formData.status
        };

        // Check for duplicates (case-insensitive)
        const duplicate = clients.find(c =>
            c.name.trim().toLowerCase() === formData.name.trim().toLowerCase() &&
            c.id !== currentId
        );

        if (duplicate) {
            alert("A client with this name already exists.");
            return;
        }

        let result;
        if (isEditing && currentId) {
            result = await supabase.from('clients').update(payload).eq('id', currentId);

            // Sync Client Name to Income Table
            if (!result.error && formData.name) {
                await supabase
                    .from('income')
                    .update({ client: formData.name })
                    .eq('client_id', currentId);
            }
        } else {
            // Initial value is 0, will be updated by calculation next fetch
            result = await supabase.from('clients').insert([{ ...payload, value: 0 }]);
        }

        if (result.error) {
            alert("Error saving client: " + result.error.message);
        } else {
            setIsModalOpen(false);
            fetchClients();
        }
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('clients').delete().eq('id', id);

        if (error) {
            // Check for Foreign Key Violation (Postgres Code 23503)
            if (error.code === '23503' || error.message.includes('foreign key constraint')) {
                if (window.confirm("Cannot delete this client because they have existing Income records.\n\nWould you like to ARCHIVE them (mark as Inactive) instead?")) {
                    await handleArchive(id);
                }
            } else {
                alert("Error deleting: " + error.message);
            }
        } else {
            fetchClients();
        }
    };

    const handleArchive = async (id: string) => {
        const { error } = await supabase.from('clients').update({ status: 'Inactive' }).eq('id', id);
        if (error) {
            alert("Error archiving: " + error.message);
        } else {
            fetchClients();
        }
    };

    // Filter Logic
    const availableIndustries = Array.from(new Set(clients.map(c => c.industry).filter(Boolean)));

    // Filter Logic
    const filteredClients = clients
        .filter(client => {
            const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.industry.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === "All" || client.status === statusFilter;
            const matchesIndustry = industryFilter === "All" || client.industry === industryFilter;
            return matchesSearch && matchesStatus && matchesIndustry;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case "value-high": return (b.value || 0) - (a.value || 0);
                case "value-low": return (a.value || 0) - (b.value || 0);
                case "name-asc": return a.name.localeCompare(b.name);
                default: return 0;
            }
        });

    // Manual Sync Button (re-runs the logic)
    const syncLTV = () => fetchClients();

    return (
        <div className="min-h-screen bg-transparent text-foreground font-sans p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Clients</h1>
                    <p className="text-muted-foreground mt-1 text-[13px]">Manage client relationships and track lifetime value.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={syncLTV}
                        className="rounded-full border-white/10 hover:bg-white/5 text-[13px]"
                        disabled={isLoading}
                    >
                        <RefreshCw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Sync Values
                    </Button>
                    <Button onClick={openAddModal} className="rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 px-6 font-semibold text-[13px]">
                        <Plus size={18} className="mr-2" /> Add Client
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6 bg-card p-2 rounded-xl border border-white/5 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search clients..."
                        className="pl-9 bg-transparent border-none focus-visible:ring-0 h-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="h-4 w-px bg-white/10 mx-1"></div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] border-none bg-transparent focus:ring-0 text-xs">
                        <div className="flex items-center gap-2">
                            <Filter size={14} className="text-muted-foreground" />
                            <span className="text-muted-foreground hidden sm:inline">Status:</span>
                            <SelectValue />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#16171D] border-white/10 text-white">
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="Lead">Lead</SelectItem>
                    </SelectContent>
                </Select>

                <div className="h-4 w-px bg-white/10 mx-1 hidden md:block"></div>

                {/* Industry Filter */}
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                    <SelectTrigger className="w-[140px] border-none bg-transparent focus:ring-0 text-xs">
                        <div className="flex items-center gap-2">
                            <Building size={14} className="text-muted-foreground" />
                            <span className="text-muted-foreground hidden sm:inline">Industry:</span>
                            <SelectValue />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#16171D] border-white/10 text-white">
                        <SelectItem value="All">All</SelectItem>
                        {availableIndustries.map(ind => (
                            <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="h-4 w-px bg-white/10 mx-1 hidden md:block"></div>

                {/* Sort By */}
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[150px] border-none bg-transparent focus:ring-0 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground hidden sm:inline">Sort:</span>
                            <SelectValue />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#16171D] border-white/10 text-white">
                        <SelectItem value="newest">Newest Added</SelectItem>
                        <SelectItem value="value-high">Highest Value</SelectItem>
                        <SelectItem value="value-low">Lowest Value</SelectItem>
                        <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <div className="text-zinc-500 text-sm">Loading clients...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map((client) => (
                        <ClientCard
                            key={client.id}
                            client={client}
                            onEdit={() => openEditModal(client)}
                            onDelete={() => handleDelete(client.id)}
                            onView={() => router.push(`/clients/${client.id}`)}
                        />
                    ))}
                    {filteredClients.length === 0 && (
                        <div className="col-span-full text-center text-zinc-500 py-10">
                            {searchTerm ? "No clients match your search." : "No clients found."}
                        </div>
                    )}
                </div>
            )}

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">{isEditing ? "Edit Client" : "Add New Client"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Company / Name</Label>
                            <Input
                                className="bg-white/5 border-white/10"
                                placeholder="Acme Corp"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Industry</Label>
                            <Input
                                className="bg-white/5 border-white/10"
                                placeholder="Tech, Retail..."
                                value={formData.industry}
                                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Email</Label>
                            <Input
                                className="bg-white/5 border-white/10"
                                type="email"
                                placeholder="contact@acme.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Status</Label>
                            <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#16171D] border-white/10 text-white">
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                    <SelectItem value="Lead">Lead</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-orange-500 text-white hover:bg-orange-600">Save Client</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function ClientCard({ client, onEdit, onDelete, onView }: { client: Client, onEdit: (e: any) => void, onDelete: () => void, onView: () => void }) {
    // 2-Step Deletion State
    const [deleteStep, setDeleteStep] = useState(0);

    // Auto-reset delete step after 3 seconds if not confirmed
    useEffect(() => {
        if (deleteStep === 1) {
            const timer = setTimeout(() => setDeleteStep(0), 3000);
            return () => clearTimeout(timer);
        }
    }, [deleteStep]);

    const handleDeleteClick = () => {
        if (deleteStep === 0) {
            setDeleteStep(1);
        } else {
            onDelete();
            // setDeleteStep(0); // Component likely unmounts, but safest to leave clean
        }
    };

    return (
        <Card
            onClick={onView}
            className="bg-card border-white/5 hover:border-white/10 transition-colors rounded-3xl group relative overflow-hidden cursor-pointer hover:bg-white/5"
        >
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
                <div className="flex flex-col">
                    <CardTitle className="text-[15px] font-semibold text-foreground group-hover:text-orange-500 transition-colors mb-1">
                        {client.name}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-white/5 text-muted-foreground text-[10px] w-fit border-0">
                        {client.industry}
                    </Badge>
                </div>
                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={(e) => { e.stopPropagation(); onEdit(e); }}>
                        <Pencil size={14} />
                    </Button>
                    <Button
                        variant={deleteStep === 1 ? "destructive" : "ghost"}
                        size="icon"
                        className={`h-8 w-8 text-muted-foreground transition-all ${deleteStep === 1 ? 'bg-red-500/20 text-red-500 w-24 px-2' : 'hover:text-red-400'}`}
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }}
                    >
                        {deleteStep === 1 ? <span className="text-[10px] font-bold whitespace-nowrap">Confirm?</span> : <Trash2 size={14} />}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
                <div className="space-y-3">
                    <div className="flex items-center text-[13px] text-muted-foreground">
                        <Mail size={14} className="mr-2 opacity-70" /> {client.email}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Status</span>
                            <span className={`text-xs font-bold ${client.status === 'Active' ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                {client.status}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Lifetime Value</span>
                            <span className="text-[16px] font-bold text-orange-500">
                                ₹{(client.value || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
