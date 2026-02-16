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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

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

            // 2. Fetch all income to calculate LTV (Lifetime Value)
            const { data: incomeData } = await supabase
                .from("income")
                .select("amount, description, client_id, status");

            const ltvMap: Record<string, number> = {};

            if (incomeData && clientsData) {
                incomeData.forEach((inc: any) => {
                    // Filter: Only include paid/received amounts
                    if (inc.status !== 'RECEIVED' && inc.status !== 'PAID') return;

                    let matchedClientId = inc.client_id;
                    const desc = inc.description ? inc.description.toLowerCase() : "";

                    // Fallback: Try to match by name if client_id is missing
                    if (!matchedClientId && desc) {
                        const matchedClient = clientsData.find((c: any) => {
                            const cName = c.name.toLowerCase().trim();
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
                case "name-asc": return a.name.localeCompare(b.name);
                default:
                    // Default: Active First, then Newest (created_at desc)
                    if (a.status === 'Active' && b.status !== 'Active') return -1;
                    if (a.status !== 'Active' && b.status === 'Active') return 1;
                    return 0; // Fallback to original order (which is created_at desc from DB)
            }
        });

    // Selection State
    const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());

    const handleSelect = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedClients);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedClients(newSelected);
    };

    const handleBulkUpdate = async (status: string) => {
        if (selectedClients.size === 0) return;
        if (!confirm(`Are you sure you want to set ${selectedClients.size} clients to ${status}?`)) return;

        setIsLoading(true);
        const ids = Array.from(selectedClients);
        const { error } = await supabase
            .from('clients')
            .update({ status })
            .in('id', ids);

        if (error) {
            alert("Error updating clients: " + error.message);
        } else {
            setSelectedClients(new Set()); // Clear selection
            fetchClients(); // Refresh data
        }
        setIsLoading(false);
    };

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    {filteredClients.map((client) => (
                        <ClientCard
                            key={client.id}
                            client={client}
                            onEdit={() => openEditModal(client)}
                            onDelete={() => handleDelete(client.id)}
                            onView={() => router.push(`/clients/${client.id}`)}
                            isSelected={selectedClients.has(client.id)}
                            onToggleSelect={(checked) => handleSelect(client.id, checked)}
                        />
                    ))}
                    {filteredClients.length === 0 && (
                        <div className="col-span-full text-center text-zinc-500 py-10">
                            {searchTerm ? "No clients match your search." : "No clients found."}
                        </div>
                    )}
                </div>
            )}

            {/* BULK ACTION BAR */}
            {selectedClients.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#16171D] border border-white/10 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 animate-in slide-in-from-bottom-6 z-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-500 rounded-full w-6 h-6 flex items-center justify-center text-[11px] font-bold text-white">
                            {selectedClients.size}
                        </div>
                        <span className="text-sm font-medium text-white">Selected</span>
                    </div>

                    <div className="h-4 w-px bg-white/10"></div>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-white hover:bg-white/5 h-8 px-3 rounded-full text-xs"
                            onClick={() => setSelectedClients(new Set())}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 h-8 rounded-full text-xs"
                            onClick={() => handleBulkUpdate('Active')}
                        >
                            Mark Active
                        </Button>
                        <Button
                            size="sm"
                            className="bg-white/5 text-zinc-400 hover:bg-white/10 border border-white/10 h-8 rounded-full text-xs"
                            onClick={() => handleBulkUpdate('Inactive')}
                        >
                            Mark Inactive
                        </Button>
                    </div>
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
                            <IndustryCombobox
                                value={formData.industry}
                                onChange={(val) => setFormData({ ...formData, industry: val })}
                                industries={availableIndustries}
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

function ClientCard({ client, onEdit, onDelete, onView, isSelected, onToggleSelect }: {
    client: Client,
    onEdit: (e: any) => void,
    onDelete: () => void,
    onView: () => void,
    isSelected: boolean,
    onToggleSelect: (checked: boolean) => void
}) {
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
            className={cn(
                "bg-card border-white/5 transition-all rounded-3xl group relative overflow-hidden cursor-pointer hover:bg-white/5",
                isSelected ? "border-orange-500/50 bg-orange-500/5" : "hover:border-white/10"
            )}
        >
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
                <div className="flex items-center gap-4">
                    <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={onToggleSelect}
                            className={cn(
                                "border-white/20 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500",
                                !isSelected && "opacity-0 group-hover:opacity-100 transition-opacity"
                            )}
                        />
                    </div>
                    <div className="flex flex-col">
                        <CardTitle className="text-[15px] font-semibold text-foreground group-hover:text-orange-500 transition-colors mb-1">
                            {client.name}
                        </CardTitle>
                        <Badge variant="secondary" className="bg-white/5 text-muted-foreground text-[10px] w-fit border-0">
                            {client.industry}
                        </Badge>
                    </div>
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

function IndustryCombobox({ value, onChange, industries }: { value: string, onChange: (val: string) => void, industries: string[] }) {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between bg-white/5 border-white/10 text-foreground hover:bg-white/10 hover:text-foreground focus:ring-1 focus:ring-orange-500/50"
                >
                    {value
                        ? value
                        : "Select industry..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 bg-[#16171D] border-white/10 text-foreground shadow-xl">
                <Command className="bg-transparent">
                    <CommandInput
                        placeholder="Search industry..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                        className="text-foreground caret-orange-500 selection:bg-orange-500/30"
                    />
                    <CommandList>
                        <CommandEmpty>
                            <div className="p-2">
                                <p className="text-sm text-muted-foreground mb-2">No industry found.</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full h-8 border-dashed border border-orange-500/30 text-orange-500 hover:bg-orange-500/10 hover:text-orange-400"
                                    onClick={() => {
                                        onChange(searchValue); // Set the new value
                                        setOpen(false);
                                    }}
                                >
                                    <Plus className="mr-2 h-3 w-3" />
                                    Create "{searchValue}"
                                </Button>
                            </div>
                        </CommandEmpty>
                        <CommandGroup>
                            {industries.map((industry) => (
                                <CommandItem
                                    key={industry}
                                    value={industry}
                                    onSelect={(currentValue) => {
                                        onChange(industry);
                                        setOpen(false);
                                    }}
                                    className="text-foreground aria-selected:bg-orange-500/10 aria-selected:text-orange-500 cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-orange-500",
                                            value === industry ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {industry}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
