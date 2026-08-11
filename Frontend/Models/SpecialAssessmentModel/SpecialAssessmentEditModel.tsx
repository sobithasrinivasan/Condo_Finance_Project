"use client";

import React, { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import { SpecialAssessmentDetail } from "./SpecialAssessmentViewModel";
import { formatToInputDate, formatFromInputDate } from "@/lib/format";
import { updateSpecialAssessmentApi } from "@/api/SpecialAssessments/SpecialAssessmentsApi";
import { getCondoUnitsApi } from "@/api/CondoUnit/CondoUnitApi";
import { toast } from "react-hot-toast";

interface SpecialAssessmentEditModelProps {
    isOpen?: boolean;
    onClose?: () => void;
    assessment?: SpecialAssessmentDetail | null;
    onSave?: (updatedAssessment: SpecialAssessmentDetail) => Promise<void> | void;
}

export default function SpecialAssessmentEditModel({
    isOpen = true,
    onClose,
    assessment,
    onSave,
    deposit,
}: SpecialAssessmentEditModelProps & { deposit?: any }) {
    const activeAssessment = assessment || deposit;
    if (!isOpen || !activeAssessment) return null;

    const [isSaving, setIsSaving] = useState(false);
    const [title, setTitle] = useState(activeAssessment.title || "");
    const [reason, setReason] = useState(activeAssessment.reason || "");
    const [amount, setAmount] = useState<number>(activeAssessment.amount || 0);
    const [dueDate, setDueDate] = useState(activeAssessment.dueDate || "");
    const [status, setStatus] = useState<string>(activeAssessment.status || "Active");
    const [units, setUnits] = useState<any[]>([]);
    const [selectedUnit, setSelectedUnit] = useState("all");

    useEffect(() => {
        const fetchUnits = async () => {
            try {
                const response = await getCondoUnitsApi({ page_size: 100 });
                if (response && Array.isArray(response.data)) {
                    setUnits(response.data);
                    
                    if (activeAssessment && activeAssessment.units) {
                        if (activeAssessment.units === "All Units") {
                            setSelectedUnit("all");
                        } else {
                            const match = activeAssessment.units.match(/Unit\s+(\S+)/i);
                            if (match && match[1]) {
                                const matchedUnit = response.data.find((u: any) => u.unit_number === match[1]);
                                if (matchedUnit) {
                                    setSelectedUnit(matchedUnit.id.toString());
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch units:", error);
            }
        };

        if (isOpen) {
            fetchUnits();
        }
    }, [isOpen, activeAssessment]);

    useEffect(() => {
        const item = activeAssessment;
        if (item) {
            setTitle(item.title || "");
            setReason(item.reason || "");
            setAmount(item.amount || 0);
            setDueDate(item.dueDate || "");
            setStatus(item.status || "Active");
        }
    }, [activeAssessment]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeAssessment || !activeAssessment.id) {
            toast.error("No assessment ID found.");
            return;
        }

        setIsSaving(true);
        try {
            await updateSpecialAssessmentApi(activeAssessment.id, {
                status: status,
            });
            toast.success("Special assessment status updated successfully!");
            if (onSave) {
                await onSave({
                    ...activeAssessment,
                    status: status,
                });
            }
            if (onClose) {
                onClose();
            }
        } catch (error: any) {
            const errMsg = error?.response?.data?.detail || error?.response?.data?.message || "Failed to update special assessment status.";
            toast.error(errMsg);
            console.error("Save failed:", error);
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
                        Edit Special Assessment
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

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
                    <div>
                        <label className="block text-slate-700 font-semibold mb-1.5">
                            Assessment Title <span className="text-rose-500">*</span>
                        </label>
                        <input
                            readOnly
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                    </div>

                    <div>
                        <label className="block text-slate-700 font-semibold mb-1.5">
                            Description / Reason <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            readOnly
                            rows={3}
                            required
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1.5">
                                Total Amount ($) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                readOnly
                                type="number"
                                required
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                        </div>

                        <div>
                            <label className="block text-slate-700 font-semibold mb-1.5">
                                Due Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                readOnly
                                required
                                value={formatToInputDate(dueDate)}
                                onChange={(e) => setDueDate(formatFromInputDate(e.target.value))}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1.5">
                                Target Units
                            </label>
                            <select
                                disabled
                                value={selectedUnit}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-500 bg-slate-100 cursor-not-allowed"
                            >
                                <option value="all">All Units</option>
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
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                            >
                                <option value="Active">Active</option>
                                <option value="Pending">Pending</option>
                                <option value="Upcoming">Upcoming</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                    </div>

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
