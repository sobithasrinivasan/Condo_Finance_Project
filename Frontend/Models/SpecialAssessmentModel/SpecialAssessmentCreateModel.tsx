"use client";

import React, { useState } from "react";
import { FiX } from "react-icons/fi";
import { SpecialAssessmentDetail } from "./SpecialAssessmentViewModel";
import moment from "moment";
import { formatToInputDate, formatFromInputDate } from "@/lib/format";

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

    const [titleError, setTitleError] = useState("");
    const [reasonError, setReasonError] = useState("");
    const [amountError, setAmountError] = useState("");
    const [dueDateError, setDueDateError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

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

        if (!amount || amount <= 0) {
            setAmountError("Total Amount must be greater than 0");
            isValid = false;
        } else {
            setAmountError("");
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
                await onCreate({
                    title,
                    reason,
                    amount,
                    dueDate,
                    status,
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
                                onChange={(e) => {
                                    setAmount(parseFloat(e.target.value) || 0);
                                    setAmountError("");
                                }}
                                placeholder="5000.00"
                                className={`w-full border ${amountError ? "border-red-500 focus:ring-red-500" : "border-slate-200 focus:ring-blue-500"} rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 bg-white`}
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

                    <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={onClose}
                            className={`px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer ${
                                isSaving ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`px-5 py-2.5 bg-[#0B46AD] hover:bg-[#093C96] text-white font-bold rounded-xl text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-2 ${
                                isSaving ? "opacity-75 cursor-not-allowed" : ""
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
