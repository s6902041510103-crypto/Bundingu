"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GameBoardWrapper } from "@/components/game/GameBoard";
import { MOCK_PLAYERS } from "@/lib/game-data";
import { ArrowRight, User, Mail, Lock, Shield, Sparkles, Eye, EyeOff } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TeacherLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const input = document.getElementById("email-input");
    input?.focus();
  }, []);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!EMAIL_REGEX.test(email)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    if (password.length < 4) {
      setError("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร");
      return;
    }

    setIsLoggingIn(true);

    // Simulate login delay
    await new Promise((r) => setTimeout(r, 1000));

    // Mock login - store in sessionStorage
    const teacherData = {
      email,
      name: email.split("@")[0],
      role: "teacher",
      loggedInAt: Date.now(),
    };
    sessionStorage.setItem("ks-teacher", JSON.stringify(teacherData));

    if (rememberMe) {
      localStorage.setItem("ks-teacher-remember", JSON.stringify(teacherData));
    }

    setIsLoggingIn(false);
    router.push("/teacher/dashboard");
  };

  const handleDemoLogin = async () => {
    setIsLoggingIn(true);
    await new Promise((r) => setTimeout(r, 500));
    const teacherData = {
      email: "demo@knowledge-snake.game",
      name: "ครูโหมดทดลอง",
      role: "teacher",
      loggedInAt: Date.now(),
    };
    sessionStorage.setItem("ks-teacher", JSON.stringify(teacherData));
    setIsLoggingIn(false);
    router.push("/teacher/dashboard");
  };

  return (
    <div className="min-h-screen bg-bg-deep text-foreground font-body flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          กลับหน้าแรก
        </Link>

        {/* Login Card */}
        <Card variant="glass-strong" padding="lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">เข้าสู่ระบบครู</h1>
            <p className="text-slate-400">สร้างเกม จัดการห้องเรียน ดูผลคะแนน</p>
          </div>

          {/* Demo Notice */}
          <Badge variant="warning" className="w-full mb-6 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>โหมดทดลอง: ไม่มีการยืนยันตัวตนจริง — กรอกอีเมล/รหัสผ่านใดๆ ก็เข้าระบบได้</span>
          </Badge>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email-input" className="block text-sm font-medium text-slate-300 mb-2">
                อีเมล <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="teacher@school.edu"
                  disabled={isLoggingIn}
                  className={cn(
                    "w-full pl-10 pr-4 py-3 text-base",
                    "bg-slate-800 border-2 rounded-xl transition-all duration-200",
                    "placeholder:text-slate-600",
                    "focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    error ? "border-red-500 bg-red-500/5" : "border-slate-700 hover:border-slate-600",
                  )}
                  autoComplete="email"
                  aria-describedby={error ? "email-error" : undefined}
                />
              </div>
              {error && (
                <p id="email-error" className="mt-1.5 flex items-center gap-1.5 text-sm text-red-400" role="alert">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password-input" className="block text-sm font-medium text-slate-300 mb-2">
                รหัสผ่าน <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  disabled={isLoggingIn}
                  className={cn(
                    "w-full pl-10 pr-12 py-3 text-base",
                    "bg-slate-800 border-2 rounded-xl transition-all duration-200",
                    "placeholder:text-slate-600",
                    "focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    error ? "border-red-500 bg-red-500/5" : "border-slate-700 hover:border-slate-600",
                  )}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoggingIn}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoggingIn}
                  className={cn(
                    "w-4 h-4 rounded border-slate-600 bg-slate-800",
                    "text-violet-500 focus:ring-violet-500",
                    "hover:border-violet-500",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                />
                <span className="text-sm text-slate-300">จดจำการเข้าสู่ระบบ</span>
              </label>
              <Link
                href="#"
                className="text-sm text-violet-400 hover:underline font-medium"
                onClick={(e) => e.preventDefault()}
              >
                ลืมรหัสผ่าน?
              </Link>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={isLoggingIn}
              variant="primary"
              size="lg"
              fullWidth
              className="py-3.5 text-lg"
              loading={isLoggingIn}
            >
              {isLoggingIn ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              <ArrowRight className="w-5 h-5" />
            </Button>

            {/* Demo Login Button */}
            <Button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoggingIn}
              variant="secondary"
              size="lg"
              fullWidth
              className="py-3.5 text-lg mt-3"
            >
              <Sparkles className="w-5 h-5" />
              เข้าสู่ระบบโหมดทดลอง (Demo)
            </Button>
          </form>

          {/* Help text */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-center text-sm text-slate-500">
              ไม่มีบัญชี? <Link href="/teacher/create" className="text-amber-400 hover:underline font-medium">สร้างเกมทันทีโดยไม่ต้องล็อกอิน</Link>
            </p>
          </div>
        </Card>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Knowledge Snake Phase 1 — Mock Authentication Only
        </p>
      </div>
    </div>
  );
}