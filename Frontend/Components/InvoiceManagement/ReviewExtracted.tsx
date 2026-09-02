"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getExtractionDetailsApi, updateExtractionDetailsApi, deleteExtractionApi } from "@/api/SyncEmail/SyncEmail";
import toast from "react-hot-toast";
import { getUser } from "@/lib/localStore";
import { isDateField, formatToInputDate, formatFromInputDate, isAmountField, cleanAmountInput } from "@/lib/format";
import {
    FiChevronRight,
    FiArrowLeft,
    FiCheck,
    FiX,
    FiRefreshCw,
    FiEdit2
} from "react-icons/fi";

const CANONICAL_KEYS = [
    "Invoice_Type",
    "Vendor_Information",
    "Invoice_Information",
    "Bill_To",
    "Invoice_Items",
    "Invoice_Summary",
    "Service_Details",
    "Product_Details",
    "Additional_Information"
];

function sortInvoiceObject(sourceObj: any) {
    if (!sourceObj || typeof sourceObj !== "object" || Array.isArray(sourceObj)) {
        return sourceObj;
    }
    const sorted: any = {};
    for (const key of CANONICAL_KEYS) {
        if (sourceObj[key] !== undefined) {
            sorted[key] = sourceObj[key];
        }
    }
    for (const key of Object.keys(sourceObj)) {
        if (sorted[key] === undefined) {
            sorted[key] = sourceObj[key];
        }
    }
    return sorted;
}

