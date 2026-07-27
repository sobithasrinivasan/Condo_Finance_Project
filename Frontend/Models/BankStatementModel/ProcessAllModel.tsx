"use client";

import React from "react";
import { FiX, FiInfo, FiAlertTriangle, FiCheckCircle, FiRefreshCw } from "react-icons/fi";

export interface MatchedTransactionRow {
    invoiceNo: string;
    vendor: string;
    amount: string;
}

interface ProcessAllModelProps {
    isOpen?: boolean;
    onClose?: () => void;
    onConfirmProcessAll?: () => void;
    matchedCount?: number;
    matchedItems?: MatchedTransactionRow[];
}

export default function ProcessAllModel({
    isOpen = true,
    onClose,
    onConfirmProcessAll,
    matchedCount = 3,
    matchedItems,
}: ProcessAllModelProps) {
    if (!isOpen) return null;

    const items: MatchedTransactionRow[] = matchedItems || [
        {
            invoiceNo: "INV-1008",
            vendor: "ABC Plumbing Service",
            amount: "$1,250.00",
        },
        {
            invoiceNo: "INV-1012",
            vendor: "Electric Company",
            amount: "$450.75",
        },
        {
            invoiceNo: "INV-1023",
            vendor: "HOA Deposit Unit 1",
            amount: "$1,100.00",
        },
    ];

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 font-sans text-slate-800">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_10px_40px_rgba(0,0,0,0.1)] overflow-hidden max-w-xl w-full p-6 space-y-5 relative">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Close Modal"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                )}

                <div className="flex items-start gap-3.5 text-left pr-6">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1A56DB] flex items-center justify-center shrink-0 border border-blue-100/60 mt-0.5">
                        <FiRefreshCw className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-base sm:text-lg font-bold text-[#0B1E48]">
                            Process All Matched Transactions
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                            The following matched transactions will be verified and the corresponding invoices will be marked as Paid.
                        </p>
                    </div>
                </div>

                <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl p-3.5 flex items-center gap-2.5 text-left shadow-2xs">
                    <FiInfo className="w-5 h-5 text-[#1D4ED8] shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-[#1D4ED8]">
                        Matched Transactions: {matchedCount || items.length}
                    </span>
                </div>

                <div className="rounded-xl border border-slate-200/80 overflow-hidden text-left shadow-2xs">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200/70 bg-[#F8FAFC]">
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                    INVOICE NO.
                                </th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                    VENDOR
                                </th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">
                                    AMOUNT
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                            {items.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0">
                                                <FiCheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                                            </div>
                                            <span className="font-bold text-slate-900">
                                                {row.invoiceNo}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                                        {row.vendor}
                                    </td>

                                    <td className="py-3.5 px-4 font-bold text-slate-900 text-right whitespace-nowrap">
                                        {row.amount}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 text-left space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 font-bold text-amber-900 text-xs sm:text-sm">
                        <FiAlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
                        <span>Please note:</span>
                    </div>
                    <ul className="space-y-1 text-xs text-amber-800 font-medium pl-6 list-disc">
                        <li>Only matched transactions will be processed.</li>
                        <li>Unmatched transactions will remain pending.</li>
                    </ul>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-xl cursor-pointer transition-colors shadow-2xs"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onConfirmProcessAll}
                        className="bg-[#1A56DB] hover:bg-[#1448C4] active:bg-[#0E3A9E] text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl cursor-pointer transition-all shadow-xs border border-blue-700/30 flex items-center gap-2 whitespace-nowrap"
                    >
                        <FiCheckCircle className="w-4 h-4 stroke-[2.2]" />
                        <span>Confirm & Mark as Paid</span>
                    </button>
                </div>

            </div>
        </div>
    );
}
