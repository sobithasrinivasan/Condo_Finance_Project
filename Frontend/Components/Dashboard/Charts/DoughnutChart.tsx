import React from "react";

interface DoughnutChartProps {
    collected?: number | string;
    pending?: number | string;
    collectionPct?: number;
}

const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DoughnutChart({
    collected = 0,
    pending = 0,
    collectionPct = 0,
}: DoughnutChartProps) {
    const radius = 38;
    const strokeWidth = 9;
    const circumference = 2 * Math.PI * radius;
    const safePct = Math.max(0, Math.min(Number(collectionPct || 0), 100));
    const strokeDashoffset = circumference - (safePct / 100) * circumference;
    const collectedValue = Number(collected || 0);
    const pendingValue = Number(pending || 0);
    const totalExpected = collectedValue + pendingValue;

    return (
        <div className="mt-4 flex items-center justify-between gap-6">
            {/* Progress Donut */}
            <div className="relative flex h-28 w-28 flex-shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                    {/* Neutral Clean Background Track */}
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        className="stroke-slate-100"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />

                    {/* Active Progress Fill */}
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        className="stroke-blue-600 transition-all duration-1000 ease-out"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                    />
                </svg>

                <div className="absolute text-center flex flex-col items-center">
                    <span className="font-sans text-xl font-bold tracking-tight text-slate-800">
                        {Math.round(safePct)}%
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                        Collected
                    </span>
                </div>
            </div>

            {/* Clean Minimalist Legend */}
            <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                        <span className="text-xs font-medium text-slate-600">Collected Dues</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                        {formatCurrency(collectedValue)}
                    </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                        <span className="text-xs font-medium text-slate-500">Pending Dues</span>
                    </div>
                    <span className="text-xs font-bold text-slate-600">
                        {formatCurrency(pendingValue)}
                    </span>
                </div>

                {totalExpected > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-0.5">
                        <span>Total Expected</span>
                        <span className="font-semibold text-slate-600">{formatCurrency(totalExpected)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
