"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
    FiChevronRight,
    FiArrowLeft,
    FiCheck,
    FiX,
    FiEdit3,
    FiCalendar,
    FiChevronDown,
    FiCheckCircle,
    FiDownload,
    FiMaximize2,
    FiMinus,
    FiPlus,
    FiMenu,
    FiFileText
} from "react-icons/fi";

export default function ReviewExtracted() {
    const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState<number>(1);
    const totalInvoices = 10;

    const [vendorName, setVendorName] = useState("ABC Plumbing");
    const [invoiceNumber, setInvoiceNumber] = useState("INV-1001");
    const [invoiceDate, setInvoiceDate] = useState("Jul 10, 2026");
    const [dueDate, setDueDate] = useState("Jul 25, 2026");
    const [amountDue, setAmountDue] = useState("$1,250.00");
    const [description, setDescription] = useState("Monthly Plumbing Maintenance");
    const [category, setCategory] = useState("Maintenance");
    const [paymentTerms, setPaymentTerms] = useState("Net 15");

    const [isSaved, setIsSaved] = useState(false);

    const handleSave = () => {
        setIsSaved(true);
        setTimeout(() => {
            setIsSaved(false);
            if (currentInvoiceIndex < totalInvoices) {
                setCurrentInvoiceIndex((prev) => prev + 1);
            }
        }, 1200);
    };

    return (
        <div className="space-y-6 font-sans text-slate-800 pb-12">
            <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                    <Link href="/invoices" className="hover:text-blue-600 transition-colors">
                        Invoices
                    </Link>
                    <FiChevronRight className="w-3 h-3 text-slate-300" />
                    <Link href="/invoices/gmail-import" className="hover:text-blue-600 transition-colors">
                        Gmail Invoice Import
                    </Link>
                    <FiChevronRight className="w-3 h-3 text-slate-300" />
                    <span className="text-[#1A56DB]">Review Invoice</span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B1E48]">
                            Review Extracted Invoice
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                            Please review and verify the extracted information before importing the invoice.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/invoices/gmail-import"
                            className="bg-white border-2 border-[#1A56DB] text-[#1A56DB] hover:bg-blue-50/80 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-2xs flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
                        >
                            <FiArrowLeft className="w-4 h-4 stroke-[2.5]" />
                            <span>Back to Import Results</span>
                        </Link>

                        <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-2xs">
                            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                                Invoice {currentInvoiceIndex} of {totalInvoices}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    disabled={currentInvoiceIndex === 1}
                                    onClick={() => setCurrentInvoiceIndex((p) => Math.max(p - 1, 1))}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs"
                                >
                                    &lt;
                                </button>
                                <button
                                    disabled={currentInvoiceIndex === totalInvoices}
                                    onClick={() => setCurrentInvoiceIndex((p) => Math.min(p + 1, totalInvoices))}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs"
                                >
                                    &gt;
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-slate-900">
                            Original Invoice Document
                        </h2>
                        <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-md border border-emerald-200">
                            PDF
                        </span>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                        <div className="bg-[#1E293B] text-slate-300 px-4 py-2.5 flex items-center justify-between text-xs select-none">
                            <div className="flex items-center gap-3">
                                <button className="hover:text-white">
                                    <FiMenu className="w-4 h-4" />
                                </button>
                                <span>1 / 1</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button className="hover:text-white">
                                    <FiMinus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[11px] font-semibold bg-slate-700/80 px-2 py-0.5 rounded">
                                    100%
                                </span>
                                <button className="hover:text-white">
                                    <FiPlus className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <button title="Download" className="hover:text-white">
                                    <FiDownload className="w-4 h-4" />
                                </button>
                                <button title="Fullscreen" className="hover:text-white">
                                    <FiMaximize2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#525659] p-4 sm:p-6 overflow-hidden flex justify-center border-t-0">
                            <div className="bg-white rounded-sm shadow-md p-6 sm:p-8 w-full max-w-md text-xs text-slate-800 border border-slate-300 space-y-6 font-sans select-none">
                                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded bg-blue-900 text-white flex items-center justify-center font-bold text-xs">
                                                🚰
                                            </div>
                                            <span className="font-extrabold text-blue-900 text-sm tracking-wide">
                                                ABC PLUMBING
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-tight">
                                            123 Water Street<br />
                                            Miami, FL 33101<br />
                                            (305) 555-0133<br />
                                            info@abcplumbing.com
                                        </p>
                                    </div>

                                    <div className="text-right space-y-1">
                                        <h3 className="text-base font-extrabold text-blue-900 uppercase">
                                            INVOICE
                                        </h3>
                                        <div className="text-[11px] text-slate-600 space-y-0.5">
                                            <div><span className="font-semibold">Invoice #:</span> INV-1001</div>
                                            <div><span className="font-semibold">Invoice Date:</span> Jul 10, 2026</div>
                                            <div><span className="font-semibold">Due Date:</span> Jul 25, 2026</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-3 rounded border border-slate-100 text-[11px] space-y-0.5">
                                    <span className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                                        BILL TO:
                                    </span>
                                    <div className="font-semibold text-slate-800">Condo Association</div>
                                    <div className="text-slate-600">103 Ocean Drive</div>
                                    <div className="text-slate-600">Miami, FL 33139</div>
                                </div>

                                <div className="border border-slate-200 rounded overflow-hidden text-[11px]">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                                            <tr>
                                                <th className="p-2">DESCRIPTION</th>
                                                <th className="p-2 text-center">QUANTITY</th>
                                                <th className="p-2 text-right">RATE</th>
                                                <th className="p-2 text-right">AMOUNT</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            <tr>
                                                <td className="p-2 font-medium">Monthly Plumbing Maintenance</td>
                                                <td className="p-2 text-center">1</td>
                                                <td className="p-2 text-right">$1,250.00</td>
                                                <td className="p-2 text-right font-semibold">$1,250.00</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-end pt-2 text-[11px]">
                                    <div className="w-48 space-y-1 text-right">
                                        <div className="flex justify-between text-slate-600">
                                            <span>Subtotal</span>
                                            <span className="font-medium">$1,250.00</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span>Tax (0%)</span>
                                            <span className="font-medium">$0.00</span>
                                        </div>
                                        <div className="flex justify-between text-slate-900 font-bold text-xs pt-1 border-t border-slate-200">
                                            <span>Total Due</span>
                                            <span>$1,250.00</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-5 sm:p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h2 className="text-base font-bold text-slate-900">
                            Extracted Invoice Details
                        </h2>
                        <span className="bg-[#DCFCE7] text-[#16A34A] text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200/60 flex items-center gap-1.5">
                            OCR Confidence: 98%
                        </span>
                    </div>

                    <div className="space-y-3.5 text-xs sm:text-sm">

                        <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                            <label className="sm:col-span-4 font-semibold text-slate-700">
                                Vendor Name <span className="text-red-500">*</span>
                            </label>
                            <div className="sm:col-span-8 relative">
                                <select
                                    value={vendorName}
                                    onChange={(e) => setVendorName(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs appearance-none pr-8 cursor-pointer"
                                >
                                    <option value="ABC Plumbing">ABC Plumbing</option>
                                    <option value="Elevator Maintenance Co.">Elevator Maintenance Co.</option>
                                    <option value="Green Landscaping">Green Landscaping</option>
                                    <option value="Secure Guard Services">Secure Guard Services</option>
                                </select>
                                <FiChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                            <label className="sm:col-span-4 font-semibold text-slate-700">
                                Invoice Number <span className="text-red-500">*</span>
                            </label>
                            <div className="sm:col-span-8 relative">
                                <input
                                    type="text"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs pr-8"
                                />
                                <FiEdit3 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                            <label className="sm:col-span-4 font-semibold text-slate-700">
                                Invoice Date <span className="text-red-500">*</span>
                            </label>
                            <div className="sm:col-span-8 relative">
                                <input
                                    type="text"
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs pr-8"
                                />
                                <FiCalendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                            <label className="sm:col-span-4 font-semibold text-slate-700">
                                Due Date <span className="text-red-500">*</span>
                            </label>
                            <div className="sm:col-span-8 relative">
                                <input
                                    type="text"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs pr-8"
                                />
                                <FiCalendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                            <label className="sm:col-span-4 font-semibold text-slate-700">
                                Amount Due <span className="text-red-500">*</span>
                            </label>
                            <div className="sm:col-span-8">
                                <input
                                    type="text"
                                    value={amountDue}
                                    onChange={(e) => setAmountDue(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-2xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                            <label className="sm:col-span-4 font-semibold text-slate-700">
                                Description
                            </label>
                            <div className="sm:col-span-8">
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                            <label className="sm:col-span-4 font-semibold text-slate-700">
                                Category
                            </label>
                            <div className="sm:col-span-8 relative">
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs appearance-none pr-8 cursor-pointer"
                                >
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Plumbing">Plumbing</option>
                                    <option value="Elevator">Elevator</option>
                                    <option value="Landscaping">Landscaping</option>
                                    <option value="Security">Security</option>
                                </select>
                                <FiChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                            <label className="sm:col-span-4 font-semibold text-slate-700">
                                Vendor Match
                            </label>
                            <div className="sm:col-span-8">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                                    <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                                    <span>ABC Plumbing (Matched)</span>
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                            <label className="sm:col-span-4 font-semibold text-slate-700">
                                Payment Terms
                            </label>
                            <div className="sm:col-span-8 relative">
                                <input
                                    type="text"
                                    value={paymentTerms}
                                    onChange={(e) => setPaymentTerms(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs pr-8"
                                />
                                <FiEdit3 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-slate-100">
                        <button
                            onClick={handleSave}
                            disabled={isSaved}
                            className="bg-[#008A4B] hover:bg-[#00753F] active:bg-[#006034] text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs border border-emerald-700/20 whitespace-nowrap"
                        >
                            <FiCheck className="w-4 h-4 stroke-[2.5]" />
                            <span>{isSaved ? "Saved!" : "Save Invoice"}</span>
                        </button>

                        <button
                            onClick={() => alert("Edit mode enabled Mode")}
                            className="bg-white border-2 border-[#1A56DB] text-[#1A56DB] hover:bg-blue-50/80 font-bold text-xs sm:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                        >
                            <FiEdit3 className="w-4 h-4 stroke-[2]" />
                            <span>Edit Manually</span>
                        </button>

                        <button
                            onClick={() => alert("Invoice rejected")}
                            className="bg-white border-2 border-[#EF4444] text-[#EF4444] hover:bg-red-50/80 font-bold text-xs sm:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
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
