import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { subDays, addDays, format, startOfDay, endOfDay, eachDayOfInterval, isSameDay } from "date-fns";
import { supabase } from "@/lib/supabase";

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#121214] border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                <p className="text-zinc-500 text-[10px] mb-1 uppercase tracking-wider font-bold">{label}</p>
                <div className="space-y-1">
                    <p className="text-white text-xs font-bold">
                        Expected In: <span className="text-orange-500">₹{payload[0].value.toLocaleString()}</span>
                    </p>
                    <p className="text-zinc-400 text-xs font-bold">
                        Expected Out: <span>₹{payload[1].value.toLocaleString()}</span>
                    </p>
                    <div className="h-px bg-white/5 my-1" />
                    <p className="underline underline-offset-4 text-[10px] text-zinc-500/80 font-medium">Forward Ledger Based</p>
                </div>
            </div>
        );
    }
    return null;
};

export function RevenueAreaChart({ range = "30" }: { range?: string }) {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const days = parseInt(range);
            const today = new Date();
            const horizon = addDays(today, days);

            const startStr = format(startOfDay(today), 'yyyy-MM-dd');
            const endStr = format(horizon, 'yyyy-MM-dd');

            try {
                // 1. Fetch Future Ledger Items
                // We fetch things dated today or in the future that aren't finalized yet OR are scheduled
                const { data: income } = await supabase
                    .from('income')
                    .select('amount, date, status')
                    .gte('date', startStr)
                    .lte('date', endStr)
                    .neq('status', 'RECEIVED'); // Forecast only Pending/Expected

                const { data: expenses } = await supabase
                    .from('expenses')
                    .select('amount, date, status')
                    .gte('date', startStr)
                    .lte('date', endStr)
                    .neq('status', 'PAID'); // Forecast only Unpaid/Scheduled

                // 2. Create exactly 10 data points by dividing the range into 10 intervals
                const NUM_POINTS = 10;
                const intervalDays = Math.ceil(days / NUM_POINTS);
                const chartData = [];

                for (let i = 0; i < NUM_POINTS; i++) {
                    const intervalStart = addDays(today, i * intervalDays);
                    const intervalEnd = addDays(today, Math.min((i + 1) * intervalDays, days));

                    // Create a label for this interval
                    const label = i === 0 ? 'Today' :
                        i === NUM_POINTS - 1 ? format(intervalEnd, 'MMM dd') :
                            format(intervalStart, 'MMM dd');

                    // Sum income and expenses that fall within this interval
                    const intervalIncome = (income || [])
                        .filter(item => {
                            const itemDate = new Date(item.date);
                            return itemDate >= intervalStart && itemDate <= intervalEnd;
                        })
                        .reduce((sum, item) => sum + Number(item.amount), 0);

                    const intervalExpense = (expenses || [])
                        .filter(item => {
                            const itemDate = new Date(item.date);
                            return itemDate >= intervalStart && itemDate <= intervalEnd;
                        })
                        .reduce((sum, item) => sum + Number(item.amount), 0);

                    chartData.push({
                        name: label,
                        income: intervalIncome,
                        expense: intervalExpense,
                    });
                }

                setData(chartData);
            } catch (err) {
                // Forecast fetch error - silently fail in production
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        // Subscription for real-time updates
        const channel = supabase.channel('forecast-sync')
            .on('postgres_changes', { event: '*', schema: 'public' }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [range]);

    if (isLoading) return (
        <div className="h-full w-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <div className="h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">Syncing Ledger...</span>
            </div>
        </div>
    );

    return (
        <div className="h-full w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 30, bottom: 35 }}
                >
                    <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#52525b" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#52525b" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} opacity={0.5} />
                    <XAxis
                        dataKey="name"
                        stroke="#444"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#a1a1aa' }}
                        dy={10}
                    />
                    <YAxis
                        hide
                        domain={[0, 'auto']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="income"
                        stroke="#f97316"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorIncome)"
                        animationDuration={1500}
                    />
                    <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#3f3f46"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorExpense)"
                        animationDuration={2000}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
