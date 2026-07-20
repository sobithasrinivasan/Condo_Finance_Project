import React from 'react'

export default function BarChart() {
    const data = [
        { label: "1st", income: 75, expense: 45 },
        { label: "2nd", income: 50, expense: 30 },
        { label: "3rd", income: 40, expense: 55 },
        { label: "4th", income: 65, expense: 35 },
        { label: "5th", income: 45, expense: 20 },
    ];
    return (
        <div className="w-full h-48 flex items-end justify-between relative mt-4">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pt-2">
                <div className="w-full border-t border-slate-100" />
                <div className="w-full border-t border-slate-100" />
                <div className="w-full border-t border-slate-100" />
            </div>

            <svg className="w-full h-full relative z-10" viewBox="0 0 300 150">
                <text x="5" y="24" className="text-[10px] fill-slate-400 font-semibold font-sans">$10k</text>
                <text x="8" y="74" className="text-[10px] fill-slate-400 font-semibold font-sans">$5k</text>
                <text x="15" y="124" className="text-[10px] fill-slate-400 font-semibold font-sans">$0</text>

                {data.map((item, index) => {
                    const xGroup = 52 + index * 52;
                    const incomeHeight = item.income;
                    const expenseHeight = item.expense;
                    return (
                        <g key={index}>
                            <rect
                                x={xGroup}
                                y={120 - incomeHeight}
                                width="12"
                                height={incomeHeight}
                                rx="2"
                                className="fill-[#1A56DB] hover:fill-[#1448C4] transition-colors duration-200"
                            />
                            <rect
                                x={xGroup + 16}
                                y={120 - expenseHeight}
                                width="12"
                                height={expenseHeight}
                                rx="2"
                                className="fill-[#00BA9D] hover:fill-[#009C83] transition-colors duration-200"
                            />
                            <text
                                x={xGroup + 14}
                                y="142"
                                textAnchor="middle"
                                className="text-[10px] fill-slate-400 font-semibold font-sans"
                            >
                                {item.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};
