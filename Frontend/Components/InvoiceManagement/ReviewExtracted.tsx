"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getExtractionDetailsApi, updateExtractionDetailsApi, deleteExtractionApi } from "@/api/SyncEmail/SyncEmail";
import toast from "react-hot-toast";
import { isDateField, formatToInputDate, formatFromInputDate, isAmountField, cleanAmountInput } from "@/lib/format";
import {
    FiChevronRight,
    FiArrowLeft,
    FiCheck,
    FiX,
    FiRefreshCw
} from "react-icons/fi";

export default function ReviewExtracted() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const documentId = searchParams.get("id");
    const pdfParam = searchParams.get("pdf");

    const [isLoading, setIsLoading] = useState<boolean>(false);


    const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState<number>(1);
    const totalInvoices = 1;


    const [ocrConfidence, setOcrConfidence] = useState<number>(98);

    const [isSaved, setIsSaved] = useState(false);
    const [hasInvoiceWrapper, setHasInvoiceWrapper] = useState<boolean>(false);
    const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
    const [showRejectModal, setShowRejectModal] = useState<boolean>(false);

    const [extractedData, setExtractedData] = useState<any>({
        Vendor_Information: { Vendor_Name: "ABC Plumbing" },
        Invoice_Information: { Invoice_Number: "INV-1001", Invoice_Date: "Jul 10, 2026", Due_Date: "Jul 25, 2026", Terms: "Net 15" },
        Invoice_Items: [
            { Description: "Monthly Plumbing Maintenance", Quantity: 1, Rate: 1250, Amount: 1250 }
        ],
        Invoice_Summary: { Subtotal: 1250, Total_Due: 1250 }
    });


    const loadDetails = async () => {
        if (!documentId) return;
        setIsLoading(true);
        try {
            const data = await getExtractionDetailsApi(documentId);
            if (data) {
                let extJson = data.extracted_json || {};
                if (typeof extJson === "string") {
                    try {
                        extJson = JSON.parse(extJson);
                    } catch (e) {
                        console.error("Failed to parse extracted_json", e);
                        extJson = {};
                    }
                }

                const hasWrapper = !!extJson.Invoice;
                setHasInvoiceWrapper(hasWrapper);
                const invoiceObj = extJson.Invoice || extJson || {};
                setExtractedData(invoiceObj);

                const findVal = (obj: any, targetKey: string): any => {
                    if (!obj || typeof obj !== "object") return undefined;

                    const normalize = (s: string) => s.toLowerCase().replace(/[-_\s]/g, "");
                    const normalizedTarget = normalize(targetKey);

                    for (const key of Object.keys(obj)) {
                        if (normalize(key) === normalizedTarget) {
                            if (obj[key] !== null && typeof obj[key] !== "object") {
                                return obj[key];
                            }
                        }
                    }

                    for (const key of Object.keys(obj)) {
                        if (obj[key] && typeof obj[key] === "object") {
                            const found = findVal(obj[key], targetKey);
                            if (found !== undefined) return found;
                        }
                    }
                    return undefined;
                };

                if (data.ocr_confidence) {
                    setOcrConfidence(Math.round(data.ocr_confidence * 100));
                }
            }
        } catch (err) {
            console.error("Failed to load extraction details:", err);
            toast.error("Failed to load invoice details.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDetails();
    }, [documentId]);

    const handleSave = async () => {
        if (!documentId) return;
        setIsSaved(true);
        try {
            const payload = hasInvoiceWrapper ? { Invoice: extractedData } : extractedData;
            await updateExtractionDetailsApi(documentId, payload);
            toast.success("Invoice successfully saved!");
            await loadDetails();
        } catch (err) {
            console.error("Failed to save invoice:", err);
            toast.error("Failed to save invoice details.");
        } finally {
            setIsSaved(false);
        }
    };

    const handleReject = async () => {
        if (!documentId) return;
        setIsLoading(true);
        try {
            await deleteExtractionApi(documentId);
            toast.success("Invoice successfully rejected and deleted!");
            router.push("/invoices/gmail-import");
        } catch (err) {
            console.error("Failed to reject invoice:", err);
            toast.error("Failed to reject invoice.");
        } finally {
            setIsLoading(false);
        }
    };



    const vendorsList = ["ABC Plumbing", "Elevator Maintenance Co.", "Green Landscaping", "Secure Guard Services"];
    const categoriesList = ["Maintenance", "Plumbing", "Elevator", "Landscaping", "Security"];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 font-sans">
                <FiRefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                <p className="text-sm font-semibold">Loading extraction details...</p>
            </div>
        );
    }


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

                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xs h-[650px]">
                        {pdfParam ? (
                            <iframe
                                src={pdfParam}
                                className="w-full h-full border-0 bg-white"
                                title="Invoice PDF"
                            />
                        ) : (
                            <div className="bg-slate-50 flex flex-col items-center justify-center h-full text-slate-400 font-sans p-6">
                                <FiX className="w-12 h-12 text-slate-300 mb-3" />
                                <p className="text-sm font-semibold text-slate-700">No PDF preview available</p>
                                <p className="text-xs text-slate-400 mt-1">Please verify the dynamic fields directly.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-5 sm:p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h2 className="text-base font-bold text-slate-900">
                            Extracted Invoice Details
                        </h2>
                        <span className="bg-[#DCFCE7] text-[#16A34A] text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200/60 flex items-center gap-1.5">
                            OCR Confidence: {ocrConfidence}%
                        </span>
                    </div>

                    <div className="space-y-6 text-xs sm:text-sm max-h-[600px] overflow-y-auto pr-3">
                        {extractedData && Object.entries(extractedData).map(([sectionKey, sectionValue]) => {
                            const sectionTitle = sectionKey.replace(/_/g, " ");

                            if (Array.isArray(sectionValue)) {
                                return (
                                    <div key={sectionKey} className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center justify-between">
                                            <span>{sectionTitle}</span>
                                        </h3>
                                        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                                                    <tr>
                                                        {sectionValue.length > 0 && Object.keys(sectionValue[0]).map((colKey) => (
                                                            <th key={colKey} className="p-2.5">
                                                                {colKey.replace(/_/g, " ")}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                                                    {sectionValue.map((item, idx) => (
                                                        <tr key={idx}>
                                                            {Object.entries(item).map(([colKey, colValue]) => (
                                                                <td key={colKey} className="p-2">
                                                                    <input
                                                                        type={isDateField(colKey) ? "date" : "text"}
                                                                        value={isDateField(colKey) ? formatToInputDate(colValue) : String(colValue ?? "")}
                                                                        onChange={(e) => {
                                                                            const updatedValue = isDateField(colKey) ? formatFromInputDate(e.target.value) : isAmountField(colKey) ? cleanAmountInput(e.target.value) : e.target.value;
                                                                            setExtractedData((prev: any) => {
                                                                                const newArr = [...prev[sectionKey]];
                                                                                newArr[idx] = { ...newArr[idx], [colKey]: updatedValue };
                                                                                return { ...prev, [sectionKey]: newArr };
                                                                            });
                                                                        }}
                                                                        className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded px-2 py-1 text-xs font-medium focus:outline-none focus:border-blue-500 transition-colors"
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            } else if (sectionValue && typeof sectionValue === "object") {
                                return (
                                    <div key={sectionKey} className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                                            {sectionTitle}
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                            {Object.entries(sectionValue).map(([fieldKey, fieldValue]) => {
                                                const fieldLabel = fieldKey.replace(/_/g, " ");
                                                const isAddress = fieldKey.toLowerCase().includes("address");
                                                const isNotes = fieldKey.toLowerCase().includes("notes");
                                                const isTextarea = isAddress || isNotes;
                                                return (
                                                    <div key={fieldKey} className={isNotes ? "sm:col-span-2 space-y-1" : "space-y-1"}>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                            {fieldLabel}
                                                        </label>
                                                        {isTextarea ? (
                                                            <textarea
                                                                value={String(fieldValue ?? "")}
                                                                onChange={(e) => {
                                                                    const updatedValue = e.target.value;
                                                                    setExtractedData((prev: any) => ({
                                                                        ...prev,
                                                                        [sectionKey]: {
                                                                            ...prev[sectionKey],
                                                                            [fieldKey]: updatedValue
                                                                        }
                                                                    }));
                                                                }}
                                                                rows={3}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs resize-y"
                                                            />
                                                        ) : (
                                                            <input
                                                                type={isDateField(fieldKey) ? "date" : "text"}
                                                                value={isDateField(fieldKey) ? formatToInputDate(fieldValue) : String(fieldValue ?? "")}
                                                                onChange={(e) => {
                                                                    const updatedValue = isDateField(fieldKey) ? formatFromInputDate(e.target.value) : isAmountField(fieldKey) ? cleanAmountInput(e.target.value) : e.target.value;
                                                                    setExtractedData((prev: any) => ({
                                                                        ...prev,
                                                                        [sectionKey]: {
                                                                            ...prev[sectionKey],
                                                                            [fieldKey]: updatedValue
                                                                        }
                                                                    }));
                                                                }}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs"
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            } else {
                                const isTextarea = sectionKey.toLowerCase().includes("address") || sectionKey.toLowerCase().includes("notes");
                                return (
                                    <div key={sectionKey} className={isTextarea ? "grid grid-cols-1 sm:grid-cols-12 items-start gap-2 pt-1" : "grid grid-cols-1 sm:grid-cols-12 items-center gap-2 pt-1"}>
                                        <label className="sm:col-span-4 font-semibold text-slate-700">
                                            {sectionTitle}
                                        </label>
                                        <div className="sm:col-span-8">
                                            {isTextarea ? (
                                                <textarea
                                                    value={String(sectionValue ?? "")}
                                                    onChange={(e) => {
                                                        const updatedValue = e.target.value;
                                                        setExtractedData((prev: any) => ({
                                                            ...prev,
                                                            [sectionKey]: updatedValue
                                                        }));
                                                    }}
                                                    rows={3}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs resize-y"
                                                />
                                            ) : (
                                                <input
                                                    type={isDateField(sectionKey) ? "date" : "text"}
                                                    value={isDateField(sectionKey) ? formatToInputDate(sectionValue) : String(sectionValue ?? "")}
                                                    onChange={(e) => {
                                                        const updatedValue = isDateField(sectionKey) ? formatFromInputDate(e.target.value) : isAmountField(sectionKey) ? cleanAmountInput(e.target.value) : e.target.value;
                                                        setExtractedData((prev: any) => ({
                                                            ...prev,
                                                            [sectionKey]: updatedValue
                                                        }));
                                                    }}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs"
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            }
                        })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5 border-t border-slate-100">
                        <button
                            onClick={() => setShowSaveModal(true)}
                            disabled={isSaved}
                            className="bg-[#008A4B] hover:bg-[#00753F] active:bg-[#006034] text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs border border-emerald-700/20 whitespace-nowrap"
                        >
                            <FiCheck className="w-4 h-4 stroke-[2.5]" />
                            <span>{isSaved ? "Saved!" : "Save Invoice"}</span>
                        </button>

                        <button
                            onClick={() => setShowRejectModal(true)}
                            className="bg-white border-2 border-[#EF4444] text-[#EF4444] hover:bg-red-50/80 font-bold text-xs sm:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                        >
                            <FiX className="w-4 h-4 stroke-[2.5]" />
                            <span>Reject Invoice</span>
                        </button>
                    </div>

                </div>
            </div>

            {showSaveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 transition-all">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-6 transform scale-100 animate-in fade-in zoom-in-95 duration-150">
                        <div className="space-y-2">
                            <h3 className="text-base font-bold text-slate-900">
                                Save Invoice Details
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                Are you sure you want to save the updated extraction details for this invoice? This will overwrite the existing invoice records in the database.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={() => setShowSaveModal(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setShowSaveModal(false);
                                    await handleSave();
                                }}
                                className="px-5 py-2 text-xs font-bold text-white bg-[#008A4B] hover:bg-[#00753F] active:bg-[#006034] rounded-xl transition-colors shadow-sm cursor-pointer"
                            >
                                Confirm Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 transition-all">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-6 transform scale-100 animate-in fade-in zoom-in-95 duration-150">
                        <div className="space-y-2">
                            <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
                                <FiX className="w-5 h-5" />
                                <span>Reject & Delete Invoice</span>
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                Are you sure you want to reject this invoice? This will delete the invoice document and its extracted details from the database. This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setShowRejectModal(false);
                                    await handleReject();
                                }}
                                className="px-5 py-2 text-xs font-bold text-white bg-[#EF4444] hover:bg-red-600 active:bg-red-700 rounded-xl transition-colors shadow-sm cursor-pointer"
                            >
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
