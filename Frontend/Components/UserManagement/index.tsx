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

export interface SystemUser {
    id: string;
    name: string;
    initials: string;
    avatarBg: string;
    joinedDate: string;
    email: string;
    role: "Administrator" | "Treasurer" | "Board Member";
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

const initialUsers: SystemUser[] = [
    {
        id: "1",
        name: "Admin User",
        initials: "AU",
        avatarBg: "bg-[#0B46AD]",
        joinedDate: "Jul 10, 2026",
        email: "admin@condo.com",
        role: "Administrator",
        status: "Active",
        lastLogin: "Today, 10:30 AM",
        phoneNumber: "+1 (555) 019-2831",
        createdOn: "Jul 10, 2026",
        twoFactorEnabled: true,
    },
    {
        id: "2",
        name: "Treasurer",
        initials: "TR",
        avatarBg: "bg-teal-500",
        joinedDate: "Jun 15, 2026",
        email: "treasurer@condo.com",
        role: "Treasurer",
        status: "Active",
        lastLogin: "Today, 9:15 AM",
        phoneNumber: "+1 (555) 123-4567",
        createdOn: "Jun 15, 2026",
        twoFactorEnabled: true,
    },
    {
        id: "3",
        name: "Board Member 1",
        initials: "BM",
        avatarBg: "bg-indigo-500",
        joinedDate: "May 20, 2026",
        email: "board1@condo.com",
        role: "Board Member",
        status: "Active",
        lastLogin: "Yesterday, 4:20 PM",
        phoneNumber: "+1 (555) 345-6789",
        createdOn: "May 20, 2026",
        twoFactorEnabled: true,
    },
    {
        id: "4",
        name: "Board Member 2",
        initials: "BM",
        avatarBg: "bg-indigo-500",
        joinedDate: "May 22, 2026",
        email: "board2@condo.com",
        role: "Board Member",
        status: "Active",
        lastLogin: "Jul 12, 2026, 2:05 PM",
        phoneNumber: "+1 (555) 987-6543",
        createdOn: "May 22, 2026",
        twoFactorEnabled: true,
    },
    {
        id: "5",
        name: "Board Member 3",
        initials: "BM",
        avatarBg: "bg-indigo-500",
        joinedDate: "May 25, 2026",
        email: "board3@condo.com",
        role: "Board Member",
        status: "Active",
        lastLogin: "Jul 11, 2026, 11:40 AM",
        phoneNumber: "+1 (555) 456-7890",
        createdOn: "May 25, 2026",
        twoFactorEnabled: true,
    },
];

const rolePermissionsMap: Record<string, ModulePermission[]> = {
    Administrator: [
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
    const [users, setUsers] = useState<SystemUser[]>(initialUsers);
    const [selectedTab, setSelectedTab] = useState<"All Users" | "Active Users" | "Pending Invitations" | "Inactive Users">("All Users");
    const [selectedUser, setSelectedUser] = useState<SystemUser>(initialUsers[1]);

    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

    const [viewingUser, setViewingUser] = useState<SystemUser | null>(null);
    const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
    const [deletingUser, setDeletingUser] = useState<SystemUser | null>(null);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);

    const [newUserName, setNewUserName] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserRole, setNewUserRole] = useState<"Administrator" | "Treasurer" | "Board Member">("Board Member");

    useEffect(() => {
        const handleClickOutside = () => setActiveDropdownId(null);
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, []);

    const filteredUsers = users.filter((u) => {
        if (selectedTab === "Active Users") return u.status === "Active";
        if (selectedTab === "Pending Invitations") return u.status === "Pending";
        if (selectedTab === "Inactive Users") return u.status === "Inactive";
        return true;
    });

    const currentPermissions = rolePermissionsMap[selectedUser.role] || rolePermissionsMap["Board Member"];

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserName || !newUserEmail) return;

        const initials = newUserName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();

        const createdUser: SystemUser = {
            id: String(Date.now()),
            name: newUserName,
            initials: initials || "US",
            avatarBg: newUserRole === "Administrator" ? "bg-[#0B46AD]" : newUserRole === "Treasurer" ? "bg-teal-500" : "bg-indigo-500",
            joinedDate: "Jul 21, 2026",
            email: newUserEmail,
            role: newUserRole,
            status: "Active",
            lastLogin: "Just now",
            phoneNumber: "+1 (555) 000-1122",
            createdOn: "Jul 21, 2026",
            twoFactorEnabled: true,
        };

