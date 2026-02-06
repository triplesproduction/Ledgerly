"use client";

import { useEffect, useState } from "react";

interface CounterProps {
    value: number;
    duration?: number;
    prefix?: string;
    className?: string;
}

export function Counter({ value, duration = 1500, prefix = "", className }: CounterProps) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        let animationFrameId: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);

            // Easing function: easeOutExpo
            const easeValue = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);

            setCount(Math.floor(easeValue * value));

            if (progress < duration) {
                animationFrameId = requestAnimationFrame(animate);
            }
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, [value, duration]);

    return (
        <span className={className}>
            {prefix}{count.toLocaleString("en-IN")}
        </span>
    );
}
