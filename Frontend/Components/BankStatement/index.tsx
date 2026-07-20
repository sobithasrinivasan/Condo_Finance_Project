"use client";

import React, { useState } from "react";
import VerfiyMatchModel from "@/Models/BankStatementModel/VerfiyMatchModel";
import ConfirmVerifyModel from "@/Models/BankStatementModel/ConfirmVerifyModel";
import CreateManualMatch, { SearchableInvoiceOption } from "@/Models/BankStatementModel/Manual/CreateManualMatch";
import ConfirmManualMatch from "@/Models/BankStatementModel/Manual/ConfirmManualMatch";
import ManualMatchSuccess from "@/Models/BankStatementModel/Manual/ManualMatchSuccess";
import ProcessAllModel from "@/Models/BankStatementModel/ProcessAllModel";
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
    FiCheck,
    FiPlus,
    FiChevronsRight,
    FiX,
    FiUploadCloud
} from "react-icons/fi";

interface StatementHistoryItem {
    id: string;
    filename: string;
    filesize: string;
    period: string;
    uploadedDate: string;
    uploadedTime: string;
    status: "Processed" | "Failed";
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

export default function BankStatement() {
    const [history] = useState<StatementHistoryItem[]>([
        {
            id: "1",
            filename: "June 2026 Statement.pdf",
            filesize: "2.4 MB",
            period: "June 2026",
            uploadedDate: "Jul 14, 2026",
            uploadedTime: "10:30 AM",
            status: "Processed",
        },
        {
            id: "2",
            filename: "May 2026 Statement.pdf",
            filesize: "2.1 MB",
            period: "May 2026",
            uploadedDate: "Jun 14, 2026",
            uploadedTime: "09:15 AM",
            status: "Processed",
        },
        {
            id: "3",
            filename: "April 2026 Statement.pdf",
            filesize: "1.8 MB",
            period: "Apr 2026",
            uploadedDate: "May 14, 2026",
            uploadedTime: "11:20 AM",
            status: "Processed",
        },
        {
            id: "4",
            filename: "March 2026 Statement.pdf",
            filesize: "2.0 MB",
            period: "Mar 2026",
            uploadedDate: "Apr 15, 2026",
            uploadedTime: "02:45 PM",
            status: "Failed",
        },
        {
            id: "5",
            filename: "February 2026 Statement.pdf",
            filesize: "1.9 MB",
            period: "Feb 2026",
            uploadedDate: "Mar 14, 2026",
            uploadedTime: "09:00 AM",
            status: "Processed",
        },
    ]);

    const [transactions, setTransactions] = useState<VerificationTransaction[]>([
        {
            id: "t1",
            date: "Jul 10, 2026",
            description: "HOA Deposit Unit 1",
            reference: "Ref: DEP-1001",
            type: "CREDIT",
            amount: "$1,100.00",
            isPositive: true,
            matchedInvoiceNo: "INV-1023",
            matchedInvoiceDesc: "HOA Deposit Unit 1",
            hasMatch: true,
            isVerified: false,
        },
        {
            id: "t2",
            date: "Jul 09, 2026",
            description: "ABC Plumbing",
            reference: "Ref: CP-7854",
            type: "DEBIT",
            amount: "-$1,250.00",
            isPositive: false,
            matchedInvoiceNo: "INV-1008",
            matchedInvoiceDesc: "ABC Plumbing Service",
            hasMatch: true,
            isVerified: false,
        },
        {
            id: "t3",
            date: "Jul 08, 2026",
            description: "Electric Company",
            reference: "Ref: EL-5542",
            type: "DEBIT",
            amount: "-$450.75",
            isPositive: false,
            matchedInvoiceNo: "INV-1012",
            matchedInvoiceDesc: "Electricity Bill",
            hasMatch: true,
            isVerified: false,
        },
        {
            id: "t4",
            date: "Jul 07, 2026",
            description: "Amazon Charge",
            reference: "Ref: AMZ-3345",
            type: "CREDIT",
            amount: "$89.99",
            isPositive: true,
            hasMatch: false,
            isVerified: false,
        },
        {
            id: "t5",
            date: "Jul 06, 2026",
            description: "Bank Interest",
            reference: "Ref: INT-6621",
            type: "CREDIT",
            amount: "$12.45",
            isPositive: true,
            hasMatch: false,
            isVerified: false,
        },
    ]);

    const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
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

    const handleVerifyMatch = (t: VerificationTransaction) => {
        setVerifyingTx(t);
    };

    const handleOpenManualMatch = (t: VerificationTransaction) => {
        setManualMatchTx(t);
    };

    const handleContinueManualMatch = (selectedInv: SearchableInvoiceOption) => {
        if (manualMatchTx) {
            setConfirmManualState({
                tx: manualMatchTx,
                inv: selectedInv,
            });
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
            setTransactions(
                transactions.map((item) => (item.id === confirmManualState.tx.id ? updatedTx : item))
            );
            setManualSuccessState(confirmManualState);
            setConfirmManualState(null);
        }
    };

    const handleConfirmVerifyMatch = () => {
        if (verifyingTx) {
            setTransactions(
                transactions.map((item) => (item.id === verifyingTx.id ? { ...item, isVerified: true } : item))
            );
            setConfirmedSuccessTx(verifyingTx);
            setVerifyingTx(null);
        }
    };

    const handleProcessAllMatches = () => {
        setIsProcessAllModalOpen(true);
    };

    const handleConfirmProcessAll = () => {
        setTransactions(
            transactions.map((t) => (t.hasMatch ? { ...t, isVerified: true } : t))
        );
        setIsProcessAllModalOpen(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUploadSubmit = () => {
        if (!selectedFile) return;
        setIsUploading(true);
        setTimeout(() => {
            setIsUploading(false);
            setIsUploadModalOpen(false);
            setSelectedFile(null);
            alert("Bank statement uploaded and processed successfully!");
        }, 1500);
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

                <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#0B1E48]">
                            <FiClock className="w-5 h-5 text-[#1A56DB]" />
                            <h2 className="text-base font-bold">
                                Upload History
                            </h2>
                        </div>

                        <button
                            onClick={() => alert("Showing complete history...")}
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
                                    <th className="py-3 px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 text-xs">
                                {history.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3 px-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-8 rounded bg-red-50 text-red-600 border border-red-200/70 flex items-center justify-center font-extrabold text-[9px] uppercase tracking-tighter shrink-0">
                                                    PDF
                                                </div>
                                                <div className="space-y-0.5">
                                                    <span className="font-bold text-slate-800 block text-xs truncate max-w-[140px]">
                                                        {item.filename}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 font-medium block">
                                                        {item.filesize}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                                            {item.period}
                                        </td>

                                        <td className="py-3 px-3 whitespace-nowrap">
                                            <div className="text-slate-700 font-medium">{item.uploadedDate}</div>
                                            <div className="text-[11px] text-slate-400">{item.uploadedTime}</div>
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
                                                    <span>Failed</span>
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-3 px-2 text-center whitespace-nowrap">
                                            <button
                                                onClick={() => alert(`Actions for ${item.filename}`)}
                                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                            >
                                                <FiMoreVertical className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="pt-1 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <FiInfo className="w-3.5 h-3.5 text-slate-400" />
                        <span>Showing latest 5 uploads</span>
                    </div>
                </div>

                <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#0B1E48]">
                            <FiFileText className="w-5 h-5 text-[#1A56DB]" />
                            <h2 className="text-base font-bold">
                                Transactions Awaiting Verification
                            </h2>
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
                                June 2026 Statement.pdf
                            </button>
                        </div>
                        <span className="text-slate-400 font-medium">
                            5 transactions found
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/70 bg-white">
                                    <th className="py-3.5 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        DATE
                                    </th>
                                    <th className="py-3.5 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        DESCRIPTION
                                    </th>
                                    <th className="py-3.5 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        TYPE
                                    </th>
                                    <th className="py-3.5 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        AMOUNT
                                    </th>
                                    <th className="py-3.5 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        MATCHED INVOICE
                                    </th>
                                    <th className="py-3.5 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">
                                        ACTION
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 text-xs">
                                {transactions.map((t) => (
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

                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            {t.hasMatch ? (
                                                <div>
                                                    <div className="font-bold text-slate-900">{t.matchedInvoiceNo}</div>
                                                    <div className="text-[11px] text-slate-500 font-medium">{t.matchedInvoiceDesc}</div>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <span className="bg-[#FEF3C7] text-[#D97706] text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200/60 inline-block">
                                                        No Match Found
                                                    </span>
                                                    <div>
                                                        <button
                                                            onClick={() => handleOpenManualMatch(t)}
                                                            className="text-[#1A56DB] text-[11px] font-semibold hover:underline cursor-pointer block"
                                                        >
                                                            Create Manual Match
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                            {t.isVerified ? (
                                                <span className="text-emerald-600 font-bold text-xs flex items-center justify-center gap-1">
                                                    <FiCheck className="w-4 h-4 stroke-[2.5]" /> Verified
                                                </span>
                                            ) : t.hasMatch ? (
                                                <button
                                                    onClick={() => handleVerifyMatch(t)}
                                                    className="bg-[#1A56DB] hover:bg-[#1448C4] active:bg-[#0E3A9E] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer transition-all border border-blue-700/30 whitespace-nowrap mx-auto"
                                                >
                                                    <FiCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                                                    <span>Verify Match</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleOpenManualMatch(t)}
                                                    className="bg-white border-2 border-[#1A56DB] text-[#1A56DB] hover:bg-blue-50/80 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap mx-auto"
                                                >
                                                    <FiPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                                                    <span>Create Match</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-slate-400 font-medium">
                            {transactions.length} transactions
                        </span>

                        <button
                            onClick={handleProcessAllMatches}
                            className="text-[#1A56DB] font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <span>Process All Matches</span>
                            <FiChevronsRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

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
                                    <h3 className="font-bold text-slate-900 text-sm">
                                        Upload Bank Statement
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Supports PDF, CSV, or Excel files
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsUploadModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                                <FiX className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50/50 space-y-3">
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
                        invoiceNo: verifyingTx.matchedInvoiceNo || "INV-1008",
                        vendor: verifyingTx.matchedInvoiceDesc || "ABC Plumbing Service",
                        invoiceDate: "Jul 05, 2026",
                        dueDate: "Jul 20, 2026",
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
                        invoiceNo: confirmedSuccessTx.matchedInvoiceNo || "INV-1008",
                        vendor: confirmedSuccessTx.matchedInvoiceDesc || "ABC Plumbing Service",
                        amountPaid: confirmedSuccessTx.amount.replace("-", ""),
                        paymentDate: confirmedSuccessTx.date,
                        paymentMethod: "Bank Statement",
                        referenceNo: confirmedSuccessTx.reference.replace("Ref: ", ""),
                    }}
                />)}

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
                        dueDate: "Jul 10, 2026",
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
                    matchedCount={transactions.filter((t) => t.hasMatch && !t.isVerified).length || 3}
                    matchedItems={transactions
                        .filter((t) => t.hasMatch && !t.isVerified)
                        .map((t) => ({
                            invoiceNo: t.matchedInvoiceNo || "INV-1000",
                            vendor: t.matchedInvoiceDesc || t.description,
                            amount: t.amount.replace("-", ""),
                        }))}
                />
            )}
        </div>
    );
}
