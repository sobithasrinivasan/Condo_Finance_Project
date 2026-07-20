"use client";

import React, { useState } from "react";
import { FiX, FiSearch } from "react-icons/fi";

export interface BankTransactionItem {
    id?: string;
    date?: string;
    description?: string;
    referenceNo?: string;
    type?: "CREDIT" | "DEBIT";
    amount?: string;
}

export interface SearchableInvoiceOption {
    id: string;
    invoiceNo: string;
    description: string;
    date: string;
    status: "Approved" | "Pending";
}

interface CreateManualMatchProps {
    isOpen?: boolean;
    onClose?: () => void;
    onContinue?: (selectedInvoice: SearchableInvoiceOption) => void;
    transaction?: BankTransactionItem | null;
}

export default function CreateManualMatch({
    isOpen = true,
    onClose,
    onContinue,
    transaction,
}: CreateManualMatchProps) {
    if (!isOpen) return null;

    const tx: BankTransactionItem = {
        date: transaction?.date || "Jul 07, 2026",
        description: transaction?.description || "Amazon Charge",
        referenceNo: transaction?.referenceNo || "AMZ-3345",
        type: transaction?.type || "CREDIT",
        amount: transaction?.amount || "$89.99",
    };

    const invoiceOptions: SearchableInvoiceOption[] = [
        {
            id: "inv-1",
            invoiceNo: "INV-1045",
            description: "Amazon Subscription",
            date: "Jun 28, 2026",
            status: "Approved",
        },
        {
            id: "inv-2",
            invoiceNo: "INV-1032",
            description: "Amazon Web Services",
            date: "Jun 15, 2026",
            status: "Approved",
        },
        {
            id: "inv-3",
            invoiceNo: "INV-0998",
            description: "Amazon Purchase",
            date: "May 30, 2026",
            status: "Approved",
        },
    ];

    const [searchTerm, setSearchTerm] = useState("amazon");
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("inv-1");

    const filteredOptions = invoiceOptions.filter(
        (item) =>
            item.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleContinue = () => {
        const selected = invoiceOptions.find((i) => i.id === selectedInvoiceId);
        if (selected && onContinue) {
            onContinue(selected);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 font-sans text-slate-800">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_10px_40px_rgba(0,0,0,0.1)] overflow-hidden max-w-3xl w-full p-6 space-y-5 relative">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Close Modal"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                )}

                <div className="space-y-1 pr-6 text-left">
                    <h2 className="text-base sm:text-lg font-bold text-[#0B1E48]">
                        Create Manual Match
                    </h2>
                    <p className="text-xs text-slate-500">
                        Search and select an invoice to match with this transaction.
                    </p>
                </div>

                <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-4 space-y-2 text-left">
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                        Bank Transaction Details
                    </h3>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Date</span>
                            <span className="font-semibold text-slate-800">{tx.date}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Type</span>
                            {tx.type === "CREDIT" ? (
                                <span className="bg-[#DCFCE7] text-[#16A34A] text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200/60 uppercase">
                                    CREDIT
                                </span>
                            ) : (
                                <span className="bg-[#FFE4E6] text-[#E11D48] text-[10px] font-bold px-2 py-0.5 rounded border border-rose-200/60 uppercase">
                                    DEBIT
                                </span>
                            )}
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Description</span>
                            <span className="font-bold text-slate-900">{tx.description}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Amount</span>
                            <span className="font-extrabold text-[#16A34A] text-xs sm:text-sm">
                                {tx.amount}
                            </span>
                        </div>

                        <div className="flex justify-between col-span-2 sm:col-span-1">
                            <span className="text-slate-500 font-medium">Reference No.</span>
                            <span className="font-semibold text-slate-800">{tx.referenceNo}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 text-left">
                    <label className="font-bold text-slate-900 text-xs sm:text-sm block">
                        Search Invoice
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search invoice number or vendor..."
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs"
                        />
                        <FiSearch className="w-4 h-4 text-[#0B1E48] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                <div className="space-y-2.5 text-left">
                    <label className="font-bold text-slate-900 text-xs sm:text-sm block">
                        Select Invoice
                    </label>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {filteredOptions.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">
                                No matching invoices found.
                            </p>
                        ) : (
                            filteredOptions.map((item) => {
                                const isSelected = selectedInvoiceId === item.id;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedInvoiceId(item.id)}
                                        className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${isSelected
                                            ? "border-2 border-[#1A56DB] bg-blue-50/40 shadow-2xs"
                                            : "border border-slate-200 hover:border-slate-300 bg-white"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${isSelected
                                                    ? "border-[#1A56DB] bg-[#1A56DB]"
                                                    : "border-slate-300 bg-white"
                                                    }`}
                                            >
                                                {isSelected && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                )}
                                            </div>

                                            <div className="space-y-0.5">
                                                <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                                                    {item.invoiceNo}
                                                </span>
                                                <span className="text-xs text-slate-500 font-medium block">
                                                    {item.description}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 text-right">
                                            <span className="bg-[#DCFCE7] text-[#16A34A] text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                                                {item.status}
                                            </span>
                                            <span className="text-xs text-slate-500 font-medium">
                                                {item.date}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl cursor-pointer transition-colors shadow-2xs"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleContinue}
                        className="bg-[#1A56DB] hover:bg-[#1448C4] active:bg-[#0E3A9E] text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl cursor-pointer transition-all shadow-xs border border-blue-700/30 whitespace-nowrap"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
