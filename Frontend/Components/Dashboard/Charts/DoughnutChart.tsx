import React from 'react'

export default function DoughnutChart() {
    const radius = 40;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    const percentCollected = 93;
    const strokeDashoffset = circumference - (percentCollected / 100) * circumference;

    return (
        <div className="flex items-center gap-6 mt-4">
            <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
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
                    <span className="text-xl font-bold text-slate-800 font-sans">93%</span>
                </div>
            </div>
            <div className="space-y-2 text-xs flex-1">
                <div className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00BA9D] mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Collected</p>
                        <p className="text-slate-800 font-bold text-sm">$82,750</p>
                    </div>
                </div>
                <div className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1A56DB] mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Pending</p>
                        <p className="text-slate-800 font-bold text-sm">$5,210</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
