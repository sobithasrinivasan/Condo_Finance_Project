import React, { useState } from "react";

interface DoughnutChartProps {
    collected?: number | string;
    pending?: number | string;
    collectionPct?: number;
}

const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DoughnutChart({
    collected = 0,
    pending = 0,
    collectionPct = 0,
}: DoughnutChartProps) {
    const [activeHover, setActiveHover] = useState<{ label: string; amount: number; pct: number } | null>(null);

    const radius = 40;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    const safePct = Math.max(0, Math.min(collectionPct, 100));
    const strokeDashoffset = circumference - (safePct / 100) * circumference;
    const collectedValue = Number(collected || 0);
    const pendingValue = Number(pending || 0);
    const totalValue = collectedValue + pendingValue;
    const pendingPct = totalValue > 0 ? round((pendingValue / totalValue) * 100) : 100 - safePct;

    function round(num: number) {
        return Math.round(num);
    }

    return (
        <div className="relative mt-4 flex items-center gap-6">
            <div className="relative flex h-28 w-28 flex-shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform cursor-pointer overflow-visible" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        className="stroke-slate-100"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    {/* Pending Arc (Blue) */}
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        className="stroke-[#1A56DB] transition-all hover:stroke-blue-700"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={0}
                        onMouseEnter={() =>
                            setActiveHover({
                                label: "Pending",
                                amount: pendingValue,
                                pct: pendingPct,
                            })
                        }
                        onMouseLeave={() => setActiveHover(null)}
                    >
                        <title>{`Pending: ${formatCurrency(pendingValue)}`}</title>
                    </circle>

                    {/* Collected Arc (Teal) */}
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        className="stroke-[#00BA9D] transition-all duration-500 hover:stroke-teal-600"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        onMouseEnter={() =>
                            setActiveHover({
                                label: "Collected",
                                amount: collectedValue,
                                pct: round(safePct),
                            })
                        }
                        onMouseLeave={() => setActiveHover(null)}
                    >
                        <title>{`Collected: ${formatCurrency(collectedValue)}`}</title>
                    </circle>
                </svg>

                <div className="pointer-events-none absolute text-center">
                    {activeHover ? (
                        <div className="animate-fade-in">
                            <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                {activeHover.label}
                            </span>
                            <span className="block text-xs font-bold text-slate-900">
                                {formatCurrency(activeHover.amount)}
                            </span>
                        </div>
                    ) : (
                        <div>
                            <span className="font-sans text-xl font-bold text-slate-800">
                                {Math.round(safePct)}%
                            </span>
                            <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                Collected
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 space-y-2 text-xs">
                <div
                    className="flex cursor-pointer items-start gap-2 rounded-lg p-1 transition-all hover:bg-slate-50"
                    onMouseEnter={() =>
                        setActiveHover({
                            label: "Collected",
                            amount: collectedValue,
                            pct: round(safePct),
                        })
                    }
                    onMouseLeave={() => setActiveHover(null)}
                >
                    <span className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#00BA9D]" />
                    <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Collected</p>
                        <p className="text-sm font-bold text-slate-800">{formatCurrency(collectedValue)}</p>
                    </div>
                </div>

                <div
                    className="flex cursor-pointer items-start gap-2 rounded-lg p-1 transition-all hover:bg-slate-50"
                    onMouseEnter={() =>
                        setActiveHover({
                            label: "Pending",
                            amount: pendingValue,
                            pct: pendingPct,
                        })
                    }
                    onMouseLeave={() => setActiveHover(null)}
                >
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
