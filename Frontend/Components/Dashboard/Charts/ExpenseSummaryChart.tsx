import React from "react";

interface ExpenseSummaryItem {
    category: string;
    total_amount: number | string;
    pct: number;
}

interface ExpenseSummaryChartProps {
    data?: ExpenseSummaryItem[];
}

const COLORS = ["#1A56DB", "#E28743", "#38BDF8", "#34D399", "#FBBF24", "#A78BFA"];

export default function ExpenseSummaryChart({ data = [] }: ExpenseSummaryChartProps) {
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
        <div className="mt-4 flex items-center gap-6">
            <div className="relative flex h-28 w-28 flex-shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
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
                            />
                        );
                        cumulative += pct;
                        return circle;
                    })}
                </svg>
                <div className="absolute flex flex-col justify-center text-center text-slate-400">
                    <span className="text-[8px] font-bold uppercase tracking-wider leading-none">Total</span>
                    <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider leading-none">Expense</span>
                </div>
            </div>

            <div className="flex-1 space-y-1.5 text-xs">
                {data.map((item, index) => (
                    <div key={`${item.category}-${index}`} className="flex items-center justify-between text-slate-500">
                        <span className="flex truncate items-center gap-1.5">
                            <span
                                className="h-2 w-2 flex-shrink-0 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            {item.category}
                        </span>
                        <span className="ml-2 font-bold text-slate-800">
                            {`${Math.round(item.pct)}%`}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
