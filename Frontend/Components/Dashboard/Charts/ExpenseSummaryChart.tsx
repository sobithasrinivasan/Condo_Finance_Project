import React from "react";

interface ExpenseSummaryItem {
    category: string;
    total_amount: number | string;
    pct: number;
}

interface ExpenseSummaryChartProps {
    data?: ExpenseSummaryItem[];
}

const COLORS = ["#3B82F6", "#6366F1", "#14B8A6", "#F59E0B", "#8B5CF6", "#EC4899"];

export default function ExpenseSummaryChart({ data = [] }: ExpenseSummaryChartProps) {
    if (!data.length) {
        return (
            <div className="flex h-40 items-center justify-center text-xs font-semibold text-slate-400">
                No expense summary data available.
            </div>
        );
    }

    const radius = 38;
    const strokeWidth = 9;
    const circumference = 2 * Math.PI * radius;
    let cumulative = 0;

    return (
        <div className="mt-4 flex items-center justify-between gap-6">
            {/* Donut Ring */}
            <div className="relative flex h-28 w-28 flex-shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#F1F5F9"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    {data.map((item, index) => {
                        const pct = Math.max(0, item.pct) / 100;
                        const segmentLength = pct * circumference;
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
                                className="transition-all duration-500"
                            />
                        );
                        cumulative += pct;
                        return circle;
                    })}
                </svg>
                <div className="absolute flex flex-col justify-center text-center text-slate-400">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-700">Expenses</span>
                    <span className="text-[8px] font-semibold text-slate-400">by category</span>
                </div>
            </div>

            {/* Category Breakdown List */}
            <div className="flex-1 space-y-2">
                {data.map((item, index) => (
                    <div key={`${item.category}-${index}`} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate max-w-[140px]">
                            <span
                                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="truncate font-medium text-slate-700" title={item.category}>
                                {item.category}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {item.total_amount !== undefined && Number(item.total_amount) > 0 && (
                                <span className="text-[11px] font-medium text-slate-400">
                                    ${Number(item.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            )}
                            <span className="font-bold text-slate-800 text-xs w-8 text-right">
                                {`${Math.round(item.pct)}%`}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
