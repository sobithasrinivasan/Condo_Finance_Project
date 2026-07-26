import React from "react";

export default function Header() {
    const initials = "David"
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <header className="w-full bg-[#0A1C3B] px-6 py-3 flex items-center justify-between border-t-4 border-[#5A2C16] shadow-sm select-none">
            <div className="text-lg font-medium text-white tracking-wide">
                Condo Finance
            </div>

            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1A56DB] flex items-center justify-center text-white font-bold text-[13px]">
                    {initials}
                </div>

                <div className="flex flex-col text-left justify-center">
                    <span className="text-sm font-bold text-white leading-tight">
                        David
                    </span>
                    <span className="text-[10px] font-bold text-blue-200/80 tracking-wider uppercase mt-0.5 leading-none">
                        ADMIN
                    </span>
                </div>
            </div>
        </header>
    );
}
