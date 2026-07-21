"use client";

import React, { useState } from "react";
import { FiX } from "react-icons/fi";
import { SpecialAssessmentDetail } from "./SpecialAssessmentViewModel";

interface SpecialAssessmentCreateModelProps {
    isOpen?: boolean;
    onClose?: () => void;
    onCreate?: (newAssessment: SpecialAssessmentDetail) => void;
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

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) return;

        const newCategory = title.toLowerCase().includes("roof")
            ? "Roof"
            : title.toLowerCase().includes("hvac")
            ? "HVAC"
            : title.toLowerCase().includes("paint")
            ? "Painting"
            : "General";

        const newItem: SpecialAssessmentDetail = {
            id: String(Date.now()),
            title,
            createdDate: "Jul 21, 2026",
            reason: reason || "General maintenance assessment",
            amount: amount || 1500,
            dueDate,
            units: "8 / 8 Units",
            status,
            category: newCategory,
        };

        if (onCreate) {
            onCreate(newItem);
        }
        if (onClose) {
            onClose();
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

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
                    <div>
                        <label className="block text-slate-700 font-semibold mb-1.5">
                            Assessment Title <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Elevator Maintenance"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                    </div>

                    <div>
                        <label className="block text-slate-700 font-semibold mb-1.5">
                            Description / Reason <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            required
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Brief description of the assessment purpose..."
                            className="w-full border border-slate-200 rounded-xl p-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1.5">
                                Total Amount ($) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="number"
                                required
                                step="0.01"
                                value={amount || ""}
                                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                                placeholder="5000.00"
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                        </div>

                        <div>
                            <label className="block text-slate-700 font-semibold mb-1.5">
                                Due Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                placeholder="Sep 15, 2026"
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                            />
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
                            onClick={onClose}
                            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-[#0B46AD] hover:bg-[#093C96] text-white font-bold rounded-xl text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer"
                        >
                            Create Assessment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
