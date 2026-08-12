"use client";

import React, { useEffect, useState } from "react";
import { formatDateDisplay } from "@/lib/format";
import AuditModel from "@/Models/BankReconciliationModel/AuditModel";
import ExportStatementModel from "@/Models/BankReconciliationModel/ExportStatementModel";
import AutoMatchModel from "@/Models/BankReconciliationModel/AutoMatchModel";
import SelectLedgerModel from "@/Models/BankReconciliationModel/SelectLedgerModel";
import ViewModel from "@/Models/BankReconciliationModel/ViewModel";
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
import { getReconciliationSummaryApi, getAllTransactionsApi, getTransactionAuditApi, exportReconciliationApi, reconcileStatementApi, updateReconciliationRecordApi } from "@/api/BankReconciliation/BankReconciliationApi";
import Pagination from "@/Components/Common/Pagination";

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
    id: string | number;
    bank_statement_id?: number;
    transaction_date?: string;
    description?: string;
    amount?: number | string;
    type?: "Credit" | "Debit" | string;
    ocr_verified?: number;
    reconciled?: number;
    created_at?: string;
    created_by?: number;
    updated_by?: number;
    updated_at?: string;
    is_active?: number;
    version?: number;
    reconciliation_id?: number;
    reconciliation_type?: string | null;
    reconciliation_status?: string;
    match_score?: number;
    payment_status?: string;
    matched_record_name?: string;

    // Derived / legacy UI properties
    date?: string;
    bankTitle?: string;
    bankSub?: string;
    bankAmount?: string;
    isCredit?: boolean;
    matchedTitle?: string;
    matchedSub?: string;
    matchedType?: "Deposit" | "Invoice" | null;
    matchedAmount?: string | null;
    status?: "Matched" | "Suggested" | "Unmatched" | "New Record Needed" | string;
    actionLabel?: "View" | "Confirm Match" | "Select Ledger" | "No record Found" | string;
    reconciliations?: any[];
}

