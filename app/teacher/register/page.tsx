"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { KnowledgeSnakeLogo } from "@/components/ui/Logo";
import {
  User,
  School,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TeacherRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [school, setSchool] = useState("โรงเรียนสาธิตพิชิตความรู้");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const input = document.getElementById("teacher-name-input");
    input?.focus();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanSchool = school.trim();

    if (cleanName.length < 2) {
      setError("กรุณากรอกชื่อ-นามสกุลครูผู้สอนอย่างน้อย 2 ตัวอักษร");
      return;
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError("กรุณากรอกอีเมลให้ถูกต้อง (เช่น somchai@school.ac.th)");
      return;
    }
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (password !== confirmPassword) {
      setError("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setIsRegistering(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          school: cleanSchool,
          email: cleanEmail,
          password,
          confirmPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "ไม่สามารถสร้างบัญชีได้ กรุณาตรวจสอบข้อมูลอีกครั้ง");
        setIsRegistering(false);
        return;
      }

      if (data.teacher) {
        sessionStorage.setItem("ks-teacher", JSON.stringify(data.teacher));
        localStorage.setItem("ks-teacher-remember", JSON.stringify(data.teacher));
      }

      router.push("/teacher/dashboard");
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-adventure-sky text-slate-900 font-body">
      {/* Top Bar */}
      <header className="px-4 sm:px-8 py-5">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <KnowledgeSnakeLogo size="md" theme="light" showSubtitle />
          <Link
            href="/teacher/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/85 hover:bg-white text-slate-700 font-display text-sm font-semibold shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าเข้าสู่ระบบ</span>
          </Link>
        </div>
      </header>

      {/* Centered Registration Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <Card variant="elevated" padding="lg" className="rounded-3xl border-white shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3">
                <UserPlus className="w-6 h-6" />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0f2547]">
                สร้างบัญชีครูผู้สอน
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                ลงทะเบียนเพื่อสร้างห้องเกม คลังคำถาม และควบคุมการแข่งขัน
              </p>
            </div>

            {error && (
              <div
                id="register-error"
                role="alert"
                className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-sm text-red-700 animate-fade-in"
              >
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              {/* Teacher Full Name */}
              <div>
                <label
                  htmlFor="teacher-name-input"
                  className="block font-display text-sm font-semibold text-slate-700 mb-1.5"
                >
                  ชื่อ-นามสกุลครูผู้สอน
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    id="teacher-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="เช่น ครูสมศรี มีสุข"
                    disabled={isRegistering}
                    required
                    className={cn(
                      "w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-slate-50/70 text-slate-900 text-sm sm:text-base transition-all",
                      "placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600",
                      error ? "border-red-300" : "border-slate-200",
                    )}
                  />
                </div>
              </div>

              {/* School Name */}
              <div>
                <label
                  htmlFor="teacher-school-input"
                  className="block font-display text-sm font-semibold text-slate-700 mb-1.5"
                >
                  โรงเรียน / สถาบันการศึกษา
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <School className="w-5 h-5" />
                  </div>
                  <input
                    id="teacher-school-input"
                    type="text"
                    value={school}
                    onChange={(e) => {
                      setSchool(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="โรงเรียนสาธิตพิชิตความรู้"
                    disabled={isRegistering}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50/70 text-slate-900 text-sm sm:text-base transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="register-email-input"
                  className="block font-display text-sm font-semibold text-slate-700 mb-1.5"
                >
                  อีเมลครูผู้สอน
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="register-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="somsri@school.ac.th"
                    disabled={isRegistering}
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

              {/* Password */}
              <div>
                <label
                  htmlFor="register-password-input"
                  className="block font-display text-sm font-semibold text-slate-700 mb-1.5"
                >
                  ตั้งรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="register-password-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="••••••••"
                    disabled={isRegistering}
                    autoComplete="new-password"
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
                    disabled={isRegistering}
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

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="register-confirm-input"
                  className="block font-display text-sm font-semibold text-slate-700 mb-1.5"
                >
                  ยืนยันรหัสผ่านอีกครั้ง
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="register-confirm-input"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="••••••••"
                    disabled={isRegistering}
                    autoComplete="new-password"
                    required
                    className={cn(
                      "w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-slate-50/70 text-slate-900 text-sm sm:text-base transition-all",
                      "placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600",
                      error ? "border-red-300" : "border-slate-200",
                    )}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isRegistering}
                iconLeft={<UserPlus className="w-5 h-5" />}
                className="mt-2 py-3.5 text-base shadow-lg shadow-blue-600/25"
              >
                {isRegistering ? "กำลังสร้างบัญชี..." : "สร้างบัญชีและเข้าสู่ระบบ"}
              </Button>
            </form>

            {/* Link to Login */}
            <div className="mt-5 pt-4 border-t border-slate-100 text-center space-y-3">
              <p className="text-sm text-slate-600">
                มีบัญชีครูผู้สอนอยู่แล้ว?{" "}
                <Link
                  href="/teacher/login"
                  className="font-display font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4"
                >
                  เข้าสู่ระบบที่นี่
                </Link>
              </p>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>รหัสผ่านถูกเข้ารหัสและจัดเก็บอย่างปลอดภัยฝั่ง Server</span>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
