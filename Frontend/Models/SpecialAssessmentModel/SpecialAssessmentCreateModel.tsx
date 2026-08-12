"use client";

import React, { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import { SpecialAssessmentDetail } from "./SpecialAssessmentViewModel";
import moment from "moment";
import { formatToInputDate, formatFromInputDate } from "@/lib/format";
import { getCondoUnitsApi } from "@/api/CondoUnit/CondoUnitApi";

interface SpecialAssessmentCreateModelProps {
    isOpen?: boolean;
    onClose?: () => void;
    onCreate?: (newAssessment: any) => Promise<void> | void;
}

export default function SpecialAssessmentCreateModel({
    isOpen = true,
    onClose,
    onCreate,
}: SpecialAssessmentCreateModelProps) {
    const [title, setTitle] = useState("");
    const [reason, setReason] = useState("");
    const [amount, setAmount] = useState<number>(0);
    const [dueDate, setDueDate] = useState("Sep 15, 2026");
    const [status, setStatus] = useState<"Active" | "Upcoming" | "Completed">("Active");
    const [units, setUnits] = useState<any[]>([]);
    const [selectedUnit, setSelectedUnit] = useState("all");
    const [customAllocations, setCustomAllocations] = useState<{ unitId: string; amount: number }[]>([]);

    const [titleError, setTitleError] = useState("");
    const [reasonError, setReasonError] = useState("");
    const [amountError, setAmountError] = useState("");
    const [dueDateError, setDueDateError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (selectedUnit === "custom") {
            const sum = customAllocations.reduce((acc, curr) => acc + curr.amount, 0);
            setAmount(sum);
            setAmountError("");
        }
    }, [customAllocations, selectedUnit]);

    const handleAddAllocation = () => {
        if (customAllocations.length < 8) {
            setCustomAllocations([...customAllocations, { unitId: "", amount: 0 }]);
        }
    };

    const handleUpdateAllocation = (index: number, field: "unitId" | "amount", value: any) => {
        const updated = [...customAllocations];
        updated[index] = {
            ...updated[index],
            [field]: value
        };
        setCustomAllocations(updated);
    };

    const handleRemoveAllocation = (index: number) => {
        setCustomAllocations(customAllocations.filter((_, i) => i !== index));
    };

    useEffect(() => {
        const fetchUnits = async () => {
            try {
                const response = await getCondoUnitsApi({ page_size: 100 });
                if (response && Array.isArray(response.data)) {
                    setUnits(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch units:", error);
            }
        };
        if (isOpen) {
            fetchUnits();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const validate = () => {
        let isValid = true;

        if (!title || !title.trim()) {
            setTitleError("Assessment Title is required");
            isValid = false;
        } else if (title.trim().length < 2) {
            setTitleError("Assessment Title must be at least 2 characters long");
            isValid = false;
        } else {
            setTitleError("");
        }

        if (!reason || !reason.trim()) {
            setReasonError("Description / Reason is required");
            isValid = false;
        } else {
            setReasonError("");
        }

        if (selectedUnit === "custom") {
            if (customAllocations.length === 0) {
                setAmountError("Please add at least one unit allocation");
                isValid = false;
            } else {
                let allocationsValid = true;
                customAllocations.forEach((alloc) => {
                    if (!alloc.unitId) {
                        setAmountError("All allocation rows must have a selected unit");
                        allocationsValid = false;
                    } else if (alloc.amount <= 0) {
                        setAmountError("All allocation amounts must be greater than 0");
                        allocationsValid = false;
                    }
                });
                if (!allocationsValid) {
                    isValid = false;
                } else {
                    setAmountError("");
                }
            }
        } else {
            if (!amount || amount <= 0) {
                setAmountError("Total Amount must be greater than 0");
                isValid = false;
            } else {
                setAmountError("");
            }
        }

        if (!dueDate || !dueDate.trim()) {
            setDueDateError("Due Date is required");
            isValid = false;
        } else {
            const parsed = moment(dueDate, ["MMM D, YYYY", "YYYY-MM-DD", "MM/DD/YYYY"], true);
            if (!parsed.isValid()) {
                setDueDateError("Please enter a valid date (e.g. Sep 15, 2026 or YYYY-MM-DD)");
                isValid = false;
            } else {
                setDueDateError("");
            }
        }

        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;

        if (!validate()) return;

        setIsSaving(true);
        try {
            if (onCreate) {
                let allocationsPayload = null;
                if (selectedUnit === "custom") {
                    allocationsPayload = customAllocations.map(a => ({
                        unit_id: Number(a.unitId),
                        allocated_amount: a.amount
                    }));
                } else if (selectedUnit !== "all") {
                    allocationsPayload = [{
                        unit_id: Number(selectedUnit),
                        allocated_amount: amount
                    }];
                }

                await onCreate({
                    title,
                    reason,
                    amount,
                    dueDate,
                    status,
                    unitId: selectedUnit === "all" || selectedUnit === "custom" ? null : Number(selectedUnit),
                    allocations: allocationsPayload,
                });
            }
            if (onClose) {
                onClose();
            }
        } catch (error) {
            console.error("Create assessment failed:", error);
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
            <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        Create Special Assessment
                    </h2>
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

                <form onSubmit={handleSubmit} noValidate className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
                    <div>
                        <label className="block text-slate-700 font-semibold mb-1.5">
                            Assessment Title <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                setTitleError("");
                            }}
                            placeholder="e.g. Elevator Maintenance"
                            className={`w-full border ${titleError ? "border-red-500 focus:ring-red-500" : "border-slate-200 focus:ring-blue-500"} rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 bg-white`}
                        />
                        {titleError && (
                            <p className="text-red-500 text-xs mt-1 font-semibold">
                                {titleError}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-slate-700 font-semibold mb-1.5">
                            Description / Reason <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                setReasonError("");
                            }}
                            placeholder="Brief description of the assessment purpose..."
                            className={`w-full border ${reasonError ? "border-red-500 focus:ring-red-500" : "border-slate-200 focus:ring-blue-500"} rounded-xl p-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 bg-white resize-none`}
                        />
                        {reasonError && (
                            <p className="text-red-500 text-xs mt-1 font-semibold">
                                {reasonError}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1.5">
                                Total Amount ($) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={amount || ""}
                                disabled={selectedUnit === "custom"}
                                onChange={(e) => {
                                    setAmount(parseFloat(e.target.value) || 0);
                                    setAmountError("");
                                }}
                                placeholder="5000.00"
                                className={`w-full border ${amountError ? "border-red-500 focus:ring-red-500" : "border-slate-200 focus:ring-blue-500"} rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 bg-white ${selectedUnit === "custom" ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
                            />
                            {amountError && (
                                <p className="text-red-500 text-xs mt-1 font-semibold">
                                    {amountError}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-slate-700 font-semibold mb-1.5">
                                Due Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formatToInputDate(dueDate)}
                                onChange={(e) => {
                                    setDueDate(formatFromInputDate(e.target.value));
                                    setDueDateError("");
                                }}
                                placeholder="Sep 15, 2026"
                                className={`w-full border ${dueDateError ? "border-red-500 focus:ring-red-500" : "border-slate-200 focus:ring-blue-500"} rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 bg-white`}
                            />
                            {dueDateError && (
                                <p className="text-red-500 text-xs mt-1 font-semibold">
                                    {dueDateError}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1.5">
                                Target Units
                            </label>
                            <select
                                value={selectedUnit}
                                onChange={(e) => {
                                    setSelectedUnit(e.target.value);
                                    if (e.target.value === "custom" && customAllocations.length === 0) {
                                        setCustomAllocations([{ unitId: "", amount: 0 }]);
                                    }
                                }}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                            >
                                <option value="all">All Units</option>
                                <option value="custom">Specific Units (Custom Allocations)...</option>
                                {units.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        Unit {u.unit_number} - {u.owner_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-slate-700 font-semibold mb-1.5">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as "Active" | "Upcoming" | "Completed")}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                            >
                                <option value="Active">Active</option>
                                <option value="Upcoming">Upcoming</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                    </div>

                    {selectedUnit === "custom" && (
                        <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-slate-700 text-[10px] sm:text-xs uppercase tracking-wider">Unit Allocations ({customAllocations.length}/8)</span>
                                {customAllocations.length < 8 && (
                                    <button
                                        type="button"
                                        onClick={handleAddAllocation}
                                        className="text-xs text-blue-600 font-bold hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                                    >
                                        + Add Unit
                                    </button>
                                )}
                            </div>

                            {customAllocations.length === 0 ? (
                                <p className="text-slate-400 text-xs italic">Click 'Add Unit' to add specific units and custom amounts.</p>
                            ) : (
                                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                                    {customAllocations.map((alloc, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <div className="flex-1">
                                                <select
                                                    value={alloc.unitId}
                                                    onChange={(e) => handleUpdateAllocation(idx, "unitId", e.target.value)}
                                                    className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer"
                                                >
                                                    <option value="">Select Unit...</option>
                                                    {units
                                                        .filter(u => !customAllocations.some((a, aIdx) => a.unitId === String(u.id) && aIdx !== idx))
                                                        .map((u) => (
                                                            <option key={u.id} value={u.id}>
                                                                Unit {u.unit_number} - {u.owner_name}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                            <div className="w-1/3">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Amount"
                                                    value={alloc.amount || ""}
                                                    onChange={(e) => handleUpdateAllocation(idx, "amount", parseFloat(e.target.value) || 0)}
                                                    className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAllocation(idx)}
                                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={onClose}
                            className={`px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer ${isSaving ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`px-5 py-2.5 bg-[#0B46AD] hover:bg-[#093C96] text-white font-bold rounded-xl text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-2 ${isSaving ? "opacity-75 cursor-not-allowed" : ""
                                }`}
                        >
                            {isSaving ? (
                                <>
                                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                    Creating...
                                </>
                            ) : (
                                "Create Assessment"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
