import React from 'react'

export default function ExpenseSummaryChart() {
    const radius = 40;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="flex items-center gap-6 mt-4">
            <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#1A56DB"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={`${circumference * 0.4} ${circumference}`}
                        strokeDashoffset={0}
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#E28743"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={`${circumference * 0.25} ${circumference}`}
                        strokeDashoffset={-circumference * 0.4}
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#38BDF8"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={`${circumference * 0.2} ${circumference}`}
                        strokeDashoffset={-circumference * 0.65}
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#34D399"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={`${circumference * 0.1} ${circumference}`}
                        strokeDashoffset={-circumference * 0.85}
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#FBBF24"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={`${circumference * 0.05} ${circumference}`}
                        strokeDashoffset={-circumference * 0.95}
                    />
                </svg>
                <div className="absolute text-center flex flex-col justify-center text-slate-400">
                    <span className="text-[8px] font-bold uppercase tracking-wider leading-none">Total</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider leading-none mt-0.5">Expense</span>
                </div>
            </div>

            <div className="space-y-1.5 text-xs flex-1">
                <div className="flex justify-between items-center text-slate-500">
                    <span className="flex items-center gap-1.5 truncate"><span className="w-2 h-2 rounded-full bg-[#1A56DB] flex-shrink-0" /> Maintenance</span>
                    <span className="font-bold text-slate-800 ml-2">40%</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                    <span className="flex items-center gap-1.5 truncate"><span className="w-2 h-2 rounded-full bg-[#E28743] flex-shrink-0" /> Utilities</span>
                    <span className="font-bold text-slate-800 ml-2">25%</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                    <span className="flex items-center gap-1.5 truncate"><span className="w-2 h-2 rounded-full bg-[#38BDF8] flex-shrink-0" /> Repairs</span>
                    <span className="font-bold text-slate-800 ml-2">20%</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                    <span className="flex items-center gap-1.5 truncate"><span className="w-2 h-2 rounded-full bg-[#34D399] flex-shrink-0" /> Insurance</span>
                    <span className="font-bold text-slate-800 ml-2">10%</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                    <span className="flex items-center gap-1.5 truncate"><span className="w-2 h-2 rounded-full bg-[#FBBF24] flex-shrink-0" /> Other</span>
                    <span className="font-bold text-slate-800 ml-2">5%</span>
                </div>
            </div>
        </div>
    );
};
