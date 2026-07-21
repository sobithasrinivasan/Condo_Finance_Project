"use client";

import React from "react";
import { FiX, FiCalendar } from "react-icons/fi";
import { LuCircleDollarSign, LuShieldCheck, LuCreditCard } from "react-icons/lu";

export interface UnitDepositDetail {
    id?: string;
    unitNumber?: string;
    badgeColor?: "blue" | "sky";
    ownerName?: string;
    expected?: number;
    received?: number;
    dateReceived?: string;
    balance?: number;
    status?: "Paid" | "Late" | "Partial" | string;
    paymentMethod?: string;
    referenceNumber?: string;
    recordedBy?: string;
    recordedOn?: string;
    month?: string;
    notes?: string;
}

interface DepositeViewModelProps {
    isOpen?: boolean;
    onClose?: () => void;
    deposit?: UnitDepositDetail | null;
}

export default function DepositeViewModel({
    isOpen = true,
    onClose,
    deposit,
}: DepositeViewModelProps) {
    if (!isOpen || !deposit) return null;

    let cleanOwnerName = deposit.ownerName || "John Doe";
    const nameMatch = cleanOwnerName.match(/\(([^)]+)\)/);
    if (nameMatch && nameMatch[1]) {
        cleanOwnerName = nameMatch[1];
    }

    const unitNumber = deposit.unitNumber || "101";
    const month = deposit.month || "July 2026";
    const recordedOn = deposit.recordedOn || `${deposit.dateReceived && deposit.dateReceived !== "-" ? deposit.dateReceived : "Jul 05, 2026"} 10:25 AM`;
    const expected = deposit.expected !== undefined ? deposit.expected : 550.0;
    const received = deposit.received !== undefined ? deposit.received : 550.0;
    const dateReceived = deposit.dateReceived && deposit.dateReceived !== "-" ? deposit.dateReceived : "Jul 05, 2026";
    const balance = deposit.balance !== undefined ? deposit.balance : 0.0;
    const status = deposit.status || "Paid";
    const paymentMethod = deposit.paymentMethod || "Bank Transfer";
    const referenceNumber = deposit.referenceNumber || "TXN-458963";
    const recordedBy = deposit.recordedBy || "Admin";
    const notes = deposit.notes || `Monthly HOA deposit for ${month}`;

    const isPaid = status === "Paid";
    const isLate = status === "Late";

    return (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans text-slate-800">
            <div
                onClick={onClose}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-300 cursor-default"
            />

            <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-10">
                <div className="w-screen max-w-md sm:max-w-lg md:max-w-xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-200/80">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white flex-shrink-0">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                            Deposit Details
                        </h2>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Close Modal"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto space-y-5">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-[#0B46AD] text-white text-sm font-extrabold rounded-lg shadow-2xs">
                                        {unitNumber}
                                    </span>
                                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                                        {deposit.ownerName || `Unit ${unitNumber} (${cleanOwnerName})`}
                                    </h3>
                                </div>
                                <span
                                    className={`px-3.5 py-1 rounded-full text-xs font-semibold ${isPaid
                                            ? "bg-[#E6F4EA] text-[#137333]"
                                            : isLate
                                                ? "bg-rose-100 text-rose-700"
                                                : "bg-amber-100 text-amber-700"
                                        }`}
                                >
                                    {status}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 pt-0.5">
                                <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                    <FiCalendar className="w-4 h-4 text-slate-500" />
                                    <span>Month: {month}</span>
                                </div>
                                <span className="text-slate-300 font-normal">|</span>
                                <span className="text-slate-500">
                                    Recorded On: {recordedOn}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[#0B46AD] font-bold text-xs sm:text-sm">
                                <LuShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#0B46AD]" />
                                <span className="text-slate-900 font-bold">Unit Information</span>
                            </div>
                            <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden text-xs sm:text-sm">
                                <div className="flex items-center justify-between p-3.5 px-4 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Unit</span>
                                    <span className="font-bold text-slate-900">{unitNumber}</span>
                                </div>
                                <div className="flex items-center justify-between p-3.5 px-4">
                                    <span className="text-slate-500 font-medium">Owner</span>
                                    <span className="font-bold text-slate-900">{cleanOwnerName}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[#0B46AD] font-bold text-xs sm:text-sm">
                                <LuCircleDollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-[#0B46AD]" />
                                <span className="text-slate-900 font-bold">Monthly Deposit</span>
                            </div>
                            <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden text-xs sm:text-sm">
                                <div className="flex items-center justify-between p-3.5 px-4 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Expected Deposit</span>
                                    <span className="font-bold text-slate-900">
                                        ${expected.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3.5 px-4 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Received Amount</span>
                                    <span className="font-bold text-emerald-600">
                                        ${received.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3.5 px-4 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Date Received</span>
                                    <span className="font-bold text-slate-900">{dateReceived}</span>
                                </div>
                                <div className="flex items-center justify-between p-3.5 px-4 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Outstanding Balance</span>
                                    <span className={`font-bold ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                        ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3.5 px-4">
                                    <span className="text-slate-500 font-medium">Status</span>
                                    <span
                                        className={`px-3 py-0.5 rounded-full text-xs font-semibold ${isPaid
                                                ? "bg-[#E6F4EA] text-[#137333]"
                                                : isLate
                                                    ? "bg-rose-100 text-rose-700"
                                                    : "bg-amber-100 text-amber-700"
                                            }`}
                                    >
                                        {status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[#0B46AD] font-bold text-xs sm:text-sm">
                                <LuCreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-[#0B46AD]" />
                                <span className="text-slate-900 font-bold">Payment Information</span>
                            </div>
                            <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden text-xs sm:text-sm">
                                <div className="flex items-center justify-between p-3.5 px-4 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Payment Method</span>
                                    <span className="font-bold text-slate-900">{paymentMethod}</span>
                                </div>
                                <div className="flex items-center justify-between p-3.5 px-4 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Reference Number</span>
                                    <span className="font-bold text-slate-900">{referenceNumber}</span>
                                </div>
                                <div className="flex items-center justify-between p-3.5 px-4 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Recorded By</span>
                                    <span className="font-bold text-slate-900">{recordedBy}</span>
                                </div>
                                <div className="flex items-center justify-between p-3.5 px-4 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Recorded On</span>
                                    <span className="font-bold text-slate-900">{recordedOn}</span>
                                </div>
                                <div className="flex items-center justify-between p-3.5 px-4">
                                    <span className="text-slate-500 font-medium">Notes</span>
                                    <span className="font-semibold text-slate-900">{notes}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end p-4 px-6 border-t border-slate-100 bg-white flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