export default function BankReconciliation() {
    const [activeTab, setActiveTab] = useState<"unmatched" | "matched" | "ignored">("unmatched");
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const [isAuditModelOpen, setIsAuditModelOpen] = useState(false);
    const [selectedAuditTx, setSelectedAuditTx] = useState<{ title: string; reference: string; amount: string; auditTrail?: any[] } | null>(null);

    const [isExportModelOpen, setIsExportModelOpen] = useState(false);

    const [isAutoMatchModelOpen, setIsAutoMatchModelOpen] = useState(false);

    const [isSelectLedgerOpen, setIsSelectLedgerOpen] = useState(false);
    const [selectedLedgerTx, setSelectedLedgerTx] = useState<{
        id: string;
        description: string;
        amount: string;
        date: string;
        reference: string;
        statement: string;
        reconciliations?: any[];
    } | null>(null);

    const [isViewModelOpen, setIsViewModelOpen] = useState(false);
    const [selectedViewTx, setSelectedViewTx] = useState<ReconciliationTableItem | null>(null);

    const [reconciliationSummary, setReconciliationSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);

    const fetchReconciliationSummary = async () => {
        try {
            const result = await getReconciliationSummaryApi();
            setReconciliationSummary(result);
        } catch (error) {
            console.error("Failed to fetch reconciliation summary:", error);
        }
    };

    const fetchTransactions = async () => {
        if (activeTab === "ignored") {
            setTableRows([]);
            setTotalCount(0);
            setTotalPages(1);
            return;
        }
        setIsLoading(true);
        try {
            const isReconciled = activeTab === "matched";
            const response = await getAllTransactionsApi({
                page: currentPage,
                page_size: rowsPerPage,
                reconciled: isReconciled,
            });

            console.log(response, 'response')
            if (response && Array.isArray(response.data)) {
                setTableRows(response.data);
                setTotalCount(response.pagination?.total ?? response.data.length);
                setTotalPages(response.pagination?.total_pages ?? 1);
            }
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReconciliationSummary();
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [currentPage, rowsPerPage, activeTab]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    const getRowData = (row: any) => {
        const tx = row.transaction || {};
        const recs = row.reconciliations || [];
        const rec = recs.length > 0 ? recs[0] : null;

        const isMultiple = !tx.reconciled && recs.length > 1;

        const rowId = String(tx.id);
        const formattedDate = formatDateDisplay(tx.created_at || tx.transaction_date || tx.date || "");
        const bankTitle = tx.description || "—";
        const bankSub = tx.bank_statement_id ? `Ref: BS-00${tx.bank_statement_id}` : (rec?.matched_record_name || tx.matched_record_name ? `Ref: ${rec?.matched_record_name || tx.matched_record_name}` : "—");
        const isCredit = tx.isCredit !== undefined ? tx.isCredit : tx.type === "Credit";
        const bankAmount = typeof tx.amount === "number" ? `$${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : (tx.amount ? `$${tx.amount}` : "$0.00");

        const matchedTitle = isMultiple ? "Multiple Matches Found" : (rec?.matched_record_name || tx.matched_record_name || "—");
        const matchedSub = isMultiple ? `${recs.length} suggested records` : (rec?.reconciliation_type && rec?.id ? `${rec.reconciliation_type} #${rec.id}` : rec?.reconciliation_type || tx.reconciliation_type || "—");
        const matchedType = isMultiple ? null : (rec?.reconciliation_type || tx.reconciliation_type || null);
        const matchedAmount = isMultiple ? null : (rec?.matched_record_name && typeof tx.amount === "number" ? `$${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : null);

        const rawStatus = tx.reconciled ? "Matched" : (isMultiple ? "Suggested" : (rec?.status || "Unmatched"));
        const status = rawStatus as "Matched" | "Suggested" | "Unmatched" | "New Record Needed" | "NeedsReview" | "Unresolved";

        const actionLabel = tx.reconciled ? "View" : (
            (status === "Unmatched" || status === "Unresolved") ? "—" :
                (isMultiple ? "Select Ledger" : (recs.length > 0 ? "Confirm Match" : "Select Ledger"))
        );

        return {
            rowId,
            formattedDate,
            bankTitle,
            bankSub,
            isCredit,
            bankAmount,
            matchedTitle,
            matchedSub,
            matchedType,
            matchedAmount,
            status,
            actionLabel,
        };
    };

    const handleOpenAudit = async (row: any) => {
        const { bankTitle, bankSub, bankAmount } = getRowData(row);
        let trail = [];
        const recId = row.reconciliations?.[0]?.id;
        if (recId) {
            try {
                const res = await getTransactionAuditApi(row.reconciliation_id);
                trail = res?.audit_trail || [];
            } catch (error) {
                console.error("Failed to fetch transaction audit:", error);
            }
        }
        setSelectedAuditTx({
            title: bankTitle,
            reference: bankSub,
            amount: bankAmount,
            auditTrail: trail
        });
        setIsAuditModelOpen(true);
    };

    const handleOpenSelectLedger = (row: any) => {
        const { bankTitle, bankAmount, formattedDate, bankSub, rowId } = getRowData(row);
        setSelectedLedgerTx({
            id: rowId,
            description: bankTitle,
            amount: bankAmount,
            date: formattedDate,
            reference: bankSub,
            statement: "June 2026 Statement.pdf",
            reconciliations: row.reconciliations || []
        });
        setIsSelectLedgerOpen(true);
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const [tableRows, setTableRows] = useState<any>([]);

    const unmatchedCount = reconciliationSummary?.unreconciled_count ?? 0;
    const matchedCount = reconciliationSummary?.reconciled_count ?? 0;
    const ignoredCount = 0;

    const toggleSelectRow = (id: string | number) => {
        const idStr = String(id);
        if (selectedRows.includes(idStr)) {
            setSelectedRows(selectedRows.filter(r => r !== idStr));
        } else {
            setSelectedRows([...selectedRows, idStr]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedRows.length === tableRows.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(tableRows.map((r: any) => String(r.transaction.id)));
        }
    };

    const handleActionClick = async (row: any) => {
        const data = getRowData(row);
        if (data.actionLabel === "Confirm Match") {
            const rec = row.reconciliations?.[0];
            if (rec && rec.id) {
                try {
                    const payload = {
                        status: "Matched",
                        resolution_notes: rec.resolution_notes || "",
                        reconciliation_type: rec.reconciliation_type || "Invoice",
                        reference_id: rec.reference_id || 0
                    };
                    await updateReconciliationRecordApi(rec.id, payload);
                    showToast(`Match confirmed for ${data.bankTitle}!`);
                    fetchReconciliationSummary();
                    fetchTransactions();
                } catch (error) {
                    console.error("Match confirmation failed:", error);
                    showToast("Failed to confirm match. Please try again.");
                }
            } else {
                setTableRows((prev: any) => prev.map((r: any) =>
                    String(r.transaction.id) === data.rowId
                        ? {
                            ...r,
                            transaction: { ...r.transaction, reconciled: 1 },
                            reconciliations: r.reconciliations.map((recItem: any) => ({ ...recItem, status: "Matched" }))
                        }
                        : r
                ));
                showToast(`Match confirmed for ${data.bankTitle}!`);
            }
        } else if (data.actionLabel === "View") {
            setSelectedViewTx({
                id: data.rowId,
                date: data.formattedDate,
                bankTitle: data.bankTitle,
                bankSub: data.bankSub,
                bankAmount: data.bankAmount,
                isCredit: data.isCredit,
                matchedTitle: data.matchedTitle,
                matchedSub: data.matchedSub,
                matchedType: data.matchedType,
                matchedAmount: data.matchedAmount,
                status: data.status,
                actionLabel: "View"
            });
            setIsViewModelOpen(true);
        } else if (data.actionLabel === "Select Ledger") {
            handleOpenSelectLedger(row);
        } else if (data.actionLabel === "No record Found") {
        }
    };

    const handleAutoMatch = () => {
        setIsAutoMatchModelOpen(true);
    };


    console.log(tableRows, 'tableRows')
    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            {toastMessage && (
                <div className="fixed top-6 right-6 z-50 bg-[#0F172A] text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-300">
                    <FiCheckCircle className="text-emerald-400 w-5 h-5 flex-shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-bold text-[#0B1E48] tracking-tight">
                        Bank Reconciliation
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 font-normal">
                        Reconcile bank transactions with ledger entries to ensure financial accuracy.
                    </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                    <button
                        disabled={selectedRows.length === 0}
                        onClick={() => setIsExportModelOpen(true)}
                        className="flex items-center gap-2 bg-[#F4F6FA] enabled:hover:bg-slate-100 border border-slate-300 text-[#0F2942] font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shadow-2xs transition-colors enabled:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FiDownload className="w-4 h-4 text-[#0F2942]" />
                        <span>Export Statement</span>
                    </button>

                    <button
                        onClick={handleAutoMatch}
                        className="flex items-center gap-2 bg-[#0B46AD] enabled:hover:bg-[#093C96] enabled:active:bg-[#072F77] text-white font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shadow-sm transition-colors enabled:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <LuWand className="w-4 h-4 text-white" />
                        <span>Auto Match</span>
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-1 mt-6">
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



            <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden mt-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
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

                            <tr className="border-b border-slate-200 bg-slate-50/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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

                                <th className="py-3 px-4">MATCHED RECORD</th>
                                <th className="py-3 px-3">TYPE</th>
                                <th className="py-3 px-4 text-right">AMOUNT</th>
                                <th className="py-3 px-4 border-r border-slate-200">
                                    <div className="flex items-center gap-1">
                                        <span>STATUS</span>
                                    </div>
                                </th>

                                <th className="py-3 px-4 text-center">ACTION</th>
                                <th className="py-3 px-4 text-center">AUDIT</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-8 text-slate-400">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-[#0B46AD]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Loading transactions...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : tableRows.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-8 text-slate-400">
                                        No transactions found.
                                    </td>
                                </tr>
                            ) : (
                                tableRows.map((row: any) => {
                                    const {
                                        rowId,
                                        formattedDate,
                                        bankTitle,
                                        bankSub,
                                        isCredit,
                                        bankAmount,
                                        matchedTitle,
                                        matchedSub,
                                        matchedType,
                                        matchedAmount,
                                        status,
                                        actionLabel,
                                    } = getRowData(row);

                                    return (
                                        <tr key={rowId} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-4 px-4 align-top">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.includes(rowId)}
                                                    onChange={() => toggleSelectRow(rowId)}
                                                    className="w-4 h-4 rounded-xs border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className="py-4 px-3 align-top font-medium text-slate-700 whitespace-nowrap">
                                                {formattedDate}
                                            </td>
                                            <td className="py-4 px-4 align-top max-w-[220px]">
                                                <div className="font-bold text-slate-900 leading-snug">{bankTitle}</div>
                                                <div className="text-slate-400 text-[11px] mt-0.5 font-normal">{bankSub}</div>
                                            </td>
                                            <td className="py-4 px-4 align-top text-right border-r border-slate-200 whitespace-nowrap">
                                                <div className={`font-bold text-sm ${isCredit ? "text-emerald-600" : "text-rose-600"}`}>
                                                    {bankAmount}
                                                </div>
                                                <div className="text-slate-400 text-[11px] font-normal mt-0.5">
                                                    {isCredit ? "Credit" : "Debit"}
                                                </div>
                                            </td>

                                            <td className="py-4 px-4 align-top max-w-[240px]">
                                                <div className="font-semibold text-slate-800 leading-snug">{matchedTitle}</div>
                                                <div className="text-slate-400 text-[11px] mt-0.5 font-normal">{matchedSub}</div>
                                            </td>
                                            <td className="py-4 px-3 align-top whitespace-nowrap">
                                                {matchedType === "Deposit" && (
                                                    <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                        Deposit
                                                    </span>
                                                )}
                                                {matchedType === "Invoice" && (
                                                    <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                                        Invoice
                                                    </span>
                                                )}
                                                {!matchedType && (
                                                    <span className="text-slate-400 font-medium">—</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 align-top text-right font-semibold text-slate-800 whitespace-nowrap">
                                                {matchedAmount ? matchedAmount : <span className="text-slate-400 font-normal">—</span>}
                                            </td>
                                            <td className="py-4 px-4 align-top border-r border-slate-200 whitespace-nowrap">
                                                {status === "Matched" && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                                        <FiCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                                                        Matched
                                                    </span>
                                                )}
                                                {(status === "Suggested" || status === "NeedsReview") && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                                                        <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                                                        {status === "NeedsReview" ? "Needs Review" : "Suggested"}
                                                    </span>
                                                )}
                                                {(status === "Unmatched" || status === "Unresolved") && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                                                        <FiAlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                                        {status === "Unresolved" ? "Unresolved" : "Unmatched"}
                                                    </span>
                                                )}
                                                {status === "New Record Needed" && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                                                        <FiCheckCircle className="w-3.5 h-3.5 text-rose-600" />
                                                        New Record Needed
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-4 px-4 align-top text-center whitespace-nowrap">
                                                {actionLabel === "—" ? (
                                                    <span className="text-slate-400 font-normal">—</span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleActionClick(row)}
                                                        className="text-blue-600 hover:text-blue-800 font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                                                    >
                                                        {actionLabel === "View" && <FiEye className="w-3.5 h-3.5" />}
                                                        <span>{actionLabel}</span>
                                                    </button>
                                                )}
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
                                    );
                                }))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/40">
                    <div className="flex-1 w-full">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalCount={totalCount}
                            rowsPerPage={rowsPerPage}
                            onPageChange={setCurrentPage}
                            description={`Showing ${tableRows.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to ${Math.min(currentPage * rowsPerPage, totalCount)} of ${totalCount} ${activeTab} transactions`}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium px-5 py-3.5 border-t sm:border-t-0 sm:border-l border-slate-200">
                        <span>Rows per page:</span>
                        <div className="relative">
                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="appearance-none bg-white border border-slate-300 rounded-md px-3 py-1 pr-7 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
                    <h3 className="text-xs font-bold text-[#0B1E48] uppercase tracking-wider">
                        RECONCILIATION SUMMARY
                    </h3>

                    <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-normal">Total Credits</span>
                            <span className="font-bold text-slate-900 text-sm tracking-tight">${reconciliationSummary?.total_credits}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-normal">Total Debits</span>
                            <span className="font-bold text-slate-900 text-sm tracking-tight">${reconciliationSummary?.total_debits}</span>
                        </div>

                        <div className="border-t border-slate-200/80 pt-3 flex items-center justify-between">
                            <span className="font-bold text-[#B91C1C]">Bank Balance (Statement)</span>
                            <span className="font-bold text-[#B91C1C] text-sm tracking-tight">${((Number(reconciliationSummary?.total_credits) || 0) - (Number(reconciliationSummary?.total_debits) || 0)).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

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

            <AuditModel
                isOpen={isAuditModelOpen}
                onClose={() => setIsAuditModelOpen(false)}
                transaction={selectedAuditTx}
            />

            <ExportStatementModel
                isOpen={isExportModelOpen}
                onClose={() => setIsExportModelOpen(false)}
                onExport={async (data) => {
                    showToast(`Starting export in ${data.format.toUpperCase()} format...`);
                    try {
                        const selectedStatements = tableRows
                            .filter((row: any) => selectedRows.includes(String(row.transaction.id)))
                            .map((row: any) => row.transaction.bank_statement_id)
                            .filter((id: any): id is number => id !== undefined && id !== null);

                        const response = await exportReconciliationApi({
                            format: data.format,
                            sections: data.sections.filter(s => s !== "auditHistory"),
                            include_audit: data.sections.includes("auditHistory"),
                            bank_statement_ids: selectedStatements,
                        });

                        const contentType = response.headers['content-type'];
                        const blob = new Blob([response.data], {
                            type: typeof contentType === 'string' ? contentType : undefined
                        });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;

                        // Extract filename from response headers or default
                        const disposition = response.headers['content-disposition'];
                        const dispositionStr = typeof disposition === 'string' ? disposition : '';
                        let filename = `reconciliation_report.${data.format === 'excel' ? 'xlsx' : data.format}`;
                        if (dispositionStr && dispositionStr.indexOf('attachment') !== -1) {
                            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                            const matches = filenameRegex.exec(dispositionStr);
                            if (matches != null && matches[1]) {
                                filename = matches[1].replace(/['"]/g, '');
                            }
                        }

                        link.setAttribute('download', filename);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        window.URL.revokeObjectURL(url);

                        showToast(`Export completed successfully!`);
                    } catch (error) {
                        console.error("Export failed:", error);
                        showToast(`Failed to export reconciliation report.`);
                    }
                }}
            />

            <AutoMatchModel
                isOpen={isAutoMatchModelOpen}
                onClose={() => setIsAutoMatchModelOpen(false)}
                unreconciledCount={unmatchedCount}
                statementIds={Array.from(new Set(
                    tableRows
                        .map((row: any) => row.transaction.bank_statement_id)
                        .filter((id: any): id is number => id !== undefined && id !== null)
                ))}
                onComplete={(count) => {
                    showToast(`Successfully auto-matched ${count} transactions!`);
                    fetchReconciliationSummary();
                    fetchTransactions();
                }}
            />

            <SelectLedgerModel
                isOpen={isSelectLedgerOpen}
                onClose={() => setIsSelectLedgerOpen(false)}
                bankTransaction={selectedLedgerTx}
                onConfirmMatch={async (ledger) => {
                    try {
                        if (ledger?.reconciliation_id) {
                            const payload = {
                                status: "Matched",
                                resolution_notes: ledger?.resolution_notes || "",
                                reconciliation_type: ledger?.reconciliation_type || "Invoice",
                                reference_id: ledger?.reference_id || 0
                            };
                            await updateReconciliationRecordApi(ledger.reconciliation_id, payload);
                        } else {
                            await new Promise(resolve => setTimeout(resolve, 800));
                        }

                        setTableRows((prev: any) => prev.map((r: any) =>
                            String(r.transaction.id) === selectedLedgerTx?.id
                                ? {
                                    ...r,
                                    transaction: { ...r.transaction, reconciled: 1 },
                                    reconciliations: r.reconciliations.map((recItem: any) =>
                                        String(recItem.id) === ledger.id ? { ...recItem, status: "Matched" } : recItem
                                    )
                                }
                                : r
                        ));
                        showToast(`Matched with ${ledger.invoiceNo} successfully!`);
                        fetchReconciliationSummary();
                        fetchTransactions();
                    } catch (error) {
                        console.error("Match failed:", error);
                        showToast("Failed to match transaction. Please try again.");
                        throw error;
                    }
                }}
            />

            <ViewModel
                isOpen={isViewModelOpen}
                onClose={() => setIsViewModelOpen(false)}
                transaction={selectedViewTx}
            // onDownloadStatement={onDownloadStatement}
            />
        </div>
    );
}


