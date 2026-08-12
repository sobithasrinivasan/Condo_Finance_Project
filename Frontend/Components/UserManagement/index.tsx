"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    FiEye,
    FiEdit2,
    FiTrash2,
    FiMoreVertical,
    FiFilter,
    FiDownload,
    FiInfo,
    FiPhone,
    FiCalendar,
    FiClock,
    FiShield,
    FiX,
    FiChevronLeft,
    FiChevronRight,
} from "react-icons/fi";
import {
    LuUserPlus,
    LuUserCheck,
    LuMail,
    LuShieldCheck,
    LuUser,
} from "react-icons/lu";

import UserEditModel from "@/Models/UserModel/UserEditModel";
import UserDeleteModel from "@/Models/UserModel/UserDeleteModel";
import AddUserModel from "@/Models/UserModel/AddUserModel";
import { createUserApi, getUsersApi, deleteUserApi } from "@/api/UsersApi/userApi";
import { formatDateDisplay } from "@/lib/format";
import toast from "react-hot-toast";

export interface SystemUser {
    id: string;
    full_name: string;
    initials: string;
    avatarBg: string;
    joinedDate: string;
    email: string;
    role: "Admin" | "Treasurer" | "Board Member";
    status: "Active" | "Pending" | "Inactive";
    lastLogin: string;
    phoneNumber?: string;
    createdOn?: string;
    twoFactorEnabled?: boolean;
}

export interface ModulePermission {
    module: string;
    access: "Full Access" | "View" | "No Access";
}


const rolePermissionsMap: Record<string, ModulePermission[]> = {
    Admin: [
        { module: "Dashboard", access: "Full Access" },
        { module: "Vendors", access: "Full Access" },
        { module: "Invoices", access: "Full Access" },
        { module: "Bank Statements", access: "Full Access" },
        { module: "Reconciliation", access: "Full Access" },
        { module: "Deposits", access: "Full Access" },
        { module: "Special Assessments", access: "Full Access" },
        { module: "Reports", access: "Full Access" },
        { module: "Users", access: "Full Access" },
        { module: "Settings", access: "Full Access" },
    ],
    Treasurer: [
        { module: "Dashboard", access: "View" },
        { module: "Vendors", access: "Full Access" },
        { module: "Invoices", access: "Full Access" },
        { module: "Bank Statements", access: "Full Access" },
        { module: "Reconciliation", access: "Full Access" },
        { module: "Deposits", access: "Full Access" },
        { module: "Special Assessments", access: "Full Access" },
        { module: "Reports", access: "Full Access" },
        { module: "Users", access: "No Access" },
        { module: "Settings", access: "No Access" },
    ],
    "Board Member": [
        { module: "Dashboard", access: "View" },
        { module: "Vendors", access: "No Access" },
        { module: "Invoices", access: "No Access" },
        { module: "Bank Statements", access: "No Access" },
        { module: "Reconciliation", access: "No Access" },
        { module: "Deposits", access: "View" },
        { module: "Special Assessments", access: "View" },
        { module: "Reports", access: "View" },
        { module: "Users", access: "No Access" },
        { module: "Settings", access: "No Access" },
    ],
};

