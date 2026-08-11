"use client";

import Header from "@/Components/Header";
import Sidebar from "@/Components/Sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import React from "react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathName = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  const segments = pathName.split("/").filter(Boolean);
  const showBreadcrumbs = pathName !== "/home" && segments.length > 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50">
      {pathName != "/home" && (
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
      )}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <Header
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
        />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {showBreadcrumbs && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-5 font-sans select-none">
              <Link
                href="/home"
                className="hover:text-blue-600 transition-colors capitalize text-[14px]"
              >
                home
              </Link>
              {segments.map((segment, index) => {
                const href = "/" + segments.slice(0, index + 1).join("/");
                const isLast = index === segments.length - 1;
                const label = segment.replace(/-/g, " ");

                return (
                  <React.Fragment key={href}>
                    <span className="text-slate-300 font-normal">/</span>
                    {isLast ? (
                      <span className="text-slate-600 capitalize font-bold text-[14px]">
                        {label}
                      </span>
                    ) : (
                      <Link
                        href={href}
                        className="hover:text-blue-600 transition-colors capitalize text-[14px]"
                      >
                        {label}
                      </Link>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
