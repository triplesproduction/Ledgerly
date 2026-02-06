"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function DebugPage() {
    const [envStatus, setEnvStatus] = useState<{ url: boolean; key: boolean } | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<"loading" | "success" | "error">("loading");
    const [connectionError, setConnectionError] = useState<string | null>(null);

    useEffect(() => {
        // 1. Check Environment Variables
        // Note: We can't see the actual values for security, but we can check if they are the placeholder
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

        const isUrlPlaceholder = url.includes("placeholder");
        const isKeyPlaceholder = key === "placeholder" || key.includes("placeholder");

        setEnvStatus({
            url: !isUrlPlaceholder && url.length > 0,
            key: !isKeyPlaceholder && key.length > 0
        });

        // 2. Test Connection
        checkConnection();
    }, []);

    const checkConnection = async () => {
        setConnectionStatus("loading");
        try {
            const { count, error } = await supabase
                .from("clients")
                .select("*", { count: "exact", head: true });

            if (error) throw error;
            setConnectionStatus("success");
        } catch (err: any) {
            setConnectionError(err.message || "Unknown error");
            setConnectionStatus("error");
        }
    };

    return (
        <div className="min-h-screen p-8 text-foreground font-sans">
            <h1 className="text-3xl font-bold mb-8">🛠️ System Diagnostics</h1>

            <div className="grid gap-6 max-w-2xl">
                {/* Environment Variables Check */}
                <Card className="bg-card border-white/10">
                    <CardHeader>
                        <CardTitle className="text-xl">Environment Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL</span>
                            {envStatus ? (
                                envStatus.url ? (
                                    <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-0 gap-1">
                                        <CheckCircle2 size={14} /> Configured
                                    </Badge>
                                ) : (
                                    <Badge variant="destructive" className="bg-red-500/20 text-red-500 hover:bg-red-500/30 border-0 gap-1">
                                        <XCircle size={14} /> Missing / Placeholder
                                    </Badge>
                                )
                            ) : <Loader2 className="animate-spin h-4 w-4 text-muted-foreground" />}
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
                            {envStatus ? (
                                envStatus.key ? (
                                    <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-0 gap-1">
                                        <CheckCircle2 size={14} /> Configured
                                    </Badge>
                                ) : (
                                    <Badge variant="destructive" className="bg-red-500/20 text-red-500 hover:bg-red-500/30 border-0 gap-1">
                                        <XCircle size={14} /> Missing / Placeholder
                                    </Badge>
                                )
                            ) : <Loader2 className="animate-spin h-4 w-4 text-muted-foreground" />}
                        </div>
                    </CardContent>
                </Card>

                {/* Connection Test */}
                <Card className="bg-card border-white/10">
                    <CardHeader>
                        <CardTitle className="text-xl">Database Connectivity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {connectionStatus === "loading" && (
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <Loader2 className="animate-spin" />
                                Testing connection to 'clients' table...
                            </div>
                        )}

                        {connectionStatus === "success" && (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 flex items-center gap-3">
                                <CheckCircle2 size={24} />
                                <div>
                                    <p className="font-bold">Connection Successful</p>
                                    <p className="text-sm opacity-90">Successfully connected to Supabase and queried the database.</p>
                                </div>
                            </div>
                        )}

                        {connectionStatus === "error" && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 flex items-start gap-3">
                                <XCircle size={24} className="mt-0.5" />
                                <div>
                                    <p className="font-bold">Connection Failed</p>
                                    <p className="text-sm opacity-90">{connectionError}</p>
                                    {connectionError?.includes("Failed to fetch") && (
                                        <p className="text-xs mt-2 p-2 bg-black/20 rounded">
                                            Tip: This usually means the URL is invalid (e.g. placeholder) or CORS is blocking the request.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
