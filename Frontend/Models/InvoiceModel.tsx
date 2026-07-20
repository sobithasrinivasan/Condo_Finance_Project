"use client";

import React from "react";
import { FiCheck, FiX, FiEye, FiCreditCard, FiFileText } from "react-icons/fi";

export interface InvoiceDetailsType {
    id?: string;
    vendor?: string;
    invoiceNo?: string;
    invoiceDate?: string;
    dueDate?: string;
    amount?: string;
    status?: "Pending" | "Approved" | "Paid" | "Rejected" | "Duplicate";
    paymentTerms?: string;
    category?: string;
}

interface InvoiceModelProps {
    invoice?: InvoiceDetailsType | null;
    onClose?: () => void;
    onApprove?: (id?: string) => void;
    onMarkAsPaid?: (id?: string) => void;
    onReject?: (id?: string) => void;
}

export default function InvoiceModel({
    invoice,
    onClose,
    onApprove,
    onMarkAsPaid,
    onReject,
}: InvoiceModelProps) {
    // Default fallback to exact screenshot data if no invoice object is passed
    const data: InvoiceDetailsType = {
        vendor: invoice?.vendor || "ABC Plumbing",
        invoiceNo: invoice?.invoiceNo || "INV-1001",
        invoiceDate: invoice?.invoiceDate || "Jul 10, 2026",
        dueDate: invoice?.dueDate || "Jul 25, 2026",
        amount: invoice?.amount || "$1,250.00",
        status: invoice?.status || "Pending",
        paymentTerms: invoice?.paymentTerms || "Net 15",
        category: invoice?.category || "Plumbing Maintenance",
        id: invoice?.id || "1",
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_10px_40px_rgba(0,0,0,0.1)] overflow-hidden max-w-4xl w-full font-sans text-slate-800 transition-all my-4">
            {/* Header Title */}
            <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 text-[#1A56DB]">
                        <FiFileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-[#0B1E48]">
                            Invoice Details
                        </h2>
                        <p className="text-xs text-slate-400">
                            {data.invoiceNo} — {data.vendor}
                        </p>
                    </div>
                </div>

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

            {/* Modal Body: Clean 2-Column Grid Layout */}
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">

                {/* Left Column: Taller Document Preview Box */}
                <div className="md:col-span-5 bg-[#F1F4FA] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center border border-slate-100/80 min-h-[380px] sm:min-h-[420px] relative group">
                    {/* Expanded Document Card */}
                    <div className="bg-white rounded-xl shadow-md border border-slate-200/80 p-6 w-52 sm:w-64 h-72 sm:h-84 flex flex-col justify-between items-center relative overflow-hidden select-none transition-transform group-hover:scale-[1.02] duration-200">
                        {/* Top Document Header Line */}
                        <div className="w-full space-y-2 border-b border-slate-100 pb-3">
                            <div className="flex justify-between items-center">
                                <div className="w-16 h-3.5 bg-slate-200/90 rounded" />
                                <div className="w-10 h-2.5 bg-blue-200/60 rounded" />
                            </div>
                            <div className="w-32 h-2 bg-slate-100 rounded" />
                        </div>

                        {/* Mid Document Rows Skeleton */}
                        <div className="w-full space-y-2.5 my-3">
                            <div className="w-full h-2 bg-slate-100 rounded" />
                            <div className="w-4/5 h-2 bg-slate-100 rounded" />
                            <div className="w-full h-2 bg-slate-100 rounded" />
                        </div>

                        {/* Center Interactive Preview Eye Icon */}
                        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-[#1A56DB] border border-blue-100 shadow-sm my-auto transition-transform group-hover:scale-110">
                            <FiEye className="w-7 h-7 stroke-[2]" />
                        </div>

                        {/* Bottom Document Skeleton Total */}
                        <div className="w-full pt-3 border-t border-slate-100 flex justify-between items-center">
                            <div className="w-10 h-2 bg-slate-200 rounded" />
                            <div className="w-16 h-4 bg-slate-300/80 rounded" />
                        </div>
                    </div>

                    <span className="text-xs font-semibold text-slate-500 mt-4 flex items-center gap-1.5">
                        <FiEye className="w-3.5 h-3.5 text-[#1A56DB]" />
                        Click to preview full document
                    </span>
                </div>

                {/* Right Column: Key-Value Details & Action Buttons */}
                <div className="md:col-span-7 flex flex-col justify-between space-y-6">

                    {/* Key - Value Info List */}
                    <div className="space-y-4">
                        {/* Row 1: Vendor */}
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-slate-500 font-medium">Vendor</span>
                            <span className="font-bold text-slate-900">{data.vendor}</span>
                        </div>

                        {/* Row 2: Invoice Number */}
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-slate-500 font-medium">Invoice Number</span>
                            <span className="font-bold text-slate-900">{data.invoiceNo}</span>
                        </div>

                        {/* Row 3: Invoice Date */}
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-slate-500 font-medium">Invoice Date</span>
                            <span className="font-bold text-slate-800">{data.invoiceDate}</span>
                        </div>

                        {/* Row 4: Due Date */}
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-slate-500 font-medium">Due Date</span>
                            <span className="font-bold text-slate-800">{data.dueDate}</span>
                        </div>

                        {/* Row 5: Amount Due */}
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-slate-500 font-medium">Amount Due</span>
                            <span className="font-bold text-slate-900 text-sm sm:text-base">
                                {data.amount}
                            </span>
                        </div>

                        {/* Row 6: Status */}
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-slate-500 font-medium">Status</span>
                            <div>
                                {data.status === "Pending" && (
                                    <span className="bg-[#FEF3C7] text-[#D97706] text-xs font-semibold px-3.5 py-1 rounded-full border border-amber-200/60 inline-flex items-center justify-center">
                                        Pending
                                    </span>
                                )}
                                {data.status === "Approved" && (
                                    <span className="bg-[#DCFCE7] text-[#16A34A] text-xs font-semibold px-3.5 py-1 rounded-full border border-emerald-200/60 inline-flex items-center justify-center">
                                        Approved
                                    </span>
                                )}
                                {data.status === "Paid" && (
                                    <span className="bg-[#EFF6FF] text-[#2563EB] text-xs font-semibold px-3.5 py-1 rounded-full border border-blue-200/60 inline-flex items-center justify-center">
                                        Paid
                                    </span>
                                )}
                                {data.status === "Duplicate" && (
                                    <span className="bg-[#FFE4E6] text-[#E11D48] text-xs font-semibold px-3.5 py-1 rounded-full border border-rose-200/60 inline-flex items-center justify-center">
                                        Duplicate
                                    </span>
                                )}
                                {data.status === "Rejected" && (
                                    <span className="bg-[#FEE2E2] text-[#DC2626] text-xs font-semibold px-3.5 py-1 rounded-full border border-red-200/60 inline-flex items-center justify-center">
                                        Rejected
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Row 7: Payment Terms */}
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-slate-500 font-medium">Payment Terms</span>
                            <span className="font-bold text-slate-800">{data.paymentTerms}</span>
                        </div>

                        {/* Row 8: Category */}
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-slate-500 font-medium">Category</span>
                            <span className="font-bold text-slate-800">{data.category}</span>
                        </div>
                    </div>

                    {/* Bottom Action Buttons matching screenshot design */}
                    <div className="grid grid-cols-3 gap-2.5 pt-5 border-t border-slate-100">
                        {/* Green Solid Approve Button */}
                        <button
                            onClick={() => onApprove && onApprove(data.id)}
                            className="bg-[#008A4B] hover:bg-[#00753F] active:bg-[#006034] text-white font-semibold text-xs sm:text-sm py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs border border-emerald-700/20 whitespace-nowrap"
                        >
                            <FiCheck className="w-4 h-4 stroke-[2.5]" />
                            <span>Approve</span>
                        </button>

                        {/* Blue Outline Mark as Paid Button */}
                        <button
                            onClick={() => onMarkAsPaid && onMarkAsPaid(data.id)}
                            className="bg-white border-2 border-[#1A56DB] text-[#1A56DB] hover:bg-blue-50/80 font-semibold text-xs sm:text-sm py-2.5 px-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                        >
                            <FiCreditCard className="w-4 h-4 stroke-[2]" />
                            <span>Mark as Paid</span>
                        </button>

                        {/* Red Outline Reject Invoice Button */}
                        <button
                            onClick={() => onReject && onReject(data.id)}
                            className="bg-white border-2 border-[#EF4444] text-[#EF4444] hover:bg-red-50/80 font-semibold text-xs sm:text-sm py-2.5 px-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                        >
                            <FiX className="w-4 h-4 stroke-[2.5]" />
                            <span>Reject Invoice</span>
                        </button>
                    </div>

                </div>

            </div>
        </div>
    );
}
