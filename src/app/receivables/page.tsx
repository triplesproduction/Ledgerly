"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format, differenceInDays, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Clock, PauseCircle, CheckCircle, Calendar, StickyNote } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function ReceivablesPage() {
    const [activeTab, setActiveTab] = useState("overdue");
    const [isLoading, setIsLoading] = useState(true);
    const [overdueItems, setOverdueItems] = useState<any[]>([]);
    const [onHoldItems, setOnHoldItems] = useState<any[]>([]);

    // Modals
    const [snoozeItem, setSnoozeItem] = useState<any | null>(null);
    const [holdItem, setHoldItem] = useState<any | null>(null);
    const [resolveItem, setResolveItem] = useState<any | null>(null);

    // Form States
    const [snoozeDate, setSnoozeDate] = useState<Date | undefined>(undefined);
    const [holdForm, setHoldForm] = useState({ reason: "", note: "", with: "client" });
    const [resolveAction, setResolveAction] = useState<"received" | "new_date">("received");
    const [resolveDate, setResolveDate] = useState<Date | undefined>(undefined);

    const GRACE_PERIOD_DAYS = 7;

    const fetchData = async () => {
        setIsLoading(true);
        const today = new Date();
        const graceLimit = new Date();
        graceLimit.setDate(today.getDate() - GRACE_PERIOD_DAYS);
        // We filter in memory to handle the fallback to 'date' correctly

        // Fetch Potential Overdue (Not Received, Not Archived, Not On Hold)
        let { data: pending, error: pendingError } = await supabase
            .from('income')
            .select('*, clients(name), services(name)')
            .neq('status', 'RECEIVED')
            .neq('status', 'ARCHIVED')
            .is('is_on_hold', false)
            .order('date', { ascending: true }); // Order by original date

        if (pending) {
            // Filter: (expected_date OR date) < graceLimit
            const overdue = pending.filter(item => {
                const targetDateStr = item.expected_date || item.date;
                const targetDate = new Date(targetDateStr);
                return targetDate < graceLimit;
            });
            setOverdueItems(overdue);
        }

        // Fetch On Hold
        const { data: held, error: heldError } = await supabase
            .from('income')
            .select('*, clients(name), services(name)')
            .eq('is_on_hold', true)
            .order('hold_start_date', { ascending: false });

        if (held) setOnHoldItems(held);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Actions
    const handleMarkReceived = async (id: string) => {
        if (!confirm("Mark this payment as RECEIVED? This will create a new Income entry for today.")) return;

        // 1. Fetch original item details
        const { data: original, error: fetchError } = await supabase
            .from('income')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !original) {
            alert("Error fetching item details: " + (fetchError?.message || "Item not found"));
            return;
        }

        // 2. Create NEW Income Entry (Realized Cash)
        const { error: insertError } = await supabase.from('income').insert({
            amount: original.amount,
            description: original.description,
            category: original.category,
            client_id: original.client_id,
            service_id: original.service_id,
            payment_method: original.payment_method,
            recurring_rule_id: original.recurring_rule_id, // Maintain link if needed, or null if independent
            is_recurring: false, // New entry is a one-off realization
            date: format(new Date(), 'yyyy-MM-dd'), // TODAY
            status: 'RECEIVED'
        });

        if (insertError) {
            alert("Error creating new income entry: " + insertError.message);
            return;
        }

        // 3. Archive OLD Item (History)
        const { error: archiveError } = await supabase
            .from('income')
            .update({
                status: 'ARCHIVED',
                description: original.description ? `${original.description} (Converted)` : '(Converted)'
            })
            .eq('id', id);

        if (archiveError) {
            alert("Error archiving old item: " + archiveError.message);
        } else {
            fetchData();
        }
    };

    const handleSnooze = async () => {
        if (!snoozeItem || !snoozeDate) return;
        const { error } = await supabase
            .from('income')
            .update({ expected_date: format(snoozeDate, 'yyyy-MM-dd') })
            .eq('id', snoozeItem.id);

        if (error) alert(error.message);
        else {
            setSnoozeItem(null);
            fetchData();
        }
    };

    const handleHold = async () => {
        if (!holdItem) return;
        const { error } = await supabase
            .from('income')
            .update({
                is_on_hold: true,
                hold_reason: holdForm.reason,
                hold_note: holdForm.note,
                hold_with: holdForm.with,
                hold_start_date: new Date().toISOString()
            })
            .eq('id', holdItem.id);

        if (error) alert(error.message);
        else {
            setHoldItem(null);
            fetchData();
        }
    };

    const handleResolve = async () => {
        if (!resolveItem) return;

        if (resolveAction === 'received') {
            // New Logic: Insert NEW + Archive OLD
            const { error: insertError } = await supabase.from('income').insert({
                amount: resolveItem.amount,
                description: resolveItem.description,
                category: resolveItem.category,
                client_id: resolveItem.client_id,
                service_id: resolveItem.service_id,
                payment_method: resolveItem.payment_method,
                date: format(new Date(), 'yyyy-MM-dd'), // TODAY
                status: 'RECEIVED'
            });

            if (insertError) {
                alert("Error creating new income entry: " + insertError.message);
                return;
            }

            const { error: archiveError } = await supabase
                .from('income')
                .update({
                    status: 'ARCHIVED',
                    is_on_hold: false,
                    hold_reason: null,
                    hold_note: null,
                    hold_start_date: null,
                    hold_with: null
                })
                .eq('id', resolveItem.id);

            if (archiveError) alert(archiveError.message);
            else {
                setResolveItem(null);
                fetchData();
            }

        } else if (resolveAction === 'new_date' && resolveDate) {
            // Standard Update for Rescheduling
            const { error } = await supabase
                .from('income')
                .update({
                    expected_date: resolveDate.toISOString(),
                    is_on_hold: false,
                    hold_reason: null,
                    hold_note: null,
                    hold_start_date: null,
                    hold_with: null
                })
                .eq('id', resolveItem.id);

            if (error) alert(error.message);
            else {
                setResolveItem(null);
                fetchData();
            }
        }
    };

    return (
        <div className="min-h-screen bg-transparent text-foreground p-8 font-sans">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Receivables</h1>
            <p className="text-muted-foreground mb-8">Manage overdue payments and paused collections.</p>

            <Tabs defaultValue="overdue" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl mb-6">
                    <TabsTrigger value="overdue" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-red-500/10 data-[state=active]:text-red-500 font-medium transition-all">
                        <AlertCircle size={16} className="mr-2" />
                        Overdue ({overdueItems.length})
                    </TabsTrigger>
                    <TabsTrigger value="on_hold" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500 font-medium transition-all">
                        <PauseCircle size={16} className="mr-2" />
                        On Hold ({onHoldItems.length})
                    </TabsTrigger>
                </TabsList>

                {/* OVERDUE CONTENT */}
                <TabsContent value="overdue" className="mt-0">
                    <div className="rounded-2xl border border-white/5 bg-card overflow-hidden shadow-2xl">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-white/5">
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-6">Client / Project</TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Expected Date</TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Overdue By</TableHead>
                                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-[240px] pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell></TableRow>
                                ) : overdueItems.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No overdue payments! 🎉</TableCell></TableRow>
                                ) : (
                                    overdueItems.map(item => {
                                        const daysOverdue = differenceInDays(new Date(), new Date(item.expected_date || item.date));
                                        return (
                                            <TableRow key={item.id} className="border-white/5 hover:bg-white/5 group">
                                                <TableCell className="pl-6">
                                                    <div className="font-semibold text-foreground">{item.clients?.name || item.client}</div>
                                                    <div className="text-xs text-muted-foreground">{item.services?.name || item.category}</div>
                                                </TableCell>
                                                <TableCell className="text-zinc-400 font-medium">
                                                    {format(new Date(item.expected_date || item.date), "MMM dd, yyyy")}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 font-bold">
                                                        {daysOverdue} Days
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-bold font-mono">
                                                    ₹{item.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleMarkReceived(item.id)} title="Mark Paid">
                                                            <CheckCircle size={16} />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10" onClick={() => { setSnoozeItem(item); setSnoozeDate(addDays(new Date(), 7)); }} title="Snooze">
                                                            <Clock size={16} />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10" onClick={() => setHoldItem(item)} title="Put on Hold">
                                                            <PauseCircle size={16} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                {/* ON HOLD CONTENT */}
                <TabsContent value="on_hold" className="mt-0">
                    <div className="rounded-2xl border border-white/5 bg-card overflow-hidden shadow-2xl">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-white/5">
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-6">Client / Details</TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason</TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hold Since</TableHead>
                                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-[150px] pr-6">Resolve</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell></TableRow>
                                ) : onHoldItems.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No payments on hold.</TableCell></TableRow>
                                ) : (
                                    onHoldItems.map(item => (
                                        <TableRow key={item.id} className="border-white/5 hover:bg-white/5">
                                            <TableCell className="pl-6">
                                                <div className="font-semibold text-foreground">{item.clients?.name || item.client}</div>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="text-xs text-muted-foreground truncate max-w-[150px] cursor-help">
                                                            {item.hold_note || "No notes"}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-[400px]">
                                                        <p className="text-sm break-words whitespace-pre-wrap">{item.hold_note || "No notes provided"}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="font-medium text-foreground truncate max-w-[200px] cursor-help">
                                                                {item.hold_reason}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-[400px]">
                                                            <p className="text-sm break-words whitespace-pre-wrap">{item.hold_reason}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    <Badge variant="secondary" className="w-fit text-[10px] bg-white/5 text-zinc-400 border border-white/10 uppercase tracking-wider">
                                                        With: {item.hold_with}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-zinc-500 text-sm">
                                                {item.hold_start_date && format(new Date(item.hold_start_date), "MMM dd, yyyy")}
                                            </TableCell>
                                            <TableCell className="text-right font-bold font-mono">
                                                ₹{item.amount.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button size="sm" variant="outline" className="h-8 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400" onClick={() => setResolveItem(item)}>
                                                    Resolve
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>

            {/* SNOOZE MODAL */}
            <Dialog open={!!snoozeItem} onOpenChange={(open) => !open && setSnoozeItem(null)}>
                <DialogContent className="bg-card border-white/10 text-foreground">
                    <DialogHeader>
                        <DialogTitle>Snooze Payment</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label className="mb-2 block">New Expected Date</Label>
                        <DatePicker date={snoozeDate} setDate={setSnoozeDate} className="w-full bg-white/5 border-white/10 text-white" />
                        <p className="text-xs text-muted-foreground mt-2">
                            This will move the payment out of "Overdue" until the new date (+ grace period).
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSnoozeItem(null)}>Cancel</Button>
                        <Button onClick={handleSnooze} className="bg-white text-black hover:bg-zinc-200">Confirm Snooze</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* HOLD MODAL */}
            <Dialog open={!!holdItem} onOpenChange={(open) => !open && setHoldItem(null)}>
                <DialogContent className="bg-card border-white/10 text-foreground">
                    <DialogHeader>
                        <DialogTitle>Put Payment on Hold</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Hold With</Label>
                            <Select value={holdForm.with} onValueChange={(val) => setHoldForm({ ...holdForm, with: val })}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="client">Client Side (They are delaying)</SelectItem>
                                    <SelectItem value="internal">Internal (We are delayed)</SelectItem>
                                    <SelectItem value="project">Project Paused</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Reason</Label>
                            <Input
                                placeholder="E.g. Waiting for approval..."
                                className="bg-white/5 border-white/10"
                                value={holdForm.reason}
                                onChange={(e) => setHoldForm({ ...holdForm, reason: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Internal Notes</Label>
                            <Textarea
                                placeholder="Any context needed for follow-up..."
                                className="bg-white/5 border-white/10"
                                value={holdForm.note}
                                onChange={(e: any) => setHoldForm({ ...holdForm, note: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setHoldItem(null)}>Cancel</Button>
                        <Button onClick={handleHold} className="bg-amber-500 hover:bg-amber-600 text-white border-0">Confirm Hold</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* RESOLVE HOLD MODAL */}
            <Dialog open={!!resolveItem} onOpenChange={(open) => !open && setResolveItem(null)}>
                <DialogContent className="bg-card border-white/10 text-foreground">
                    <DialogHeader>
                        <DialogTitle>Resolve Hold</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Payment Details</Label>
                            <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/10 mb-2">
                                <div className="text-sm font-semibold text-amber-500">{resolveItem?.clients?.name || resolveItem?.client || "Unknown Client"}</div>
                                <div className="text-xs text-muted-foreground">{resolveItem?.hold_reason || "No specific reason provided"}</div>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Resolution Action</Label>
                            <Select value={resolveAction} onValueChange={(val: any) => setResolveAction(val)}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="received">Payment Received (Close functionality)</SelectItem>
                                    <SelectItem value="new_date">Resume Collection (Set new date)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {resolveAction === 'new_date' && (
                            <div className="grid gap-2">
                                <Label>New Expected Date</Label>
                                <DatePicker date={resolveDate} setDate={setResolveDate} className="w-full bg-white/5 border-white/10 text-white" />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setResolveItem(null)}>Cancel</Button>
                        <Button onClick={handleResolve} className="bg-emerald-500 hover:bg-emerald-600 text-white">Resolve Payment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
