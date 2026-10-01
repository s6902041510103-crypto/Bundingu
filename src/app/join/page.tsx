'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, MousePointer2, User, Sparkles, Loader2 } from 'lucide-react';

const AVATAR_OPTIONS = [
  { id: 'avatar-01', label: 'ช้าง', emoji: '🐘' },
  { id: 'avatar-02', label: 'เสือ', emoji: '🐯' },
  { id: 'avatar-03', label: 'กระรอก', emoji: '🐿️' },
  { id: 'avatar-04', label: 'นกแก้ว', emoji: '🦜' },
  { id: 'avatar-05', label: 'กระต่าย', emoji: '🐰' },
  { id: 'avatar-06', label: 'หมา', emoji: '🐶' },
  { id: 'avatar-07', label: 'แมว', emoji: '🐱' },
  { id: 'avatar-08', label: 'เพนกวิน', emoji: '🐧' },
  { id: 'avatar-09', label: 'ปิงปอง', emoji: '🐼' },
  { id: 'avatar-10', label: 'ค้างคาว', emoji: '🦥' },
  { id: 'avatar-11', label: 'สุนัขจิ้งจอก', emoji: '🦊' },
  { id: 'avatar-12', label: 'กวาง', emoji: '🦌' },
];

export default function JoinPage() {
  const [gamePin, setGamePin] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-select random avatar on mount
  useEffect(() => {
    const randomAvatar = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)].id;
    setSelectedAvatar(randomAvatar);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!gamePin.trim()) {
      setError('กรุณากรอก Game PIN');
      return;
    }
    if (gamePin.length !== 6) {
      setError('Game PIN ต้องมี 6 ตัวอักษร');
      return;
    }
    if (!displayName.trim()) {
      setError('กรุณากรอกชื่อเล่น');
      return;
    }
    if (displayName.length > 20) {
      setError('ชื่อเล่นต้องไม่เกิน 20 ตัวอักษร');
      return;
    }
    if (!selectedAvatar) {
      setError('กรุณาเลือก Avatar');
      return;
    }

    setIsLoading(true);
    // TODO: Connect to GameStateTransport JOIN_GAME command
    // Mock delay for demonstration
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);

    // TODO: Redirect to /game/[pin] with player session
    console.log('Join game:', { gamePin: gamePin.toUpperCase(), displayName, avatarId: selectedAvatar });
    // window.location.href = `/game/${gamePin.toUpperCase()}`;
  };

  const handleAvatarChange = (avatarId: string) => {
    setSelectedAvatar(avatarId);
  };

  const randomizeAvatar = () => {
    const randomAvatar = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)].id;
    setSelectedAvatar(randomAvatar);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-in">
        {/* Header */}
        <div className="text-center mb-8 animate-in">
          <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">กลับหน้าหลัก</span>
          </Link>
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 mb-4">
            <MousePointer2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">เข้าร่วมเกม</h1>
          <p className="text-gray-500 mt-2">กรอก Game PIN และชื่อเล่นเพื่อเริ่มเล่น</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-6 animate-in" noValidate>
          {/* Game PIN */}
          <div>
            <label htmlFor="game-pin" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Game PIN
            </label>
            <input
              id="game-pin"
              type="text"
              maxLength={6}
              value={gamePin}
              onChange={(e) => setGamePin(e.target.value.toUpperCase())}
              className="input text-center text-3xl tracking-widest uppercase"
              placeholder="A7K9M2"
              autoComplete="off"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1 text-center">รหัส 6 ตัวอักษรจากครู</p>
          </div>

          {/* Display Name */}
          <div>
            <label htmlFor="display-name" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />
              ชื่อเล่น
            </label>
            <input
              id="display-name"
              type="text"
              maxLength={20}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input"
              placeholder="สมชาย"
              autoComplete="off"
            />
            <p className="text-xs text-gray-400 mt-1">ไม่เกิน 20 ตัวอักษร</p>
          </div>

          {/* Avatar Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              เลือกตัวละคร (Avatar)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3" role="radiogroup" aria-label="เลือก Avatar">
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => handleAvatarChange(avatar.id)}
                  className={`relative aspect-square rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center p-2 ${
                    selectedAvatar === avatar.id
                      ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-200 ring-2 ring-indigo-500/20'
                      : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                  aria-pressed={selectedAvatar === avatar.id}
                >
                  <span className="text-3xl mb-1" role="img" aria-label={avatar.label}>
                    {avatar.emoji}
                  </span>
                  <span className="text-xs font-medium text-gray-700">{avatar.label}</span>
                  {selectedAvatar === avatar.id && (
                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                      <span className="w-3 h-3 rounded-full bg-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={randomizeAvatar}
              className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              สุ่ม Avatar ใหม่
            </button>
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
            className="w-full btn-primary text-lg py-4 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                กำลังเข้าห้องเกม...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                เข้าห้องเกม
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center animate-in">
          <Link href="/teacher/login" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            เป็นครูหรือไม่? สร้างเกมเลย
          </Link>
        </div>
      </div>
    </main>
  );
}