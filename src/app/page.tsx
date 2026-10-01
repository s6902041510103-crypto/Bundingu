'use client';

import Link from 'next/link';
import { MousePointer2, Crown, Sparkles, Loader2 } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full animate-in">
        {/* Snake Mascot & Title */}
        <div className="text-center mb-12 animate-in stagger-1">
          <div className="relative inline-block mb-6">
            <div className="w-28 h-28 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/25">
              <svg className="w-16 h-16 text-white" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="snake-body" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#f0f4ff" />
                  </linearGradient>
                </defs>
                <path
                  d="M50 15 Q70 25 70 45 Q70 65 50 75 Q30 65 30 45 Q30 25 50 15"
                  stroke="url(#snake-body)"
                  strokeWidth="18"
                  strokeLinecap="round"
                  fill="none"
                  strokeLinejoin="round"
                />
                <circle cx="42" cy="35" r="4" fill="#3730a3" />
                <circle cx="58" cy="35" r="4" fill="#3730a3" />
                <path d="M50 48 Q50 53 45 55" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            {/* Sparkle animation */}
            <div className="absolute -top-2 -right-2 w-6 h-6 animate-bounce">
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="absolute bottom-2 -left-2 w-4 h-4 animate-bounce delay-500" style={{ animationDelay: '0.5s' }}>
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
            Knowledge Snake
          </h1>
          <p className="mt-4 text-xl sm:text-2xl text-gray-700 font-medium">
            เกมบันไดงูพิชิตความรู้
          </p>
          <p className="mt-3 text-lg text-indigo-600 font-medium animate-pulse">
            เรียนรู้ • เล่น • แข่งขัน
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 animate-in stagger-2">
          {/* Join Game Button - Student */}
          <Link
            href="/join"
            className="group flex items-center gap-4 w-full p-6 rounded-2xl bg-white border border-indigo-100 shadow-lg hover:shadow-xl hover:border-indigo-300 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
              <MousePointer2 className="w-7 h-7 text-white" />
            </div>
            <div className="text-left flex-1">
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                เข้าร่วมเกม
              </h2>
              <p className="text-sm text-gray-500 mt-1">Join Game</p>
              <p className="text-xs text-indigo-500 font-medium mt-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                สำหรับนักเรียน
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <Sparkles className="w-5 h-5 text-indigo-500 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </Link>

          {/* Create Game Button - Teacher */}
          <Link
            href="/teacher/login"
            className="group flex items-center gap-4 w-full p-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-violet-700 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300 backdrop-blur-sm">
              <Crown className="w-7 h-7" />
            </div>
            <div className="text-left flex-1">
              <h2 className="text-xl font-bold group-hover:text-yellow-200 transition-colors">
                สร้างเกม
              </h2>
              <p className="text-sm text-indigo-100 mt-1">Create Game</p>
              <p className="text-xs text-yellow-200 font-medium mt-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
                สำหรับครู
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-white group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </Link>

          {/* Loading indicator placeholder */}
          <div className="text-center text-xs text-gray-400 py-4 animate-in stagger-3">
            <Loader2 className="w-4 h-4 mx-auto animate-spin text-indigo-400 mb-2" />
            <p className="text-gray-500">กำลังเตรียมระบบ...</p>
            <p className="text-xs text-gray-400 mt-1">Phase 2 Development</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center animate-in stagger-3">
          <p className="text-sm text-gray-500">Knowledge Snake</p>
          <p className="text-xs text-gray-400 mt-1">Phase 2: Question System Development</p>
        </footer>
      </div>
    </main>
  );
}