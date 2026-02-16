"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MapPin, Building, Calendar, Wallet, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { Client, Income } from "@/types/general";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function ClientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [client, setClient] = useState<Client | null>(null);
    const [payments, setPayments] = useState<Income[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) fetchData();
    }, [id]);

    const fetchData = async () => {
        setIsLoading(true);

        // 1. Client Details
        const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();

        if (clientError) {
            console.error("Error fetching client:", clientError);
            alert("Error fetching client details.");
            router.back();
            return;
        }
        setClient(clientData);

        // 2. Payment History (Income)
        const { data: paymentData, error: paymentError } = await supabase
            .from('income')
            .select('*, services(name)')
            .eq('client_id', id)
            .order('date', { ascending: false });

        if (paymentError) {
            console.error("Error fetching payments:", paymentError);
        } else {
            setPayments(paymentData);
        }

        setIsLoading(false);
    };

    const handleDeletePayment = async (paymentId: string) => {
        if (!confirm("Are you sure you want to delete this payment record?")) return;

        const { error } = await supabase
            .from('income')
            .delete()
            .eq('id', paymentId);

        if (error) {
            console.error("Error deleting payment:", error);
            alert("Failed to delete payment.");
        } else {
            // Update local state to remove the deleted payment
            setPayments(prev => prev.filter(p => p.id !== paymentId));
        }
    };

    if (isLoading) return <div className="p-8 text-white">Loading details...</div>;
    if (!client) return <div className="p-8 text-white">Client not found.</div>;

    const totalValue = payments
        .filter(p => p.status === 'RECEIVED' || p.status === 'PAID')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

    return (
        <div className="min-h-screen bg-transparent p-8 font-sans text-foreground">
            {/* Header */}
            <div className="flex items-center gap-4 mb-10">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-zinc-400 hover:text-white">
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-white">{client.name}</h1>
                        <Badge variant="outline" className={cn(
                            "capitalize",
                            client.status === 'Active' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" : "text-zinc-500 border-zinc-500/20"
                        )}>
                            {client.status}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                        <Building size={12} /> {client.industry}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Client Info */}
                <div className="space-y-6">
                    <Card className="bg-card border-white/5">
                        <CardHeader className="p-4 pb-0">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building size={16} className="text-orange-500" /> Contact Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 p-4 pt-2">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="text-sm text-zinc-400">Total Revenue</div>
                                    <div className="text-xl font-bold text-emerald-400">₹{totalValue.toLocaleString()}</div>
                                </div>

                                <div className="pt-2 space-y-2">
                                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                            <Mail size={14} className="text-zinc-500" />
                                        </div>
                                        {client.email || "-"}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                            <Phone size={14} className="text-zinc-500" />
                                        </div>
                                        {client.phone || "-"}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                            <MapPin size={14} className="text-zinc-500" />
                                        </div>
                                        {client.address || "-"}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                            <Calendar size={14} className="text-zinc-500" />
                                        </div>
                                        Joined {client.created_at ? format(new Date(client.created_at), "MMM d, yyyy") : "-"}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Payment History */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Wallet size={16} className="text-blue-500" /> Payment History
                        </h2>
                    </div>

                    <div className="bg-card border border-white/5 rounded-xl overflow-hidden">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="hover:bg-transparent border-white/5">
                                    <TableHead className="text-zinc-400">Date</TableHead>
                                    <TableHead className="text-zinc-400">Description</TableHead>
                                    <TableHead className="text-zinc-400">Service</TableHead>

                                    <TableHead className="text-zinc-400">Status</TableHead>
                                    <TableHead className="text-zinc-400 text-right">Amount</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map((payment) => (
                                    <TableRow key={payment.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                        <TableCell className="font-medium text-zinc-300">
                                            {format(new Date(payment.date), "MMM d, yyyy")}
                                        </TableCell>
                                        <TableCell className="text-zinc-400 max-w-[200px] truncate" title={payment.description}>
                                            {payment.description}
                                        </TableCell>
                                        <TableCell className="text-zinc-400">
                                            {payment.services?.name || "-"}
                                        </TableCell>

                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "text-[10px] h-5 px-2",
                                                payment.status === 'RECEIVED' || payment.status === 'PAID' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" :
                                                    payment.status === 'PENDING' ? "text-amber-500 border-amber-500/20 bg-amber-500/10" :
                                                        "text-zinc-500 border-zinc-500/20"
                                            )}>
                                                {payment.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-white">
                                            ₹{payment.amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
                                                onClick={() => handleDeletePayment(payment.id)}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {payments.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-zinc-500 italic">
                                            No payment history found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}
