"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export function useInactivityLogout() {
    const router = useRouter();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Function to handle the actual logout
        const handleLogout = async () => {
            console.log("User inactive for 2 minutes. Logging out automatically.");

            try {
                // Clear Supabase session
                await supabase.auth.signOut();

                // Redirect to login page
                router.push("/login");
            } catch (error) {
                console.error("Logout failed:", error);
            }
        };

        // Function to reset the inactivity timer
        const resetTimer = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT_MS);
        };

        // Events that indicate user activity
        const activityEvents = [
            "mousemove",
            "mousedown",
            "keypress",
            "touchstart",
            "scroll",
            "click"
        ];

        // Initial timer start
        resetTimer();

        // Attach event listeners to reset timer on activity
        activityEvents.forEach((event) => {
            window.addEventListener(event, resetTimer);
        });

        // Cleanup function
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            activityEvents.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [router]);
}
