"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
    createCondoUnitApi,
    updateCondoUnitApi,
    CondoUnitType
} from "@/api/CondoUnit/CondoUnitApi";

interface CondoUnitModalProps {
    isOpen: boolean;
    selectedCondo: CondoUnitType | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CondoUnitModal({
    isOpen,
    selectedCondo,
    onClose,
    onSuccess
}: CondoUnitModalProps) {
    // Form fields
    const [unitNumber, setUnitNumber] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [ownerEmail, setOwnerEmail] = useState("");
    const [ownerPhone, setOwnerPhone] = useState("");
    const [monthlyHoaAmount, setMonthlyHoaAmount] = useState("");
    const [status, setStatus] = useState<"Active" | "Inactive">("Active");
    const [isSaving, setIsSaving] = useState(false);

    // Form validation errors state
    const [errors, setErrors] = useState({
        unitNumber: "",
        ownerName: "",
        ownerEmail: "",
        monthlyHoaAmount: ""
    });

    useEffect(() => {
        if (isOpen) {
            if (selectedCondo) {
                setUnitNumber(selectedCondo.unit_number || "");
                setOwnerName(selectedCondo.owner_name || "");
                setOwnerEmail(selectedCondo.owner_email || "");
                setOwnerPhone(selectedCondo.owner_phone || "");
                setMonthlyHoaAmount(selectedCondo.monthly_hoa_amount ? selectedCondo.monthly_hoa_amount.toString() : "");
                setStatus(selectedCondo.status === "Inactive" ? "Inactive" : "Active");
            } else {
                setUnitNumber("");
                setOwnerName("");
                setOwnerEmail("");
                setOwnerPhone("");
                setMonthlyHoaAmount("");
                setStatus("Active");
            }
            setErrors({ unitNumber: "", ownerName: "", ownerEmail: "", monthlyHoaAmount: "" });
        }
    }, [isOpen, selectedCondo]);

    const validate = () => {
        let tempErrors = { unitNumber: "", ownerName: "", ownerEmail: "", monthlyHoaAmount: "" };
        let isValid = true;

        if (!unitNumber.trim()) {
            tempErrors.unitNumber = "Unit Number is required";
            isValid = false;
        }

        if (!ownerName.trim()) {
            tempErrors.ownerName = "Owner Name is required";
            isValid = false;
        }

        if (ownerEmail.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(ownerEmail)) {
                tempErrors.ownerEmail = "Please enter a valid email address";
                isValid = false;
            }
        }

        const hoaNum = parseFloat(monthlyHoaAmount);
        if (!monthlyHoaAmount.trim() || isNaN(hoaNum) || hoaNum <= 0) {
            tempErrors.monthlyHoaAmount = "Monthly HOA amount must be a positive number";
            isValid = false;
        }

        setErrors(tempErrors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSaving(true);
        try {
            const payload = {
                unit_number: unitNumber,
                owner_name: ownerName,
                owner_email: ownerEmail.trim() || undefined,
                owner_phone: ownerPhone.trim() || undefined,
                monthly_hoa_amount: parseFloat(monthlyHoaAmount),
                status
            };

            if (selectedCondo && selectedCondo.id !== undefined) {
                await updateCondoUnitApi(selectedCondo.id, payload);
                toast.success("Condo unit updated successfully!");
            } else {
                await createCondoUnitApi(payload);
                toast.success("Condo unit added successfully!");
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Failed to save condo:", error);
            const msg = error?.response?.data?.message || "Failed to save condo unit. Please try again.";
            toast.error(msg);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl p-6 border border-slate-100 shadow-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-800">
                        {selectedCondo ? "Edit Condo Unit" : "Add New Condo Unit"}
                    </h3>
                    <button
                        onClick={onClose}
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
                        <label className="block text-slate-500 mb-1">Owner Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Sarah Connor"
                            value={ownerName}
                            onChange={(e) => {
                                setOwnerName(e.target.value);
                                setErrors(prev => ({ ...prev, ownerName: "" }));
                            }}
                            className={`w-full bg-slate-50 rounded-lg border px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 ${
                                errors.ownerName ? "border-red-500 focus:ring-1 focus:ring-red-500" : "border-slate-200/80"
                            }`}
                        />
                        {errors.ownerName && (
                            <p className="text-red-500 text-[10px] mt-1">{errors.ownerName}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-500 mb-1">Owner Email</label>
                            <input
                                type="email"
                                placeholder="e.g. sarah@example.com"
                                value={ownerEmail}
                                onChange={(e) => {
                                    setOwnerEmail(e.target.value);
                                    setErrors(prev => ({ ...prev, ownerEmail: "" }));
                                }}
                                className={`w-full bg-slate-50 rounded-lg border px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 ${
                                    errors.ownerEmail ? "border-red-500 focus:ring-1 focus:ring-red-500" : "border-slate-200/80"
                                }`}
                            />
                            {errors.ownerEmail && (
                                <p className="text-red-500 text-[10px] mt-1">{errors.ownerEmail}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-slate-500 mb-1">Owner Phone</label>
                            <input
                                type="text"
                                placeholder="e.g. (555) 123-4567"
                                value={ownerPhone}
                                onChange={(e) => setOwnerPhone(e.target.value)}
                                className="w-full bg-slate-50 rounded-lg border border-slate-200/80 px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-500 mb-1">Address</label>
                        <input
                            type="text"
                            placeholder="e.g. address"
                            value={unitNumber}
                            onChange={(e) => {
                                setUnitNumber(e.target.value);
                                setErrors(prev => ({ ...prev, unitNumber: "" }));
                            }}
                            className={`w-full bg-slate-50 rounded-lg border px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 ${
                                errors.unitNumber ? "border-red-500 focus:ring-1 focus:ring-red-500" : "border-slate-200/80"
                            }`}
                        />
                        {errors.unitNumber && (
                            <p className="text-red-500 text-[10px] mt-1">{errors.unitNumber}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-500 mb-1">Monthly HOA Amount ($)</label>
                            <input
                                type="text"
                                placeholder="e.g. 350.00"
                                value={monthlyHoaAmount}
                                onChange={(e) => {
                                    setMonthlyHoaAmount(e.target.value);
                                    setErrors(prev => ({ ...prev, monthlyHoaAmount: "" }));
                                }}
                                className={`w-full bg-slate-50 rounded-lg border px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 ${
                                    errors.monthlyHoaAmount ? "border-red-500 focus:ring-1 focus:ring-red-500" : "border-slate-200/80"
                                }`}
                            />
                            {errors.monthlyHoaAmount && (
                                <p className="text-red-500 text-[10px] mt-1">{errors.monthlyHoaAmount}</p>
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
                            disabled={isSaving}
                            onClick={onClose}
                            className={`px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer ${
                                isSaving ? "opacity-50 cursor-not-allowed" : ""
                            }`}
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
                                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                    Saving...
                                </>
                            ) : selectedCondo ? (
                                "Update Condo"
                            ) : (
                                "Save Condo"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
