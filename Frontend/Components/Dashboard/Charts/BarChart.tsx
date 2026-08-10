import React, { useState } from "react";

interface MonthlyIncomeExpenseItem {
    txn_month: string;
    total_income: number | string;
    total_expense: number | string;
}

interface BarChartProps {
    data?: MonthlyIncomeExpenseItem[];
}

interface HoverTooltip {
    month: string;
    type: "Income" | "Expense";
    amount: number;
    x: number;
    y: number;
}

const formatMonthLabel = (value: string) => {
    const [year, month] = value.split("-");
    const parsed = new Date(Number(year), Number(month) - 1, 1);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString("en-US", { month: "short" });
};

const formatCurrency = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatAxisValue = (value: number) => {
    if (value >= 1000) {
        return `$${Math.round(value / 1000)}k`;
    }
    return `$${Math.round(value)}`;
};

export default function BarChart({ data = [] }: BarChartProps) {
    const [tooltip, setTooltip] = useState<HoverTooltip | null>(null);

    if (!data.length) {
        return (
            <div className="flex h-48 items-center justify-center text-xs font-semibold text-slate-400">
                No monthly income/expense data available.
            </div>
        );
    }

    const chartData = data.map((item) => ({
        label: formatMonthLabel(item.txn_month),
        rawMonth: item.txn_month,
        income: Number(item.total_income || 0),
        expense: Number(item.total_expense || 0),
    }));

    const svgWidth = 320;
    const svgHeight = 170;
    const chartTop = 18;
    const chartHeight = 108;
    const chartLeft = 42;
    const chartRight = 16;
    const plotWidth = svgWidth - chartLeft - chartRight;
    const maxValue = Math.max(...chartData.flatMap((item) => [item.income, item.expense]), 1);
    const axisMax = Math.ceil(maxValue / 1000) * 1000 || 1000;
    const groupWidth = plotWidth / chartData.length;
    const barWidth = Math.min(16, groupWidth / 3);
    const gap = 6;

    return (
        <div className="relative mt-4">
            {/* Modern Floating Numerical Tooltip */}
            {tooltip && (
                <div
                    className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900/95 px-2.5 py-1.5 text-center text-white shadow-xl backdrop-blur-sm transition-all duration-150"
                    style={{
                        left: `${(tooltip.x / svgWidth) * 100}%`,
                        top: `${(tooltip.y / svgHeight) * 100}%`,
                    }}
                >
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                        {tooltip.month} • {tooltip.type}
                    </div>
                    <div className="text-xs font-bold text-white">
                        {formatCurrency(tooltip.amount)}
                    </div>
                </div>
            )}

            <svg className="h-48 w-full overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                {[0, 1, 2].map((index) => {
                    const y = chartTop + (chartHeight / 2) * index;
                    return (
                        <line
                            key={index}
                            x1={chartLeft}
                            y1={y}
                            x2={svgWidth - chartRight}
                            y2={y}
                            stroke="#E2E8F0"
                            strokeWidth="1"
                        />
                    );
                })}

                <text x="6" y={chartTop + 4} className="fill-slate-400 text-[10px] font-semibold">
                    {formatAxisValue(axisMax)}
                </text>
                <text x="10" y={chartTop + chartHeight / 2 + 4} className="fill-slate-400 text-[10px] font-semibold">
                    {formatAxisValue(axisMax / 2)}
                </text>
                <text x="20" y={chartTop + chartHeight + 4} className="fill-slate-400 text-[10px] font-semibold">
                    $0
                </text>

                {chartData.map((item, index) => {
                    const groupX = chartLeft + index * groupWidth + groupWidth / 2;
                    const incomeHeight = Math.max((item.income / axisMax) * chartHeight, 0);
                    const expenseHeight = Math.max((item.expense / axisMax) * chartHeight, 0);

                    const incomeX = groupX - barWidth - gap / 2;
                    const incomeY = chartTop + chartHeight - incomeHeight;

                    const expenseX = groupX + gap / 2;
                    const expenseY = chartTop + chartHeight - expenseHeight;

                    return (
                        <g key={`${item.label}-${index}`}>
                            {/* Income Bar */}
                            <rect
                                x={incomeX}
                                y={incomeY}
                                width={barWidth}
                                height={incomeHeight}
                                rx="3"
                                fill="#1A56DB"
                                className="cursor-pointer transition-all hover:opacity-80"
                                onMouseEnter={() =>
                                    setTooltip({
                                        month: item.label,
                                        type: "Income",
                                        amount: item.income,
                                        x: incomeX + barWidth / 2,
                                        y: incomeY - 4,
                                    })
                                }
                                onMouseLeave={() => setTooltip(null)}
                            >
                                <title>{`Income (${item.label}): ${formatCurrency(item.income)}`}</title>
                            </rect>

                            {/* Expense Bar */}
                            <rect
                                x={expenseX}
                                y={expenseY}
                                width={barWidth}
                                height={expenseHeight}
                                rx="3"
                                fill="#00BA9D"
                                className="cursor-pointer transition-all hover:opacity-80"
                                onMouseEnter={() =>
                                    setTooltip({
                                        month: item.label,
                                        type: "Expense",
                                        amount: item.expense,
                                        x: expenseX + barWidth / 2,
                                        y: expenseY - 4,
                                    })
                                }
                                onMouseLeave={() => setTooltip(null)}
                            >
                                <title>{`Expense (${item.label}): ${formatCurrency(item.expense)}`}</title>
                            </rect>

                            <text
                                x={groupX}
                                y={svgHeight - 8}
                                textAnchor="middle"
                                className="fill-slate-400 text-[10px] font-semibold"
                            >
                                {item.label}
                            </text>
                        </g>
                    );
                })}

                <line
                    x1={chartLeft}
                    y1={chartTop + chartHeight}
                    x2={svgWidth - chartRight}
                    y2={chartTop + chartHeight}
                    stroke="#CBD5E1"
                    strokeWidth="1"
                />
            </svg>
        </div>
    );
}
