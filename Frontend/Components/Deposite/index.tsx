"use client";

import React, { useState } from "react";
import {
    FiEye,
    FiEdit2,
    FiSearch,
    FiFilter,
    FiChevronLeft,
    FiChevronRight,
    FiInfo,
    FiX,
    FiCheckCircle,
    FiCalendar,
    FiDollarSign,
    FiPlus,
} from "react-icons/fi";
import { LuCalendarDays, LuWallet, LuCircleAlert, LuLandmark } from "react-icons/lu";

export interface UnitDeposit {
    id: string;
    unitNumber: string;
    badgeColor: "blue" | "sky";
    ownerName: string;
    expected: number;
    received: number;
    dateReceived: string;
    balance: number;
    status: "Paid" | "Late" | "Partial";
    paymentMethod?: string;
    notes?: string;
}

const initialDeposits: UnitDeposit[] = [
    {
        id: "1",
        unitNumber: "101",
        badgeColor: "blue",
        ownerName: "Unit 1 (John Doe)",
        expected: 550,
        received: 550,
        dateReceived: "Jul 05, 2026",
        balance: 0,
        status: "Paid",
        paymentMethod: "Bank Transfer",
        notes: "HOA Monthly Maintenance Fee - Paid in Full",
    },
    {
        id: "2",
        unitNumber: "202",
        badgeColor: "sky",
        ownerName: "Unit 2 (Jane Smith)",
        expected: 550,
        received: 0,
        dateReceived: "-",
        balance: 550,
        status: "Late",
        paymentMethod: "Pending",
        notes: "Overdue by 15 days. First reminder sent.",
    },
    {
        id: "3",
        unitNumber: "303",
        badgeColor: "blue",
        ownerName: "Unit 3 (Robert Brown)",
        expected: 550,
        received: 550,
        dateReceived: "Jul 03, 2026",
        balance: 0,
        status: "Paid",
        paymentMethod: "Auto-Debit / ACH",
        notes: "Recurring monthly auto-pay",
    },
    {
        id: "4",
        unitNumber: "404",
        badgeColor: "sky",
        ownerName: "Unit 4 (Michael Johnson)",
        expected: 550,
        received: 550,
        dateReceived: "Jul 07, 2026",
        balance: 0,
        status: "Paid",
        paymentMethod: "Credit Card",
        notes: "Online Portal Payment",
    },
    {
        id: "5",
        unitNumber: "505",
        badgeColor: "blue",
        ownerName: "Unit 5 (Sarah Wilson)",
        expected: 550,
        received: 0,
        dateReceived: "-",
        balance: 550,
        status: "Late",
        paymentMethod: "Pending",
        notes: "Overdue by 10 days.",
    },
    {
        id: "6",
        unitNumber: "606",
        badgeColor: "blue",
        ownerName: "Unit 6 (David Lee)",
        expected: 550,
        received: 275,
        dateReceived: "Jul 10, 2026",
        balance: 275,
        status: "Partial",
        paymentMethod: "Check #4092",
        notes: "Partial payment received. Remaining $275 due Jul 25.",
    },
    {
        id: "7",
        unitNumber: "707",
        badgeColor: "blue",
        ownerName: "Unit 7 (Emily Davis)",
        expected: 550,
        received: 550,
        dateReceived: "Jul 02, 2026",
        balance: 0,
        status: "Paid",
        paymentMethod: "Bank Transfer",
        notes: "HOA Deposit",
    },
    {
        id: "8",
        unitNumber: "808",
        badgeColor: "sky",
        ownerName: "Unit 8 (William Taylor)",
        expected: 550,
        received: 550,
        dateReceived: "Jul 04, 2026",
        balance: 0,
        status: "Paid",
        paymentMethod: "Check #1042",
        notes: "HOA Deposit",
    },
];

