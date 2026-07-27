"use client";

import React from "react";
import { FiX, FiCheckCircle } from "react-icons/fi";

export interface BankTransactionData {
    date?: string;
    description?: string;
    referenceNo?: string;
    type?: "DEBIT" | "CREDIT";
    amount?: string;
}

export interface MatchedInvoiceData {
    invoiceNo?: string;
    vendor?: string;
    invoiceDate?: string;
    dueDate?: string;
    invoiceAmount?: string;
    status?: "Approved" | "Pending" | "Paid" | "Rejected";
}

interface VerifyMatchModelProps {
    isOpen?: boolean;
    onClose?: () => void;
    onConfirmMatch?: () => void;
    transaction?: BankTransactionData | null;
    matchedInvoice?: MatchedInvoiceData | null;
}

export default function VerfiyMatchModel({
    isOpen = true,
    onClose,
    onConfirmMatch,
    transaction,
    matchedInvoice,
}: VerifyMatchModelProps) {
    if (!isOpen) return null;

    const tx: BankTransactionData = {
        date: transaction?.date || "Jul 09, 2026",
        description: transaction?.description || "ABC Plumbing",
        referenceNo: transaction?.referenceNo || "CP-7854",
        type: transaction?.type || "DEBIT",
        amount: transaction?.amount || "-$1,250.00",
    };

    const inv: MatchedInvoiceData = {
        invoiceNo: matchedInvoice?.invoiceNo || "INV-1008",
        vendor: matchedInvoice?.vendor || "ABC Plumbing Service",
        invoiceDate: matchedInvoice?.invoiceDate || "Jul 05, 2026",
        dueDate: matchedInvoice?.dueDate || "Jul 20, 2026",
        invoiceAmount: matchedInvoice?.invoiceAmount || "$1,250.00",
        status: matchedInvoice?.status || "Approved",
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 font-sans text-slate-800">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_10px_40px_rgba(0,0,0,0.1)] overflow-hidden max-w-4xl w-full transition-all">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <h2 className="text-base sm:text-lg font-bold text-[#0B1E48]">
                        Confirm Invoice Match
                    </h2>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Close Modal"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="p-6 space-y-5">
                    <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl p-4 space-y-1">
                        <h4 className="text-xs sm:text-sm font-bold text-[#1D4ED8]">
                            We found a matching invoice for this transaction.
                        </h4>
                        <p className="text-xs text-slate-600">
                            Please review the details and confirm.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="border border-slate-200/80 rounded-2xl p-4 sm:p-5 bg-white space-y-3 shadow-2xs">
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base border-b border-slate-100 pb-2">
                                Bank Transaction
                            </h3>

                            <div className="space-y-2.5 text-xs sm:text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Date</span>
                                    <span className="font-semibold text-slate-800">{tx.date}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Description</span>
                                    <span className="font-bold text-slate-900">{tx.description}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Reference No.</span>
                                    <span className="font-semibold text-slate-800">{tx.referenceNo}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Type</span>
                                    {tx.type === "DEBIT" ? (
                                        <span className="bg-[#FFE4E6] text-[#E11D48] text-xs font-bold px-2 py-0.5 rounded border border-rose-200/60 uppercase">
                                            DEBIT
                                        </span>
                                    ) : (
                                        <span className="bg-[#DCFCE7] text-[#16A34A] text-xs font-bold px-2 py-0.5 rounded border border-emerald-200/60 uppercase">
                                            CREDIT
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Amount</span>
                                    <span className="font-extrabold text-[#E11D48] text-sm sm:text-base">
                                        {tx.amount}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-200/80 rounded-2xl p-4 sm:p-5 bg-white space-y-3 shadow-2xs">
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base border-b border-slate-100 pb-2">
                                Matched Invoice
                            </h3>

                            <div className="space-y-2.5 text-xs sm:text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Invoice No.</span>
                                    <button
                                        onClick={() => alert(`View invoice ${inv.invoiceNo}`)}
                                        className="font-bold text-[#1A56DB] underline hover:text-blue-800 cursor-pointer"
                                    >
                                        {inv.invoiceNo}
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Vendor</span>
                                    <span className="font-semibold text-slate-800 truncate max-w-[130px]" title={inv.vendor}>
                                        {inv.vendor}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Invoice Date</span>
                                    <span className="font-semibold text-slate-800">{inv.invoiceDate}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Due Date</span>
                                    <span className="font-semibold text-slate-800">{inv.dueDate}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Invoice Amount</span>
                                    <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                                        {inv.invoiceAmount}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Status</span>
                                    <span className="bg-[#DCFCE7] text-[#16A34A] text-xs font-semibold px-3 py-0.5 rounded-full border border-emerald-200/60">
                                        {inv.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
                        <FiCheckCircle className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                        <div className="space-y-0.5 text-xs">
                            <h5 className="font-bold text-slate-900">
                                Amount matches
                            </h5>
                            <p className="text-slate-600">
                                Bank amount and invoice amount are the same.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3">
                        <button
                            onClick={onClose}
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl cursor-pointer transition-colors shadow-2xs"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={onConfirmMatch}
                            className="bg-[#1A56DB] hover:bg-[#1448C4] active:bg-[#0E3A9E] text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl cursor-pointer transition-all shadow-xs border border-blue-700/30 whitespace-nowrap"
                        >
                            Confirm Match
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