        setUsers((prev) => [...prev, createdUser]);
        setSelectedUser(createdUser);
        setIsAddUserOpen(false);
        setNewUserName("");
        setNewUserEmail("");
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
                                        filteredUsers.map((user) => {
                                            const isSelected = selectedUser.id === user.id;
                                            const isDropdownOpen = activeDropdownId === user.id;

                                            return (
                                                <tr
                                                    key={user.id}
                                                    onClick={() => setSelectedUser(user)}
                                                    className={`cursor-pointer transition-colors ${isSelected
                                                        ? "bg-blue-50/40"
                                                        : "hover:bg-slate-50/60"
                                                        }`}
                                                >
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={`w-9 h-9 rounded-full ${user.avatarBg} text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs`}
                                                            >
                                                                 {user.initials}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                                                    {user.name}
                                                                </div>
                                                                <div className="text-[11px] text-slate-400 font-normal">
                                                                    Joined {user.joinedDate}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-4 px-6 text-slate-600 font-medium whitespace-nowrap">
                                                        {user.email}
                                                    </td>

                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span
                                                            className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold ${user.role === "Administrator"
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
                                                        {user.lastLogin}
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
                                className={`w-12 h-12 rounded-full ${selectedUser.avatarBg} text-white font-extrabold text-base flex items-center justify-center flex-shrink-0 shadow-sm`}
                            >
                                {selectedUser.initials}
                            </div>
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-slate-900">
                                        {selectedUser.name}
                                    </h3>
                                    <span className="bg-emerald-100 text-emerald-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                        {selectedUser.status}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 font-medium">
                                    {selectedUser.email}
                                </div>
                                <div className="text-xs text-slate-400 font-medium">
                                    {selectedUser.role}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2 text-xs border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium flex items-center gap-2">
                                    <FiPhone className="w-4 h-4 text-slate-400" />
                                    <span>Phone Number</span>
                                </span>
                                <span className="font-bold text-slate-900">
                                    {selectedUser.phoneNumber || "+1 (555) 123-4567"}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium flex items-center gap-2">
                                    <FiCalendar className="w-4 h-4 text-slate-400" />
                                    <span>Created On</span>
                                </span>
                                <span className="font-bold text-slate-900">
                                    {selectedUser.createdOn || selectedUser.joinedDate}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium flex items-center gap-2">
                                    <FiClock className="w-4 h-4 text-slate-400" />
                                    <span>Last Login</span>
                                </span>
                                <span className="font-bold text-slate-900">
                                    {selectedUser.lastLogin}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium flex items-center gap-2">
                                    <FiShield className="w-4 h-4 text-emerald-600" />
                                    <span>Two-Factor Authentication</span>
                                </span>
                                <span className="font-bold text-emerald-600">
                                    {selectedUser.twoFactorEnabled !== false ? "Enabled" : "Disabled"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                        <div className="p-4 px-5 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-base font-bold text-slate-900">
                                Role Permissions ({selectedUser.role})
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
                    onSave={(updated) => {
                        setUsers((prev) =>
                            prev.map((u) => (u.id === updated.id ? updated : u))
                        );
                        if (selectedUser.id === updated.id) {
                            setSelectedUser(updated);
                        }
                        setEditingUser(null);
                    }}
                />
            )}

            {deletingUser && (
                <UserDeleteModel
                    isOpen={Boolean(deletingUser)}
                    onClose={() => setDeletingUser(null)}
                    user={deletingUser}
                    onDelete={(userId) => {
                        setUsers((prev) => prev.filter((u) => u.id !== userId));
                        if (selectedUser.id === userId) {
                            const remaining = users.filter((u) => u.id !== userId);
                            if (remaining.length > 0) setSelectedUser(remaining[0]);
                        }
                        setDeletingUser(null);
                    }}
                />
            )}

            {isAddUserOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div
                        onClick={() => setIsAddUserOpen(false)}
                        className="fixed inset-0 cursor-default"
                    />
                    <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                Add System User
                            </h2>
                            <button
                                onClick={() => setIsAddUserOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddUser} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
                            <div>
                                <label className="block text-slate-700 font-semibold mb-1.5">
                                    Full Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    placeholder="e.g. Sarah Connor"
                                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-700 font-semibold mb-1.5">
                                    Email Address <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    placeholder="sarah@condo.com"
                                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-700 font-semibold mb-1.5">
                                    Assign Role
                                </label>
                                <select
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value as any)}
                                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                                >
                                    <option value="Board Member">Board Member</option>
                                    <option value="Treasurer">Treasurer</option>
                                    <option value="Administrator">Administrator</option>
                                </select>
                            </div>

                            <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddUserOpen(false)}
                                    className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-[#0B46AD] hover:bg-[#093C96] text-white font-bold rounded-xl text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer"
                                >
                                    Add User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}