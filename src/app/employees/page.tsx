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
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
        <div className="min-h-screen text-foreground p-4 md:p-6 lg:p-8 font-sans">
            <div className="max-w-[1600px] mx-auto space-y-8">

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
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold h-11 px-6 rounded-xl shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-95 w-full lg:w-auto"
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
                <div className="space-y-4">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredEmployees.map((employee) => (
                                <Card
                                    key={employee.id}
                                    onClick={() => { setSelectedEmployee(employee); setIsDetailModalOpen(true); }}
                                    className="bg-[#121215] border-white/5 rounded-2xl overflow-hidden transition-all hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-1 cursor-pointer group flex flex-col h-full"
                                >
                                    <div className="p-6 flex-1">
                                        <div className="flex items-start justify-between mb-5">
                                            <Avatar className="h-14 w-14 border-2 border-white/10 shadow-xl shrink-0 group-hover:border-orange-500/30 transition-all">
                                                <AvatarFallback className="bg-zinc-800 text-white font-bold text-lg group-hover:bg-orange-500/20 group-hover:text-orange-500 transition-all">
                                                    {employee.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <Badge className={cn("border-none font-bold text-[10px]", employee.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-400')}>
                                                {employee.status}
                                            </Badge>
                                        </div>
                                        <div className="min-w-0 mb-4">
                                            <h4 className="text-lg font-bold text-white truncate group-hover:text-orange-500 transition-colors">{employee.name}</h4>
                                            <p className="text-sm text-zinc-500 font-medium truncate">{employee.role}</p>
                                        </div>

                                        <div className="space-y-3 mt-auto">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest">Type</p>
                                                <Badge className="bg-white/5 text-white border border-white/10 font-bold text-xs group-hover:bg-orange-500/10 group-hover:text-orange-500 group-hover:border-orange-500/20 transition-all">
                                                    {employee.type}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                                <p className="text-sm text-zinc-400 font-medium">Monthly Pay</p>
                                                <p className="text-base font-bold text-white group-hover:text-orange-500 transition-colors">₹{(employee.salary / 12).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full bg-white/5 p-3 flex justify-center items-center border-t border-white/5 text-zinc-500 text-sm font-semibold group-hover:bg-orange-500/10 group-hover:text-orange-500 transition-colors shrink-0">
                                        View Full Profile <ChevronRight className="w-4 h-4 ml-1" />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Employee Profile Modal */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="bg-[#0e0e11] border-white/10 text-foreground sm:max-w-4xl p-0 gap-0 outline-none overflow-hidden flex flex-col w-[95vw] max-h-[90vh]">
                    {selectedEmployee && (
                        <>
                            {/* Profile Header */}
                            <div className="relative p-6 md:p-10 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent shrink-0">
                                <button className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" onClick={() => setIsDetailModalOpen(false)}>
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="absolute top-6 right-16 flex gap-2">
                                    <Badge className="bg-white/5 text-white font-bold text-sm border-white/10 backdrop-blur-md">
                                        {selectedEmployee.status}
                                    </Badge>
                                    <Badge className="bg-orange-500/20 text-orange-500 font-bold text-sm border-orange-500/20 backdrop-blur-md">
                                        {selectedEmployee.type}
                                    </Badge>
                                </div>
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mt-4 md:mt-0">
                                    <Avatar className="h-24 w-24 border-2 border-white/10 shadow-2xl bg-[#121215]">
                                        <AvatarFallback className="bg-zinc-800 text-white font-bold text-3xl">
                                            {selectedEmployee.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">{selectedEmployee.name}</h2>
                                        <p className="text-lg text-orange-500 font-semibold mb-3">{selectedEmployee.role}</p>
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400 font-medium">
                                            <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5"><Mail className="w-4 h-4 text-zinc-500" /> {selectedEmployee.email}</span>
                                            <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5"><CalendarIcon className="w-4 h-4 text-zinc-500" /> Joined {format(new Date(selectedEmployee.joinDate), 'MMM yyyy')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="p-6 md:p-10 overflow-y-auto w-full flex-1 space-y-8 custom-scrollbar">

                                {/* KPI Metrics */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="p-6 bg-[#121215] rounded-3xl border border-white/5 hover:border-orange-500/30 transition-all group">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 group-hover:text-orange-500/70">Tenure</p>
                                        <p className="text-3xl font-bold text-white mb-1 group-hover:text-orange-500">{calculateTenure(selectedEmployee.joinDate)}</p>
                                        <p className="text-xs text-zinc-600 font-medium">Total time at org</p>
                                    </div>
                                    <div className="p-6 bg-[#121215] rounded-3xl border border-white/5 hover:border-orange-500/30 transition-all group">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 group-hover:text-orange-500/70">Total Paid</p>
                                        <p className="text-3xl font-bold text-white mb-1 group-hover:text-orange-500">₹{selectedEmployee.totalPaid.toLocaleString()}</p>
                                        <p className="text-xs text-zinc-600 font-medium">Lifetime earnings</p>
                                    </div>
                                    <div className="p-6 bg-[#121215] rounded-3xl border border-white/5 hover:border-orange-500/30 transition-all group">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 group-hover:text-orange-500/70">Advance Bal.</p>
                                        <p className="text-3xl font-bold text-red-500 mb-1 group-hover:text-red-400">₹{selectedEmployee.advanceTaken.toLocaleString()}</p>
                                        <p className="text-xs text-zinc-600 font-medium">Pending recovery</p>
                                    </div>
                                    <div className="p-6 bg-[#121215] rounded-3xl border border-white/5 hover:border-orange-500/30 transition-all group">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 group-hover:text-orange-500/70">Monthly Eq.</p>
                                        <p className="text-3xl font-bold text-emerald-500 mb-1 group-hover:text-emerald-400">₹{(selectedEmployee.salary / 12).toLocaleString()}</p>
                                        <p className="text-xs text-zinc-600 font-medium">Regular payout</p>
                                    </div>
                                </div>

                                {/* Internship Module (Conditionally Rendered) */}
                                {selectedEmployee.type.toLowerCase().includes('intern') && (
                                    <div className="p-8 bg-gradient-to-br from-orange-500/10 to-transparent rounded-3xl border border-orange-500/20 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                            <Briefcase className="w-32 h-32 text-orange-500" />
                                        </div>
                                        <div className="flex items-center gap-3 mb-6 relative z-10">
                                            <div className="p-2 bg-orange-500/20 rounded-xl">
                                                <Award className="w-6 h-6 text-orange-500" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">Internship Track</h3>
                                        </div>
                                        <div className="space-y-6 relative z-10">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-sm font-medium text-orange-500/80 mb-1">Time Completed</p>
                                                    <p className="text-2xl font-bold text-orange-500">{calculateTenure(selectedEmployee.joinDate)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Program Type</p>
                                                    <Badge className="bg-orange-500/20 text-orange-500 border-none font-bold px-3 py-1 text-sm">
                                                        {selectedEmployee.type.toLowerCase().includes('paid') ? 'Stipend Enabled' : 'Unpaid Program'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="w-full bg-black/40 rounded-full h-4 overflow-hidden border border-orange-500/10 p-0.5">
                                                <div className="bg-gradient-to-r from-orange-600 to-orange-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(249,115,22,0.6)]" style={{ width: '60%' }}></div>
                                            </div>
                                            <p className="text-xs text-zinc-400 italic text-center">Internship progress is an estimation based on the start date.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Quick Actions */}
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2"><Briefcase className="w-5 h-5 text-zinc-500" /> Administrative Actions</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Button
                                            onClick={() => { setIsDetailModalOpen(false); setPaymentEmployee(selectedEmployee); setIsPaymentModalOpen(true); }}
                                            className="h-20 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-2xl flex items-center justify-between px-8 shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.02] border border-orange-400/20"
                                        >
                                            <div className="text-left">
                                                <p className="text-[11px] uppercase tracking-widest text-orange-100/70 mb-1 font-bold">Execute</p>
                                                <p className="text-lg font-bold drop-shadow-sm">Process Payment</p>
                                            </div>
                                            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                                                <span className="text-white text-xl font-bold flex items-center justify-center">₹</span>
                                            </div>
                                        </Button>

                                        <Button
                                            onClick={() => { setIsDetailModalOpen(false); handleEdit(selectedEmployee); }}
                                            variant="outline"
                                            className="h-20 border-white/10 bg-[#121215] hover:bg-orange-500/10 hover:border-orange-500/30 text-white font-bold rounded-2xl flex items-center justify-between px-8 transition-all hover:scale-[1.02]"
                                        >
                                            <div className="text-left">
                                                <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1 font-bold">Modify</p>
                                                <p className="text-lg font-bold">Edit Profile</p>
                                            </div>
                                            <div className="bg-white/5 p-2 rounded-xl text-zinc-400">
                                                <Pencil className="w-5 h-5" />
                                            </div>
                                        </Button>
                                    </div>
                                </div>

                                {/* Secondary Actions Grid */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/5">
                                    <Button
                                        onClick={() => { setIsDetailModalOpen(false); setHistoryEmployee(selectedEmployee); setIsHistoryModalOpen(true); }}
                                        variant="outline"
                                        className="h-24 flex flex-col items-center justify-center border-white/10 bg-[#121215] hover:bg-white/10 text-white rounded-2xl gap-3 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-white/5 group"
                                    >
                                        <History className="w-7 h-7 text-zinc-500 group-hover:text-white transition-colors" />
                                        <span className="text-sm font-bold">Payment Ledger</span>
                                    </Button>

                                    <Button
                                        onClick={() => { setIsDetailModalOpen(false); setDocEmployee(selectedEmployee); setIsDocModalOpen(true); }}
                                        variant="outline"
                                        className="h-24 flex flex-col items-center justify-center border-white/10 bg-[#121215] hover:bg-white/10 text-white rounded-2xl gap-3 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-white/5 group"
                                    >
                                        <FileText className="w-7 h-7 text-zinc-500 group-hover:text-white transition-colors" />
                                        <span className="text-sm font-bold">Documents</span>
                                    </Button>

                                    {selectedEmployee.type.toLowerCase().includes('intern') && (
                                        <Button
                                            onClick={async () => {
                                                const confirm = window.confirm(`Convert ${selectedEmployee.name} to Full-Time employee?`);
                                                if (confirm) {
                                                    const { error } = await supabase
                                                        .from('employees')
                                                        .update({
                                                            type: 'Full-Time',
                                                            internship_duration: null,
                                                            internship_end_date: null
                                                        })
                                                        .eq('id', selectedEmployee.id);
                                                    if (error) {
                                                        alert('Error converting employee: ' + error.message);
                                                    } else {
                                                        setIsDetailModalOpen(false);
                                                        fetchEmployees();
                                                    }
                                                }
                                            }}
                                            variant="outline"
                                            className="h-24 flex flex-col items-center justify-center border-green-500/30 bg-green-500/5 hover:bg-green-500/20 text-green-500 rounded-2xl gap-3 col-span-2 md:col-span-1 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-green-500/10 group"
                                        >
                                            <Award className="w-7 h-7 text-green-500/70 group-hover:text-green-400 transition-colors" />
                                            <span className="text-sm font-bold text-center">Promote to<br />Full-Time</span>
                                        </Button>
                                    )}

                                    <Button
                                        onClick={() => {
                                            if (window.confirm(`Remove ${selectedEmployee.name} permanently?`)) {
                                                setIsDetailModalOpen(false);
                                                handleDelete(selectedEmployee.id);
                                            }
                                        }}
                                        variant="outline"
                                        className={cn(
                                            "h-24 flex flex-col items-center justify-center border-red-500/30 bg-red-500/5 hover:bg-red-500/20 text-red-500 rounded-2xl gap-3 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/10 group",
                                            !selectedEmployee.type.toLowerCase().includes('intern') && "col-span-2 lg:col-span-2"
                                        )}
                                    >
                                        <Trash2 className="w-7 h-7 text-red-500/70 group-hover:text-red-400 transition-colors" />
                                        <span className="text-sm font-bold">Remove</span>
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Add/Edit Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={(open) => { setIsAddModalOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="bg-[#0e0e11] border-white/10 text-foreground sm:max-w-[520px] p-0 gap-0 outline-none w-[95vw] max-h-[90vh] overflow-y-auto custom-scrollbar">
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <div className="flex flex-col sm:flex-row justify-end items-center py-5 border-t border-white/5 mt-6 gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsAddModalOpen(false)}
                                className="h-11 text-zinc-400 hover:text-white hover:bg-white/5 px-6 rounded-xl font-medium transition-colors w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-500/20 px-8 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
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
