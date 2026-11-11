"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { KnowledgeSnakeLogo } from "@/components/ui/Logo";
import { Avatar } from "@/components/game/Avatar";
import {
  Home,
  PlusCircle,
  BookOpen,
  History,
  FileBarChart,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

export interface TeacherProfile {
  teacherId?: string;
  name: string;
  email: string;
  school?: string;
}

const NAV_ITEMS = [
  { href: "/teacher/dashboard", label: "หน้าหลัก", icon: Home },
  { href: "/teacher/games/new", label: "สร้างเกม", icon: PlusCircle },
  { href: "/teacher/questions", label: "คลังคำถาม", icon: BookOpen },
  { href: "/teacher/history", label: "ห้องเกมที่สร้างไว้", icon: History },
  { href: "/teacher/reports", label: "รายงาน", icon: FileBarChart },
  { href: "/teacher/settings", label: "ตั้งค่า", icon: Settings },
];

interface TeacherLayoutShellProps {
  teacher: TeacherProfile | null;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function TeacherLayoutShell({
  teacher,
  title,
  subtitle,
  actions,
  children,
}: TeacherLayoutShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    sessionStorage.removeItem("ks-teacher");
    router.push("/teacher/login");
  };

  const sidebarContent = (
    <div className="flex flex-col h-full w-64 bg-gradient-to-b from-[#0a1931] via-[#0f2547] to-[#08152c] text-white shrink-0 select-none border-r border-blue-800/40 shadow-2xl">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-blue-800/50 bg-[#08152c]/40">
        <KnowledgeSnakeLogo size="sm" theme="dark" showSubtitle />
      </div>

      {/* Teacher Profile */}
      <div className="px-5 py-4 border-b border-blue-800/50 flex items-center gap-3 bg-gradient-to-r from-[#132e59]/80 to-[#193b73]/50">
        <Avatar avatarId="panda" size="md" ring />
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-sm text-white truncate">
            {teacher?.name || "ครูสมชาย ใจดี"}
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ครูผู้สอน (Teacher)
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto" aria-label="เมนูครูผู้สอน">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/teacher/dashboard" && pathname?.startsWith(href)) ||
            (href === "/teacher/games/new" && pathname === "/teacher/create");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-display text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-gradient-to-r from-[#2573ff] to-[#1554d1] text-white shadow-lg shadow-blue-950/50 font-semibold ring-1 ring-blue-400/40"
                  : "text-blue-100/80 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-blue-800/50 bg-[#08152c]/50">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl font-display text-sm font-medium text-blue-200 hover:bg-red-500/20 hover:text-red-200 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#f4f7fb] text-slate-900 font-body">
      {/* Desktop Sidebar — Fixed full-height so the navy bar never cuts off on long pages */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 no-print">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 flex h-full">
            {sidebarContent}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="m-3 p-2 h-10 w-10 rounded-xl bg-white/10 text-white flex items-center justify-center"
              aria-label="ปิดเมนู"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-4 shadow-2xs no-print">
          <div className="flex items-center justify-between gap-4 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
                aria-label="เปิดเมนู"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#0f2547] truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-slate-500 truncate">{subtitle}</p>
                )}
              </div>
            </div>
            {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
