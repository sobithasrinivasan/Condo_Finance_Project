import React from "react";

interface DoughnutChartProps {
    collected?: number | string;
    pending?: number | string;
    collectionPct?: number;
}

const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function DoughnutChart({
    collected = 0,
    pending = 0,
    collectionPct = 0,
}: DoughnutChartProps) {
    const radius = 40;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    const safePct = Math.max(0, Math.min(collectionPct, 100));
    const strokeDashoffset = circumference - (safePct / 100) * circumference;
    const collectedValue = Number(collected || 0);
    const pendingValue = Number(pending || 0);

    return (
        <div className="mt-4 flex items-center gap-6">
            <div className="relative flex h-28 w-28 flex-shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        className="stroke-slate-100"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        className="stroke-[#1A56DB]"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={0}
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        className="stroke-[#00BA9D] transition-all duration-500"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute text-center">
                    <span className="font-sans text-xl font-bold text-slate-800">
                        {Math.round(safePct)}%
                    </span>
                </div>
            </div>

            <div className="flex-1 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#00BA9D]" />
                    <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Collected</p>
                        <p className="text-sm font-bold text-slate-800">{formatCurrency(collectedValue)}</p>
                    </div>
                </div>
                <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#1A56DB]" />
                    <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Pending</p>
                        <p className="text-sm font-bold text-slate-800">{formatCurrency(pendingValue)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
