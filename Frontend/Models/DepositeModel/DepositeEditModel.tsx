"use client";

import React, { useState, useEffect } from "react";
import { FiX, FiCalendar } from "react-icons/fi";

export interface UnitDepositDetail {
    id?: string;
    unitNumber?: string;
    badgeColor?: "blue" | "sky";
    ownerName?: string;
    expected?: number;
    received?: number;
    dateReceived?: string;
    balance?: number;
    status?: "Paid" | "Late" | "Partial" | string;
    paymentMethod?: string;
    referenceNumber?: string;
    recordedBy?: string;
    recordedOn?: string;
    recordedOnRaw?: string;
    month?: string;
    notes?: string;
}

interface DepositeEditModelProps {
    isOpen?: boolean;
    onClose?: () => void;
    deposit?: UnitDepositDetail | null;
    onSave?: (updated: UnitDepositDetail) => void;
}

export default function DepositeEditModel({
    isOpen = true,
    onClose,
    deposit,
    onSave,
}: DepositeEditModelProps) {
    if (!isOpen || !deposit) return null;

    const [expected, setExpected] = useState<number>(deposit.expected ?? 550);
    const [received, setReceived] = useState<number>(deposit.received ?? 550);
    const [dateReceived, setDateReceived] = useState<string>(
        deposit.dateReceived && deposit.dateReceived !== "-" ? deposit.dateReceived : "Jul 05, 2026"
    );
    const [status, setEditStatus] = useState<string>(deposit.status || "Paid");
    const [paymentMethod, setPaymentMethod] = useState<string>(deposit.paymentMethod || "Bank Transfer");
    const [referenceNumber, setReferenceNumber] = useState<string>(deposit.referenceNumber || "TXN-458963");
    const [notes, setNotes] = useState<string>(deposit.notes || "Monthly HOA deposit for July 2026");

    useEffect(() => {
        if (deposit) {
            setExpected(deposit.expected ?? 550);
            setReceived(deposit.received ?? 550);
            setDateReceived(deposit.dateReceived && deposit.dateReceived !== "-" ? deposit.dateReceived : "Jul 05, 2026");
            setEditStatus(deposit.status || "Paid");
            setPaymentMethod(deposit.paymentMethod || "Bank Transfer");
            setReferenceNumber(deposit.referenceNumber || "TXN-458963");
            setNotes(deposit.notes || "Monthly HOA deposit for July 2026");
        }
    }, [deposit]);

    let cleanOwnerName = deposit.ownerName || "John Doe";
    const nameMatch = cleanOwnerName.match(/\(([^)]+)\)/);
    if (nameMatch && nameMatch[1]) {
        cleanOwnerName = nameMatch[1];
    }

    const unitNumber = deposit.unitNumber || "101";
    const month = deposit.month || "July 2026";

    const handleSave = () => {
        const calculatedBalance = Math.max(0, expected - received);
        let finalStatus = status;

        if (received >= expected && expected > 0) {
            finalStatus = "Paid";
        } else if (received > 0) {
            finalStatus = "Partial";
        } else {
            finalStatus = "Late";
        }

        const updated: UnitDepositDetail = {
            ...deposit,
            expected,
            received,
            dateReceived: received > 0 ? dateReceived : "-",
            balance: calculatedBalance,
            status: finalStatus,
            paymentMethod,
            referenceNumber,
            notes,
        };

        if (onSave) {
            onSave(updated);
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
            <div className="relative z-10 w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        Edit Deposit
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

                <div className="p-6 overflow-y-auto space-y-5">
                    <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 bg-[#0B46AD] text-white text-xs font-extrabold rounded-lg shadow-2xs">
                                {unitNumber}
                            </span>
                            <h3 className="text-base font-bold text-slate-900">
                                {deposit.ownerName || `Unit ${unitNumber} (${cleanOwnerName})`}
                            </h3>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                            <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Month: {month}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Expected Deposit <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={expected}
                                    onChange={(e) => setExpected(parseFloat(e.target.value) || 0)}
                                    className="w-full border border-slate-200 rounded-xl pl-3.5 pr-8 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                                    $
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Received Amount <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={received}
                                    onChange={(e) => setReceived(parseFloat(e.target.value) || 0)}
                                    className="w-full border border-slate-200 rounded-xl pl-3.5 pr-8 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                                    $
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Date Received <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <FiCalendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={dateReceived}
                                    onChange={(e) => setDateReceived(e.target.value)}
                                    placeholder="Jul 05, 2026"
                                    className="w-full border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Status <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setEditStatus(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                            >
                                <option value="Paid">Paid</option>
                                <option value="Late">Late</option>
                                <option value="Partial">Partial</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Payment Method
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                            >
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Auto-Debit / ACH">Auto-Debit / ACH</option>
                                <option value="Credit Card">Credit Card</option>
                                <option value="Check">Check</option>
                                <option value="Cash">Cash</option>
                                <option value="Pending">Pending</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Reference Number
                            </label>
                            <input
                                type="text"
                                value={referenceNumber}
                                onChange={(e) => setReferenceNumber(e.target.value)}
                                placeholder="TXN-458963"
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Notes
                        </label>
                        <textarea
                            rows={3}
                            maxLength={250}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add remarks or notes..."
                            className="w-full border border-slate-200 rounded-xl p-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                        />
                        <div className="text-right text-[11px] font-medium text-slate-400 mt-1">
                            {notes.length} / 250
                        </div>
                    </div>
                </div>

                <div className="flex justify-end items-center gap-3 p-4 px-6 border-t border-slate-100 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-6 py-2.5 bg-[#0B46AD] hover:bg-[#093C96] text-white font-bold rounded-xl text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