export default function Deposits() {
    const [deposits, setDeposits] = useState<UnitDeposit[]>(initialDeposits);
    const [selectedMonth, setSelectedMonth] = useState("July 2026");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"All" | "Paid" | "Late" | "Partial">("All");

    // Modal States
    const [viewingDeposit, setViewingDeposit] = useState<UnitDeposit | null>(null);
    const [editingDeposit, setEditingDeposit] = useState<UnitDeposit | null>(null);

    // Edit form fields
    const [editReceived, setEditReceived] = useState<number>(0);
    const [editDate, setEditDate] = useState<string>("");
    const [editStatus, setEditStatus] = useState<"Paid" | "Late" | "Partial">("Paid");
    const [editMethod, setEditMethod] = useState<string>("");
    const [editNotes, setEditNotes] = useState<string>("");

    // Calculate Summary Stats
    const totalExpected = 245600.0;
    const totalReceived = 212850.0;
    const outstandingBalance = 32750.0;

    const filteredDeposits = deposits.filter((dep) => {
        const matchesSearch =
            dep.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dep.unitNumber.includes(searchQuery);
        const matchesStatus = statusFilter === "All" || dep.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const openEditModal = (deposit: UnitDeposit) => {
        setEditingDeposit(deposit);
        setEditReceived(deposit.received);
        setEditDate(deposit.dateReceived === "-" ? "Jul 21, 2026" : deposit.dateReceived);
        setEditStatus(deposit.status);
        setEditMethod(deposit.paymentMethod || "Bank Transfer");
        setEditNotes(deposit.notes || "");
    };

    const handleSaveEdit = () => {
        if (!editingDeposit) return;
        const newBalance = Math.max(0, editingDeposit.expected - editReceived);
        let calculatedStatus: "Paid" | "Late" | "Partial" = editStatus;

        if (editReceived >= editingDeposit.expected) {
            calculatedStatus = "Paid";
        } else if (editReceived > 0) {
            calculatedStatus = "Partial";
        } else {
            calculatedStatus = "Late";
        }

        setDeposits((prev) =>
            prev.map((d) =>
                d.id === editingDeposit.id
                    ? {
                        ...d,
                        received: editReceived,
                        dateReceived: editReceived > 0 ? editDate : "-",
                        balance: newBalance,
                        status: calculatedStatus,
                        paymentMethod: editMethod,
                        notes: editNotes,
                    }
                    : d
            )
        );
        setEditingDeposit(null);
    };

    return (
        <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Top KPI Cards Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Card 1: Total Expected */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50/80 flex items-center justify-center text-[#0B46AD] flex-shrink-0">
                        <LuCalendarDays className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-500 tracking-tight block">
                            Total Expected ({selectedMonth})
                        </span>
                        <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            ${totalExpected.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-xs font-medium text-slate-400 block">
                            From 8 Units
                        </span>
                    </div>
                </div>

                {/* Card 2: Total Received */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50/80 flex items-center justify-center text-emerald-600 flex-shrink-0">
                        <LuWallet className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-500 tracking-tight block">
                            Total Received
                        </span>
                        <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
                            ${totalReceived.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-xs font-medium text-slate-400 block">
                            86.7% of expected
                        </span>
                    </div>
                </div>

                {/* Card 3: Outstanding Balance */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-14 h-14 rounded-2xl bg-rose-50/80 flex items-center justify-center text-rose-600 flex-shrink-0">
                        <LuCircleAlert className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-500 tracking-tight block">
                            Outstanding Balance
                        </span>
                        <div className="text-2xl font-extrabold text-rose-600 tracking-tight">
                            ${outstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-xs font-medium text-slate-400 block">
                            From 3 Units
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {/* Header & Controls */}
                <div className="p-6 pb-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                            Unit Deposits Overview
                        </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Month Selector */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                            <span>Month:</span>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
                            >
                                <option value="July 2026">July 2026</option>
                                <option value="June 2026">June 2026</option>
                                <option value="May 2026">May 2026</option>
                                <option value="April 2026">April 2026</option>
                            </select>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <FiSearch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search unit or owner..."
                                className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500 w-44 sm:w-56 transition-all"
                            />
                        </div>

                        {/* Status Filter Buttons */}
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
                            {(["All", "Paid", "Late", "Partial"] as const).map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === st
                                            ? "bg-white text-slate-900 shadow-2xs"
                                            : "text-slate-500 hover:text-slate-800"
                                        }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                                <th className="py-3.5 px-6">UNIT</th>
                                <th className="py-3.5 px-6">OWNER</th>
                                <th className="py-3.5 px-6">EXPECTED</th>
                                <th className="py-3.5 px-6">RECEIVED</th>
                                <th className="py-3.5 px-6">DATE RECEIVED</th>
                                <th className="py-3.5 px-6">BALANCE</th>
                                <th className="py-3.5 px-6 text-center">STATUS</th>
                                <th className="py-3.5 px-6 text-center">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredDeposits.length > 0 ? (
                                filteredDeposits.map((dep) => {
                                    const formattedExpected = `$${dep.expected.toFixed(2)}`;
                                    const formattedReceived = `$${dep.received.toFixed(2)}`;
                                    const formattedBalance = `$${dep.balance.toFixed(2)}`;

                                    return (
                                        <tr
                                            key={dep.id}
                                            className="hover:bg-slate-50/60 transition-colors"
                                        >
                                            {/* Unit Badge & Name */}
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded font-bold text-xs text-white ${dep.badgeColor === "blue"
                                                            ? "bg-[#0B46AD]"
                                                            : "bg-sky-500"
                                                        }`}
                                                >
                                                    {dep.unitNumber}
                                                </span>
                                            </td>

                                            {/* Owner */}
                                            <td className="py-4 px-6 font-semibold text-slate-800 whitespace-nowrap">
                                                {dep.ownerName}
                                            </td>

                                            {/* Expected Amount */}
                                            <td className="py-4 px-6 font-bold text-slate-800 whitespace-nowrap">
                                                {formattedExpected}
                                            </td>

                                            {/* Received Amount */}
                                            <td
                                                className={`py-4 px-6 font-bold whitespace-nowrap ${dep.status === "Paid"
                                                        ? "text-emerald-600"
                                                        : dep.status === "Late"
                                                            ? "text-rose-600"
                                                            : "text-amber-600"
                                                    }`}
                                            >
                                                {formattedReceived}
                                            </td>

                                            {/* Date Received */}
                                            <td className="py-4 px-6 text-slate-600 font-medium whitespace-nowrap">
                                                {dep.dateReceived}
                                            </td>

                                            {/* Balance */}
                                            <td
                                                className={`py-4 px-6 font-bold whitespace-nowrap ${dep.balance > 0
                                                        ? dep.status === "Late"
                                                            ? "text-rose-600"
                                                            : "text-amber-600"
                                                        : "text-slate-800"
                                                    }`}
                                            >
                                                {formattedBalance}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-4 px-6 text-center whitespace-nowrap">
                                                <span
                                                    className={`inline-block px-3.5 py-1 rounded-full text-xs font-bold ${dep.status === "Paid"
                                                            ? "bg-emerald-100/70 text-emerald-700"
                                                            : dep.status === "Late"
                                                                ? "bg-rose-100/70 text-rose-700"
                                                                : "bg-amber-100/70 text-amber-700"
                                                        }`}
                                                >
                                                    {dep.status}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-6 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setViewingDeposit(dep)}
                                                        title="View Details"
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <FiEye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(dep)}
                                                        title="Edit Deposit"
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <FiEdit2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="py-12 text-center text-slate-400 font-medium"
                                    >
                                        No deposits match your search criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="p-4 px-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>
                        Showing 1-{filteredDeposits.length} of {filteredDeposits.length} Units
                    </span>

                    <div className="flex items-center gap-1.5">
                        <button
                            disabled
                            className="p-2 text-slate-300 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-not-allowed"
                        >
                            <FiChevronLeft className="w-4 h-4" />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center bg-[#0B46AD] text-white font-bold rounded-lg shadow-2xs">
                            1
                        </button>
                        <button
                            disabled
                            className="p-2 text-slate-300 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-not-allowed"
                        >
                            <FiChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Info Banner */}
            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 flex items-center gap-3 text-xs text-blue-900 font-medium shadow-2xs">
                <FiInfo className="w-5 h-5 text-[#0B46AD] flex-shrink-0" />
                <span>
                    Track monthly HOA deposits for each unit and monitor payment status.
                </span>
            </div>

            {/* View Details Modal */}
            {viewingDeposit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        onClick={() => setViewingDeposit(null)}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                    />
                    <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <span
                                    className={`px-2.5 py-1 rounded text-xs font-bold text-white ${viewingDeposit.badgeColor === "blue"
                                            ? "bg-[#0B46AD]"
                                            : "bg-sky-500"
                                        }`}
                                >
                                    {viewingDeposit.unitNumber}
                                </span>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Deposit Details
                                    </h3>
                                    <p className="text-xs text-slate-500 font-normal">
                                        {viewingDeposit.ownerName}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingDeposit(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body Details */}
                        <div className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
                                <div>
                                    <span className="text-slate-400 block mb-0.5">Expected Amount</span>
                                    <span className="text-sm font-bold text-slate-900">
                                        ${viewingDeposit.expected.toFixed(2)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block mb-0.5">Received Amount</span>
                                    <span
                                        className={`text-sm font-bold ${viewingDeposit.status === "Paid"
                                                ? "text-emerald-600"
                                                : viewingDeposit.status === "Late"
                                                    ? "text-rose-600"
                                                    : "text-amber-600"
                                            }`}
                                    >
                                        ${viewingDeposit.received.toFixed(2)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block mb-0.5">Date Received</span>
                                    <span className="font-semibold text-slate-800">
                                        {viewingDeposit.dateReceived}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block mb-0.5">Outstanding Balance</span>
                                    <span
                                        className={`font-semibold ${viewingDeposit.balance > 0 ? "text-rose-600" : "text-slate-800"
                                            }`}
                                    >
                                        ${viewingDeposit.balance.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between border-b border-slate-100 pb-2">
                                    <span className="text-slate-500 font-medium">Status</span>
                                    <span
                                        className={`px-2.5 py-0.5 rounded-full font-bold ${viewingDeposit.status === "Paid"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : viewingDeposit.status === "Late"
                                                    ? "bg-rose-100 text-rose-700"
                                                    : "bg-amber-100 text-amber-700"
                                            }`}
                                    >
                                        {viewingDeposit.status}
                                    </span>
                                </div>

                                <div className="flex justify-between border-b border-slate-100 pb-2">
                                    <span className="text-slate-500 font-medium">Payment Method</span>
                                    <span className="font-semibold text-slate-800">
                                        {viewingDeposit.paymentMethod || "N/A"}
                                    </span>
                                </div>

                                <div className="pt-2">
                                    <span className="text-slate-500 font-medium block mb-1">
                                        Notes / Comments
                                    </span>
                                    <p className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-slate-700 leading-relaxed">
                                        {viewingDeposit.notes || "No additional notes recorded for this unit."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 px-6 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                            <button
                                onClick={() => {
                                    const dep = viewingDeposit;
                                    setViewingDeposit(null);
                                    openEditModal(dep);
                                }}
                                className="px-4 py-2 bg-[#0B46AD] hover:bg-[#093C96] text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                Edit Record
                            </button>
                            <button
                                onClick={() => setViewingDeposit(null)}
                                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit / Record Deposit Modal */}
            {editingDeposit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        onClick={() => setEditingDeposit(null)}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                    />
                    <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Record / Edit Deposit
                                </h3>
                                <p className="text-xs text-slate-500 font-normal">
                                    {editingDeposit.ownerName}
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingDeposit(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form Body */}
                        <div className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-600 font-semibold mb-1">
                                        Received Amount ($)
                                    </label>
                                    <input
                                        type="number"
                                        value={editReceived}
                                        onChange={(e) => setEditReceived(Number(e.target.value))}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-600 font-semibold mb-1">
                                        Date Received
                                    </label>
                                    <input
                                        type="text"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        placeholder="e.g. Jul 21, 2026"
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-600 font-semibold mb-1">
                                        Payment Method
                                    </label>
                                    <select
                                        value={editMethod}
                                        onChange={(e) => setEditMethod(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Check">Check</option>
                                        <option value="Auto-Debit / ACH">Auto-Debit / ACH</option>
                                        <option value="Credit Card">Credit Card</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Pending">Pending</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-600 font-semibold mb-1">
                                        Status Override
                                    </label>
                                    <select
                                        value={editStatus}
                                        onChange={(e) =>
                                            setEditStatus(e.target.value as "Paid" | "Late" | "Partial")
                                        }
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="Paid">Paid</option>
                                        <option value="Late">Late</option>
                                        <option value="Partial">Partial</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-600 font-semibold mb-1">
                                    Notes / Description
                                </label>
                                <textarea
                                    rows={3}
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    placeholder="Add payment reference or remarks..."
                                    className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 px-6 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                            <button
                                onClick={() => setEditingDeposit(null)}
                                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-4 py-2 bg-[#0B46AD] hover:bg-[#093C96] text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-2xs"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
