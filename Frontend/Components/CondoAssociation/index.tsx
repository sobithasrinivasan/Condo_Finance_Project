"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface CondoAssociationType {
    id: number;
    name: string;
    address: string;
    established: string;
    status: "Active" | "Inactive";
}

export default function CondoAssociation() {
    const router = useRouter();
    const [associations, setAssociations] = useState<CondoAssociationType[]>([
        {
            id: 1,
            name: "Bayshore Condominium",
            address: "123 Bayshore Ave, Miami, FL",
            established: "2015",
            status: "Active"
        },
        {
            id: 2,
            name: "Ocean View Residency",
            address: "456 Ocean Dr, Fort Lauderdale, FL",
            established: "2018",
            status: "Active"
        },
        {
            id: 3,
            name: "Sunset Hills Association",
            address: "789 Sunset Blvd, Los Angeles, CA",
            established: "2020",
            status: "Active"
        }
    ]);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Status");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssociation, setSelectedAssociation] = useState<CondoAssociationType | null>(null);

    // Form fields
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [established, setEstablished] = useState("");
    const [status, setStatus] = useState<"Active" | "Inactive">("Active");

    // Form validation errors state
    const [errors, setErrors] = useState({
        name: "",
        address: "",
        established: ""
    });

    // Delete Confirmation state
    const [deletingAssociation, setDeletingAssociation] = useState<CondoAssociationType | null>(null);

    const filteredAssociations = associations.filter((item) => {
        const matchesSearch =
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.established.includes(searchTerm);

        const matchesStatus =
            statusFilter === "All Status" ? true : item.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleConfirmDelete = () => {
        if (!deletingAssociation) return;
        setAssociations(prev => prev.filter(item => item.id !== deletingAssociation.id));
        toast.success("Condo association deleted successfully!");
        setDeletingAssociation(null);
    };

    const validate = () => {
        let tempErrors = { name: "", address: "", established: "" };
        let isValid = true;

        if (!name.trim()) {
            tempErrors.name = "Name is required";
            isValid = false;
        }

        if (!address.trim()) {
            tempErrors.address = "Address is required";
            isValid = false;
        }

        if (!established.trim()) {
            tempErrors.established = "Established year is required";
            isValid = false;
        } else if (isNaN(Number(established)) || Number(established) < 1800 || Number(established) > new Date().getFullYear()) {
            tempErrors.established = "Please enter a valid established year (e.g. 2015)";
            isValid = false;
        }

        setErrors(tempErrors);
        return isValid;
    };

    const handleOpenAddModal = () => {
        setSelectedAssociation(null);
        setName("");
        setAddress("");
        setEstablished("");
        setStatus("Active");
        setErrors({ name: "", address: "", established: "" });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (association: CondoAssociationType, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedAssociation(association);
        setName(association.name || "");
        setAddress(association.address || "");
        setEstablished(association.established || "");
        setStatus(association.status || "Active");
        setErrors({ name: "", address: "", established: "" });
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        if (selectedAssociation) {
            // Edit Mode
            setAssociations(prev =>
                prev.map(item =>
                    item.id === selectedAssociation.id
                        ? { ...item, name, address, established, status }
                        : item
                )
            );
            toast.success("Condo association updated successfully!");
        } else {
            // Add Mode
            const newAssoc: CondoAssociationType = {
                id: Date.now(),
                name,
                address,
                established,
                status
            };
            setAssociations(prev => [...prev, newAssoc]);
            toast.success("Condo association added successfully!");
        }
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                        Condo Associations
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        View, search, and manage registered condo associations
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
                    Add Condo Association
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 relative">
                    <input
                        type="text"
                        placeholder="Search by name, address or established..."
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
                                <th className="py-4 px-6">Name</th>
                                <th className="py-4 px-6">Address</th>
                                <th className="py-4 px-6">Established</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-600 font-semibold">
                            {filteredAssociations.length > 0 ? (
                                filteredAssociations.map((assoc) => (
                                    <tr
                                        key={assoc.id}
                                        className="hover:bg-blue-50/100 transition-colors cursor-pointer group"
                                        onClick={() => router.push("/condo-units")}
                                    >
                                        <td className="py-4 px-6 font-bold text-slate-800 group-hover:underline">{assoc.name}</td>
                                        <td className="py-4 px-6 text-slate-500">{assoc.address}</td>
                                        <td className="py-4 px-6 text-slate-500 font-sans">{assoc.established}</td>
                                        <td className="py-4 px-6">
                                            <span
                                                className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${assoc.status === "Active"
                                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200/40"
                                                    : "bg-slate-50 text-slate-400 border border-slate-200/40"
                                                    }`}
                                            >
                                                {assoc.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    onClick={(e) => handleOpenEditModal(assoc, e)}
                                                    className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                                    title="Edit Condo Association"
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
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-8 px-6 text-center text-slate-400">
                                        No condo associations found. Click "Add Condo Association" to create one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl p-6 border border-slate-100 shadow-xl space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <h3 className="text-base font-bold text-slate-800">
                                {selectedAssociation ? "Edit Condo Association" : "Add New Condo Association"}
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
                                <label className="block text-slate-500 mb-1">Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Bayshore Condominium"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setErrors(prev => ({ ...prev, name: "" }));
                                    }}
                                    className={`w-full bg-slate-50 rounded-lg border px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 ${errors.name ? "border-red-500 focus:ring-1 focus:ring-red-500" : "border-slate-200/80"
                                        }`}
                                />
                                {errors.name && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-slate-500 mb-1">Address</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 123 Main St, Miami, FL"
                                    value={address}
                                    onChange={(e) => {
                                        setAddress(e.target.value);
                                        setErrors(prev => ({ ...prev, address: "" }));
                                    }}
                                    className={`w-full bg-slate-50 rounded-lg border px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 ${errors.address ? "border-red-500 focus:ring-1 focus:ring-red-500" : "border-slate-200/80"
                                        }`}
                                />
                                {errors.address && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.address}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-500 mb-1">Established</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 2015"
                                        value={established}
                                        onChange={(e) => {
                                            setEstablished(e.target.value);
                                            setErrors(prev => ({ ...prev, established: "" }));
                                        }}
                                        className={`w-full bg-slate-50 rounded-lg border px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 ${errors.established ? "border-red-500 focus:ring-1 focus:ring-red-500" : "border-slate-200/80"
                                            }`}
                                    />
                                    {errors.established && (
                                        <p className="text-red-500 text-[10px] mt-1">{errors.established}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-slate-500 mb-1">Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as "Active" | "Inactive")}
                                        className="w-full bg-slate-50 rounded-lg border border-slate-200/80 px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
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
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    {selectedAssociation ? "Update Condo" : "Save Condo"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deletingAssociation && (
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
                            <h3 className="text-base font-bold text-slate-900">Delete Condo Association</h3>
                        </div>

                        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                            Are you sure you want to delete <span className="font-extrabold text-slate-800">{deletingAssociation.name}</span>? This action is permanent and cannot be undone.
                        </p>

                        <div className="flex items-center justify-end gap-2.5 pt-2 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setDeletingAssociation(null)}
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
