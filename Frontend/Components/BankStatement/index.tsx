"use client";

import React, { useEffect, useState } from "react";
import VerfiyMatchModel from "@/Models/BankStatementModel/VerfiyMatchModel";
import ConfirmVerifyModel from "@/Models/BankStatementModel/ConfirmVerifyModel";
import CreateManualMatch, { SearchableInvoiceOption } from "@/Models/BankStatementModel/Manual/CreateManualMatch";
import ConfirmManualMatch from "@/Models/BankStatementModel/Manual/ConfirmManualMatch";
import ManualMatchSuccess from "@/Models/BankStatementModel/Manual/ManualMatchSuccess";
import ProcessAllModel from "@/Models/BankStatementModel/ProcessAllModel";
import StatementViewDrawer, { StatementViewData, StatementViewTransaction } from "@/Models/BankStatementModel/StatementViewDrawer";
import DeleteConfirmModel from "@/Models/BankStatementModel/DeleteConfirmModel";
import {
    FiUpload,
    FiClock,
    FiFileText,
    FiMoreVertical,
    FiFilter,
    FiChevronRight,
    FiCheckCircle,
    FiXCircle,
    FiInfo,
    FiX,
    FiUploadCloud,
    FiEye,
    FiTrash2
} from "react-icons/fi";
import { getBankStatementApi, deleteBankStatementApi, uploadBankStatementApi, getSingleExtractionStatusApi } from "@/api/BankStatement/bankStatementApi";
import { formatDateDisplay } from "@/lib/format";
import toast from "react-hot-toast";

interface StatementHistoryItem {
    id: string;
    filename: string;
    filesize: string;
    period: string;
    uploadedDate: string;
    status: "Processed" | "Failed" | string;
}

interface VerificationTransaction {
    id: string;
    date: string;
    description: string;
    reference: string;
    type: "CREDIT" | "DEBIT";
    amount: string;
    isPositive: boolean;
    matchedInvoiceNo?: string;
    matchedInvoiceDesc?: string;
    hasMatch: boolean;
    isVerified?: boolean;
}

function mapToHistoryItem(raw: any): StatementHistoryItem {
    const month = raw.period_month?.toString().padStart(2, "0") ?? "";
    const year = raw.period_year ?? "";
    const period = month && year
        ? new Date(`${year}-${month}-01`).toLocaleString("en-US", { month: "short", year: "numeric" })
        : "—";

    return {
        id: String(raw.id),
        filename: raw.file_name ?? "Unknown File",
        filesize: raw.file_url ? "" : "",
        period,
        uploadedDate: formatDateDisplay(raw.created_at),
        status: raw.status ?? "Failed",
    };
}

