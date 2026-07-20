"use client";

import React from "react";
import { FiCheck, FiX } from "react-icons/fi";

export interface PaymentDetailsType {
    invoiceNo?: string;
    vendor?: string;
    amountPaid?: string;
    paymentDate?: string;
    paymentMethod?: string;
    referenceNo?: string;
}

interface ConfirmVerifyModelProps {
    isOpen?: boolean;
    onClose?: () => void;
    details?: PaymentDetailsType | null;
}

export default function ConfirmVerifyModel({
    isOpen = true,
    onClose,
    details,
}: ConfirmVerifyModelProps) {
    if (!isOpen) return null;

    const payment: PaymentDetailsType = {
        invoiceNo: details?.invoiceNo || "INV-1008",
        vendor: details?.vendor || "ABC Plumbing Service",
        amountPaid: details?.amountPaid || "$1,250.00",
        paymentDate: details?.paymentDate || "Jul 09, 2026",
        paymentMethod: details?.paymentMethod || "Bank Statement",
        referenceNo: details?.referenceNo || "CP-7854",
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 font-sans text-slate-800">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-xl w-full p-6 text-center space-y-5 relative overflow-hidden">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Close Modal"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                )}

                <div className="space-y-3 pt-2">
                    <div className="w-14 h-14 rounded-full bg-[#00A859] text-white flex items-center justify-center mx-auto shadow-sm">
                        <FiCheck className="w-8 h-8 stroke-[3]" />
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-lg sm:text-xl font-bold text-[#0B1E48]">
                            Match Confirmed Successfully!
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                            This invoice has been marked as Paid and will be reflected in the invoice list.
                        </p>
                    </div>
                </div>

                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-5 space-y-3 text-left shadow-2xs">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base border-b border-emerald-200/60 pb-2">
                        Payment Details
                    </h3>

                    <div className="space-y-2.5 text-xs sm:text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">Invoice No.</span>
                            <span className="font-bold text-slate-900">{payment.invoiceNo}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">Vendor</span>
                            <span className="font-bold text-slate-900 truncate max-w-[170px]" title={payment.vendor}>
                                {payment.vendor}
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">Amount Paid</span>
                            <span className="font-bold text-slate-900">{payment.amountPaid}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">Payment Date</span>
                            <span className="font-bold text-slate-900">{payment.paymentDate}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">Payment Method</span>
                            <span className="font-bold text-slate-900">{payment.paymentMethod}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">Reference No.</span>
                            <span className="font-bold text-slate-900">{payment.referenceNo}</span>
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        onClick={onClose}
                        className="bg-[#1A56DB] hover:bg-[#1448C4] active:bg-[#0E3A9E] text-white font-bold text-xs sm:text-sm px-8 py-2.5 rounded-xl cursor-pointer transition-all shadow-xs border border-blue-700/30 whitespace-nowrap mx-auto block"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
