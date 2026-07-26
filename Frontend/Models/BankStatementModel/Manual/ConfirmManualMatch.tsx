"use client";

import React from "react";
import { FiX, FiInfo, FiAlertTriangle } from "react-icons/fi";

export interface BankTransactionItemData {
    date?: string;
    description?: string;
    referenceNo?: string;
    type?: "CREDIT" | "DEBIT";
    amount?: string;
}

export interface SelectedInvoiceData {
    invoiceNo?: string;
    vendor?: string;
    invoiceDate?: string;
    dueDate?: string;
    invoiceAmount?: string;
    status?: "Approved" | "Pending" | "Paid";
}

interface ConfirmManualMatchProps {
    isOpen?: boolean;
    onClose?: () => void;
    onBack?: () => void;
    onConfirmMatch?: () => void;
    transaction?: BankTransactionItemData | null;
    selectedInvoice?: SelectedInvoiceData | null;
}

export default function ConfirmManualMatch({
    isOpen = true,
    onClose,
    onBack,
    onConfirmMatch,
    transaction,
    selectedInvoice,
}: ConfirmManualMatchProps) {
    if (!isOpen) return null;

    const tx: BankTransactionItemData = {
        date: transaction?.date || "Jul 07, 2026",
        description: transaction?.description || "Amazon Charge",
        referenceNo: transaction?.referenceNo || "AMZ-3345",
        type: transaction?.type || "CREDIT",
        amount: transaction?.amount || "$89.99",
    };

    const inv: SelectedInvoiceData = {
        invoiceNo: selectedInvoice?.invoiceNo || "INV-1045",
        vendor: selectedInvoice?.vendor || "Amazon Subscription",
        invoiceDate: selectedInvoice?.invoiceDate || "Jun 28, 2026",
        dueDate: selectedInvoice?.dueDate || "Jul 10, 2026",
        invoiceAmount: selectedInvoice?.invoiceAmount || "$89.99",
        status: selectedInvoice?.status || "Approved",
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 font-sans text-slate-800">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_10px_40px_rgba(0,0,0,0.1)] overflow-hidden max-w-2xl w-full p-6 space-y-5 relative">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Close Modal"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                )}

                <div className="space-y-1.5 text-left pr-6">
                    <h2 className="text-base sm:text-lg font-bold text-[#0B1E48]">
                        Confirm Manual Match
                    </h2>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                        <FiInfo className="w-4 h-4 text-[#1A56DB] shrink-0" />
                        <span>Please review the details before confirming the manual match.</span>
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-slate-200/80 rounded-2xl p-4 sm:p-5 bg-white space-y-3 shadow-2xs text-left">
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
                                {tx.type === "CREDIT" ? (
                                    <span className="bg-[#DCFCE7] text-[#16A34A] text-xs font-bold px-2 py-0.5 rounded border border-emerald-200/60 uppercase">
                                        CREDIT
                                    </span>
                                ) : (
                                    <span className="bg-[#FFE4E6] text-[#E11D48] text-xs font-bold px-2 py-0.5 rounded border border-rose-200/60 uppercase">
                                        DEBIT
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Amount</span>
                                <span className="font-extrabold text-[#16A34A] text-sm sm:text-base">
                                    {tx.amount}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="border border-slate-200/80 rounded-2xl p-4 sm:p-5 bg-white space-y-3 shadow-2xs text-left">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base border-b border-slate-100 pb-2">
                            Selected Invoice
                        </h3>

                        <div className="space-y-2.5 text-xs sm:text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Invoice No.</span>
                                <button className="font-bold text-[#1A56DB]">
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

                <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3.5 flex items-start gap-3 text-left shadow-2xs">
                    <FiAlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-amber-900 leading-relaxed">
                        You are manually matching this transaction with the selected invoice. Please confirm.
                    </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                        onClick={onBack}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl cursor-pointer transition-colors shadow-2xs"
                    >
                        Back
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
    );
}
