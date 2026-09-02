"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { TbArrowLeft, TbLayoutSidebarLeftCollapse, TbLayoutSidebarRightCollapse } from "react-icons/tb";
import { removeUser } from "@/lib/localStore";
import toast from "react-hot-toast";

interface MenuItem {
  name: string;
  icon: React.ReactNode;
  href: string;
}

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

interface NavSection {
  title?: string;
  items: MenuItem[];
}

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.role) {
          setUserRole(parsed.role);
        }
      } catch (e) {
        console.error("Failed to parse user role from localStorage:", e);
      }
    }
  }, []);

  const navSections: NavSection[] = [
    {
      items: [
        {
          name: "Dashboard",
          href: "/dashboard",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21.75h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21.75h7.5"
              />
            </svg>
          ),
        },
      ],
    },
    {
      title: "Setup",
      items: [
        {
          name: "Condo Units",
          href: "/condo-units",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M2.25 21h19.5M2.25 5.25h19.5M12 9h.008v.008H12V9Zm0 3.75h.008v.008H12v-.008Zm0 3.75h.008v.008H12v-.008Zm-3-7.5h.008v.008H9V9Zm0 3.75h.008v.008H9v-.008Zm0 3.75h.008v.008H9v-.008Zm6-3.75h.008v.008h-.008V12.75Zm0 3.75h.008v.008h-.008v-.008Z"
              />
            </svg>
          ),
        },
        {
          name: "Vendors",
          href: "/vendors",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
              />
            </svg>
          ),
        },
      ],
    },
    {
      title: "Processing",
      items: [
        {
          name: "Invoices",
          href: "/invoices",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          ),
        },
        {
          name: "Special Assessments",
          href: "/special-assessments",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.375m0-10.06h3.375a2.625 2.625 0 0 1 2.625 2.625v9a2.625 2.625 0 0 1-2.625 2.625h-3.375M9 19.5H5.625c-.621 0-1.125-.504-1.125-1.125V4.125c0-.621.504-1.125 1.125-1.125H9m0 16.5V3m0 16.5H12m-3-16.5H12"
              />
            </svg>
          ),
        },
        {
          name: "Bank Statements",
          href: "/bank-statements",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 21h19.5m-18-18v18m16.5-18v18m-13.5-3.75h10.5m-10.5-3h10.5m-10.5-3h10.5m-10.5-3h10.5M12 3v18"
              />
            </svg>
          ),
        },
      ],
    },
    {
      title: "Accounts",
      items: [
        {
          name: "Receivable",
          href: "/receivable",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          ),
        },
        {
          name: "Payable",
          href: "/payable",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H3.75A1.5 1.5 0 0 1 2.25 18V6a1.5 1.5 0 0 1 1.5-1.5Zm12 4.5h.008v.008h-.008V9Zm.008 3h-.008v.008h.008V12Zm-3-3h.008v.008h-.008V9Zm.008 3h-.008v.008h.008V12Z"
              />
            </svg>
          ),
        },
        {
          name: "Reconciliation",
          href: "/reconciliation",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          ),
        },
      ],
    },
    {
      items: [
        {
          name: "Reports",
          href: "/reports",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z"
              />
            </svg>
          ),
        },
        {
          name: "Users",
          href: "/users",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
              />
            </svg>
          ),
        },
      ],
    },
  ];

  const isManager = userRole.toLowerCase() === "manager";

  const displaySections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (isManager) {
          return item.name === "Dashboard" || item.name === "Reports";
        }
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div
      className={`h-full bg-white text-slate-600 flex flex-col p-4 transition-all duration-300 ease-in-out select-none border-r border-slate-200/80 ${isCollapsed ? "w-20" : "w-64"
        }`}
    >
      <div className={`flex gap-2 items-center mb-6 px-2 ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {!isCollapsed ? (
          <Link
            href="/home"
            className={`flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all duration-200 text-[13px] font-medium leading-normal ${pathname === "/home"
              ? "bg-slate-100 text-slate-950 font-bold"
              : "hover:bg-slate-50 hover:text-slate-900 text-slate-500"
              }`}
          >
            <TbArrowLeft size={18} className="flex-shrink-0" />
            <span className="truncate transition-opacity duration-300 font-sans">
              Home
            </span>
          </Link>
        ) : (
          <></>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/60 hover:bg-slate-100 hover:text-slate-900 text-slate-500 transition-colors cursor-pointer"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <TbLayoutSidebarRightCollapse size={18} />
          ) : (
            <TbLayoutSidebarLeftCollapse size={18} />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto min-h-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pr-0.5">
        {displaySections.map((section, sIdx) => (
          <div key={section.title || sIdx} className="space-y-1">
            {section.title && !isCollapsed && (
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                {section.title}
              </div>
            )}
            {section.title && isCollapsed && (
              <div className="my-1.5 border-t border-slate-100" />
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-[13px] font-medium leading-normal ${isActive
                    ? "bg-slate-100 text-slate-950 font-bold"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-500"
                    } ${isCollapsed ? "justify-center" : ""}`}
                  title={isCollapsed ? item.name : undefined}
                >
                  {item.icon}
                  {!isCollapsed && (
                    <span className="truncate transition-opacity duration-300 font-sans">
                      {item.name}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="pt-4 border-t border-slate-200/80 space-y-1.5 mt-auto">

        <button
          onClick={(e) => {
            e.preventDefault();
            setIsConfirmOpen(true);
          }}
          className={`cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[13px] font-medium leading-normal hover:bg-slate-50 hover:text-rose-600 text-slate-500 ${isCollapsed ? "justify-center" : ""
            }`}
          title={isCollapsed ? "Logout" : undefined}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-5 h-5 flex-shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
            />
          </svg>
          {!isCollapsed && <span className="truncate transition-opacity duration-300 font-sans">Logout</span>}
        </button>

        {isConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200 text-slate-800">
              <h3 className="text-base font-bold text-slate-900 mb-2">Confirm Logout</h3>
              <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
                Are you sure you want to sign out of your account? Any unsaved changes may be lost.
              </p>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeUser();
                    toast.success("Successfully logged out");
                    setIsConfirmOpen(false);
                    router.push("/auth/sign-in");
                  }}
                  className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
