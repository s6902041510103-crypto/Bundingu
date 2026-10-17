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
    <div className="flex flex-col h-full bg-[#0f2547] text-white w-64 shrink-0 select-none">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-blue-800/60">
        <KnowledgeSnakeLogo size="sm" theme="dark" showSubtitle />
      </div>

      {/* Teacher Profile */}
      <div className="px-5 py-4 border-b border-blue-800/60 flex items-center gap-3 bg-[#132e59]/60">
        <Avatar avatarId="panda" size="md" ring />
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-sm text-white truncate">
            {teacher?.name || "ครูสมชาย ใจดี"}
          </p>
          <p className="text-xs text-blue-200 truncate">Teacher</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5" aria-label="เมนูครูผู้สอน">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/teacher/dashboard" && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-display text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-gradient-to-r from-[#2573ff] to-[#1554d1] text-white shadow-md shadow-blue-900/40 font-semibold"
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
      <div className="p-4 border-t border-blue-800/60">
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
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block sticky top-0 h-screen no-print">
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-4 no-print">
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
                <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0f2547] truncate">
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
