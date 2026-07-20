"use client";

import { formatDate } from "@/lib/format";
import React, { useState } from "react";

interface VendorType {
    id: number;
    name: string;
    category: string;
    phone: string;
    createdDate: string;
    status: "Active" | "Inactive";
}

export default function Vendor() {
    const [vendors, setVendors] = useState<VendorType[]>([
        { id: 1, name: "ABC Plumbing", category: "Plumbing", phone: "(555) 123-4567", createdDate: "2024-01-01", status: "Active" },
        { id: 2, name: "Elevator Maintenance Co.", category: "Elevator", phone: "(555) 234-5678", createdDate: "2024-01-01", status: "Active" },
        { id: 3, name: "Green Landscaping", category: "Landscaping", phone: "(555) 345-6789", createdDate: "2024-01-01", status: "Active" },
        { id: 4, name: "Secure Guard Services", category: "Security", phone: "(555) 456-7890", createdDate: "2024-01-01", status: "Active" },
        { id: 5, name: "City Waste Management", category: "Waste", phone: "(555) 567-8901", createdDate: "2024-01-01", status: "Inactive" },
    ]);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Status");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const [newName, setNewName] = useState("");
    const [newCategory, setNewCategory] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newStatus, setNewStatus] = useState<"Active" | "Inactive">("Active");

    const filteredVendors = vendors.filter((vendor) => {
        const matchesSearch =
            vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vendor.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vendor.phone.includes(searchTerm);

        const matchesStatus =
            statusFilter === "All Status" ? true : vendor.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleDelete = (id: number) => {
        setVendors(vendors.filter((v) => v.id !== id));
    };

    const handleAddVendor = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newCategory || !newPhone) return;

        const newVendor: VendorType = {
            id: Date.now(),
            name: newName,
            category: newCategory,
            phone: newPhone,
            createdDate: formatDate(new Date().toISOString()),
            status: newStatus,
        };

        setVendors([...vendors, newVendor]);
        setIsAddModalOpen(false);

        setNewName("");
        setNewCategory("");
        setNewPhone("");
        setNewStatus("Active");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                        Vendor Management
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        View, search, and manage condo service vendors
                    </p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
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
                    Add Vendor
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 relative">
                    <input
                        type="text"
                        placeholder="Search vendors..."
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
                                <th className="py-4 px-6">
                                    <div className="flex items-center gap-1.5 cursor-pointer select-none">
                                        Vendor Name
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="2"
                                            stroke="currentColor"
                                            className="w-3 h-3 text-slate-400"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                                            />
                                        </svg>
                                    </div>
                                </th>
                                <th className="py-4 px-6">Category</th>
                                <th className="py-4 px-6">Phone</th>
                                <th className="py-4 px-6">Created Date</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-600 font-semibold">
                            {filteredVendors.length > 0 ? (
                                filteredVendors.map((vendor) => (
                                    <tr key={vendor.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-6 font-bold text-slate-800">{vendor.name}</td>
                                        <td className="py-4 px-6 text-slate-500">{vendor.category}</td>
                                        <td className="py-4 px-6 text-slate-500 font-sans">{vendor.phone}</td>
                                        <td className="py-4 px-6 text-slate-500 font-sans">{formatDate(vendor.createdDate)}</td>
                                        <td className="py-4 px-6">
                                            <span
                                                className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${vendor.status === "Active"
                                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200/40"
                                                    : "bg-slate-50 text-slate-400 border border-slate-200/40"
                                                    }`}
                                            >
                                                {vendor.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                                    title="Edit Vendor"
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
                                                    onClick={() => handleDelete(vendor.id)}
                                                    className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                                    title="Delete Vendor"
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
                                    <td colSpan={5} className="py-8 px-6 text-center text-slate-400">
                                        No vendors found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-center items-center gap-2 pt-2">
                <button className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xs select-none">
                    1
                </button>
                <button className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 border border-transparent flex items-center justify-center font-bold text-xs select-none cursor-pointer">
                    2
                </button>
                <button className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 border border-transparent flex items-center justify-center font-bold text-xs select-none cursor-pointer">
                    3
                </button>
                <button className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 border border-transparent flex items-center justify-center font-bold text-xs select-none cursor-pointer">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                        className="w-3.5 h-3.5"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                </button>
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-slate-100 shadow-xl space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <h3 className="text-base font-bold text-slate-800">Add New Vendor</h3>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
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

                        <form onSubmit={handleAddVendor} className="space-y-4 text-xs font-semibold">
                            <div>
                                <label className="block text-slate-500 mb-1">Vendor Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. ABC Plumbing"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full bg-slate-50 rounded-lg border border-slate-200/80 px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-500 mb-1">Category</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Plumbing"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="w-full bg-slate-50 rounded-lg border border-slate-200/80 px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-500 mb-1">Phone</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. (555) 123-4567"
                                    value={newPhone}
                                    onChange={(e) => setNewPhone(e.target.value)}
                                    className="w-full bg-slate-50 rounded-lg border border-slate-200/80 px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-500 mb-1">Status</label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value as "Active" | "Inactive")}
                                    className="w-full bg-slate-50 rounded-lg border border-slate-200/80 px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                                >
                                    Save Vendor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
