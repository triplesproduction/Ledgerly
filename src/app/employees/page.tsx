"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Plus, Search, ChevronDown, ChevronUp, Calendar as CalendarIcon,
    Pencil, Trash2, History, FileText, Briefcase, Users,
    Wallet, Award, Clock, Mail, TrendingUp,
    Filter, X, ChevronRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { differenceInMonths, format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { PaymentModal } from "@/components/employees/payment-modal";
import { PaymentHistoryModal } from "@/components/employees/payment-history-modal";
import { DocumentModal } from "@/components/employees/document-modal";

type Employee = {
    id: string;
    name: string;
    role: string;
    type: string;
    email: string;
    joinDate: string;
    salary: number;
    totalPaid: number;
    advanceTaken: number;
    status: string;
    documents?: any[];
};

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);

    // Modal Helpers
    const [paymentEmployee, setPaymentEmployee] = useState<Employee | null>(null);
    const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);
    const [docEmployee, setDocEmployee] = useState<Employee | null>(null);

    // Form state
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newRole, setNewRole] = useState("");
    const [newType, setNewType] = useState("full-time");
    const [newSalary, setNewSalary] = useState("");
    const [newJoinDate, setNewJoinDate] = useState<Date | undefined>(new Date());
    const [internshipDuration, setInternshipDuration] = useState(""); // In months
    const [internshipEndDate, setInternshipEndDate] = useState<Date | undefined>();
    const [isIntern, setIsIntern] = useState(false);

    const resetForm = () => {
        setIsEditing(false);
        setCurrentId(null);
        setNewName("");
        setNewEmail("");
        setNewRole("");
        setNewSalary("");
        setNewJoinDate(new Date());
        setInternshipDuration("");
        setInternshipEndDate(undefined);
        setIsIntern(false);
    };

    const fetchEmployees = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('name', { ascending: true });

        if (data) {
            const formatted = data.map((e: any) => ({
                id: e.id,
                name: e.name,
                role: e.role || "Team Member",
                type: e.type || "Full-Time",
                email: e.email || "",
                joinDate: e.join_date || new Date().toISOString(),
                salary: Number(e.salary),
                totalPaid: Number(e.total_paid),
                advanceTaken: Number(e.advance_taken),
                status: e.status || "Active",
                documents: e.documents || []
            }));
            setEmployees(formatted);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.role.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === "all" || emp.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [employees, searchQuery, roleFilter]);

    const roles = Array.from(new Set(employees.map(e => e.role)));

    const totalHeadcount = employees.length;
    const activeCount = employees.filter(e => e.status === "Active").length;
    const monthlyPayroll = employees.filter(e => e.status === "Active").reduce((sum, e) => sum + (e.salary / 12), 0);
    const totalAdvances = employees.reduce((sum, e) => sum + e.advanceTaken, 0);

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        const salaryNum = parseFloat(newSalary) || 0;

        // Format employment type properly
        let formattedType = "Full-Time";
        if (newType === "contractor") formattedType = "Contractor";
        else if (newType === "part-time") formattedType = "Part-Time";
        else if (newType === "intern-paid") formattedType = "Intern (Paid)";
        else if (newType === "intern-unpaid") formattedType = "Intern (Unpaid)";

        const payload: any = {
            name: newName || "New Employee",
            role: newRole || "Team Member",
            type: formattedType,
            email: newEmail,
            join_date: newJoinDate ? newJoinDate.toISOString() : new Date().toISOString(),
            salary: salaryNum,
            status: "Active"
        };

        // Add intern-specific fields if applicable
        if (isIntern) {
            payload.internship_duration = internshipDuration ? parseInt(internshipDuration) : null;
            payload.internship_end_date = internshipEndDate ? internshipEndDate.toISOString() : null;
        }

        const { error } = isEditing && currentId
            ? await supabase.from('employees').update(payload).eq('id', currentId)
            : await supabase.from('employees').insert([payload]);

        if (error) {
            alert("Error saving employee: " + error.message);
        } else {
            setIsAddModalOpen(false);
            resetForm();
            fetchEmployees();
        }
    };

    const handleEdit = (employee: Employee) => {
        setIsEditing(true);
        setCurrentId(employee.id);
        setNewName(employee.name);
        setNewEmail(employee.email);
        setNewRole(employee.role);

        // Map employee type to form value
        if (employee.type.toLowerCase().includes('intern')) {
            if (employee.type.toLowerCase().includes('paid')) {
                setNewType('intern-paid');
            } else {
                setNewType('intern-unpaid');
            }
            setIsIntern(true);
        } else if (employee.type.toLowerCase().includes('contract')) {
            setNewType('contractor');
            setIsIntern(false);
        } else if (employee.type.toLowerCase().includes('part')) {
            setNewType('part-time');
            setIsIntern(false);
        } else {
            setNewType('full-time');
            setIsIntern(false);
        }

        setNewSalary(employee.salary.toString());
        setNewJoinDate(new Date(employee.joinDate));
        setIsAddModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to remove this employee? This action cannot be undone.")) return;
        const { error } = await supabase.from('employees').delete().eq('id', id);
        if (error) alert("Error deleting employee: " + error.message);
        else fetchEmployees();
    };

    const calculateTenure = (joinDate: string) => {
        const months = differenceInMonths(new Date(), new Date(joinDate));
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        if (years > 0) return `${years}y ${remainingMonths}m`;
        return `${months}m`;
    };

    return (
        <div className="min-h-screen text-foreground p-4 font-sans">
            <div className="max-w-[1600px] mx-auto space-y-6">

                {/* Header Section */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-white/5">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                                <Users className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white tracking-tight">Team Roster</h1>
                                <p className="text-xs text-zinc-500 font-medium mt-0.5">Manage workforce, payroll, and performance metrics</p>
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold h-11 px-6 rounded-xl shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Member
                    </Button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-[#121215] border-white/5 rounded-2xl overflow-hidden hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/10 transition-all hover:scale-[1.02] cursor-pointer group">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] group-hover:text-orange-500/70 transition-colors">Total Headcount</p>
                                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-all group-hover:scale-110">
                                    <Users className="w-5 h-5 text-orange-500" />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-1 group-hover:text-orange-500 transition-colors">{totalHeadcount}</h3>
                            <p className="text-[10px] text-zinc-500 font-medium">{activeCount} Active Members</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#121215] border-white/5 rounded-3xl overflow-hidden hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/10 transition-all hover:scale-[1.02] cursor-pointer group">
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] group-hover:text-orange-500/70 transition-colors">Monthly Payroll</p>
                                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-all group-hover:scale-110">
                                    <Wallet className="w-5 h-5 text-orange-500" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-bold text-white mb-2 group-hover:text-orange-500 transition-colors">₹{monthlyPayroll.toLocaleString()}</h3>
                            <p className="text-xs text-zinc-500 font-medium">Active Commitments</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#121215] border-white/5 rounded-3xl overflow-hidden hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/10 transition-all hover:scale-[1.02] cursor-pointer group">
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] group-hover:text-orange-500/70 transition-colors">Advances Out</p>
                                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-all group-hover:scale-110">
                                    <TrendingUp className="w-5 h-5 text-orange-500" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-bold text-white mb-2 group-hover:text-orange-500 transition-colors">₹{totalAdvances.toLocaleString()}</h3>
                            <p className="text-xs text-zinc-500 font-medium">Pending Recovery</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#121215] border-white/5 rounded-3xl overflow-hidden hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/10 transition-all hover:scale-[1.02] cursor-pointer group">
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] group-hover:text-orange-500/70 transition-colors">Avg Tenure</p>
                                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-all group-hover:scale-110">
                                    <Clock className="w-5 h-5 text-orange-500" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-bold text-white mb-2 group-hover:text-orange-500 transition-colors">
                                {employees.length > 0
                                    ? `${Math.floor(employees.reduce((sum, e) => sum + differenceInMonths(new Date(), new Date(e.joinDate)), 0) / employees.length / 12)}y`
                                    : "0y"}
                            </h3>
                            <p className="text-xs text-zinc-500 font-medium">Team Experience</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                        <Input
                            placeholder="Search by name, email, or role..."
                            className="h-11 pl-12 bg-white/5 border-white/10 rounded-xl text-sm font-medium focus-visible:ring-orange-500/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-full md:w-64 h-11 bg-white/5 border-white/10 rounded-xl font-bold">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Filter by role" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#121215] border-white/10 text-white">
                            <SelectItem value="all">All Roles</SelectItem>
                            {roles.map(role => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Employee Table */}
                <div className="space-y-2">
                    {isLoading ? (
                        <div className="text-center py-20">
                            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent mb-4"></div>
                            <p className="text-zinc-500 font-medium">Loading team data...</p>
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <Card className="bg-[#121215] border-white/5 rounded-2xl">
                            <CardContent className="p-12 text-center">
                                <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-1">No team members found</h3>
                                <p className="text-sm text-zinc-500 mb-6">Start building your roster by adding your first member</p>
                                <Button
                                    onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold h-12 px-8 rounded-xl"
                                >
                                    <Plus className="w-5 h-5 mr-2" />
                                    Add First Member
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredEmployees.map((employee) => (
                            <Card
                                key={employee.id}
                                className={cn(
                                    "bg-[#121215] border-white/5 rounded-2xl overflow-hidden transition-all",
                                    expandedId === employee.id ? "border-orange-500/20 shadow-2xl shadow-orange-500/5" : "hover:border-white/10"
                                )}
                            >
                                {/* Table Row */}
                                <button
                                    onClick={() => setExpandedId(expandedId === employee.id ? null : employee.id)}
                                    className="w-full p-4 flex items-center gap-4 text-left transition-all hover:bg-orange-500/5 group/row"
                                >
                                    <Avatar className="h-12 w-12 border-2 border-white/10 shadow-xl shrink-0 group-hover/row:border-orange-500/30 transition-all group-hover/row:scale-105">
                                        <AvatarFallback className="bg-zinc-800 text-white font-bold text-sm group-hover/row:bg-orange-500/20 group-hover/row:text-orange-500 transition-all">
                                            {employee.name.split(' ').map(n => n[0]).join('')}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                                        <div className="md:col-span-2">
                                            <h4 className="text-base font-bold text-white truncate mb-0.5 group-hover/row:text-orange-500 transition-colors">{employee.name}</h4>
                                            <p className="text-xs text-zinc-500 font-medium truncate group-hover/row:text-zinc-400 transition-colors">{employee.role}</p>
                                        </div>

                                        <div className="hidden md:block">
                                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-0.5">Type</p>
                                            <Badge className="bg-white/5 text-white border border-white/10 font-bold text-xs group-hover/row:bg-orange-500/10 group-hover/row:text-orange-500 group-hover/row:border-orange-500/20 transition-all">
                                                {employee.type}
                                            </Badge>
                                        </div>

                                        <div className="hidden md:block">
                                            <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest mb-1">Status</p>
                                            <Badge className="bg-white/5 text-white border border-white/10 font-bold text-xs group-hover/row:bg-orange-500/10 group-hover/row:text-orange-500 group-hover/row:border-orange-500/20 transition-all">
                                                {employee.status}
                                            </Badge>
                                        </div>

                                        <div className="hidden md:block">
                                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-0.5">Monthly</p>
                                            <p className="text-base font-bold text-white group-hover/row:text-orange-500 transition-colors">₹{(employee.salary / 12).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="shrink-0">
                                        {expandedId === employee.id ? (
                                            <ChevronUp className="w-6 h-6 text-orange-500" />
                                        ) : (
                                            <ChevronDown className="w-6 h-6 text-zinc-600 group-hover/row:text-orange-500 transition-colors" />
                                        )}
                                    </div>
                                </button>

                                {/* Expanded Detail Panel */}
                                {expandedId === employee.id && (
                                    <div className="border-t border-white/5 bg-black/20 p-5 animate-in slide-in-from-top-4 duration-300">
                                        <Tabs defaultValue="overview" className="w-full">
                                            <TabsList className="mb-5 bg-white/5 p-1 rounded-xl border border-white/10 h-10">
                                                <TabsTrigger value="overview" className="px-6 rounded-xl font-bold text-xs uppercase tracking-widest data-[state=active]:bg-orange-500 data-[state=active]:text-white">Overview</TabsTrigger>
                                                <TabsTrigger value="actions" className="px-6 rounded-xl font-bold text-xs uppercase tracking-widest data-[state=active]:bg-orange-500 data-[state=active]:text-white">Actions</TabsTrigger>
                                                <TabsTrigger value="history" className="px-6 rounded-xl font-bold text-xs uppercase tracking-widest data-[state=active]:bg-orange-500 data-[state=active]:text-white">History</TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="overview" className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group cursor-pointer">
                                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 group-hover:text-orange-500/70 transition-colors">Email</p>
                                                        <p className="text-xs font-bold text-white truncate group-hover:text-orange-500 transition-colors">{employee.email}</p>
                                                    </div>
                                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group cursor-pointer">
                                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 group-hover:text-orange-500/70 transition-colors">Tenure</p>
                                                        <p className="text-2xl font-bold text-white group-hover:text-orange-500 transition-colors">{calculateTenure(employee.joinDate)}</p>
                                                    </div>
                                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group cursor-pointer">
                                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 group-hover:text-orange-500/70 transition-colors">Total Paid</p>
                                                        <p className="text-2xl font-bold text-white group-hover:text-orange-500 transition-colors">₹{employee.totalPaid.toLocaleString()}</p>
                                                    </div>
                                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group cursor-pointer">
                                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 group-hover:text-orange-500/70 transition-colors">Advance</p>
                                                        <p className="text-2xl font-bold text-white group-hover:text-orange-500 transition-colors">₹{employee.advanceTaken.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="actions" className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <Button
                                                        onClick={() => { setPaymentEmployee(employee); setIsPaymentModalOpen(true); }}
                                                        className="h-16 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center justify-between px-6 shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-95 hover:shadow-2xl hover:shadow-orange-500/30"
                                                    >
                                                        <div className="text-left">
                                                            <p className="text-[10px] opacity-80 mb-0.5">Execute</p>
                                                            <p className="text-base font-bold">Process Payment</p>
                                                        </div>
                                                        <span className="text-orange-500 text-lg font-semibold">₹</span>
                                                    </Button>

                                                    <Button
                                                        onClick={() => handleEdit(employee)}
                                                        variant="outline"
                                                        className="h-20 border-white/10 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 text-white font-bold rounded-2xl flex items-center justify-between px-8 transition-all hover:scale-[1.02]"
                                                    >
                                                        <div className="text-left">
                                                            <p className="text-xs text-zinc-500 mb-1">Modify</p>
                                                            <p className="text-lg font-bold">Edit Profile</p>
                                                        </div>
                                                        <Pencil className="w-6 h-6" />
                                                    </Button>

                                                    {/* Convert to Full-Time - Only for Interns */}
                                                    {employee.type.toLowerCase().includes('intern') && (
                                                        <Button
                                                            onClick={async () => {
                                                                const confirm = window.confirm(`Convert ${employee.name} to Full-Time employee?`);
                                                                if (confirm) {
                                                                    const { error } = await supabase
                                                                        .from('employees')
                                                                        .update({
                                                                            type: 'Full-Time',
                                                                            internship_duration: null,
                                                                            internship_end_date: null
                                                                        })
                                                                        .eq('id', employee.id);

                                                                    if (error) {
                                                                        alert('Error converting employee: ' + error.message);
                                                                    } else {
                                                                        fetchEmployees();
                                                                    }
                                                                }
                                                            }}
                                                            variant="outline"
                                                            className="h-20 border-green-500/30 bg-green-500/10 hover:bg-green-500/20 hover:border-green-500/50 text-white font-bold rounded-2xl flex items-center justify-between px-8 transition-all hover:scale-[1.02]"
                                                        >
                                                            <div className="text-left">
                                                                <p className="text-xs text-green-500 mb-1">Promote</p>
                                                                <p className="text-lg font-bold">Convert to Full-Time</p>
                                                            </div>
                                                            <Award className="w-6 h-6 text-green-500" />
                                                        </Button>
                                                    )}

                                                    <Button
                                                        onClick={() => { setHistoryEmployee(employee); setIsHistoryModalOpen(true); }}
                                                        variant="outline"
                                                        className="h-20 border-white/10 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 text-white font-bold rounded-2xl flex items-center justify-between px-8 transition-all hover:scale-[1.02]"
                                                    >
                                                        <div className="text-left">
                                                            <p className="text-xs text-zinc-500 mb-1">View</p>
                                                            <p className="text-lg font-bold">Payment Ledger</p>
                                                        </div>
                                                        <History className="w-6 h-6" />
                                                    </Button>

                                                    <Button
                                                        onClick={() => { setDocEmployee(employee); setIsDocModalOpen(true); }}
                                                        variant="outline"
                                                        className="h-20 border-white/10 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 text-white font-bold rounded-2xl flex items-center justify-between px-8 transition-all hover:scale-[1.02]"
                                                    >
                                                        <div className="text-left">
                                                            <p className="text-xs text-zinc-500 mb-1">Access</p>
                                                            <p className="text-lg font-bold">Documents</p>
                                                        </div>
                                                        <FileText className="w-6 h-6" />
                                                    </Button>
                                                </div>

                                                <Button
                                                    onClick={() => handleDelete(employee.id)}
                                                    variant="outline"
                                                    className="w-full h-16 border-white/10 bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 text-white hover:text-red-500 font-bold rounded-2xl transition-all"
                                                >
                                                    <Trash2 className="w-5 h-5 mr-3" />
                                                    Remove from Roster
                                                </Button>
                                            </TabsContent>

                                            <TabsContent value="history">
                                                <div className="p-12 text-center space-y-4">
                                                    <History className="w-12 h-12 text-zinc-700 mx-auto" />
                                                    <p className="text-zinc-500 font-medium">Click below to view complete payment history</p>
                                                    <Button
                                                        onClick={() => { setHistoryEmployee(employee); setIsHistoryModalOpen(true); }}
                                                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold h-12 px-8 rounded-xl"
                                                    >
                                                        Open Full Ledger
                                                    </Button>
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </div>
                                )}
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={(open) => { setIsAddModalOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="bg-[#0e0e11] border-white/10 text-foreground sm:max-w-[520px] p-0 gap-0 outline-none">
                    <DialogHeader className="p-6 pb-3 space-y-1">
                        <DialogTitle className="text-2xl font-bold text-white">
                            {isEditing ? "Edit Team Member" : "Add New Member"}
                        </DialogTitle>
                        <p className="text-sm text-zinc-500 font-normal">
                            {isEditing ? "Update team member information" : "Add a new team member to your team"}
                        </p>
                    </DialogHeader>
                    <form onSubmit={handleAddEmployee} className="px-6 py-2">
                        <div className="grid gap-5">
                            {/* Name & Email */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-muted-foreground text-xs font-semibold">Full Name</Label>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="John Doe"
                                        className="h-11 bg-white/5 border-white/10 rounded-xl text-white font-medium focus-visible:ring-1 focus-visible:ring-orange-500/20"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-muted-foreground text-xs font-semibold">Email</Label>
                                    <Input
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        type="email"
                                        placeholder="john@company.com"
                                        className="h-11 bg-white/5 border-white/10 rounded-xl text-white font-medium focus-visible:ring-1 focus-visible:ring-orange-500/20"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Role & Type */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-muted-foreground text-xs font-semibold">Role</Label>
                                    <Input
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value)}
                                        placeholder="e.g. Senior Developer"
                                        className="h-11 bg-white/5 border-white/10 rounded-xl text-white font-medium focus-visible:ring-1 focus-visible:ring-orange-500/20"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-muted-foreground text-xs font-semibold">Employment Type</Label>
                                    <Select value={newType} onValueChange={(val) => { setNewType(val); setIsIntern(val.includes('intern')); }}>
                                        <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-white font-medium">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#121215] border-white/10 text-white z-[200]">
                                            <SelectItem value="full-time">Full-Time</SelectItem>
                                            <SelectItem value="contractor">Contractor</SelectItem>
                                            <SelectItem value="part-time">Part-Time</SelectItem>
                                            <SelectItem value="intern-paid">Intern (Paid)</SelectItem>
                                            <SelectItem value="intern-unpaid">Intern (Unpaid)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Salary & Join Date */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-muted-foreground text-xs font-semibold">{isIntern ? "Monthly Stipend" : "Annual Salary"}</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 text-sm font-semibold">₹</span>
                                        <Input
                                            value={newType === 'intern-unpaid' ? '0' : newSalary}
                                            onChange={(e) => setNewSalary(e.target.value)}
                                            type="number"
                                            placeholder={newType === 'intern-unpaid' ? 'N/A (Unpaid)' : '0'}
                                            className="h-11 pl-7 bg-white/5 border-white/10 rounded-xl text-white font-medium focus-visible:ring-1 focus-visible:ring-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={newType === 'intern-unpaid'}
                                            required={newType !== 'intern-unpaid'}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-muted-foreground text-xs font-semibold">Join Date</Label>
                                    <DatePicker
                                        date={newJoinDate}
                                        setDate={setNewJoinDate}
                                        className="h-11 w-full bg-white/5 border-white/10 rounded-xl text-white hover:bg-zinc-900 justify-start text-left font-medium"
                                    />
                                </div>
                            </div>

                            {/* Internship Duration - Only for Interns */}
                            {isIntern && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="text-muted-foreground text-xs font-semibold">Internship Duration (Months)</Label>
                                        <Input
                                            value={internshipDuration}
                                            onChange={(e) => setInternshipDuration(e.target.value)}
                                            type="number"
                                            placeholder="3"
                                            className="h-11 bg-white/5 border-white/10 rounded-xl text-white font-medium focus-visible:ring-1 focus-visible:ring-orange-500/20"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-muted-foreground text-xs font-semibold">Expected End Date</Label>
                                        <DatePicker
                                            date={internshipEndDate}
                                            setDate={setInternshipEndDate}
                                            fromDate={newJoinDate || new Date()}
                                            className="h-11 w-full bg-white/5 border-white/10 rounded-xl text-white hover:bg-zinc-900 justify-start text-left font-medium"
                                        />
                                        {newJoinDate && internshipEndDate && internshipEndDate < newJoinDate && (
                                            <p className="text-xs text-red-500">End date must be after join date</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end items-center py-5 border-t border-white/5 mt-6 gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsAddModalOpen(false)}
                                className="h-11 text-zinc-400 hover:text-white hover:bg-white/5 px-6 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-500/20 px-8 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isEditing ? "Save Changes" : "Add Member"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <PaymentModal open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen} employee={paymentEmployee} onSuccess={fetchEmployees} />
            <PaymentHistoryModal open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen} employee={historyEmployee} />
            <DocumentModal open={isDocModalOpen} onOpenChange={setIsDocModalOpen} employee={docEmployee} onSuccess={fetchEmployees} />
        </div>
    );
}
