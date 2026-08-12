"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
    getCondoUnitsApi,
    deleteCondoUnitApi,
    CondoUnitType
} from "@/api/CondoUnit/CondoUnitApi";
import CondoUnitModal from "./CondoUnitModal";

export default function CondoUnit() {
    const router = useRouter();
    const [condos, setCondos] = useState<CondoUnitType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Status");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCondo, setSelectedCondo] = useState<CondoUnitType | null>(null);

    // Delete Confirmation state
    const [deletingCondo, setDeletingCondo] = useState<CondoUnitType | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);


    const fetchCondos = async () => {
        setIsLoading(true);
        try {
            // Backend endpoint accepts filters for unit_number, owner_name, status, is_active
            const filterParams: any = {
                page: 1,
                page_size: 100
            };
            if (statusFilter !== "All Status") {
                filterParams.status = statusFilter;
            }
            if (searchTerm.trim() !== "") {
                // If it looks like a number, search by unit number. Otherwise search by owner name.
                if (/^\d/.test(searchTerm)) {
                    filterParams.unit_number = searchTerm;
                } else {
                    filterParams.owner_name = searchTerm;
                }
            }
            const res = await getCondoUnitsApi(filterParams);
            setCondos(Array.isArray(res) ? res : (res?.data || []));
        } catch (error) {
            console.error("Failed to fetch condos:", error);
            toast.error("Failed to load condo units.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCondos();
    }, [searchTerm, statusFilter]);

    const handleConfirmDelete = async () => {
        if (!deletingCondo || deletingCondo.id === undefined) return;
        setIsDeleting(true);
        try {
            await deleteCondoUnitApi(deletingCondo.id);
            toast.success("Condo unit deleted successfully!");
            setDeletingCondo(null);
            fetchCondos();
        } catch (error) {
            console.error("Failed to delete condo:", error);
            toast.error("Failed to delete condo unit.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleOpenAddModal = () => {
        setSelectedCondo(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (condo: CondoUnitType) => {
        setSelectedCondo(condo);
        setIsModalOpen(true);
    };


    const formatDateDisplay = (dateStr?: string) => {
        if (!dateStr) return "—";
        const parts = dateStr.split("-");
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const d = new Date(year, month, day);
            return d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
            });
        }
        return dateStr;
    };

    return (
        <div className="space-y-6">




            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                        Condo Units
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        View, search, and manage registered condo units and owners
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
                    Add Condo Units
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 relative">
                    <input
                        type="text"
                        placeholder="Search by owner name or unit number..."
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
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
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
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider">
                                <th className="py-4 px-6">Owner Name</th>
                                <th className="py-4 px-6">Owner Email</th>
                                <th className="py-4 px-6">Owner Phone</th>
                                <th className="py-4 px-6">Address</th>
                                <th className="py-4 px-6">Monthly HOA Amount</th>
                                <th className="py-4 px-6">Due Date</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-600 font-semibold">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                                            Loading condo units...
                                        </div>
                                    </td>
                                </tr>
                            ) : condos.length > 0 ? (
                                condos.map((condo) => (
                                    <tr
                                        key={condo.id}
                                        className=" transition-colors"
                                    >
                                        <td className="py-4 px-6 text-slate-500">{condo.owner_name}</td>
                                        <td className="py-4 px-6 text-slate-500 font-sans">{condo.owner_email || "—"}</td>
                                        <td className="py-4 px-6 text-slate-500 font-sans">{condo.owner_phone || "—"}</td>
                                        <td className="py-4 px-6 text-slate-500 font-sans">{condo?.address || "—"}</td>
                                        <td className="py-4 px-6 text-slate-500 font-sans">
                                            ${condo.monthly_hoa_amount !== undefined ? condo.monthly_hoa_amount.toFixed(2) : "0.00"}
                                        </td>
                                        <td className="py-4 px-6 text-slate-500 font-sans">{formatDateDisplay(condo.due_date)}</td>
                                        <td className="py-4 px-6">
                                            <span
                                                className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${condo.status === "Active"
                                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200/40"
                                                    : "bg-slate-50 text-slate-400 border border-slate-200/40"
                                                    }`}
                                            >
                                                {condo.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    onClick={() => handleOpenEditModal(condo)}
                                                    className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                                    title="Edit Condo"
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
                                                    onClick={() => setDeletingCondo(condo)}
                                                    className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                                    title="Delete Condo"
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
                                    <td colSpan={8} className="py-8 px-6 text-center text-slate-400">
                                        No condo units found. Click "Add Condo" to create one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CondoUnitModal
                isOpen={isModalOpen}
                selectedCondo={selectedCondo}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchCondos}
            />

            {deletingCondo && (
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
                            <h3 className="text-base font-bold text-slate-900">Delete Condo Unit</h3>
                        </div>

                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Are you sure you want to delete condo unit <span className="font-bold text-slate-800">{deletingCondo.unit_number}</span> owned by <span className="font-bold text-slate-800">{deletingCondo.owner_name}</span>? This action is reversible by changing its status to active later, but it will be archived from the active listings.
                        </p>

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setDeletingCondo(null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                            >
                                {isDeleting ? (
                                    <>
                                        <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Delete"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
