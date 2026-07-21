"use client";

import React, { useState } from "react";
import AuditModel from "@/Models/BankReconciliationModel/AuditModel";
import ExportStatementModel from "@/Models/BankReconciliationModel/ExportStatementModel";
import AutoMatchModel from "@/Models/BankReconciliationModel/AutoMatchModel";
import SelectLedgerModel from "@/Models/BankReconciliationModel/SelectLedgerModel";
import {
    FiDownload,
    FiCheckCircle,
    FiEye,
    FiClock,
    FiChevronLeft,
    FiChevronRight,
    FiChevronDown,
    FiAlertTriangle,
    FiCheck,
    FiInfo,
} from "react-icons/fi";
import { LuWand, LuLandmark, LuFileText, LuArrowUpDown } from "react-icons/lu";

export interface UnmatchedTransaction {
    id: string;
    date: string;
    description: string;
    reference: string;
    category: string;
    type: "CREDIT" | "DEBIT";
    amount: number;
    suggestedMatch?: {
        invoiceNo: string;
        description: string;
        amount: number;
        confidence: number;
        date: string;
        entityName: string;
    };
}

export interface MatchedTransaction {
    id: string;
    date: string;
    description: string;
    reference: string;
    type: "CREDIT" | "DEBIT";
    amount: number;
    matchedInvoiceNo: string;
    matchedEntity: string;
    matchType: "Auto" | "Manual";
    matchedDate: string;
}

export interface IgnoredTransaction {
    id: string;
    date: string;
    description: string;
    reference: string;
    type: "CREDIT" | "DEBIT";
    amount: number;
    reason: string;
    ignoredDate: string;
}

export interface ReconciliationTableItem {
    id: string;
    date: string;
    bankTitle: string;
    bankSub: string;
    bankAmount: string;
    isCredit: boolean;
    matchedTitle: string;
    matchedSub: string;
    matchedType?: "Deposit" | "Invoice" | null;
    matchedAmount?: string | null;
    status: "Matched" | "Suggested" | "Unmatched" | "New Record Needed";
    actionLabel: "View" | "Confirm Match" | "Select Ledger" | "Create Entry";
}