function mapToTransaction(raw: any): VerificationTransaction {
    const amount = parseFloat(raw.amount ?? 0);
    const type: "CREDIT" | "DEBIT" = raw.type?.toUpperCase() === "CREDIT" ? "CREDIT" : "DEBIT";
    const isPositive = type === "CREDIT";
    const formattedAmount = isPositive
        ? `$${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `-$${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return {
        id: String(raw.id),
        date: formatDateDisplay(raw.transaction_date),
        description: raw.description ?? "—",
        reference: raw.id ? `Ref: TXN-${raw.id}` : "—",
        type,
        amount: formattedAmount,
        isPositive,
        hasMatch: raw.reconciled ?? false,
        isVerified: raw.ocr_verified ?? false,
    };
}

export default function BankStatement() {
    const [history, setHistory] = useState<StatementHistoryItem[]>([]);
    const [transactions, setTransactions] = useState<VerificationTransaction[]>([]);
    const [activeStatementName, setActiveStatementName] = useState<string>("");
    const [allRawStatements, setAllRawStatements] = useState<any[]>([]);

    const [selectedStatement, setSelectedStatement] = useState<StatementViewData | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<StatementHistoryItem | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [verifyingTx, setVerifyingTx] = useState<VerificationTransaction | null>(null);
    const [confirmedSuccessTx, setConfirmedSuccessTx] = useState<VerificationTransaction | null>(null);
    const [manualMatchTx, setManualMatchTx] = useState<VerificationTransaction | null>(null);
    const [confirmManualState, setConfirmManualState] = useState<{
        tx: VerificationTransaction;
        inv: SearchableInvoiceOption;
    } | null>(null);
    const [manualSuccessState, setManualSuccessState] = useState<{
        tx: VerificationTransaction;
        inv: SearchableInvoiceOption;
    } | null>(null);
    const [isProcessAllModalOpen, setIsProcessAllModalOpen] = useState<boolean>(false);
    const [trigger, setTrigger] = useState<number>(0)

    const fetchBankStatement = async () => {
        try {
            const result = await getBankStatementApi();
            const rows: any[] = result?.data ?? [];
            const historyItems = rows.map(mapToHistoryItem);
            setHistory(historyItems);

            if (rows.length > 0) {
                const latest = rows[0];
                setActiveStatementName(latest.file_name ?? "");
                const txs: VerificationTransaction[] = (latest.transactions ?? []).map(mapToTransaction);
                setTransactions(txs);
            }

            if (result?.data?.length == 0) {
                setTransactions([])
            }

            setAllRawStatements(rows);
        } catch (error) {
            console.error("Error fetching bank statements:", error);
        }
    };

    useEffect(() => {
        fetchBankStatement();
    }, [trigger]);

    const handleContinueManualMatch = (selectedInv: SearchableInvoiceOption) => {
        if (manualMatchTx) {
            setConfirmManualState({ tx: manualMatchTx, inv: selectedInv });
            setManualMatchTx(null);
        }
    };

    const handleFinalConfirmManualMatch = () => {
        if (confirmManualState) {
            const updatedTx: VerificationTransaction = {
                ...confirmManualState.tx,
                hasMatch: true,
                matchedInvoiceNo: confirmManualState.inv.invoiceNo,
                matchedInvoiceDesc: confirmManualState.inv.description,
                isVerified: true,
            };
            setTransactions(transactions.map((item) => (item.id === confirmManualState.tx.id ? updatedTx : item)));
            setManualSuccessState(confirmManualState);
            setConfirmManualState(null);
        }
    };

    const handleConfirmVerifyMatch = () => {
        if (verifyingTx) {
            setTransactions(transactions.map((item) => (item.id === verifyingTx.id ? { ...item, isVerified: true } : item)));
            setConfirmedSuccessTx(verifyingTx);
            setVerifyingTx(null);
        }
    };

    const handleConfirmProcessAll = () => {
        setTransactions(transactions.map((t) => (t.hasMatch ? { ...t, isVerified: true } : t)));
        setIsProcessAllModalOpen(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    };

    const handleUploadSubmit = async () => {
        if (!selectedFile) return;
        setIsUploading(true);
        try {
            let payload = {
                files: selectedFile,
                doc_types: "BANK_STATEMENT"
            }
            let res = await uploadBankStatementApi(payload)
            if (res) {
                let statusInterval = setInterval(async () => {
                    const status = await getSingleExtractionStatusApi(res?.[0]?.document_id);
                    if (status?.status === "COMPLETED") {
                        toast.success("Bank statement processed successfully!");
                        clearInterval(statusInterval);
                        setTrigger(prev => prev + 1)
                        setIsUploading(false);
                        setIsUploadModalOpen(false);
                        setSelectedFile(null);
                    }
                    if (status?.status === "FAILED") {
                        toast.error("Bank statement processing failed!");
                        clearInterval(statusInterval);
                        setIsUploading(false);
                        setIsUploadModalOpen(false);
                        setSelectedFile(null);
                    }
                }, 2000);
            } else {
                toast.error(res.message)
            }
        } catch (error) {
            console.log(error)
        } finally {

        }
    };

    return (
        <div className="space-y-6 font-sans text-slate-800 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B1E48]">
                        Bank Statement Upload
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Upload and process bank statements to automatically extract transactions and match with invoices.
                    </p>
                </div>

                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-[#1A56DB] hover:bg-[#1448C4] active:bg-[#0E3A9E] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all border border-blue-700/30 whitespace-nowrap self-start md:self-auto"
                >
                    <FiUpload className="w-4 h-4" />
                    <span>Upload Statement</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                <div className="lg:col-span-12 bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#0B1E48]">
                            <FiClock className="w-5 h-5 text-[#1A56DB]" />
                            <h2 className="text-base font-bold">Upload History</h2>
                        </div>
                        <button
                            className="text-[#1A56DB] text-xs font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <span>View All History</span>
                            <FiChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/70 bg-white">
                                    <th className="py-3 px-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        STATEMENT NAME
                                    </th>
                                    <th className="py-3 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        PERIOD
                                    </th>
                                    <th className="py-3 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        UPLOADED ON
                                    </th>
                                    <th className="py-3 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        STATUS
                                    </th>
                                    <th className="py-3 px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center whitespace-nowrap"></th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 text-xs">
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-slate-400">
                                            No statements found.
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((item) => {
                                        const isActive = activeStatementName === item.filename;
                                        return (
                                            <tr
                                                key={item.id}
                                                onClick={() => {
                                                    const raw = allRawStatements.find((r) => String(r.id) === item.id);
                                                    if (!raw) return;
                                                    setActiveStatementName(item.filename);
                                                    const txs: VerificationTransaction[] = (raw.transactions ?? []).map(mapToTransaction);
                                                    setTransactions(txs);
                                                }}
                                                className={`transition-colors cursor-pointer ${isActive
                                                    ? "bg-blue-50/50 hover:bg-blue-50/70 font-medium"
                                                    : "hover:bg-slate-50/70"
                                                    }`}
                                            >
                                                <td className="py-3 px-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-8 rounded bg-red-50 text-red-600 border border-red-200/70 flex items-center justify-center font-extrabold text-[9px] uppercase tracking-tighter shrink-0">
                                                            PDF
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <span className="font-bold text-slate-800 block text-xs truncate max-w-[140px]">
                                                                {item.filename}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                                                    {item.period}
                                                </td>

                                                <td className="py-3 px-3 whitespace-nowrap">
                                                    <div className="text-slate-700 font-medium">{item.uploadedDate}</div>
                                                </td>

                                                <td className="py-3 px-3 whitespace-nowrap">
                                                    {item.status === "Processed" ? (
                                                        <span className="bg-[#DCFCE7] text-[#16A34A] text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200/60 inline-flex items-center gap-1">
                                                            <FiCheckCircle className="w-3 h-3 text-[#16A34A]" />
                                                            <span>Processed</span>
                                                        </span>
                                                    ) : (
                                                        <span className="bg-[#FFE4E6] text-[#E11D48] text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-rose-200/60 inline-flex items-center gap-1">
                                                            <FiXCircle className="w-3 h-3 text-[#E11D48]" />
                                                            <span>{item.status || "Failed"}</span>
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3 px-2 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const raw = allRawStatements.find((r) => String(r.id) === item.id);
                                                                if (!raw) return;
                                                                const drawerTxs: StatementViewTransaction[] = (raw.transactions ?? []).map((t: any) => ({
                                                                    ...mapToTransaction(t),
                                                                    reconciled: t.reconciled ?? false,
                                                                    ocr_verified: t.ocr_verified ?? false,
                                                                }));
                                                                setSelectedStatement({
                                                                    id: item.id,
                                                                    filename: item.filename,
                                                                    period: item.period,
                                                                    uploadedDate: item.uploadedDate,
                                                                    status: item.status,
                                                                    transactionCount: drawerTxs.length,
                                                                    transactions: drawerTxs,
                                                                });
                                                            }}
                                                            title="View Statement"
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                                        >
                                                            <FiEye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDeleteTarget(item);
                                                            }}
                                                            title="Delete Statement"
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                                        >
                                                            <FiTrash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="pt-1 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <FiInfo className="w-3.5 h-3.5 text-slate-400" />
                        <span>Showing latest {history.length} uploads</span>
                    </div>
                </div>

                {/* <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#0B1E48]">
                            <FiFileText className="w-5 h-5 text-[#1A56DB]" />
                            <h2 className="text-base font-bold">Transactions Awaiting Verification</h2>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => alert("Filter transactions")}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                            >
                                <FiFilter className="w-3.5 h-3.5 text-slate-500" />
                                <span>Filter</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
                        <div className="flex items-center gap-1">
                            <span className="text-slate-500 font-medium">Source:</span>
                            <button className="text-[#1A56DB] font-bold hover:underline cursor-pointer">
                                {activeStatementName || "—"}
                            </button>
                        </div>
                        <span className="text-slate-400 font-medium">
                            {transactions.length} transactions found
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/70 bg-white">
                                    <th className="py-3.5 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">DATE</th>
                                    <th className="py-3.5 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">DESCRIPTION</th>
                                    <th className="py-3.5 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">TYPE</th>
                                    <th className="py-3.5 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">AMOUNT</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 text-xs">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-slate-400">
                                            No transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                                                {t.date}
                                            </td>

                                            <td className="py-3.5 px-3 whitespace-nowrap">
                                                <div className="font-bold text-slate-800">{t.description}</div>
                                                <div className="text-[11px] text-slate-400 font-medium">{t.reference}</div>
                                            </td>

                                            <td className="py-3.5 px-3 whitespace-nowrap">
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

                                            <td className="py-3.5 px-3 whitespace-nowrap">
                                                <span className={`font-bold ${t.isPositive ? "text-[#16A34A]" : "text-[#E11D48]"}`}>
                                                    {t.amount}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-slate-400 font-medium">
                            {transactions.length} transactions
                        </span>
                    </div>
                </div> */}

            </div>

            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-blue-50 text-[#1A56DB]">
                                    <FiUploadCloud className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">Upload Bank Statement</h3>
                                    <p className="text-xs text-slate-400">Supports PDF, CSV, or Excel files</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsUploadModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                                <FiX className="w-4 h-4" />
                            </button>
                        </div>

                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors space-y-3 ${isDragging
                                ? "border-blue-500 bg-blue-50/50"
                                : "border-slate-200 hover:border-blue-500 bg-slate-50/50"
                                }`}
                        >
                            <FiUploadCloud className="w-10 h-10 text-[#1A56DB] mx-auto" />
                            <div>
                                <label className="text-xs font-bold text-[#1A56DB] hover:underline cursor-pointer">
                                    Click to browse files
                                    <input
                                        type="file"
                                        accept=".pdf,.csv,.xlsx"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                                <p className="text-xs text-slate-400 mt-1">or drag & drop statement here</p>
                            </div>
                            {selectedFile && (
                                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800 truncate">
                                    📄 {selectedFile.name}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setIsUploadModalOpen(false)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUploadSubmit}
                                disabled={!selectedFile || isUploading}
                                className="px-4 py-2 rounded-xl bg-[#1A56DB] hover:bg-[#1448C4] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                            >
                                {isUploading ? "Uploading..." : "Upload & Extract"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {verifyingTx && (
                <VerfiyMatchModel
                    isOpen={!!verifyingTx}
                    onClose={() => setVerifyingTx(null)}
                    onConfirmMatch={handleConfirmVerifyMatch}
                    transaction={{
                        date: verifyingTx.date,
                        description: verifyingTx.description,
                        referenceNo: verifyingTx.reference,
                        type: verifyingTx.type,
                        amount: verifyingTx.amount,
                    }}
                    matchedInvoice={{
                        invoiceNo: verifyingTx.matchedInvoiceNo || "—",
                        vendor: verifyingTx.matchedInvoiceDesc || "—",
                        invoiceDate: "—",
                        dueDate: "—",
                        invoiceAmount: verifyingTx.amount.replace("-", ""),
                        status: "Approved",
                    }}
                />
            )}

            {confirmedSuccessTx && (
                <ConfirmVerifyModel
                    isOpen={!!confirmedSuccessTx}
                    onClose={() => setConfirmedSuccessTx(null)}
                    details={{
                        invoiceNo: confirmedSuccessTx.matchedInvoiceNo || "—",
                        vendor: confirmedSuccessTx.matchedInvoiceDesc || "—",
                        amountPaid: confirmedSuccessTx.amount.replace("-", ""),
                        paymentDate: confirmedSuccessTx.date,
                        paymentMethod: "Bank Statement",
                        referenceNo: confirmedSuccessTx.reference.replace("Ref: ", ""),
                    }}
                />
            )}

            {manualMatchTx && (
                <CreateManualMatch
                    isOpen={!!manualMatchTx}
                    onClose={() => setManualMatchTx(null)}
                    onContinue={handleContinueManualMatch}
                    transaction={{
                        date: manualMatchTx.date,
                        description: manualMatchTx.description,
                        referenceNo: manualMatchTx.reference.replace("Ref: ", ""),
                        type: manualMatchTx.type,
                        amount: manualMatchTx.amount,
                    }}
                />
            )}

            {confirmManualState && (
                <ConfirmManualMatch
                    isOpen={!!confirmManualState}
                    onClose={() => setConfirmManualState(null)}
                    onBack={() => {
                        setManualMatchTx(confirmManualState.tx);
                        setConfirmManualState(null);
                    }}
                    onConfirmMatch={handleFinalConfirmManualMatch}
                    transaction={{
                        date: confirmManualState.tx.date,
                        description: confirmManualState.tx.description,
                        referenceNo: confirmManualState.tx.reference.replace("Ref: ", ""),
                        type: confirmManualState.tx.type,
                        amount: confirmManualState.tx.amount,
                    }}
                    selectedInvoice={{
                        invoiceNo: confirmManualState.inv.invoiceNo,
                        vendor: confirmManualState.inv.description,
                        invoiceDate: confirmManualState.inv.date,
                        dueDate: "—",
                        invoiceAmount: confirmManualState.tx.amount,
                        status: "Approved",
                    }}
                />
            )}

            {manualSuccessState && (
                <ManualMatchSuccess
                    isOpen={!!manualSuccessState}
                    onClose={() => setManualSuccessState(null)}
                    details={{
                        invoiceNo: manualSuccessState.inv.invoiceNo,
                        vendor: manualSuccessState.inv.description,
                        amountPaid: manualSuccessState.tx.amount.replace("-", ""),
                        paymentDate: manualSuccessState.tx.date,
                        paymentMethod: "Bank Statement",
                        referenceNo: manualSuccessState.tx.reference.replace("Ref: ", ""),
                    }}
                />
            )}

            {isProcessAllModalOpen && (
                <ProcessAllModel
                    isOpen={isProcessAllModalOpen}
                    onClose={() => setIsProcessAllModalOpen(false)}
                    onConfirmProcessAll={handleConfirmProcessAll}
                    matchedCount={transactions.filter((t) => t.hasMatch && !t.isVerified).length}
                    matchedItems={transactions
                        .filter((t) => t.hasMatch && !t.isVerified)
                        .map((t) => ({
                            invoiceNo: t.matchedInvoiceNo || "—",
                            vendor: t.matchedInvoiceDesc || t.description,
                            amount: t.amount.replace("-", ""),
                        }))}
                />
            )}

            <StatementViewDrawer
                isOpen={!!selectedStatement}
                onClose={() => setSelectedStatement(null)}
                statement={selectedStatement}
            />

            <DeleteConfirmModel
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                filename={deleteTarget?.filename ?? ""}
                onConfirm={async () => {
                    try {
                        await deleteBankStatementApi(deleteTarget?.id ?? "");
                        toast.success(`"${deleteTarget?.filename}" deleted successfully.`);
                        setDeleteTarget(null);
                        setActiveStatementName("")
                        await fetchBankStatement();
                    } catch (error: any) {
                        toast.error(error?.response?.data?.detail ?? "Failed to delete statement. Please try again.");
                    }
                }}
            />
        </div>
    );
}