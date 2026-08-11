"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { getReceivablesApi, updateReceivableApi, ReceivableBackendType } from "@/api/Receivable/receivableApi";
import Pagination from "@/Components/Common/Pagination";

export default function Receivable() {
    const [receivables, setReceivables] = useState<ReceivableBackendType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Status");
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedReceivable, setSelectedReceivable] = useState<ReceivableBackendType | null>(null);

    // Form fields
    const [from, setFrom] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [paidDate, setPaidDate] = useState("");
    const [amount, setAmount] = useState("");
    const [status, setStatus] = useState<"Paid" | "Pending" | "Overdue">("Pending");
    const [instrument, setInstrument] = useState("ACH");
    const [bank, setBank] = useState("");
    const [notes, setNotes] = useState("");

    // Form validation errors state
    const [errors, setErrors] = useState({
        from: "",
        dueDate: "",
        amount: "",
        bank: ""
    });

    // Info Modal state
    const [infoModalContent, setInfoModalContent] = useState<{ title: string; message: string } | null>(null);

    const fetchReceivables = async () => {
        try {
            setLoading(true);
            const response = await getReceivablesApi({ page_size: 100 });
            if (response && Array.isArray(response.data)) {
                setReceivables(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch receivables:", error);
            toast.error("Failed to load receivables data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReceivables();
    }, []);

    // Helper functions for mapping database values to Receivable UI
    const getReceivableStatus = (item: ReceivableBackendType): "Paid" | "Pending" | "Overdue" => {
        if (item.status === "Paid") return "Paid";
        if (item.status === "Overdue" || item.status === "Late") return "Overdue";
        return "Pending";
    };

    const filteredReceivables = receivables.filter((item) => {
        const fromName = item.unit_number ? `Unit ${item.unit_number} - ${item.from_payer}` : item.from_payer;
        const instrumentName = item.instrument || "ACH";
        const bankName = item.bank || "-";
        const statusValue = getReceivableStatus(item);

        const matchesSearch =
            fromName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            instrumentName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === "All Status" ? true : statusValue === statusFilter;

        return matchesSearch && matchesStatus;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const paginatedReceivables = filteredReceivables.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );
    const totalPages = Math.ceil(filteredReceivables.length / rowsPerPage) || 1;

    const handleOpenAddModal = () => {
        setInfoModalContent({
            title: "Add Receivable Record",
            message: "Accounts Receivable records are generated automatically from uploaded bank statements. To add new records, please upload bank statements in the Bank Statements page, or match them in the Bank Reconciliation page."
        });
    };

    const handleOpenDeleteModal = (item: ReceivableBackendType) => {
        const fromName = item.unit_number ? `Unit ${item.unit_number} - ${item.from_payer}` : item.from_payer;
        setInfoModalContent({
            title: "Delete Receivable Record",
            message: `The receivable record for "${fromName}" cannot be deleted directly because it is synchronized from bank statements. To remove this record, please delete or update the associated statement in the Bank Statements page.`
        });
    };

    const handleOpenEditModal = (item: ReceivableBackendType) => {
        setSelectedReceivable(item);
        const fromName = item.unit_number ? `Unit ${item.unit_number} - ${item.from_payer}` : item.from_payer;
        setFrom(fromName);
        setDueDate(item.due_date || "");
        setPaidDate(item.paid_date || "");
        setAmount(item.expected_amount ? item.expected_amount.toString() : "0.00");
        setStatus(getReceivableStatus(item));
        setInstrument(item.instrument || "ACH");
        setBank(item.bank || "-");
        setNotes("");
        setErrors({ from: "", dueDate: "", amount: "", bank: "" });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReceivable) return;

        try {
            const updatePayload: any = { status };
            if (status === "Paid") {
                updatePayload.paid_date = new Date().toISOString().split('T')[0];
                updatePayload.amount_received = selectedReceivable.expected_amount;
            } else if (status === "Pending") {
                updatePayload.paid_date = null;
                updatePayload.amount_received = 0.0;
            }

            await updateReceivableApi(selectedReceivable.id, updatePayload);
            toast.success("Receivable updated successfully!");
            setIsModalOpen(false);
            fetchReceivables();
        } catch (error) {
            console.error("Failed to update receivable:", error);
            toast.error("Failed to update receivable.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                        Accounts Receivable
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        View, search, and manage invoice receivables and income records
                    </p>
                </div>
                <button
                    onClick={handleOpenAddModal}
                    className="flex items-center gap-2 bg-[#1A56DB] hover:bg-[#1448C4] active:bg-[#0E3A9E] text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                        stroke="currentColor"
                        className="w-4 h-4"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Receivable
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 relative">
                    <input
                        type="text"
                        placeholder="Search by payer, bank or instrument..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white text-slate-800 text-xs rounded-xl border border-slate-200/80 pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder-slate-400"
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-4 h-4"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.608 10.608Z"
                            />
                        </svg>
                    </div>
                </div>

                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-white text-slate-800 text-xs rounded-xl border border-slate-200/80 px-4 py-3 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold cursor-pointer"
                    >
                        <option value="All Status">All Status</option>
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                        <option value="Overdue">Overdue</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-4 h-4"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#1A56DB] animate-spin"></div>
                            <span className="text-xs text-slate-400 font-semibold">Loading receivables...</span>
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider">
                                    <th className="py-4 px-6">From</th>
                                    <th className="py-4 px-6">Due Date</th>
                                    <th className="py-4 px-6">Paid Date</th>
                                    <th className="py-4 px-6">Amount</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6">Instrument</th>
                                    <th className="py-4 px-6">Bank</th>
                                    <th className="py-4 px-6 text-center">Actions</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-slate-50 text-slate-600 font-semibold">
                                {paginatedReceivables.length > 0 ? (
                                    paginatedReceivables.map((item) => {
                                        const fromName = item.unit_number ? `Unit ${item.unit_number} - ${item.from_payer}` : item.from_payer;
                                        const dueDate = item.due_date;
                                        const paidDate = item.paid_date || "-";
                                        const amount = item.expected_amount || 0;
                                        const statusValue = getReceivableStatus(item);
                                        const instrumentName = item.instrument || "ACH";
                                        const bankName = item.bank || "-";

                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 px-6 font-bold text-slate-800">{fromName}</td>
                                                <td className="py-4 px-6 text-slate-500 font-sans">{dueDate}</td>
                                                <td className="py-4 px-6 text-slate-500 font-sans">{paidDate}</td>
                                                <td className="py-4 px-6 text-slate-500 font-sans">${amount.toFixed(2)}</td>
                                                <td className="py-4 px-6">
                                                    <span
                                                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${statusValue === "Paid"
                                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200/40"
                                                            : statusValue === "Pending"
                                                                ? "bg-amber-50 text-amber-600 border border-amber-200/40"
                                                                : "bg-rose-50 text-rose-600 border border-rose-200/40"
                                                            }`}
                                                    >
                                                        {statusValue}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-slate-500">{instrumentName}</td>
                                                <td className="py-4 px-6 text-slate-500">{bankName}</td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <button
                                                            onClick={() => handleOpenEditModal(item)}
                                                            className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                                            title="Edit Receivable"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                strokeWidth="1.8"
                                                                stroke="currentColor"
                                                                className="w-4 h-4 text-slate-400 hover:text-blue-600 transition-colors"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                                                                />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenDeleteModal(item)}
                                                            className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                                            title="Delete Receivable"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                strokeWidth="1.8"
                                                                stroke="currentColor"
                                                                className="w-4 h-4 text-slate-400 hover:text-red-600 transition-colors"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                                                />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="py-8 px-6 text-center text-slate-400">
                                            No receivables found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
                {!loading && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={filteredReceivables.length}
                        rowsPerPage={rowsPerPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl p-6 border border-slate-100 shadow-xl space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <h3 className="text-base font-bold text-slate-800">
                                Edit Receivable
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2.5"
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs font-semibold text-slate-700">
                            <div>
                                <label className="block text-slate-500 mb-1">From</label>
                                <input
                                    type="text"
                                    disabled
                                    placeholder="e.g. Unit 101 - John Doe"
                                    value={from}
                                    className="w-full bg-slate-100 rounded-lg border border-slate-200/80 px-3 py-2.5 text-slate-500 cursor-not-allowed"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-500 mb-1">Due Date</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={dueDate}
                                        className="w-full bg-slate-100 rounded-lg border border-slate-200/80 px-3 py-2.5 text-slate-500 cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-500 mb-1">Paid Date</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={paidDate || "-"}
                                        className="w-full bg-slate-100 rounded-lg border border-slate-200/80 px-3 py-2.5 text-slate-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-500 mb-1">Amount ($)</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={amount}
                                        className="w-full bg-slate-100 rounded-lg border border-slate-200/80 px-3 py-2.5 text-slate-500 cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-500 mb-1">Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as "Paid" | "Pending" | "Overdue")}
                                        className="w-full bg-slate-50 rounded-lg border border-slate-200/80 px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                                    >
                                        <option value="Paid">Paid</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Overdue">Overdue</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-500 mb-1">Instrument</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={instrument}
                                        className="w-full bg-slate-100 rounded-lg border border-slate-200/80 px-3 py-2.5 text-slate-500 cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-500 mb-1">Bank</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={bank}
                                        className="w-full bg-slate-100 rounded-lg border border-slate-200/80 px-3 py-2.5 text-slate-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-500 mb-1">Notes</label>
                                <textarea
                                    placeholder="Resolution notes..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full bg-slate-50 rounded-lg border border-slate-200/80 px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                                    rows={3}
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                                >
                                    Update Receivable
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {infoModalContent && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-slate-100 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-blue-600">
                            <div className="w-10 h-10 rounded-full bg-blue-50/80 flex items-center justify-center flex-shrink-0">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
                                    stroke="currentColor"
                                    className="w-5 h-5 text-blue-600"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.028M12 9.75h.008v.008H12V9.75zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-slate-900">{infoModalContent.title}</h3>
                        </div>

                        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                            {infoModalContent.message}
                        </p>

                        <div className="flex items-center justify-end pt-2 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setInfoModalContent(null)}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