export default function ReviewExtracted() {
    const user = getUser();
    const isManager = (user?.role || "").toLowerCase() === "manager";
    const router = useRouter();
    const searchParams = useSearchParams();
    const documentId = searchParams.get("id");
    const pdfParam = searchParams.get("pdf");

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);

    const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState<number>(1);
    const totalInvoices = 1;

    const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);

    const [isSaved, setIsSaved] = useState(false);
    const [hasInvoiceWrapper, setHasInvoiceWrapper] = useState<boolean>(false);
    const [wrapperKey, setWrapperKey] = useState<string | null>(null);
    const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
    const [showRejectModal, setShowRejectModal] = useState<boolean>(false);

    const [extractedData, setExtractedData] = useState<any>(null);
    const [initialExtractedData, setInitialExtractedData] = useState<any>(null);
    const [pdfUrl, setPdfUrl] = useState<any>(null);

    const getPdfSrc = () => {
        const rawPath = pdfUrl?.document_url || pdfUrl?.file_path || pdfParam;
        if (!rawPath || typeof rawPath !== "string") return null;
        if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) return rawPath;
        const cleanPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
        return `http://localhost:8000${cleanPath}`;
    };

    const loadDetails = async () => {
        if (!documentId) return;
        setIsLoading(true);
        try {
            const data = await getExtractionDetailsApi(documentId);
            console.log(data, 'data32423423432');
            let res = typeof data?.extracted_json === "string" ? JSON.parse(data.extracted_json) : data?.extracted_json;
            if (res && typeof res === "object") {
                if (!res.Invoice && (res.Vendor_Information || res.Invoice_Information || res.Invoice_Items || res.Invoice_Summary)) {
                    const invoiceObj: any = {};
                    if (res.Invoice_Type !== undefined) invoiceObj.Invoice_Type = res.Invoice_Type;
                    if (res.Vendor_Information !== undefined) invoiceObj.Vendor_Information = res.Vendor_Information;
                    if (res.Invoice_Information !== undefined) invoiceObj.Invoice_Information = res.Invoice_Information;
                    if (res.Bill_To !== undefined) invoiceObj.Bill_To = res.Bill_To;
                    if (res.Invoice_Items !== undefined) invoiceObj.Invoice_Items = res.Invoice_Items;
                    if (res.Invoice_Summary !== undefined) invoiceObj.Invoice_Summary = res.Invoice_Summary;
                    if (res.Service_Details !== undefined) invoiceObj.Service_Details = res.Service_Details;
                    if (res.Product_Details !== undefined) invoiceObj.Product_Details = res.Product_Details;
                    if (res.Additional_Information !== undefined) invoiceObj.Additional_Information = res.Additional_Information;

                    delete res.Invoice_Type;
                    delete res.Vendor_Information;
                    delete res.Invoice_Information;
                    delete res.Bill_To;
                    delete res.Invoice_Items;
                    delete res.Invoice_Summary;
                    delete res.Service_Details;
                    delete res.Product_Details;
                    delete res.Additional_Information;

                    res.Invoice = invoiceObj;
                }
                data.extracted_json = res;
            }
            console.log(data?.extracted_json, 'modifiedData');
            if (data && typeof data === "object" && !data.detail) {
                let extJson = data.extracted_json || data.extracted || {};
                if (typeof extJson === "string") {
                    try {
                        extJson = JSON.parse(extJson);
                    } catch (e) {
                        console.error("Failed to parse extracted_json", e);
                        extJson = {};
                    }
                }

                const topKeys = Object.keys(extJson);
                const hasWrapper = topKeys.length === 1 && typeof extJson[topKeys[0]] === "object" && !Array.isArray(extJson[topKeys[0]]);
                setHasInvoiceWrapper(hasWrapper);
                const wKey = hasWrapper ? topKeys[0] : null;
                setWrapperKey(wKey);
                const invoiceObj = hasWrapper ? extJson[topKeys[0]] : extJson;
                const sortedObj = sortInvoiceObject(invoiceObj);
                setExtractedData(sortedObj);
                setInitialExtractedData(JSON.parse(JSON.stringify(sortedObj)));
                setPdfUrl(data);

                if (data.ocr_confidence) {
                    setOcrConfidence(Math.round(data.ocr_confidence * 100));
                }
            } else {
                setExtractedData(null);
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
            const payload = hasInvoiceWrapper && wrapperKey ? { [wrapperKey]: extractedData } : extractedData;
            await updateExtractionDetailsApi(documentId, payload);
            toast.success("Invoice successfully saved!");
            setInitialExtractedData(JSON.parse(JSON.stringify(extractedData)));
            setIsEditing(false);
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

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 font-sans">
                <FiRefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                <p className="text-sm font-semibold">Loading extraction details...</p>
            </div>
        );
    }

    if (!documentId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 font-sans p-6 text-center">
                <FiX className="w-12 h-12 text-rose-500 mb-3" />
                <p className="text-sm font-semibold text-slate-700">No Invoice ID Provided</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">Please select an invoice from Gmail Import Results to review.</p>
                <Link href="/invoices/gmail-import" className="mt-4 bg-[#1A56DB] hover:bg-[#1448C4] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-2xs">
                    Go to Gmail Import
                </Link>
            </div>
        );
    }

    if (!extractedData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 font-sans p-6 text-center">
                <FiX className="w-12 h-12 text-rose-500 mb-3" />
                <p className="text-sm font-semibold text-slate-700">No Extracted Details Found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">Could not find or load the extraction details for this document.</p>
                <Link href="/invoices/gmail-import" className="mt-4 bg-[#1A56DB] hover:bg-[#1448C4] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-2xs">
                    Go to Gmail Import
                </Link>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-3 font-sans text-slate-800 overflow-hidden">
            <div className="flex-shrink-0 space-y-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B1E48]">
                            Review Extracted Invoice
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Please review and verify the extracted information before importing the invoice.
                        </p>
                    </div>

                    {!isManager && (
                        <div className="flex items-center gap-3 transition-all duration-300">
                            <div className="flex items-center gap-3 animate-in fade-in duration-200">
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="bg-[#1A56DB] hover:bg-[#1448C4] active:bg-[#0E3A9E] text-white font-bold text-xs sm:text-sm py-2 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs border border-blue-700/20 whitespace-nowrap"
                                    >
                                        <FiEdit2 className="w-4 h-4 stroke-[2.5]" />
                                        <span>Edit</span>
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => {
                                                setExtractedData(JSON.parse(JSON.stringify(initialExtractedData)));
                                                setIsEditing(false);
                                            }}
                                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm py-2 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors border border-slate-200 whitespace-nowrap"
                                        >
                                            <FiX className="w-4 h-4 stroke-[2.5]" />
                                            <span>Cancel</span>
                                        </button>

                                        <button
                                            onClick={() => setShowSaveModal(true)}
                                            disabled={isSaved}
                                            className="bg-[#008A4B] hover:bg-[#00753F] active:bg-[#006034] text-white font-bold text-xs sm:text-sm py-2 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs border border-emerald-700/20 whitespace-nowrap"
                                        >
                                            <FiCheck className="w-4 h-4 stroke-[2.5]" />
                                            <span>{isSaved ? "Saved!" : "Save Invoice"}</span>
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={() => setShowRejectModal(true)}
                                    className="bg-white border-2 border-[#EF4444] text-[#EF4444] hover:bg-red-50/80 font-bold text-xs sm:text-sm py-2 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                                >
                                    <FiX className="w-4 h-4 stroke-[2.5]" />
                                    <span>Reject Invoice</span>
                                </button>
                            </div>
                        </div>
                    )}


                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch overflow-hidden">
                <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-4 flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between flex-shrink-0 mb-2">
                        <h2 className="text-base font-bold text-slate-900">
                            Original Invoice Document
                        </h2>
                        <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-md border border-emerald-200">
                            PDF
                        </span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xs flex-1 min-h-0">
                        {getPdfSrc() ? (
                            <iframe
                                src={getPdfSrc()!}
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

                <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-4 sm:p-5 flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-shrink-0">
                        <h2 className="text-base font-bold text-slate-900">
                            Extracted Invoice Details
                        </h2>
                        {ocrConfidence !== null && (
                            <span className="bg-[#DCFCE7] text-[#16A34A] text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200/60 flex items-center gap-1.5">
                                OCR Confidence: {ocrConfidence}%
                            </span>
                        )}
                    </div>

                    <div className="space-y-5 text-xs sm:text-sm flex-1 min-h-0 overflow-y-auto pr-2 mt-3">
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
                                                                    {isEditing ? (
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
                                                                            className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded px-2.5 h-[30px] text-xs font-medium focus:outline-none focus:border-blue-500 transition-colors"
                                                                        />
                                                                    ) : (
                                                                        <div className="px-2.5 py-1 text-xs font-semibold text-slate-800 flex items-center h-[30px]">
                                                                            {String(colValue ?? "—")}
                                                                        </div>
                                                                    )}
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
                                                        {isEditing ? (
                                                            isTextarea ? (
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
                                                                    rows={2}
                                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs resize-y min-h-[64px] leading-relaxed transition-all duration-200"
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
                                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 min-h-[42px] text-xs sm:text-sm text-slate-800 font-medium leading-snug focus:outline-none focus:border-blue-500 shadow-2xs transition-all duration-200"
                                                                />
                                                            )
                                                        ) : (
                                                            isTextarea ? (
                                                                <div className="w-full bg-slate-50/80 border border-slate-200/60 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-semibold min-h-[64px] flex items-start leading-relaxed whitespace-pre-wrap break-words transition-all duration-200">
                                                                    {String(fieldValue ?? "—")}
                                                                </div>
                                                            ) : (
                                                                <div className="w-full bg-slate-50/80 border border-slate-200/60 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 font-semibold min-h-[42px] flex items-center leading-snug break-words transition-all duration-200">
                                                                    {String(fieldValue ?? "—")}
                                                                </div>
                                                            )
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
                                            {isEditing ? (
                                                isTextarea ? (
                                                    <textarea
                                                        value={String(sectionValue ?? "")}
                                                        onChange={(e) => {
                                                            const updatedValue = e.target.value;
                                                            setExtractedData((prev: any) => ({
                                                                ...prev,
                                                                [sectionKey]: updatedValue
                                                            }));
                                                        }}
                                                        rows={2}
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs resize-y min-h-[64px] leading-relaxed transition-all duration-200"
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
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 min-h-[42px] text-xs sm:text-sm text-slate-800 font-medium leading-snug focus:outline-none focus:border-blue-500 shadow-2xs transition-all duration-200"
                                                    />
                                                )
                                            ) : (
                                                isTextarea ? (
                                                    <div className="w-full bg-slate-50/80 border border-slate-200/60 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-semibold min-h-[64px] flex items-start leading-relaxed whitespace-pre-wrap break-words transition-all duration-200">
                                                        {String(sectionValue ?? "—")}
                                                    </div>
                                                ) : (
                                                    <div className="w-full bg-slate-50/80 border border-slate-200/60 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 font-semibold min-h-[42px] flex items-center leading-snug break-words transition-all duration-200">
                                                        {String(sectionValue ?? "—")}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                );
                            }
                        })}
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
