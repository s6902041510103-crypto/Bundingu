"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { KnowledgeSnakeLogo } from "@/components/ui/Logo";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TeacherLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const input = document.getElementById("email-input");
    input?.focus();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError("กรุณากรอกอีเมลให้ถูกต้อง (เช่น teacher@school.ac.th)");
      return;
    }
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password, rememberMe }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบข้อมูลอีกครั้ง");
        setIsLoggingIn(false);
        return;
      }

      if (data.teacher) {
        sessionStorage.setItem("ks-teacher", JSON.stringify(data.teacher));
        if (rememberMe) {
          localStorage.setItem("ks-teacher-remember", JSON.stringify(data.teacher));
        }
      }

      router.push("/teacher/dashboard");
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-adventure-sky text-slate-900 font-body">
      {/* Top Bar */}
      <header className="px-4 sm:px-8 py-5">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <KnowledgeSnakeLogo size="md" theme="light" showSubtitle />
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/85 hover:bg-white text-slate-700 font-display text-sm font-semibold shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าหลัก</span>
          </Link>
        </div>
      </header>

      {/* Centered Login Card (matches Reference Screen #2) */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Card variant="elevated" padding="lg" className="rounded-3xl border-white shadow-2xl">
            <div className="text-center mb-6">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0f2547]">
                เข้าสู่ระบบครู
              </h1>
              <p className="text-slate-500 text-sm mt-1.5">
                กรุณาเข้าสู่ระบบเพื่อสร้างห้องเรียนและควบคุมการแข่งขัน
              </p>
            </div>

            {error && (
              <div
                id="login-error"
                role="alert"
                className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-sm text-red-700 animate-fade-in"
              >
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              {/* Email Input */}
              <div>
                <label
                  htmlFor="email-input"
                  className="block font-display text-sm font-semibold text-slate-700 mb-1.5"
                >
                  อีเมลครูผู้สอน
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="teacher@school.ac.th"
                    disabled={isLoggingIn}
                    autoComplete="email"
                    required
                    className={cn(
                      "w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-slate-50/70 text-slate-900 text-sm sm:text-base transition-all",
                      "placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600",
                      error ? "border-red-300" : "border-slate-200",
                    )}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="password-input"
                  className="block font-display text-sm font-semibold text-slate-700 mb-1.5"
                >
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="password-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="••••••••"
                    disabled={isLoggingIn}
                    autoComplete="current-password"
                    required
                    className={cn(
                      "w-full pl-11 pr-11 py-3 rounded-xl border-2 bg-slate-50/70 text-slate-900 text-sm sm:text-base transition-all",
                      "placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600",
                      error ? "border-red-300" : "border-slate-200",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoggingIn}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoggingIn}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-600">จดจำการใช้งาน</span>
                </label>
                <span className="text-xs text-slate-400">ตรวจสอบสิทธิ์ผ่าน Server</span>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoggingIn}
                className="mt-2 py-3.5 text-base shadow-lg shadow-blue-600/25"
              >
                {isLoggingIn ? "กำลังตรวจสอบสิทธิ์..." : "เข้าสู่ระบบ"}
              </Button>
            </form>

            {/* Register Link & Security Notice */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center space-y-3">
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-slate-700 font-medium">
                  ยังไม่มีบัญชีครูผู้สอน?
                </span>
                <Link
                  href="/teacher/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-display text-xs sm:text-sm font-bold shadow-xs transition-colors"
                >
                  สร้างบัญชีครูใหม่
                </Link>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>ระบบตรวจสอบสิทธิ์ฝั่ง Server ก่อนอนุญาตให้สร้างและควบคุมเกม</span>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}