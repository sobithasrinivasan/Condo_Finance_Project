"use client";

import React from "react";
import {
    FiX,
    FiFileText,
    FiCalendar,
    FiCheckCircle,
    FiXCircle,
    FiArrowUpRight,
    FiArrowDownLeft,
    FiHash,
} from "react-icons/fi";

export interface StatementViewTransaction {
    id: string;
    date: string;
    description: string;
    reference: string;
    type: "CREDIT" | "DEBIT";
    amount: string;
    isPositive: boolean;
    reconciled: boolean;
    ocr_verified: boolean;
}

export interface StatementViewData {
    id: string;
    filename: string;
    period: string;
    uploadedDate: string;
    status: string;
    transactionCount: number;
    transactions: StatementViewTransaction[];
}

interface StatementViewDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    statement: StatementViewData | null;
}

export default function StatementViewDrawer({ isOpen, onClose, statement }: StatementViewDrawerProps) {
    if (!isOpen || !statement) return null;

    const credits = statement.transactions.filter((t) => t.type === "CREDIT");
    const debits = statement.transactions.filter((t) => t.type === "DEBIT");

    const totalCredit = credits.reduce((sum, t) => {
        const v = parseFloat(t.amount.replace(/[$,]/g, ""));
        return sum + (isNaN(v) ? 0 : Math.abs(v));
    }, 0);

    const totalDebit = debits.reduce((sum, t) => {
        const v = parseFloat(t.amount.replace(/[$,]/g, ""));
        return sum + (isNaN(v) ? 0 : Math.abs(v));
    }, 0);

    const fmt = (n: number) =>
        `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="fixed inset-0 z-50 flex font-sans">
            <div
                className="flex-1 bg-slate-900/40 backdrop-blur-xs"
                onClick={onClose}
            />

            <div className="w-full max-w-xl bg-white h-full flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.15)] animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-blue-50 text-[#1A56DB]">
                            <FiFileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-[#0B1E48] truncate max-w-[260px]">
                                {statement.filename}
                            </h2>
                            <p className="text-xs text-slate-400 font-medium">{statement.period}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</p>
                            {statement.status === "Processed" ? (
                                <span className="inline-flex items-center gap-1 bg-[#DCFCE7] text-[#16A34A] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                                    <FiCheckCircle className="w-3 h-3" />
                                    Processed
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 bg-[#FFE4E6] text-[#E11D48] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-rose-200/60">
                                    <FiXCircle className="w-3 h-3" />
                                    {statement.status || "Failed"}
                                </span>
                            )}
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Period</p>
                            <div className="flex items-center gap-1.5">
                                <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-sm font-bold text-slate-800">{statement.period}</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Uploaded On</p>
                            <span className="text-sm font-bold text-slate-800">{statement.uploadedDate}</span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Transactions</p>
                            <div className="flex items-center gap-1.5">
                                <FiHash className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-sm font-bold text-slate-800">{statement.transactions.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#F0FDF4] border border-emerald-200/60 rounded-xl p-4 space-y-1">
                            <div className="flex items-center gap-1.5 text-[#16A34A]">
                                <FiArrowUpRight className="w-4 h-4" />
                                <span className="text-[11px] font-semibold uppercase tracking-wider">Total Credits</span>
                            </div>
                            <p className="text-base font-extrabold text-[#16A34A]">{fmt(totalCredit)}</p>
                            <p className="text-[11px] text-slate-500">{credits.length} transactions</p>
                        </div>

                        <div className="bg-[#FFF1F2] border border-rose-200/60 rounded-xl p-4 space-y-1">
                            <div className="flex items-center gap-1.5 text-[#E11D48]">
                                <FiArrowDownLeft className="w-4 h-4" />
                                <span className="text-[11px] font-semibold uppercase tracking-wider">Total Debits</span>
                            </div>
                            <p className="text-base font-extrabold text-[#E11D48]">{fmt(totalDebit)}</p>
                            <p className="text-[11px] text-slate-500">{debits.length} transactions</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-[#0B1E48]">
                            All Transactions
                        </h3>

                        {statement.transactions.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs border border-slate-100 rounded-xl">
                                No transactions in this statement.
                            </div>
                        ) : (
                            <div className="border border-slate-100 rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50">
                                            <th className="py-3 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                                            <th className="py-3 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                                            <th className="py-3 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                                            <th className="py-3 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {statement.transactions.map((t) => (
                                            <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{t.date}</td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <div className="font-semibold text-slate-800 truncate max-w-[160px]">{t.description}</div>
                                                    <div className="text-[10px] text-slate-400">{t.reference}</div>
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    {t.type === "CREDIT" ? (
                                                        <span className="bg-[#DCFCE7] text-[#16A34A] text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200/60 uppercase">
                                                            CREDIT
                                                        </span>
                                                    ) : (
                                                        <span className="bg-[#FFE4E6] text-[#E11D48] text-[10px] font-bold px-2 py-0.5 rounded border border-rose-200/60 uppercase">
                                                            DEBIT
                                                        </span>
                                                    )}
                                                </td>
                                                <td className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${t.isPositive ? "text-[#16A34A]" : "text-[#E11D48]"}`}>
                                                    {t.amount}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