export default function BankReconciliation() {
    const [activeTab, setActiveTab] = useState<"unmatched" | "matched" | "ignored">("unmatched");
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Audit model state
    const [isAuditModelOpen, setIsAuditModelOpen] = useState(false);
    const [selectedAuditTx, setSelectedAuditTx] = useState<{ title: string; reference: string; amount: string } | null>(null);

    // Export model state
    const [isExportModelOpen, setIsExportModelOpen] = useState(false);

    // Auto Match model state
    const [isAutoMatchModelOpen, setIsAutoMatchModelOpen] = useState(false);

    // Select Ledger model state
    const [isSelectLedgerOpen, setIsSelectLedgerOpen] = useState(false);
    const [selectedLedgerTx, setSelectedLedgerTx] = useState<{
        description: string;
        amount: string;
        date: string;
        reference: string;
        statement: string;
    } | null>(null);

    const handleOpenAudit = (row: ReconciliationTableItem) => {
        setSelectedAuditTx({
            title: row.bankTitle,
            reference: row.bankSub,
            amount: row.bankAmount
        });
        setIsAuditModelOpen(true);
    };

    const handleOpenSelectLedger = (row: ReconciliationTableItem) => {
        setSelectedLedgerTx({
            description: row.bankTitle,
            amount: row.bankAmount,
            date: row.date,
            reference: row.bankSub,
            statement: "June 2026 Statement.pdf"
        });
        setIsSelectLedgerOpen(true);
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    // Table items matching the design screenshot
    const [tableRows, setTableRows] = useState<ReconciliationTableItem[]>([
        {
            id: "row-1",
            date: "Jul 10, 2026",
            bankTitle: "HOA Deposit",
            bankSub: "Unit 1",
            bankAmount: "$1,100.00",
            isCredit: true,
            matchedTitle: "HOA Deposit - Unit 1",
            matchedSub: "June 2026",
            matchedType: "Deposit",
            matchedAmount: "$1,100.00",
            status: "Matched",
            actionLabel: "View"
        },
        {
            id: "row-2",
            date: "Jul 09, 2026",
            bankTitle: "ABC Plumbing",
            bankSub: "Ref: CP-7854",
            bankAmount: "-$1,250.00",
            isCredit: false,
            matchedTitle: "INV-1008",
            matchedSub: "ABC Plumbing Service",
            matchedType: "Invoice",
            matchedAmount: "$1,250.00",
            status: "Suggested",
            actionLabel: "Confirm Match"
        },
        {
            id: "row-3",
            date: "Jul 08, 2026",
            bankTitle: "Electric Company",
            bankSub: "Ref: EL-5542",
            bankAmount: "-$450.75",
            isCredit: false,
            matchedTitle: "Multiple Matches Found",
            matchedSub: "3 possible records",
            matchedType: "Invoice",
            matchedAmount: null,
            status: "Unmatched",
            actionLabel: "Select Ledger"
        },
        {
            id: "row-4",
            date: "Jul 07, 2026",
            bankTitle: "Amazon Charge",
            bankSub: "Ref: AMZ-3345",
            bankAmount: "-$89.99",
            isCredit: false,
            matchedTitle: "No Record Found",
            matchedSub: "Create new ledger entry",
            matchedType: null,
            matchedAmount: null,
            status: "New Record Needed",
            actionLabel: "Create Entry"
        },
        {
            id: "row-5",
            date: "Jul 06, 2026",
            bankTitle: "HOA Fees Unit 45",
            bankSub: "June 2026",
            bankAmount: "$550.00",
            isCredit: true,
            matchedTitle: "HOA Fees - Unit 45",
            matchedSub: "June 2026",
            matchedType: "Deposit",
            matchedAmount: "$550.00",
            status: "Matched",
            actionLabel: "View"
        }
    ]);

    // Mock counts
    const unmatchedCount = 24;
    const matchedCount = 152;
    const ignoredCount = 8;

    const toggleSelectRow = (id: string) => {
        if (selectedRows.includes(id)) {
            setSelectedRows(selectedRows.filter(r => r !== id));
        } else {
            setSelectedRows([...selectedRows, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedRows.length === tableRows.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(tableRows.map(r => r.id));
        }
    };

    const handleActionClick = (row: ReconciliationTableItem) => {
        if (row.actionLabel === "Confirm Match") {
            setTableRows(prev => prev.map(r => r.id === row.id ? { ...r, status: "Matched", actionLabel: "View" } : r));
            showToast(`Match confirmed for ${row.bankTitle}!`);
        } else if (row.actionLabel === "View") {
            showToast(`Viewing details for ${row.matchedTitle}`);
        } else if (row.actionLabel === "Select Ledger") {
            handleOpenSelectLedger(row);
        } else if (row.actionLabel === "Create Entry") {
            showToast(`Opening new ledger entry form for ${row.bankTitle}`);
        }
    };

    const handleRunAutoMatch = () => {
        showToast("Running AI Auto Match...");
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-6 right-6 z-50 bg-[#0F172A] text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-300">
                    <FiCheckCircle className="text-emerald-400 w-5 h-5 flex-shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* TOP HEADER SECTION - Exact Match to Screenshot */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-bold text-[#0B1E48] tracking-tight">
                        Bank Reconciliation
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 font-normal">
                        Reconcile bank transactions with ledger entries to ensure financial accuracy.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 self-start sm:self-auto">
                    <button
                        onClick={() => setIsExportModelOpen(true)}
                        className="flex items-center gap-2 bg-[#F4F6FA] hover:bg-slate-100 border border-slate-300 text-[#0F2942] font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                        <FiDownload className="w-4 h-4 text-[#0F2942]" />
                        <span>Export Statement</span>
                    </button>

                    <button
                        onClick={() => setIsAutoMatchModelOpen(true)}
                        className="flex items-center gap-2 bg-[#0B46AD] hover:bg-[#093C96] active:bg-[#072F77] text-white font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                        <LuWand className="w-4 h-4 text-white" />
                        <span>Auto Match</span>
                    </button>
                </div>
            </div>

            {/* TABS FILTER PILLS SECTION - Exact Design from Screenshot */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 mt-6">
                {/* Tab 1: Unmatched */}
                <button
                    onClick={() => setActiveTab("unmatched")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === "unmatched"
                        ? "bg-[#0A1835] text-white shadow-xs"
                        : "bg-[#F4F6FA] border border-slate-200/90 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                >
                    <span>Unmatched</span>
                    <span
                        className={`px-2 py-0.5 rounded-md text-xs font-bold ${activeTab === "unmatched"
                            ? "bg-[#1E325C] text-white"
                            : "bg-slate-200/80 text-slate-700"
                            }`}
                    >
                        {unmatchedCount}
                    </span>
                </button>

                {/* Tab 2: Matched */}
                <button
                    onClick={() => setActiveTab("matched")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === "matched"
                        ? "bg-[#0A1835] text-white shadow-xs"
                        : "bg-[#F4F6FA] border border-slate-200/90 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                >
                    <span>Matched</span>
                    <span
                        className={`px-2 py-0.5 rounded-md text-xs font-bold ${activeTab === "matched"
                            ? "bg-[#1E325C] text-white"
                            : "bg-slate-200/80 text-slate-700"
                            }`}
                    >
                        {matchedCount}
                    </span>
                </button>

                {/* Tab 3: Ignored */}
                <button
                    onClick={() => setActiveTab("ignored")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === "ignored"
                        ? "bg-[#0A1835] text-white shadow-xs"
                        : "bg-[#F4F6FA] border border-slate-200/90 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                >
                    <span>Ignored</span>
                    <span
                        className={`px-2 py-0.5 rounded-md text-xs font-bold ${activeTab === "ignored"
                            ? "bg-[#1E325C] text-white"
                            : "bg-slate-200/80 text-slate-700"
                            }`}
                    >
                        {ignoredCount}
                    </span>
                </button>
            </div>



            {/* RECONCILIATION SIDE-BY-SIDE TABLE - Exact Match to Design Screenshot */}
            <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden mt-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            {/* Level 1 Group Header Row */}
                            <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold tracking-wider">
                                <th colSpan={4} className="py-3 px-4 border-r border-slate-200 text-[#1E40AF]">
                                    <div className="flex items-center gap-2">
                                        <LuLandmark className="w-4 h-4 text-[#1E40AF]" />
                                        <span>BANK TRANSACTIONS</span>
                                    </div>
                                </th>
                                <th colSpan={4} className="py-3 px-4 border-r border-slate-200 text-[#1E40AF]">
                                    <div className="flex items-center gap-2">
                                        <LuFileText className="w-4 h-4 text-[#1E40AF]" />
                                        <span>MATCHED SYSTEM RECORDS</span>
                                    </div>
                                </th>
                                <th colSpan={2} className="py-3 px-4 text-slate-500 text-center uppercase">
                                    ACTION
                                </th>
                            </tr>

                            {/* Level 2 Column Sub-headers Row */}
                            <tr className="border-b border-slate-200 bg-slate-50/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                {/* Bank Transactions Sub-columns */}
                                <th className="py-3 px-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.length === tableRows.length && tableRows.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded-xs border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </th>
                                <th className="py-3 px-3">
                                    <div className="flex items-center gap-1 cursor-pointer select-none">
                                        <span>DATE</span>
                                        <LuArrowUpDown className="w-3 h-3 text-slate-400" />
                                    </div>
                                </th>
                                <th className="py-3 px-4">DESCRIPTION</th>
                                <th className="py-3 px-4 text-right border-r border-slate-200">AMOUNT</th>

                                {/* Matched System Records Sub-columns */}
                                <th className="py-3 px-4">MATCHED RECORD</th>
                                <th className="py-3 px-3">TYPE</th>
                                <th className="py-3 px-4 text-right">AMOUNT</th>
                                <th className="py-3 px-4 border-r border-slate-200">
                                    <div className="flex items-center gap-1">
                                        <span>STATUS</span>
                                    </div>
                                </th>

                                {/* Action Sub-columns */}
                                <th className="py-3 px-4 text-center">ACTION</th>
                                <th className="py-3 px-4 text-center">AUDIT</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {tableRows.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                                    {/* Bank Transactions Cells */}
                                    <td className="py-4 px-4 align-top">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.includes(row.id)}
                                            onChange={() => toggleSelectRow(row.id)}
                                            className="w-4 h-4 rounded-xs border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="py-4 px-3 align-top font-medium text-slate-700 whitespace-nowrap">
                                        {row.date}
                                    </td>
                                    <td className="py-4 px-4 align-top max-w-[220px]">
                                        <div className="font-bold text-slate-900 leading-snug">{row.bankTitle}</div>
                                        <div className="text-slate-400 text-[11px] mt-0.5 font-normal">{row.bankSub}</div>
                                    </td>
                                    <td className="py-4 px-4 align-top text-right border-r border-slate-200 whitespace-nowrap">
                                        <div className={`font-bold text-sm ${row.isCredit ? "text-emerald-600" : "text-rose-600"}`}>
                                            {row.bankAmount}
                                        </div>
                                        <div className="text-slate-400 text-[11px] font-normal mt-0.5">
                                            {row.isCredit ? "Credit" : "Debit"}
                                        </div>
                                    </td>

                                    {/* Matched System Records Cells */}
                                    <td className="py-4 px-4 align-top max-w-[240px]">
                                        <div className="font-semibold text-slate-800 leading-snug">{row.matchedTitle}</div>
                                        <div className="text-slate-400 text-[11px] mt-0.5 font-normal">{row.matchedSub}</div>
                                    </td>
                                    <td className="py-4 px-3 align-top whitespace-nowrap">
                                        {row.matchedType === "Deposit" && (
                                            <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                Deposit
                                            </span>
                                        )}
                                        {row.matchedType === "Invoice" && (
                                            <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                                Invoice
                                            </span>
                                        )}
                                        {!row.matchedType && (
                                            <span className="text-slate-400 font-medium">—</span>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 align-top text-right font-semibold text-slate-800 whitespace-nowrap">
                                        {row.matchedAmount ? row.matchedAmount : <span className="text-slate-400 font-normal">—</span>}
                                    </td>
                                    <td className="py-4 px-4 align-top border-r border-slate-200 whitespace-nowrap">
                                        {row.status === "Matched" && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                                <FiCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                                                Matched
                                            </span>
                                        )}
                                        {row.status === "Suggested" && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                                                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                                                Suggested
                                            </span>
                                        )}
                                        {row.status === "Unmatched" && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                                                <FiAlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                                Unmatched
                                            </span>
                                        )}
                                        {row.status === "New Record Needed" && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                                                <FiCheckCircle className="w-3.5 h-3.5 text-rose-600" />
                                                New Record Needed
                                            </span>
                                        )}
                                    </td>

                                    {/* Action & Audit Cells */}
                                    <td className="py-4 px-4 align-top text-center whitespace-nowrap">
                                        <button
                                            onClick={() => handleActionClick(row)}
                                            className="text-blue-600 hover:text-blue-800 font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                                        >
                                            {row.actionLabel === "View" && <FiEye className="w-3.5 h-3.5" />}
                                            <span>{row.actionLabel}</span>
                                        </button>
                                    </td>
                                    <td className="py-4 px-4 align-top text-center whitespace-nowrap">
                                        <button
                                            onClick={() => handleOpenAudit(row)}
                                            title="View audit history"
                                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer inline-block"
                                        >
                                            <FiClock className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer Pagination */}
                <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
                    <div>
                        Showing 1 to {tableRows.length} of 24 unmatched transactions
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Page Numbers */}
                        <div className="flex items-center gap-1">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <FiChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(1)}
                                className={`px-3 py-1 rounded-md font-semibold ${currentPage === 1 ? "bg-blue-600 text-white" : "border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"}`}
                            >
                                1
                            </button>
                            <button
                                onClick={() => setCurrentPage(2)}
                                className={`px-3 py-1 rounded-md font-semibold ${currentPage === 2 ? "bg-blue-600 text-white" : "border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"}`}
                            >
                                2
                            </button>
                            <button
                                onClick={() => setCurrentPage(3)}
                                className={`px-3 py-1 rounded-md font-semibold ${currentPage === 3 ? "bg-blue-600 text-white" : "border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"}`}
                            >
                                3
                            </button>
                            <span className="px-1 text-slate-400">...</span>
                            <button
                                onClick={() => setCurrentPage(5)}
                                className={`px-3 py-1 rounded-md font-semibold ${currentPage === 5 ? "bg-blue-600 text-white" : "border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"}`}
                            >
                                5
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(5, p + 1))}
                                className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-100 cursor-pointer"
                            >
                                <FiChevronRight className="w-3.5 h-3.5 text-slate-600" />
                            </button>
                        </div>

                        {/* Rows Per Page Dropdown */}
                        <div className="flex items-center gap-2">
                            <span>Rows per page:</span>
                            <div className="relative">
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                                    className="appearance-none bg-white border border-slate-300 rounded-md px-3 py-1 pr-7 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                                <FiChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* BOTTOM SUMMARY & INFO BANNER SECTION - Exact Match to Screenshot */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                {/* Left Card: Reconciliation Summary */}
                <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
                    <h3 className="text-xs font-bold text-[#0B1E48] uppercase tracking-wider">
                        RECONCILIATION SUMMARY
                    </h3>

                    <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-normal">Bank Balance (Statement)</span>
                            <span className="font-bold text-slate-900 text-sm tracking-tight">$142,450.22</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-normal">Ledger Balance</span>
                            <span className="font-bold text-slate-900 text-sm tracking-tight">$138,210.15</span>
                        </div>

                        <div className="border-t border-slate-200/80 pt-3 flex items-center justify-between">
                            <span className="font-bold text-[#B91C1C]">Current Difference</span>
                            <span className="font-bold text-[#B91C1C] text-sm tracking-tight">$4,240.07</span>
                        </div>
                    </div>
                </div>

                {/* Right Card: Did you know? Info Banner */}
                <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs flex items-start gap-4">
                    <div className="p-3 bg-blue-50/70 text-[#0B1E48] rounded-xl flex items-center justify-center flex-shrink-0">
                        <FiInfo className="w-6 h-6 text-[#0B1E48]" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                            Did you know?
                        </h4>
                        <p className="text-slate-500 text-xs sm:text-[13px] leading-relaxed">
                            The &apos;Auto Match&apos; algorithm uses transaction date windows, exact amounts, and vendor name fuzzy matching to suggest connections with 95% accuracy. Review suggested matches before finalizing.
                        </p>
                    </div>
                </div>
            </div>

            {/* Audit History Slide-over Modal */}
            <AuditModel
                isOpen={isAuditModelOpen}
                onClose={() => setIsAuditModelOpen(false)}
                transaction={selectedAuditTx}
            />

            {/* Export Reconciliation Report Modal */}
            <ExportStatementModel
                isOpen={isExportModelOpen}
                onClose={() => setIsExportModelOpen(false)}
                onExport={(data) => {
                    showToast(`Reconciliation report exported in ${data.format.toUpperCase()} format!`);
                }}
            />

            {/* Auto Match 3-Step Modal */}
            <AutoMatchModel
                isOpen={isAutoMatchModelOpen}
                onClose={() => setIsAutoMatchModelOpen(false)}
                unreconciledCount={24}
                onComplete={(count) => {
                    showToast(`Successfully auto-matched ${count} transactions!`);
                }}
            />

            {/* Select Ledger Record Modal */}
            <SelectLedgerModel
                isOpen={isSelectLedgerOpen}
                onClose={() => setIsSelectLedgerOpen(false)}
                bankTransaction={selectedLedgerTx}
                onConfirmMatch={(ledger) => {
                    showToast(`Matched with ${ledger.invoiceNo} successfully!`);
                }}
            />
        </div>
    );
}


