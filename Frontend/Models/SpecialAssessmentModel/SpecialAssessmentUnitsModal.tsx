"use client";

import React, { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import { getSpecialAssessmentAllocationsApi, updateSpecialAssessmentAllocationApi } from "@/api/SpecialAssessments/SpecialAssessmentsApi";
import { toast } from "react-hot-toast";

interface SpecialAssessmentUnitsModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    assessmentId: string | null;
    assessmentTitle: string;
    onSaveSuccess?: () => void;
}

export default function SpecialAssessmentUnitsModal({
    isOpen = false,
    onClose,
    assessmentId,
    assessmentTitle,
    onSaveSuccess,
}: SpecialAssessmentUnitsModalProps) {
    if (!isOpen || !assessmentId) return null;

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [allocations, setAllocations] = useState<any[]>([]);
    const [editedAllocations, setEditedAllocations] = useState<{ [id: string]: { status?: string; paid_amount?: number } }>({});
    const [inputPaidAmounts, setInputPaidAmounts] = useState<{ [id: string]: string }>({});

    useEffect(() => {
        const fetchAllocations = async () => {
            setIsLoading(true);
            try {
                const response = await getSpecialAssessmentAllocationsApi(assessmentId);
                if (response && Array.isArray(response.data)) {
                    setAllocations(response.data);
                    const initialInputs: { [id: string]: string } = {};
                    response.data.forEach((alloc: any) => {
                        initialInputs[alloc.id] = (alloc.paid_amount || 0).toString();
                    });
                    setInputPaidAmounts(initialInputs);
                }
            } catch (error) {
                console.error("Failed to fetch allocations:", error);
                toast.error("Failed to load unit allocations.");
            } finally {
                setIsLoading(false);
            }
        };

        if (isOpen && assessmentId) {
            fetchAllocations();
            setEditedAllocations({});
            setInputPaidAmounts({});
        }
    }, [isOpen, assessmentId]);

    const handlePaidAmountChange = (allocId: string, allocatedAmount: number, inputValue: string) => {
        let cleanValue = inputValue.replace(/[^0-9.]/g, "");
        const dots = cleanValue.split(".");
        if (dots.length > 2) {
            cleanValue = `${dots[0]}.${dots.slice(1).join("")}`;
        }
        if (cleanValue.length > 1 && cleanValue.startsWith("0") && cleanValue[1] !== ".") {
            cleanValue = cleanValue.replace(/^0+/, "");
        }

        setInputPaidAmounts((prev) => ({
            ...prev,
            [allocId]: cleanValue
        }));

        const numericVal = parseFloat(cleanValue) || 0;
        const changes = editedAllocations[allocId] || {};
        setEditedAllocations((prev) => ({
            ...prev,
            [allocId]: {
                ...changes,
                paid_amount: numericVal,
                status: numericVal >= allocatedAmount ? "Paid" : numericVal > 0 ? "Partial" : "Pending"
            }
        }));
    };

    const handleStatusChange = (allocId: string, allocatedAmount: number, newStatus: string) => {
        const changes = editedAllocations[allocId] || {};
        const currentPaidStr = inputPaidAmounts[allocId] || "0";
        const newPaidStr = newStatus === "Paid" ? allocatedAmount.toString() : newStatus === "Pending" ? "0" : currentPaidStr;

        setInputPaidAmounts((prev) => ({
            ...prev,
            [allocId]: newPaidStr
        }));

        const numericVal = parseFloat(newPaidStr) || 0;
        setEditedAllocations((prev) => ({
            ...prev,
            [allocId]: {
                ...changes,
                status: newStatus,
                paid_amount: numericVal
            }
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const modifiedCount = Object.keys(editedAllocations).length;
        if (modifiedCount === 0) {
            if (onClose) onClose();
            return;
        }

        setIsSaving(true);
        try {
            const promises = Object.entries(editedAllocations).map(([allocId, updateData]) =>
                updateSpecialAssessmentAllocationApi(Number(allocId), updateData)
            );
            await Promise.all(promises);
            toast.success("Unit allocations updated successfully!");
            if (onSaveSuccess) onSaveSuccess();
            if (onClose) onClose();
        } catch (error: any) {
            const errMsg = error?.response?.data?.detail || error?.response?.data?.message || "Failed to update allocations.";
            toast.error(errMsg);
            console.error("Failed to save unit allocations:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans text-slate-800">
            <div
                onClick={onClose}
                className="fixed inset-0 cursor-default"
            />
            <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white">
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                            Unit Allocations
                        </h2>
                        <p className="text-xs text-slate-400 font-medium">
                            {assessmentTitle}
                        </p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Close Modal"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 flex flex-col space-y-4">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-2">
                            <span className="animate-spin inline-block w-8 h-8 border-4 border-[#0B46AD] border-t-transparent rounded-full" />
                            <span className="text-xs text-slate-400 font-semibold">Loading unit details...</span>
                        </div>
                    ) : allocations.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 font-medium italic">
                            No unit allocations found for this assessment.
                        </div>
                    ) : (
                        <div className="border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-100 bg-slate-50/50">
                            {allocations.map((alloc) => {
                                const changes = editedAllocations[alloc.id] || {};
                                const currentStatus = changes.status !== undefined ? changes.status : alloc.status;
                                const currentPaidAmount = changes.paid_amount !== undefined ? changes.paid_amount : alloc.paid_amount;

                                return (
                                    <div key={alloc.id} className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs sm:text-sm">
                                        <div className="flex-1 min-w-[120px] space-y-0.5">
                                            <span className="font-bold text-slate-950 block">Unit {alloc.unit_number}</span>
                                            <span className="text-slate-400 font-semibold text-xs">{alloc.owner_name || "Unknown Owner"}</span>
                                        </div>
                                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-4">
                                            <div className="text-right pr-2">
                                                <span className="text-slate-400 font-bold text-[10px] sm:text-xs block mb-0.5 uppercase tracking-wider">Allocated</span>
                                                <span className="font-bold text-slate-800">${alloc.allocated_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div>
                                                <label className="text-[10px] sm:text-xs text-slate-400 font-bold block mb-1 uppercase tracking-wider">Paid ($)</label>
                                                <input
                                                    type="text"
                                                    value={inputPaidAmounts[alloc.id] ?? (alloc.paid_amount || 0).toString()}
                                                    onChange={(e) => handlePaidAmountChange(alloc.id, alloc.allocated_amount, e.target.value)}
                                                    className="w-24 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-slate-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] sm:text-xs text-slate-400 font-bold block mb-1 uppercase tracking-wider">Status</label>
                                                <select
                                                    value={currentStatus}
                                                    onChange={(e) => handleStatusChange(alloc.id, alloc.allocated_amount, e.target.value)}
                                                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold bg-white cursor-pointer text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="Partial">Partial</option>
                                                    <option value="Paid">Paid</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100 bg-white">
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={onClose}
                            className={`px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || isLoading}
                            className={`px-5 py-2.5 bg-[#0B46AD] hover:bg-[#093C96] text-white font-bold rounded-xl text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-2 ${isSaving || isLoading ? "opacity-75 cursor-not-allowed" : ""}`}
                        >
                            {isSaving ? (
                                <>
                                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