export default function UserManagement() {
    const [users, setUsers] = useState<any>([]);
    const [selectedTab, setSelectedTab] = useState<"All Users" | "Active Users" | "Pending Invitations" | "Inactive Users">("All Users");
    const [selectedUser, setSelectedUser] = useState<any>();

    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

    const [viewingUser, setViewingUser] = useState<any>();
    const [editingUser, setEditingUser] = useState<any>();
    const [deletingUser, setDeletingUser] = useState<any>();
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);

    const [newUserName, setNewUserName] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserRole, setNewUserRole] = useState<"Admin" | "Treasurer" | "Board Member">("Board Member");
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const fetchUserList = async () => {
        try {
            const response = await getUsersApi();
            if (response.data) {
                setUsers(response.data);
                setSelectedUser((prevSelected: any) => {
                    if (prevSelected) {
                        const updatedSelected = response.data.find((u: any) => u.id === prevSelected.id);
                        if (updatedSelected) return updatedSelected;
                    }
                    return response.data?.[0];
                });
            }
        } catch (error) {
            console.error("Failed to fetch user list:", error);
            toast.error("Failed to fetch user list.");
        }
    };

    useEffect(() => {
        fetchUserList();
    }, [refreshTrigger]);

    useEffect(() => {
        const handleClickOutside = () => setActiveDropdownId(null);
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, []);

    const filteredUsers = users.filter((u: any) => {
        if (selectedTab === "Active Users") return u.status === "Active";
        if (selectedTab === "Pending Invitations") return u.status === "Pending";
        if (selectedTab === "Inactive Users") return u.status === "Inactive";
        return true;
    });

    const currentPermissions = rolePermissionsMap[selectedUser?.role] || rolePermissionsMap["Board Member"];

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserName || !newUserEmail) return;

        try {
            await createUserApi({
                full_name: newUserName,
                email: newUserEmail,
                role: newUserRole,
                password: "CondoFinance2026!",
                status: "Active"
            });

            setIsAddUserOpen(false);
            setNewUserName("");
            setNewUserEmail("");
            setRefreshTrigger((prev) => prev + 1);
            toast.success("User added successfully!");
        } catch (error: any) {
            console.error("Failed to create user:", error);
            const errorMessage = error?.response?.data?.message || error?.message || "Failed to add user.";
            toast.error(errorMessage);
            throw error;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6 font-sans text-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        User Management
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                        Manage system users, roles and access permissions.
                    </p>
                </div>

                <button
                    onClick={() => setIsAddUserOpen(true)}
                    className="bg-[#0B46AD] hover:bg-[#093C96] text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
                >
                    <LuUserPlus className="w-4 h-4 stroke-[2.5]" />
                    <span>Add User</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                        <div className="p-4 px-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-2 border-b md:border-b-0 border-slate-100 overflow-x-auto">
                                {(["All Users", "Active Users", "Pending Invitations", "Inactive Users"] as const).map(
                                    (tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setSelectedTab(tab)}
                                            className={`py-2 px-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 cursor-pointer ${selectedTab === tab
                                                ? "border-[#0B46AD] text-[#0B46AD] font-bold"
                                                : "border-transparent text-slate-500 hover:text-slate-800"
                                                }`}
                                        >
                                            {tab}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                                        <th className="py-3.5 px-6">USER</th>
                                        <th className="py-3.5 px-6">EMAIL</th>
                                        <th className="py-3.5 px-6">ROLE</th>
                                        <th className="py-3.5 px-6">STATUS</th>
                                        <th className="py-3.5 px-6">LAST LOGIN</th>
                                        <th className="py-3.5 px-6 text-center">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.map((user: any, index: number) => {
                                            const isDropdownOpen = activeDropdownId === user.id;
                                            return (
                                                <tr
                                                    key={user.id}
                                                    onClick={() => setSelectedUser(user)}
                                                    className={`cursor-pointer transition-colors ${selectedUser?.id === user?.id ? "bg-blue-100" : "hover:bg-blue-50"}`}
                                                >
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={`w-9 h-9 ${index % 2 === 0 ? "bg-indigo-500" : "bg-teal-500"} rounded-full text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs`}
                                                            >
                                                                {user.full_name.split(" ").filter((res: any, ind: number) => ind <= 1).map((n: string) => n[0]).join("").toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                                                    {user.full_name}
                                                                </div>
                                                                <div className="text-[11px] text-slate-400 font-normal">
                                                                    Joined {formatDateDisplay(user.created_at)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-4 px-6 text-slate-600 font-medium whitespace-nowrap">
                                                        {user.email}
                                                    </td>

                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span
                                                            className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold ${user.role === "Admin"
                                                                ? "bg-purple-100/80 text-purple-700"
                                                                : "bg-blue-100/80 text-blue-700"
                                                                }`}
                                                        >
                                                            {user.role}
                                                        </span>
                                                    </td>

                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span
                                                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${user.status === "Active"
                                                                ? "bg-emerald-100/80 text-emerald-700"
                                                                : user.status === "Pending"
                                                                    ? "bg-amber-100/80 text-amber-700"
                                                                    : "bg-slate-100 text-slate-600"
                                                                }`}
                                                        >
                                                            {user.status}
                                                        </span>
                                                    </td>

                                                    <td className="py-4 px-6 text-slate-600 font-medium whitespace-nowrap">
                                                        {formatDateDisplay(user.last_login_at)}
                                                    </td>

                                                    <td className="py-4 px-6 text-center whitespace-nowrap relative">
                                                        <div className="inline-block text-left" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDropdownId(isDropdownOpen ? null : user.id);
                                                                }}
                                                                title="Actions"
                                                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                            >
                                                                <FiMoreVertical className="w-4 h-4" />
                                                            </button>

                                                            {isDropdownOpen && (
                                                                <div className="absolute right-6 top-10 z-30 w-36 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1 text-left text-xs font-semibold animate-in fade-in zoom-in-95 duration-150">

                                                                    <button
                                                                        onClick={() => {
                                                                            setActiveDropdownId(null);
                                                                            setEditingUser(user);
                                                                        }}
                                                                        className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                                                                    >
                                                                        <FiEdit2 className="w-3.5 h-3.5 text-slate-400" />
                                                                        <span>Edit</span>
                                                                    </button>

                                                                    <div className="border-t border-slate-100 my-1" />

                                                                    <button
                                                                        onClick={() => {
                                                                            setActiveDropdownId(null);
                                                                            setDeletingUser(user);
                                                                        }}
                                                                        className="w-full px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                                                                    >
                                                                        <FiTrash2 className="w-3.5 h-3.5 text-rose-500" />
                                                                        <span>Delete</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="py-12 text-center text-slate-400 font-medium"
                                            >
                                                No users found matching tab criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 px-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span>
                                Showing 1 to {filteredUsers.length} of {filteredUsers.length} users
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

                    <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-5 flex items-start gap-3.5 text-xs text-blue-900 shadow-2xs">
                        <FiInfo className="w-5 h-5 text-[#0B46AD] flex-shrink-0 mt-0.5" />
                        <div className="space-y-1.5">
                            <h3 className="font-bold text-sm text-[#0B46AD]">
                                About User Access
                            </h3>
                            <ul className="space-y-1 text-slate-700 font-medium leading-relaxed">
                                <li>• Board Treasurer/Admin users have full access to all system features.</li>
                                <li>• Board Member users have read access to Dashboard, Deposits, Special Assessments and Reports only.</li>
                                <li>• Maximum 5 board members can be added to the system.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                            User Details
                        </h2>

                        <div className="flex items-center gap-3">
                            <div
                                className={`w-12 h-12 rounded-full bg-indigo-500 text-white font-extrabold text-base flex items-center justify-center flex-shrink-0 shadow-sm`}
                            >
                                {selectedUser?.full_name.split(" ").filter((res: any, ind: number) => ind <= 1).map((n: string) => n[0]).join("").toUpperCase()}
                            </div>
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-slate-900">
                                        {selectedUser?.full_name}
                                    </h3>
                                    <span className={`${selectedUser?.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"} text-[11px] font-bold px-2.5 py-0.5 rounded-full`}>
                                        {selectedUser?.status}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 font-medium">
                                    {selectedUser?.email}
                                </div>
                                <div className="text-xs text-slate-400 font-medium">
                                    {selectedUser?.role}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2 text-xs border-t border-slate-100">
                            {/* <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium flex items-center gap-2">
                                    <FiPhone className="w-4 h-4 text-slate-400" />
                                    <span>Phone Number</span>
                                </span>
                                <span className="font-bold text-slate-900">
                                    {selectedUser?.phoneNumber || "+1 (555) 123-4567"}
                                </span>
                            </div> */}

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium flex items-center gap-2">
                                    <FiCalendar className="w-4 h-4 text-slate-400" />
                                    <span>Created On</span>
                                </span>
                                <span className="font-bold text-slate-900">
                                    {formatDateDisplay(selectedUser?.created_at)}                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium flex items-center gap-2">
                                    <FiClock className="w-4 h-4 text-slate-400" />
                                    <span>Last Login</span>
                                </span>
                                <span className="font-bold text-slate-900">
                                    {formatDateDisplay(selectedUser?.last_login_at)}                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium flex items-center gap-2">
                                    <FiShield className="w-4 h-4 text-emerald-600" />
                                    <span>Two-Factor Authentication</span>
                                </span>
                                <span className="font-bold text-emerald-600">
                                    {selectedUser?.twoFactorEnabled !== false ? "Enabled" : "Disabled"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                        <div className="p-4 px-5 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-base font-bold text-slate-900">
                                Role Permissions ({selectedUser?.role})
                            </h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                        <th className="py-2.5 px-5">MODULE</th>
                                        <th className="py-2.5 px-5">ACCESS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {currentPermissions.map((perm) => (
                                        <tr key={perm.module} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-2.5 px-5 font-semibold text-slate-700">
                                                {perm.module}
                                            </td>
                                            <td className="py-2.5 px-5 font-bold">
                                                {perm.access === "Full Access" ? (
                                                    <span className="text-emerald-600">Full Access</span>
                                                ) : perm.access === "View" ? (
                                                    <span className="text-blue-600">View</span>
                                                ) : (
                                                    <span className="text-rose-600">No Access</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {editingUser && (
                <UserEditModel
                    isOpen={Boolean(editingUser)}
                    onClose={() => setEditingUser(null)}
                    user={editingUser}
                    onSave={() => {
                        setEditingUser(null);
                        setRefreshTrigger((prev) => prev + 1);
                        toast.success("User updated successfully!");
                    }}
                />
            )}

            {deletingUser && (
                <UserDeleteModel
                    isOpen={Boolean(deletingUser)}
                    onClose={() => setDeletingUser(null)}
                    user={deletingUser}
                    onDelete={async (userId) => {
                        try {
                            await deleteUserApi(userId);
                            setDeletingUser(null);
                            setRefreshTrigger((prev) => prev + 1);
                            toast.success("User deleted successfully!");
                        } catch (error: any) {
                            console.error("Failed to delete user:", error);
                            const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete user.";
                            toast.error(errorMessage);
                            throw error;
                        }
                    }}
                />
            )}

            {isAddUserOpen && (
                <AddUserModel
                    setIsAddUserOpen={setIsAddUserOpen}
                    handleAddUser={handleAddUser}
                    newUserName={newUserName}
                    setNewUserName={setNewUserName}
                    newUserEmail={newUserEmail}
                    setNewUserEmail={setNewUserEmail}
                    newUserRole={newUserRole}
                    setNewUserRole={setNewUserRole} />
            )}
        </div>
    );
}