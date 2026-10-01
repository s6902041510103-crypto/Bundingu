'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Crown, Eye, EyeOff, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export default function TeacherLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setIsLoading(true);
    // TODO: Connect to AuthRepository (Supabase Auth in production)
    // Mock delay for demonstration
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);

    // Mock login success
    setIsLoggedIn(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('teacher_session', JSON.stringify({ email: email.trim(), name: 'คุณครู' }));
    }

    // Redirect to teacher dashboard after short delay
    setTimeout(() => {
      window.location.href = '/teacher/dashboard';
    }, 1000);
  };

  const handleDemoLogin = async () => {
    setError('');
    setIsLoading(true);
    setEmail('teacher@demo.com');
    setPassword('demo123456');
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsLoading(false);
    setIsLoggedIn(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('teacher_session', JSON.stringify({ email: 'teacher@demo.com', name: 'คุณครูสมศรี (Demo)' }));
    }
    setTimeout(() => {
      window.location.href = '/teacher/dashboard';
    }, 500);
  };

  if (isLoggedIn) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center animate-in">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-green-500/25 mb-6">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">เข้าสู่ระบบสำเร็จ</h1>
          <p className="text-gray-500 mt-2">กำลังนำคุณไปยังแดชบอร์ดครู...</p>
          <Loader2 className="w-8 h-8 mx-auto mt-6 animate-spin text-indigo-500" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-in">
        {/* Header */}
        <div className="text-center mb-8 animate-in">
          <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">กลับหน้าหลัก</span>
          </Link>
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 mb-4">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">เข้าสู่ระบบครู</h1>
          <p className="text-gray-500 mt-2">สร้างเกม จัดการคำถาม ดูสถิติ</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-5 animate-in" noValidate>
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              อีเมล
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="teacher@school.ac.th"
              autoComplete="email"
              autoFocus
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              รหัสผ่าน
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-12"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 animate-in">
              <Sparkles className="w-4 h-4 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary text-lg py-3 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              <>
                <Crown className="w-5 h-5" />
                เข้าสู่ระบบ
              </>
            )}
          </button>
        </form>

        {/* Demo Login */}
        <div className="mt-6 animate-in">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            เข้าสู่ระบบทดสอบ (Demo Teacher)
          </button>
        </div>

        {/* Register Link */}
        <div className="mt-6 text-center animate-in">
          <Link href="/teacher/register" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            สร้างบัญชีครู
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center animate-in">
          <Link href="/join" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            ไม่ใช่ครู? เข้าร่วมเกมแทน
          </Link>
        </div>
      </div>
    </main>
  );
}