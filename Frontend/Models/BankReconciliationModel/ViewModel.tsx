"use client";

import React from "react";
import { FiX, FiDownload, FiFileText } from "react-icons/fi";

export interface ReconciliationTableItem {
    id?: string | number;
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
}

interface ViewModelProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: ReconciliationTableItem | null;
    // onDownloadStatement?: (tx: ReconciliationTableItem) => void;
}

export default function ViewModel({
    isOpen,
    onClose,
    transaction,
    // onDownloadStatement,
}: ViewModelProps) {
    if (!isOpen || !transaction) return null;

    const isCredit = transaction.isCredit;
    const cleanRef = (transaction.bankSub || "").replace("Ref: ", "").replace("Ref:", "").trim();

    const amountColor = isCredit ? "text-emerald-600" : "text-rose-600";

    const invoiceDate = "Jul 05, 2026";
    const dueDate = "Jul 20, 2026";
    const matchedOn = "Jul 15, 2026 10:18 AM";
    const matchedBy = "John Smith";
    const confidence = "98%";

    const hasMatchedRecord = transaction.status === "Matched" || transaction.status === "Suggested";

    return (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans text-slate-800">
            <div
                onClick={onClose}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-300 cursor-default"
            />

            <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-10">
                <div className="w-screen max-w-md sm:max-w-lg md:max-w-xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-200/80">

                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white flex-shrink-0">
                        <h2 className="text-base sm:text-lg font-bold text-[#0B1E48] tracking-tight">
                            Reconciliation Details
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Close"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto space-y-6">

                        <div className="flex items-start justify-between gap-4 pb-2 border-b border-slate-100">
                            <div className="space-y-1">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                                    Transaction: {transaction.bankTitle}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                    <FiFileText className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Reference: {cleanRef}</span>
                                </p>
                            </div>

                            <div className="flex-shrink-0">
                                {transaction.status === "Matched" && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                        Matched
                                    </span>
                                )}
                                {transaction.status === "Suggested" && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80">
                                        Suggested
                                    </span>
                                )}
                                {transaction.status === "Unmatched" && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                                        Unmatched
                                    </span>
                                )}
                                {transaction.status === "New Record Needed" && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                                        New Record Needed
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0A1835] text-white text-[11px] font-bold">
                                    1
                                </div>
                                <span className="text-xs font-extrabold text-[#0B46AD] tracking-wider uppercase">
                                    BANK TRANSACTION
                                </span>
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3.5 text-xs sm:text-sm pl-7">
                                <div className="text-slate-500 font-medium">Date</div>
                                <div className="text-slate-900 font-semibold">{transaction.date}</div>

                                <div className="text-slate-500 font-medium">Description</div>
                                <div className="text-slate-900 font-semibold">{transaction.bankTitle}</div>

                                <div className="text-slate-500 font-medium">Transaction Type</div>
                                <div className="text-slate-900 font-semibold">{isCredit ? "Credit" : "Debit"}</div>

                                <div className="text-slate-500 font-medium">Amount</div>
                                <div className={`font-bold ${amountColor}`}>{transaction.bankAmount}</div>

                                <div className="text-slate-500 font-medium">Reference</div>
                                <div className="text-slate-900 font-semibold">{cleanRef}</div>

                                <div className="text-slate-500 font-medium">Source Statement</div>
                                <div className="text-slate-900 font-semibold">June 2026 Statement.pdf</div>
                            </div>

                            <div className="pl-7 pt-1">
                                <button
                                    onClick={() => alert("Viewing Statement: June 2026 Statement.pdf")}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                                >
                                    <FiFileText className="w-3.5 h-3.5" />
                                    <span>View Statement</span>
                                </button>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        <div className="space-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0A1835] text-white text-[11px] font-bold">
                                    2
                                </div>
                                <span className="text-xs font-extrabold text-[#0B46AD] tracking-wider uppercase">
                                    MATCHED SYSTEM RECORD
                                </span>
                            </div>

                            {hasMatchedRecord ? (
                                <>
                                    <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3.5 text-xs sm:text-sm pl-7">
                                        <div className="text-slate-500 font-medium">Record Type</div>
                                        <div>
                                            <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${transaction.matchedType === "Deposit"
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                                : "bg-purple-50 text-purple-700 border border-purple-100"
                                                }`}>
                                                {transaction.matchedType || "Invoice"}
                                            </span>
                                        </div>

                                        <div className="text-slate-500 font-medium">
                                            {transaction.matchedType === "Deposit" ? "Deposit Ref" : "Invoice No."}
                                        </div>
                                        <div className="text-slate-900 font-semibold">{transaction.matchedTitle}</div>

                                        <div className="text-slate-500 font-medium">
                                            {transaction.matchedType === "Deposit" ? "Received From" : "Vendor"}
                                        </div>
                                        <div className="text-slate-900 font-semibold">{transaction.matchedSub}</div>

                                        <div className="text-slate-500 font-medium">
                                            {transaction.matchedType === "Deposit" ? "Deposit Date" : "Invoice Date"}
                                        </div>
                                        <div className="text-slate-900 font-semibold">{invoiceDate}</div>

                                        {transaction.matchedType !== "Deposit" && (
                                            <>
                                                <div className="text-slate-500 font-medium">Due Date</div>
                                                <div className="text-slate-900 font-semibold">{dueDate}</div>
                                            </>
                                        )}

                                        <div className="text-slate-500 font-medium">Amount</div>
                                        <div className="text-slate-900 font-bold">{transaction.matchedAmount || transaction.bankAmount}</div>

                                        <div className="text-slate-500 font-medium">Status</div>
                                        <div>
                                            <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                Matched
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pl-7 pt-1">
                                        <button
                                            onClick={() => alert(`Viewing Matched Record: ${transaction.matchedTitle}`)}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                                        >
                                            <FiFileText className="w-3.5 h-3.5" />
                                            <span>{transaction.matchedType === "Deposit" ? "View Deposit Receipt" : "View Invoice"}</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-xs sm:text-sm text-slate-500 pl-7 italic">
                                    No matched system record found. This transaction needs to be matched manually.
                                </div>
                            )}
                        </div>

                        <hr className="border-slate-100" />

                        <div className="space-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0A1835] text-white text-[11px] font-bold">
                                    3
                                </div>
                                <span className="text-xs font-extrabold text-[#0B46AD] tracking-wider uppercase">
                                    MATCH INFORMATION
                                </span>
                            </div>

                            {hasMatchedRecord ? (
                                <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3.5 text-xs sm:text-sm pl-7">
                                    <div className="text-slate-500 font-medium">Match Type</div>
                                    <div className="text-slate-900 font-semibold">
                                        {transaction.status === "Matched" ? "Manual Match" : "Auto Match"}
                                    </div>

                                    <div className="text-slate-500 font-medium">Matched By</div>
                                    <div className="text-slate-900 font-semibold">{matchedBy}</div>

                                    <div className="text-slate-500 font-medium">Matched On</div>
                                    <div className="text-slate-900 font-semibold">{matchedOn}</div>

                                    <div className="text-slate-500 font-medium">Confidence</div>
                                    <div className="text-slate-900 font-semibold">{confidence}</div>
                                </div>
                            ) : (
                                <div className="text-xs sm:text-sm text-slate-500 pl-7 italic">
                                    Match information not available.
                                </div>
                            )}
                        </div>

                        <hr className="border-slate-100" />

                        <div className="space-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0A1835] text-white text-[11px] font-bold">
                                    4
                                </div>
                                <span className="text-xs font-extrabold text-[#0B46AD] tracking-wider uppercase">
                                    NOTES
                                </span>
                            </div>

                            <div className="pl-7">
                                <div className="bg-[#F8FAFC] border border-slate-200/60 rounded-xl p-4 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                                    {hasMatchedRecord
                                        ? "Vendor name, amount and transaction date matched successfully."
                                        : "This transaction is currently unmatched. Search the ledger or create a new entry to reconcile."
                                    }
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-4 flex-shrink-0">
                        <button
                            // onClick={() => {
                            //     if (onDownloadStatement) {
                            //         onDownloadStatement(transaction);
                            //     } else {
                            //         alert(`Downloading June 2026 Statement.pdf for transaction: ${transaction.bankTitle}`);
                            //     }
                            // }}
                            className="flex items-center gap-2 border border-slate-350 hover:bg-slate-50 text-[#0F2942] font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer bg-white"
                        >
                            <FiDownload className="w-4 h-4 text-[#0F2942]" />
                            <span>Download Statement</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="border border-slate-300 hover:bg-slate-50 text-[#0F2942] font-semibold text-xs py-2.5 px-6 rounded-xl transition-colors cursor-pointer bg-white"
                        >
                            Close
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
