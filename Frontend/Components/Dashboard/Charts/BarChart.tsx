import React, { useState } from "react";

interface MonthlyIncomeExpenseItem {
    txn_month: string;
    total_income: number | string;
    total_expense: number | string;
}

interface BarChartProps {
    data?: MonthlyIncomeExpenseItem[];
}

const formatMonthLabel = (value: string) => {
    const [year, month] = value.split("-");
    const parsed = new Date(Number(year), Number(month) - 1, 1);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleDateString("en-US", { month: "short" });
};

const formatAxisValue = (value: number) => {
    if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${Math.round(value)}`;
};

const formatBarAmount = (amount: number) => {
    if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${Math.round(amount)}`;
};

export default function BarChart({ data = [] }: BarChartProps) {
    const [hoveredItem, setHoveredItem] = useState<{
        month: string;
        income: number;
        expense: number;
        x: number;
        y: number;
    } | null>(null);

    if (!data.length) {
        return (
            <div className="flex h-52 items-center justify-center text-xs font-semibold text-slate-400">
                No monthly income/expense data available.
            </div>
        );
    }

    const chartData = data.map((item) => ({
        monthKey: item.txn_month,
        label: formatMonthLabel(item.txn_month),
        income: Number(item.total_income || 0),
        expense: Number(item.total_expense || 0),
    }));

    const svgWidth = 440;
    const svgHeight = 205;
    const chartTop = 24;
    const chartHeight = 112;
    const chartLeft = 38;
    const chartRight = 14;
    const plotWidth = svgWidth - chartLeft - chartRight;
    const maxValue = Math.max(...chartData.flatMap((item) => [item.income, item.expense]), 100);
    const axisMax = Math.ceil(maxValue / 1000) * 1000 || 1000;
    const groupWidth = plotWidth / chartData.length;
    const barWidth = 9.5;
    const gap = 3.5;

    return (
        <div className="mt-3 relative">
            {hoveredItem && (
                <div
                    className="absolute z-20 pointer-events-none bg-slate-900 text-white rounded-lg shadow-xl px-2.5 py-1.5 text-[10px] transform -translate-x-1/2 -translate-y-full transition-all"
                    style={{ left: `${(hoveredItem.x / svgWidth) * 100}%`, top: `${(hoveredItem.y / svgHeight) * 100}%` }}
                >
                    <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-300">
                        {hoveredItem.month}
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <span>Income:</span>
                        <span>${hoveredItem.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-rose-400 font-semibold">
                        <span>Expense:</span>
                        <span>${hoveredItem.expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            )}

            <svg className="h-52 w-full" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                <defs>
                    <linearGradient id="incomeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#F43F5E" />
                        <stop offset="100%" stopColor="#E11D48" />
                    </linearGradient>
                </defs>

                {[0, 1, 2].map((index) => {
                    const y = chartTop + (chartHeight / 2) * index;
                    return (
                        <line
                            key={index}
                            x1={chartLeft}
                            y1={y}
                            x2={svgWidth - chartRight}
                            y2={y}
                            stroke="#F1F5F9"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                        />
                    );
                })}

                <text x="4" y={chartTop + 4} className="fill-slate-400 text-[9px] font-bold">
                    {formatAxisValue(axisMax)}
                </text>
                <text x="6" y={chartTop + chartHeight / 2 + 4} className="fill-slate-400 text-[9px] font-bold">
                    {formatAxisValue(axisMax / 2)}
                </text>
                <text x="14" y={chartTop + chartHeight + 4} className="fill-slate-400 text-[9px] font-bold">
                    $0
                </text>

                {chartData.map((item, index) => {
                    const groupX = chartLeft + index * groupWidth + groupWidth / 2;
                    const incomeHeight = Math.max((item.income / axisMax) * chartHeight, 0);
                    const expenseHeight = Math.max((item.expense / axisMax) * chartHeight, 0);
                    const labelY = chartTop + chartHeight + 10;

                    return (
                        <g
                            key={`${item.label}-${index}`}
                            className="group cursor-pointer"
                            onMouseEnter={() =>
                                setHoveredItem({
                                    month: item.label,
                                    income: item.income,
                                    expense: item.expense,
                                    x: groupX,
                                    y: chartTop + chartHeight - Math.max(incomeHeight, expenseHeight) - 8,
                                })
                            }
                            onMouseLeave={() => setHoveredItem(null)}
                        >
                            {/* Hitbox */}
                            <rect
                                x={groupX - groupWidth / 2}
                                y={chartTop}
                                width={groupWidth}
                                height={chartHeight}
                                fill="transparent"
                            />

                            {/* Income Bar (Green) */}
                            <rect
                                x={groupX - barWidth - gap / 2}
                                y={chartTop + chartHeight - incomeHeight}
                                width={barWidth}
                                height={incomeHeight}
                                rx="3"
                                fill="url(#incomeGrad)"
                                className="transition-all duration-300 group-hover:opacity-85"
                            />

                            {/* Expense Bar (Red) */}
                            <rect
                                x={groupX + gap / 2}
                                y={chartTop + chartHeight - expenseHeight}
                                width={barWidth}
                                height={expenseHeight}
                                rx="3"
                                fill="url(#expenseGrad)"
                                className="transition-all duration-300 group-hover:opacity-85"
                            />

                            {/* Formatted Top Amounts without overlap */}
                            {item.income > 0 && (
                                <text
                                    x={groupX - barWidth / 2 - gap / 2}
                                    y={chartTop + chartHeight - incomeHeight - 3}
                                    textAnchor="middle"
                                    className="fill-emerald-600 text-[7.5px] font-extrabold"
                                >
                                    {formatBarAmount(item.income)}
                                </text>
                            )}
                            {item.expense > 0 && (
                                <text
                                    x={groupX + barWidth / 2 + gap / 2}
                                    y={chartTop + chartHeight - expenseHeight - 3}
                                    textAnchor="middle"
                                    className="fill-rose-500 text-[7.5px] font-extrabold"
                                >
                                    {formatBarAmount(item.expense)}
                                </text>
                            )}

                            {/* Diagonal Rotated Month Labels */}
                            <text
                                x={groupX}
                                y={labelY}
                                textAnchor="end"
                                transform={`rotate(-40 ${groupX} ${labelY})`}
                                className="fill-slate-500 text-[8.5px] font-bold group-hover:fill-slate-900 transition-colors"
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
                    stroke="#E2E8F0"
                    strokeWidth="1.5"
                />
            </svg>
        </div>
    );
}
