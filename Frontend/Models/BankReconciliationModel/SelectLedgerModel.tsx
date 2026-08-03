"use client";

import React, { useState } from "react";
import {
    FiX,
    FiSearch,
    FiFilter,
    FiChevronDown,
    FiInfo,
    FiFileText,
} from "react-icons/fi";
import { LuLandmark } from "react-icons/lu";

export interface LedgerRecord {
    id: string;
    invoiceNo: string;
    reference: string;
    description: string;
    subDescription?: string;
    dueDate: string;
    vendor: string;
    date: string;
    amount: string;
    status: "Unpaid" | "Paid" | "Pending";
    reconciliation_id?: number;
    reconciliation_type?: string;
    resolution_notes?: string;
    reference_id?: number | null;
}

export interface SelectLedgerModelProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmMatch?: (ledgerRecord: LedgerRecord) => void | Promise<void>;
    bankTransaction?: {
        description: string;
        amount: string;
        date: string;
        reference: string;
        statement: string;
        reconciliations?: any[];
    } | null;
}

export default function SelectLedgerModel({
    isOpen,
    onClose,
    onConfirmMatch,
    bankTransaction
}: SelectLedgerModelProps) {
    const defaultTx = {
        description: bankTransaction?.description || "Electric Company",
        amount: bankTransaction?.amount || "-$450.75",
        date: bankTransaction?.date || "Jul 08, 2026",
        reference: bankTransaction?.reference || "EL-5542",
        statement: bankTransaction?.statement || "June 2026 Statement.pdf"
    };

    const mockLedgers: LedgerRecord[] = [
        {
            id: "led-1",
            invoiceNo: "INV-1025",
            reference: "EL-5542",
            description: "Electricity Bill - July 2026",
            subDescription: "Due: Jul 20, 2026",
            dueDate: "Jul 20, 2026",
            vendor: "Electric Company",
            date: "Jul 08, 2026",
            amount: "-$450.75",
            status: "Unpaid"
        },
        {
            id: "led-2",
            invoiceNo: "INV-0987",
            reference: "EL-4987",
            description: "Electricity Bill - June 2026",
            subDescription: "Due: Jun 20, 2026",
            dueDate: "Jun 20, 2026",
            vendor: "Electric Company",
            date: "Jun 10, 2026",
            amount: "-$450.75",
            status: "Paid"
        },
        {
            id: "led-3",
            invoiceNo: "INV-0874",
            reference: "EL-3210",
            description: "Electric Maintenance",
            subDescription: "Service Charge",
            dueDate: "Jul 25, 2026",
            vendor: "Electric Company",
            date: "Jul 09, 2026",
            amount: "-$450.75",
            status: "Unpaid"
        }
    ];

    const ledgerRecords: LedgerRecord[] = (bankTransaction?.reconciliations && bankTransaction.reconciliations.length > 0)
        ? bankTransaction.reconciliations.map((rec: any, index: number) => {
            return {
                id: rec.id ? String(rec.id) : `rec-${index}`,
                invoiceNo: rec.matched_record_name || `REC-${rec.id || index}`,
                reference: rec.reference_id ? `REF-${rec.reference_id}` : `Match: ${rec.match_score || 0}%`,
                description: rec.resolution_notes || `Reconciliation type: ${rec.reconciliation_type || "Invoice"}`,
                subDescription: rec.payment_status ? `Payment Timing: ${rec.payment_status}` : undefined,
                dueDate: rec.matched_date ? new Date(rec.matched_date).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "—",
                vendor: rec.reconciliation_type || "Invoice",
                date: rec.created_at ? new Date(rec.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "—",
                amount: bankTransaction.amount || "—",
                status: (rec.status === "NeedsReview" ? "Pending" : rec.status === "Unresolved" ? "Unpaid" : "Paid") as "Unpaid" | "Paid" | "Pending",
                reconciliation_id: rec.id,
                reconciliation_type: rec.reconciliation_type,
                resolution_notes: rec.resolution_notes,
                reference_id: rec.reference_id
            };
        })
        : mockLedgers;

    const [selectedLedgerId, setSelectedLedgerId] = useState<string>("led-1");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    React.useEffect(() => {
        if (bankTransaction?.reconciliations && bankTransaction.reconciliations.length > 0) {
            setSelectedLedgerId(bankTransaction.reconciliations[0].id ? String(bankTransaction.reconciliations[0].id) : "rec-0");
        } else {
            setSelectedLedgerId("led-1");
        }
    }, [bankTransaction]);

    if (!isOpen) return null;

    const selectedLedger = ledgerRecords.find(l => l.id === selectedLedgerId) || ledgerRecords[0];

    const filteredLedgers = ledgerRecords.filter(l =>
        l.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.reference.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleConfirm = async () => {
        if (onConfirmMatch) {
            console.log(selectedLedger, 'selectedLedger')
            setIsSubmitting(true);
            try {
                await onConfirmMatch(selectedLedger);
                onClose();
            } catch (error) {
                console.error("Match confirmation failed:", error);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                onClick={onClose}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            />

            <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between border-b border-slate-100 p-6 pb-4 bg-white rounded-t-2xl flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-[#0B1E48] rounded-xl flex items-center justify-center flex-shrink-0">
                            <FiFileText className="w-5.5 h-5.5 text-[#0B1E48]" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                                Select Ledger Record
                            </h3>
                            <p className="text-xs text-slate-500 font-normal mt-0.5">
                                Multiple ledger records found for this bank transaction. Please select the correct ledger to match.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#0B46AD] uppercase tracking-wider">
                            <LuLandmark className="w-4 h-4 text-[#0B46AD]" />
                            <span>BANK TRANSACTION</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Description</span>
                                <span className="font-bold text-slate-900">{defaultTx.description}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Amount</span>
                                <span className="font-bold text-rose-600">{defaultTx.amount}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Transaction Date</span>
                                <span className="font-bold text-slate-900">{defaultTx.date}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Reference / Check No.</span>
                                <span className="font-bold text-slate-900">{defaultTx.reference}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Statement</span>
                                <span className="font-medium text-slate-700 truncate block">{defaultTx.statement}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <FiSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search ledger by description, invoice no., vendor, reference..."
                                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                        </div>

                        <button className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2 px-3.5 rounded-xl transition-colors cursor-pointer self-end sm:self-auto">
                            <FiFilter className="w-3.5 h-3.5 text-slate-500" />
                            <span>Filters</span>
                            <FiChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                        <span className="font-semibold text-slate-500">
                            {filteredLedgers.length} ledger records found
                        </span>

                        <div className="flex items-center gap-1 font-semibold text-slate-700 cursor-pointer hover:text-slate-900">
                            <span>Sort by: <strong className="text-slate-900">Date (Newest)</strong></span>
                            <FiChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                    </div>

                    <div className="border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                                    <th className="py-3 px-3 w-10 text-center"></th>
                                    <th className="py-3 px-3">LEDGER / INVOICE NO.</th>
                                    <th className="py-3 px-3">DESCRIPTION</th>
                                    <th className="py-3 px-3">VENDOR</th>
                                    <th className="py-3 px-3">DATE</th>
                                    <th className="py-3 px-3">AMOUNT</th>
                                    <th className="py-3 px-3 text-center">STATUS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredLedgers.map((ledger) => {
                                    const isSelected = selectedLedgerId === ledger.id;
                                    return (
                                        <tr
                                            key={ledger.id}
                                            onClick={() => setSelectedLedgerId(ledger.id)}
                                            className={`transition-colors cursor-pointer ${isSelected
                                                    ? "bg-blue-50/40 hover:bg-blue-50/60"
                                                    : "hover:bg-slate-50/80"
                                                }`}
                                        >
                                            <td className="py-3.5 px-3 text-center">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center mx-auto transition-colors ${isSelected ? "border-[#0B46AD] bg-[#0B46AD]" : "border-slate-300"
                                                    }`}>
                                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-3 whitespace-nowrap">
                                                <div className="font-bold text-[#0B46AD]">{ledger.invoiceNo}</div>
                                                <div className="text-[11px] text-slate-400">Ref: {ledger.reference}</div>
                                            </td>
                                            <td className="py-3.5 px-3">
                                                <div className="font-bold text-slate-900">{ledger.description}</div>
                                                {ledger.subDescription && (
                                                    <div className="text-[11px] text-slate-500">{ledger.subDescription}</div>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                                                {ledger.vendor}
                                            </td>
                                            <td className="py-3.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                                                {ledger.date}
                                            </td>
                                            <td className="py-3.5 px-3 font-bold text-rose-600 whitespace-nowrap">
                                                {ledger.amount}
                                            </td>
                                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${ledger.status === "Paid"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                                    }`}>
                                                    {ledger.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 space-y-4">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Ledger Preview
                        </h4>

                        <div className="grid grid-cols-2 gap-y-2.5 gap-x-6 text-xs border-b border-slate-200/70 pb-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Invoice No.</span>
                                    <span className="font-bold text-slate-900">{selectedLedger.invoiceNo}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Vendor</span>
                                    <span className="font-bold text-slate-900">{selectedLedger.vendor}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Description</span>
                                    <span className="font-bold text-slate-900">{selectedLedger.description}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Due Date</span>
                                    <span className="font-bold text-slate-900">{selectedLedger.dueDate}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Invoice Date</span>
                                    <span className="font-bold text-slate-900">{selectedLedger.date}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Amount</span>
                                    <span className="font-bold text-rose-600">{selectedLedger.amount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Reference</span>
                                    <span className="font-bold text-slate-900">{selectedLedger.reference}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Status</span>
                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${selectedLedger.status === "Paid"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-amber-50 text-amber-700 border-amber-200"
                                        }`}>
                                        {selectedLedger.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3 flex items-center gap-2.5 text-xs text-blue-900 font-medium">
                            <FiInfo className="w-4 h-4 text-[#0B46AD] flex-shrink-0" />
                            <span>Selecting this ledger will mark both the bank transaction and ledger record as <strong>Matched</strong>.</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-slate-100 bg-white rounded-b-2xl flex-shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className={`px-6 py-2.5 bg-[#0B46AD] hover:bg-[#093C96] active:bg-[#072F77] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""
                            }`}
                    >
                        {isSubmitting && (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isSubmitting ? "Matching..." : "Confirm Match"}
                    </button>
                </div>
            </div>
        </div>
    );
}
