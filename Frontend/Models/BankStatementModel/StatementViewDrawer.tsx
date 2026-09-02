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
    type: "Credit" | "Debit";
    amount: string;
    isPositive: boolean;
    reconciled: boolean;
    ocr_verified: boolean;
}

export interface StatementViewData {
    id: string;
    statement_name: string;
    period: string;
    uploadedDate: string;
    status: string;
    transactionCount: number;
    transactions: StatementViewTransaction[];
    file_path?: string;
}

interface StatementViewDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    statement: StatementViewData | null;
}

export default function StatementViewDrawer({ isOpen, onClose, statement }: StatementViewDrawerProps) {
    if (!isOpen || !statement) return null;

    const credits = statement.transactions.filter((t) => t.type === "Credit");
    const debits = statement.transactions.filter((t) => t.type === "Debit");

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

    const getPdfUrl = (url?: string) => {
        if (!url) return "";
        if (url.startsWith("http://") || url.startsWith("https://")) return url;
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1/";
        try {
            const parsed = new URL(apiBase);
            return `${parsed.protocol}//${parsed.host}${url.startsWith("/") ? "" : "/"}${url}`;
        } catch (e) {
            return `http://localhost:8000${url.startsWith("/") ? "" : "/"}${url}`;
        }
    };

    const pdfUrl = getPdfUrl(statement.file_path);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans">
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
                onClick={onClose}
            />

            <div className="relative z-10 w-full max-w-6xl h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
                {/* Left Side: Document Preview Iframe */}
                <div className="flex-1 bg-slate-50 border-r border-slate-100 flex flex-col h-full">
                    <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center gap-2 shrink-0">
                        <FiFileText className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-bold text-slate-800">Document Preview</span>
                    </div>
                    <div className="flex-1 bg-slate-100 relative">
                        {pdfUrl ? (
                            <iframe
                                src={pdfUrl}
                                className="w-full h-full border-none absolute inset-0 bg-white"
                                title="Bank Statement PDF"
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8 space-y-2 bg-slate-50">
                                <FiFileText className="w-10 h-10 text-slate-300" />
                                <p className="text-xs font-semibold">No document preview available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Data view */}
                <div className="w-full md:w-[480px] lg:w-[540px] h-full flex flex-col bg-white">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-blue-50 text-[#1A56DB]">
                                <FiFileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-[#0B1E48] truncate max-w-[260px]">
                                    {statement.statement_name}
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
                                                    <td className="py-2.5 px-3">
                                                        <div className="font-semibold text-slate-800 truncate max-w-[120px]" title={t.description}>{t.description}</div>
                                                        <div className="text-[10px] text-slate-400">{t.reference}</div>
                                                    </td>
                                                    <td className="py-2.5 px-3 whitespace-nowrap">
                                                        {t.type.toLowerCase() === "credit" ? (
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


                </div>
            </div>
        </div>
    );
}
