"use client";

import React, { useState, useEffect } from "react";
import { formatDateDisplay } from "@/lib/format";
import { toast } from "react-hot-toast";
import {
    getVendorApi,
    createVendorApi,
    updateVendorApi,
    deleteVendorApi
} from "@/api/Vendor/VendorApi";

interface VendorType {
    id: number;
    vendor_name: string;
    category: string;
    phone?: string;
    email?: string;
    address?: string;
    tin_number?: string;
    status: "Active" | "Inactive";
    created_at?: string;
}

export default function Vendor() {
    const [vendors, setVendors] = useState<VendorType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Status");
    const [associationId, setAssociationId] = useState<number | null>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<VendorType | null>(null);

    // Form fields
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [tinNumber, setTinNumber] = useState("");
    const [status, setStatus] = useState<"Active" | "Inactive">("Active");

    // Form validation errors state
    const [errors, setErrors] = useState({
        name: "",
        category: "",
        phone: ""
    });

    // Delete Confirmation state
    const [deletingVendor, setDeletingVendor] = useState<VendorType | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchVendors = async () => {
        setIsLoading(true);
        try {
            const data = await getVendorApi();
            setVendors(Array.isArray(data) ? data : (data?.data || []));
        } catch (error) {
            console.error("Failed to fetch vendors:", error);
            toast.error("Failed to load vendors.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();

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
        }
    }, []);

    const filteredVendors = vendors.filter((vendor) => {
        const matchesSearch =
            (vendor.vendor_name || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
            (vendor.category || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
            (vendor.phone && vendor.phone.includes(searchTerm));

        const matchesStatus =
            statusFilter === "All Status" ? true : vendor.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleConfirmDelete = async () => {
        if (!deletingVendor) return;
        setIsDeleting(true);
        try {
            await deleteVendorApi(deletingVendor.id);
            toast.success("Vendor deleted successfully!");
            setDeletingVendor(null);
            fetchVendors();
        } catch (error) {
            console.error("Failed to delete vendor:", error);
            toast.error("Failed to delete vendor.");
        } finally {
            setIsDeleting(false);
        }
    };

    const validate = () => {
        let tempErrors = { name: "", category: "", phone: "" };
        let isValid = true;

        if (!name.trim()) {
            tempErrors.name = "Vendor Name is required";
            isValid = false;
        }

        if (!category.trim()) {
            tempErrors.category = "Category is required";
            isValid = false;
        }

        if (!phone.trim()) {
            tempErrors.phone = "Phone number is required";
            isValid = false;
        } else {
            const cleanPhone = phone.replace(/\D/g, "");
            if (cleanPhone.length < 7) {
                tempErrors.phone = "Phone number must be at least 7 digits";
                isValid = false;
            }
        }

        setErrors(tempErrors);
        return isValid;
    };

    const handleOpenAddModal = () => {
        setSelectedVendor(null);
        setName("");
        setCategory("");
        setPhone("");
        setEmail("");
        setAddress("");
        setTinNumber("");
        setStatus("Active");
        setErrors({ name: "", category: "", phone: "" });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (vendor: VendorType) => {
        setSelectedVendor(vendor);
        setName(vendor.vendor_name || "");
        setCategory(vendor.category || "");
        setPhone(vendor.phone || "");
        setEmail(vendor.email || "");
        setAddress(vendor.address || "");
        setTinNumber(vendor.tin_number || "");
        setStatus(vendor.status === "Inactive" ? "Inactive" : "Active");
        setErrors({ name: "", category: "", phone: "" });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSaving(true);
        try {
            if (selectedVendor) {
                // Edit mode
                await updateVendorApi(selectedVendor.id, {
                    vendor_name: name,
                    category,
                    phone,
                    email: email || undefined,
                    address: address || undefined,
                    tin_number: tinNumber || undefined,
                    status
                });
                toast.success("Vendor updated successfully!");
            } else {
                // Add mode
                await createVendorApi({
                    association_id: associationId || 1,
                    vendor_name: name,
                    category,
                    phone,
                    email: email || undefined,
                    address: address || undefined,
                    tin_number: tinNumber || undefined
                });
                toast.success("Vendor added successfully!");
            }
            setIsModalOpen(false);
            fetchVendors();
        } catch (error) {
            console.error("Failed to save vendor:", error);
            toast.error("Failed to save vendor. Please try again.");
        } finally {
            setIsSaving(false);
        }
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
                                <th className="py-4 px-6">Vendor Name</th>
                                <th className="py-4 px-6">Category</th>
                                <th className="py-4 px-6">Phone</th>
                                <th className="py-4 px-6">Address</th>
                                <th className="py-4 px-6">TIN Number</th>
                                <th className="py-4 px-6">Created Date</th>
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
                                            Loading vendors...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredVendors.length > 0 ? (
                                filteredVendors.map((vendor) => (
                                    <tr key={vendor.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-6 font-bold text-slate-800">{vendor.vendor_name}</td>
                                        <td className="py-4 px-6 text-slate-500">{vendor.category}</td>
                                        <td className="py-4 px-6 text-slate-500 font-sans">{vendor.phone || "—"}</td>
                                        <td className="py-4 px-6 text-slate-500">{vendor.address || "—"}</td>
                                        <td className="py-4 px-6 text-slate-500 font-sans">{vendor.tin_number || "—"}</td>
                                        <td className="py-4 px-6 text-slate-500 font-sans">{formatDateDisplay(vendor.created_at || "2026-07-29")}</td>
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
                                                    onClick={() => handleOpenEditModal(vendor)}
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
                                                    onClick={() => setDeletingVendor(vendor)}
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
                                    <td colSpan={8} className="py-8 px-6 text-center text-slate-400">
                                        No vendors found matching your search.
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
                                {selectedVendor ? "Edit Vendor" : "Add New Vendor"}
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

                        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs font-semibold">
                            <div>
                                <label className="block text-slate-500 mb-1">Vendor Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. ABC Plumbing"
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
                                <label className="block text-slate-500 mb-1">Category</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Plumbing"
                                    value={category}
                                    onChange={(e) => {
                                        setCategory(e.target.value);
                                        setErrors(prev => ({ ...prev, category: "" }));
                                    }}
                                    className={`w-full bg-slate-50 rounded-lg border px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 ${errors.category ? "border-red-500 focus:ring-1 focus:ring-red-500" : "border-slate-200/80"
                                        }`}
                                />
                                {errors.category && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.category}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-slate-500 mb-1">Phone</label>
                                <input
                                    type="text"
                                    placeholder="e.g. (555) 123-4567"
                                    value={phone}
                                    onChange={(e) => {
                                        setPhone(e.target.value);
                                        setErrors(prev => ({ ...prev, phone: "" }));
                                    }}
                                    className={`w-full bg-slate-50 rounded-lg border px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 ${errors.phone ? "border-red-500 focus:ring-1 focus:ring-red-500" : "border-slate-200/80"
                                        }`}
                                />
                                {errors.phone && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.phone}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-slate-500 mb-1">Email</label>
                                <input
                                    type="email"
                                    placeholder="e.g. contact@vendor.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 rounded-lg border border-slate-200/80 px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-500 mb-1">Address</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 123 Main St, Anytown"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full bg-slate-50 rounded-lg border border-slate-200/80 px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-500 mb-1">TIN Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. TX-98765432"
                                    value={tinNumber}
                                    onChange={(e) => setTinNumber(e.target.value)}
                                    className="w-full bg-slate-50 rounded-lg border border-slate-200/80 px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {selectedVendor && (
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
                            )}

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => setIsModalOpen(false)}
                                    className={`px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer ${isSaving ? "opacity-50 cursor-not-allowed" : ""
                                        }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${isSaving ? "opacity-75 cursor-not-allowed" : ""
                                        }`}
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                            Saving...
                                        </>
                                    ) : selectedVendor ? (
                                        "Update Vendor"
                                    ) : (
                                        "Save Vendor"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {deletingVendor && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-slate-100 shadow-xl space-y-4">
                        <div className="flex items-center gap-3 text-rose-600">
                            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
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
                                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-slate-800">Delete Vendor</h3>
                        </div>

                        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                                    Are you sure you want to delete <span className="font-extrabold text-slate-800">{deletingVendor.vendor_name}</span>? This action is permanent and cannot be undone.
                        </p>

                        <div className="pt-2 flex justify-end gap-3 font-semibold text-xs">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setDeletingVendor(null)}
                                className={`px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer ${isDeleting ? "opacity-50 cursor-not-allowed" : ""
                                    }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleConfirmDelete}
                                className={`px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${isDeleting ? "opacity-75 cursor-not-allowed" : ""
                                    }`}
                            >
                                {isDeleting ? (
                                    <>
                                        <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Delete Vendor"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
