"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
    getPayablesApi,
    createPayableApi,
    updatePayableApi,
    deletePayableApi,
    PayableBackendType
} from "@/api/Payable/payableApi";

export default function Payable() {
    const [payables, setPayables] = useState<PayableBackendType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Status");
    const [associationId, setAssociationId] = useState<number | null>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPayable, setSelectedPayable] = useState<PayableBackendType | null>(null);

    // Form fields
    const [payTo, setPayTo] = useState("");
    const [dateOfPayment, setDateOfPayment] = useState("");
    const [amount, setAmount] = useState("");
    const [status, setStatus] = useState<string>("Pending");
    const [instrument, setInstrument] = useState("ACH");

    // Form validation errors state
    const [errors, setErrors] = useState({
        payTo: "",
        dateOfPayment: "",
        amount: ""
    });

    // Delete Confirmation state
    const [deletingPayable, setDeletingPayable] = useState<PayableBackendType | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem("selectedAssociation");
        if (stored) {
            try {
                const assoc = JSON.parse(stored);
                if (assoc && assoc.id) {
                    setAssociationId(assoc.id);
                }
            } catch (e) {
                console.error("Failed to parse selected association:", e);
            }
        } else {
            setLoading(false);
        }
    }, []);

    const fetchPayables = async () => {
        if (!associationId) return;
        try {
            setLoading(true);
            const response = await getPayablesApi({ association_id: associationId, page_size: 100 });
            if (response && Array.isArray(response.data)) {
                setPayables(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch payables:", error);
            toast.error("Failed to load payables data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (associationId) {
            fetchPayables();
        }
    }, [associationId]);

    const filteredPayables = payables.filter((item) => {
        const matchesSearch =
            item.pay_to.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.instrument.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === "All Status" ? true : item.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleConfirmDelete = async () => {
        if (!deletingPayable || !deletingPayable.id) return;
        try {
            await deletePayableApi(deletingPayable.id);
            toast.success("Payable record deleted successfully!");
            setDeletingPayable(null);
            fetchPayables();
        } catch (error) {
            console.error("Failed to delete payable:", error);
            toast.error("Failed to delete payable record.");
        }
    };

    const validate = () => {
        let tempErrors = { payTo: "", dateOfPayment: "", amount: "" };
        let isValid = true;

        if (!payTo.trim()) {
            tempErrors.payTo = "Pay To is required";
            isValid = false;
        }

        if (!dateOfPayment.trim()) {
            tempErrors.dateOfPayment = "Date of Payment is required";
            isValid = false;
        }

        const amtNum = parseFloat(amount);
        if (!amount.trim() || isNaN(amtNum) || amtNum <= 0) {
            tempErrors.amount = "Amount must be a positive number";
            isValid = false;
        }

        setErrors(tempErrors);
        return isValid;
    };

    const handleOpenAddModal = () => {
        setSelectedPayable(null);
        setPayTo("");
        setDateOfPayment("");
        setAmount("");
        setStatus("Pending");
        setInstrument("ACH");
        setErrors({ payTo: "", dateOfPayment: "", amount: "" });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (item: PayableBackendType) => {
        setSelectedPayable(item);
        setPayTo(item.pay_to || "");
        setDateOfPayment(item.date_of_payment || "");
        setAmount(item.amount ? item.amount.toString() : "");
        setStatus(item.status || "Pending");
        setInstrument(item.instrument || "ACH");
        setErrors({ payTo: "", dateOfPayment: "", amount: "" });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        if (isSaving) return;

        setIsSaving(true);
        try {
            if (selectedPayable && selectedPayable.id) {
                // Edit Mode
                await updatePayableApi(selectedPayable.id, {
                    pay_to: payTo,
                    date_of_payment: dateOfPayment,
                    amount: parseFloat(amount),
                    due_date: dateOfPayment,
                    status,
                    instrument,
                });
                toast.success("Payable updated successfully!");
            } else {
                // Add Mode
                if (!associationId) {
                    toast.error("Please select a condo association first.");
                    setIsSaving(false);
                    return;
                }
                await createPayableApi({
                    association_id: associationId,
                    pay_to: payTo,
                    date_of_payment: dateOfPayment,
                    amount: parseFloat(amount),
                    due_date: dateOfPayment,
                    status,
                    instrument,
                });
                toast.success("Payable added successfully!");
            }
            setIsModalOpen(false);
            fetchPayables();
        } catch (error) {
            console.error("Failed to save payable:", error);
            toast.error("Failed to save payable record.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                        Accounts Payable
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        View, search, and manage vendor payable records and outgoing payments
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
                    Add Payable
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 relative">
                    <input
                        type="text"
                        placeholder="Search by vendor, method or instrument..."
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
                        <option value="Failed">Failed</option>
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
                            <span className="text-xs text-slate-400 font-semibold">Loading payables...</span>
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider">
                                    <th className="py-4 px-6">Pay To</th>
                                    <th className="py-4 px-6">Date of Payment</th>
                                    <th className="py-4 px-6">Amount</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6">Instrument</th>
                                    <th className="py-4 px-6 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-slate-600 font-semibold">
                                {filteredPayables.length > 0 ? (
                                    filteredPayables.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-6 font-bold text-slate-800">{item.pay_to}</td>
                                            <td className="py-4 px-6 text-slate-500 font-sans">{item.date_of_payment}</td>
                                            <td className="py-4 px-6 text-slate-500 font-sans">${item.amount.toFixed(2)}</td>
                                            <td className="py-4 px-6">
                                                <span
                                                    className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                                        item.status === "Paid"
                                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200/40"
                                                            : item.status === "Pending"
                                                            ? "bg-amber-50 text-amber-600 border border-amber-200/40"
                                                            : "bg-rose-50 text-rose-600 border border-rose-200/40"
                                                    }`}
                                                >
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-slate-500">{item.instrument}</td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button
                                                        onClick={() => handleOpenEditModal(item)}
                                                        className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                                        title="Edit Payable"
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
                                                        onClick={() => setDeletingPayable(item)}
                                                        className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                                        title="Delete Payable"
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
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-8 px-6 text-center text-slate-400">
                                            No payables found. Click "Add Payable" to create one.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl p-6 border border-slate-100 shadow-xl space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <h3 className="text-base font-bold text-slate-800">
                                {selectedPayable ? "Edit Payable" : "Add New Payable"}
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
                                <label className="block text-slate-500 mb-1">Pay To</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Apex Plumbing Services"
                                    value={payTo}
                                    onChange={(e) => {
                                        setPayTo(e.target.value);
                                        setErrors(prev => ({ ...prev, payTo: "" }));
                                    }}
                                    className={`w-full bg-slate-50 rounded-lg border px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 ${
                                        errors.payTo ? "border-red-500 focus:ring-1 focus:ring-red-500" : "border-slate-200/80"
                                    }`}
                                />
                                {errors.payTo && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.payTo}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-500 mb-1">Date of Payment</label>
                                    <input
                                        type="date"
                                        value={dateOfPayment}
                                        onChange={(e) => {
                                            setDateOfPayment(e.target.value);
                                            setErrors(prev => ({ ...prev, dateOfPayment: "" }));
                                        }}
                                        className={`w-full bg-slate-50 rounded-lg border px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 ${
                                            errors.dateOfPayment ? "border-red-500 focus:ring-1 focus:ring-red-500" : "border-slate-200/80"
                                        }`}
                                    />
                                    {errors.dateOfPayment && (
                                        <p className="text-red-500 text-[10px] mt-1">{errors.dateOfPayment}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-slate-500 mb-1">Amount ($)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 250.00"
                                        value={amount}
                                        onChange={(e) => {
                                            setAmount(e.target.value);
                                            setErrors(prev => ({ ...prev, amount: "" }));
                                        }}
                                        className={`w-full bg-slate-50 rounded-lg border px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 ${
                                            errors.amount ? "border-red-500 focus:ring-1 focus:ring-red-500" : "border-slate-200/80"
                                        }`}
                                    />
                                    {errors.amount && (
                                        <p className="text-red-500 text-[10px] mt-1">{errors.amount}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-500 mb-1">Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full bg-slate-50 rounded-lg border border-slate-200/80 px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                                    >
                                        <option value="Paid">Paid</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Failed">Failed</option>
                                        <option value="Overdue">Overdue</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-500 mb-1">Instrument</label>
                                    <select
                                        value={instrument}
                                        onChange={(e) => setInstrument(e.target.value)}
                                        className="w-full bg-slate-50 rounded-lg border border-slate-200/80 px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                                    >
                                        <option value="ACH">ACH</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Card">Card</option>
                                        <option value="Cash">Cash</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                                        isSaving ? "opacity-75 cursor-not-allowed" : ""
                                    }`}
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                            Saving...
                                        </>
                                    ) : selectedPayable ? (
                                        "Update Payable"
                                    ) : (
                                        "Save Payable"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deletingPayable && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-slate-100 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-rose-600">
                            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-slate-900">Delete Payable Record</h3>
                        </div>

                        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                            Are you sure you want to delete payable record for <span className="font-extrabold text-slate-800">{deletingPayable.pay_to}</span>? This action is permanent and cannot be undone.
                        </p>

                        <div className="flex items-center justify-end gap-2.5 pt-2 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setDeletingPayable(null)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
