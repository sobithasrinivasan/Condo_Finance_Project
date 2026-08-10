import React, { useState } from "react";

interface ExpenseSummaryItem {
    category: string;
    total_amount: number | string;
    pct: number;
}

interface ExpenseSummaryChartProps {
    data?: ExpenseSummaryItem[];
}

const COLORS = ["#1A56DB", "#E28743", "#38BDF8", "#34D399", "#FBBF24", "#A78BFA"];

const formatCurrency = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ExpenseSummaryChart({ data = [] }: ExpenseSummaryChartProps) {
    const [hoveredCategory, setHoveredCategory] = useState<{ category: string; amount: number; pct: number } | null>(null);

    if (!data.length) {
        return (
            <div className="flex h-40 items-center justify-center text-xs font-semibold text-slate-400">
                No expense summary data available.
            </div>
        );
    }

    const radius = 40;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    let cumulative = 0;

    return (
        <div className="relative mt-4 flex items-center gap-6">
            <div className="relative flex h-28 w-28 flex-shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform cursor-pointer overflow-visible" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#E2E8F0"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    {data.map((item, index) => {
                        const pct = Math.max(0, item.pct) / 100;
                        const segmentLength = pct * circumference;
                        const amt = Number(item.total_amount || 0);

                        const circle = (
                            <circle
                                key={`${item.category}-${index}`}
                                cx="50"
                                cy="50"
                                r={radius}
                                stroke={COLORS[index % COLORS.length]}
                                strokeWidth={strokeWidth}
                                fill="transparent"
                                strokeDasharray={`${segmentLength} ${circumference}`}
                                strokeDashoffset={-cumulative * circumference}
                                strokeLinecap="butt"
                                className="transition-all hover:stroke-width-[12px]"
                                onMouseEnter={() =>
                                    setHoveredCategory({
                                        category: item.category,
                                        amount: amt,
                                        pct: item.pct,
                                    })
                                }
                                onMouseLeave={() => setHoveredCategory(null)}
                            >
                                <title>{`${item.category}: ${formatCurrency(amt)} (${Math.round(item.pct)}%)`}</title>
                            </circle>
                        );
                        cumulative += pct;
                        return circle;
                    })}
                </svg>
                <div className="pointer-events-none absolute flex flex-col justify-center text-center">
                    {hoveredCategory ? (
                        <div className="animate-fade-in px-1">
                            <span className="block truncate text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                {hoveredCategory.category}
                            </span>
                            <span className="block text-[10px] font-bold text-slate-900">
                                {formatCurrency(hoveredCategory.amount)}
                            </span>
                        </div>
                    ) : (
                        <div className="text-slate-400">
                            <span className="text-[8px] font-bold uppercase tracking-wider leading-none">Total</span>
                            <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider leading-none">Expense</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 space-y-1.5 text-xs max-h-36 overflow-y-auto pr-1">
                {data.map((item, index) => {
                    const amt = Number(item.total_amount || 0);
                    return (
                        <div
                            key={`${item.category}-${index}`}
                            className="flex cursor-pointer items-center justify-between text-slate-500 rounded p-1 transition-colors hover:bg-slate-50"
                            onMouseEnter={() =>
                                setHoveredCategory({
                                    category: item.category,
                                    amount: amt,
                                    pct: item.pct,
                                })
                            }
                            onMouseLeave={() => setHoveredCategory(null)}
                        >
                            <span className="flex truncate items-center gap-1.5 max-w-[110px]" title={item.category}>
                                <span
                                    className="h-2 w-2 flex-shrink-0 rounded-full"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="truncate">{item.category}</span>
                            </span>
                            <span className="ml-2 font-bold text-slate-800 text-[11px]">
                                {formatCurrency(amt)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
