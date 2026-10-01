'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Crown,
  Sparkles,
  Users,
  BookOpen,
  Play,
  Copy,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  LogOut,
  Trophy,
  Clock,
  LayoutGrid,
  ChevronRight,
  HelpCircle,
  Dice5,
  RefreshCw,
  QrCode
} from 'lucide-react';

interface QuestionItem {
  id: string;
  question: string;
  choices: [string, string, string, string];
  correctAnswer: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const DEFAULT_QUESTIONS: QuestionItem[] = [
  {
    id: 'q1',
    question: 'เมืองหลวงของประเทศไทยคือกรุงไหน?',
    choices: ['กรุงเทพมหานคร', 'เชียงใหม่', 'ภูเก็ต', 'ขอนแก่น'],
    correctAnswer: 0,
    category: 'สังคมศึกษา',
    difficulty: 'easy',
  },
  {
    id: 'q2',
    question: '2 + 2 × 2 = ?',
    choices: ['6', '8', '4', '10'],
    correctAnswer: 0,
    category: 'คณิตศาสตร์',
    difficulty: 'easy',
  },
  {
    id: 'q3',
    question: 'สัตว์เลี้ยงลูกด้วยนมที่บินได้คือสัตว์ชนิดใด?',
    choices: ['ค้างคาว', 'นกกระปูด', 'สิงโตทะเล', 'หมูน้ำ'],
    correctAnswer: 0,
    category: 'วิทยาศาสตร์',
    difficulty: 'medium',
  },
  {
    id: 'q4',
    question: 'แม่น้ำที่ยาวที่สุดในโลกคือแม่น้ำไหน?',
    choices: ['แม่น้ำไนล์', 'แม่น้ำอเมซอน', 'แม่น้ำมิสซิสซิปปี้', 'แม่น้ำยางซี'],
    correctAnswer: 0,
    category: 'สังคมศึกษา',
    difficulty: 'medium',
  },
  {
    id: 'q5',
    question: 'H2O คือสูตรเคมีของสารประกอบใด?',
    choices: ['น้ำ', 'ออกซิเจน', 'ไฮโดรเจน', 'คาร์บอนไดออกไซด์'],
    correctAnswer: 0,
    category: 'วิทยาศาสตร์',
    difficulty: 'easy',
  },
];

const MOCK_WAITING_STUDENTS = [
  { id: 'p1', name: 'น้องน้ำหวาน', avatar: '🐘', color: 'bg-indigo-500' },
  { id: 'p2', name: 'น้องกล้าหาญ', avatar: '🐯', color: 'bg-orange-500' },
  { id: 'p3', name: 'น้องฟ้าใส', avatar: '🐰', color: 'bg-pink-500' },
  { id: 'p4', name: 'น้องต้นกล้า', avatar: '🐿️', color: 'bg-emerald-500' },
];

export default function TeacherDashboardPage() {
  const router = useRouter();

  // Active room state
  const [gamePin, setGamePin] = useState<string>('');
  const [roomSubject, setRoomSubject] = useState('รวมทุกวิชา');
  const [roundCount, setRoundCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(15);
  const [isRoomActive, setIsRoomActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'questions' | 'history'>('create');

  // Question bank state
  const [questions, setQuestions] = useState<QuestionItem[]>(DEFAULT_QUESTIONS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    choices: ['', '', '', ''],
    correctAnswer: 0,
    category: 'ทั่วไป',
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
  });

  // Generate random 6-character PIN
  const generatePin = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pin = '';
    for (let i = 0; i < 6; i++) {
      pin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pin;
  };

  const handleCreateRoom = () => {
    const pin = generatePin();
    setGamePin(pin);
    setIsRoomActive(true);
  };

  const handleCopyPin = () => {
    if (!gamePin) return;
    navigator.clipboard.writeText(gamePin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    if (!gamePin) return;
    router.push(`/game/${gamePin}/play`);
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.question.trim() || newQuestion.choices.some((c) => !c.trim())) {
      alert('กรุณากรอกคำถามและตัวเลือกให้ครบทั้ง 4 ข้อ');
      return;
    }

    const item: QuestionItem = {
      id: `q-${Date.now()}`,
      question: newQuestion.question.trim(),
      choices: [
        newQuestion.choices[0].trim(),
        newQuestion.choices[1].trim(),
        newQuestion.choices[2].trim(),
        newQuestion.choices[3].trim(),
      ],
      correctAnswer: newQuestion.correctAnswer,
      category: newQuestion.category,
      difficulty: newQuestion.difficulty,
    };

    setQuestions((prev) => [item, ...prev]);
    setShowAddModal(false);
    setNewQuestion({
      question: '',
      choices: ['', '', '', ''],
      correctAnswer: 0,
      category: 'ทั่วไป',
      difficulty: 'easy',
    });
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-thai">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Knowledge Snake</h1>
                <span className="text-xs text-indigo-600 font-medium">Teacher Portal</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/game/board"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              ดูตัวอย่างกระดานเกม
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
            </Link>

            <div className="flex items-center gap-3 border-l pl-4 border-gray-200">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow">
                ครู
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-800 leading-none">คุณครูสมศรี (Demo)</p>
                <p className="text-xs text-gray-500 mt-0.5">teacher@demo.com</p>
              </div>
              <Link
                href="/teacher/login"
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="ออกจากระบบ"
              >
                <LogOut className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="md:col-span-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-500/10 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-medium backdrop-blur-sm mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                ระบบจัดการห้องเรียน Knowledge Snake
              </div>
              <h2 className="text-2xl font-bold">สวัสดีครับคุณครู! พร้อมเริ่มเล่นเกมหรือยัง?</h2>
              <p className="text-indigo-100 text-sm mt-1">
                สร้างห้องเรียนสด สุ่ม Game PIN ให้นักเรียนเข้าร่วมแข่งขันตอบคำถามไต่บันไดงู
              </p>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setActiveTab('create');
                  if (!isRoomActive) handleCreateRoom();
                }}
                className="px-4 py-2 rounded-xl bg-white text-indigo-700 font-semibold text-sm hover:bg-indigo-50 transition-all shadow-md flex items-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-current" />
                {isRoomActive ? 'ดูห้องเกมที่กำลังเปิด' : 'สร้างห้องเกมใหม่ทันที'}
              </button>
            </div>
          </div>

          <div className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">คลังคำถามทั้งหมด</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{questions.length} ข้อ</h3>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">พร้อมใช้งาน 3 หมวดหมู่</p>
            </div>
          </div>

          <div className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">สถิติการเล่นสะสม</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">14 ครั้ง</h3>
              <p className="text-xs text-indigo-600 font-medium mt-0.5">นักเรียน 86 คนเคยเข้าร่วม</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'create'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Play className="w-4 h-4" />
            สร้างห้องและเปิดเกม (Game Lobby)
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'questions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            จัดการคลังคำถาม ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            ประวัติเกมที่ผ่านมา
          </button>
        </div>

        {/* TAB 1: CREATE ROOM & LOBBY */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Room Configuration */}
            <div className="lg:col-span-1 space-y-6">
              <div className="card p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Dice5 className="w-5 h-5 text-indigo-600" />
                  ตั้งค่าห้องเกม
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      หมวดวิชา / ชุดคำถาม
                    </label>
                    <select
                      value={roomSubject}
                      onChange={(e) => setRoomSubject(e.target.value)}
                      className="input"
                    >
                      <option value="รวมทุกวิชา">รวมทุกวิชา (ทั่วไป / วิทย์ / สังคม)</option>
                      <option value="วิทยาศาสตร์">วิทยาศาสตร์น่ารู้</option>
                      <option value="คณิตศาสตร์">คณิตศาสตร์หรรษา</option>
                      <option value="สังคมศึกษา">สังคมศึกษาและรอบตัว</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      จำนวนรอบคำถาม
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[5, 10, 15].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setRoundCount(cnt)}
                          className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                            roundCount === cnt
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {cnt} รอบ
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      เวลาตอบต่อข้อ
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[15, 20, 30].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setTimeLimit(sec)}
                          className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                            timeLimit === sec
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {sec} วินาที
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      onClick={handleCreateRoom}
                      className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md shadow-indigo-500/20"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {isRoomActive ? 'สุ่มสร้าง PIN ใหม่' : 'เปิดห้องรอผู้เล่น'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tips for Teachers */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  ขั้นตอนการจัดกิจกรรม:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-indigo-800">
                  <li>กดสร้างห้องเพื่อรับรหัส Game PIN 6 หลัก</li>
                  <li>ให้นักเรียนเข้าเว็บที่ <span className="font-mono font-bold">/join</span> แล้วใส่ PIN</li>
                  <li>เมื่อนักเรียนเข้าครบแล้ว กดปุ่ม <b>"เริ่มเกมทันที"</b></li>
                </ol>
              </div>
            </div>

            {/* Right: Active Room Lobby & PIN Display */}
            <div className="lg:col-span-2">
              {isRoomActive ? (
                <div className="card p-6 border-indigo-200 shadow-md space-y-6">
                  {/* Big PIN Display */}
                  <div className="text-center p-8 rounded-2xl bg-gradient-to-b from-indigo-50 via-white to-violet-50 border border-indigo-100">
                    <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3 animate-pulse">
                      ● ห้องเกมกำลังเปิดรอผู้เล่น
                    </span>
                    <p className="text-sm font-medium text-gray-500">รหัสเข้าร่วมเกมสำหรับนักเรียน (Game PIN)</p>
                    <div className="mt-2 flex items-center justify-center gap-3">
                      <span className="font-mono text-5xl sm:text-6xl font-extrabold tracking-widest text-indigo-700 bg-white px-6 py-2 rounded-2xl border-2 border-indigo-200 shadow-inner">
                        {gamePin}
                      </span>
                      <button
                        onClick={handleCopyPin}
                        className="p-3.5 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-600 transition-colors shadow-sm"
                        title="คัดลอก PIN"
                      >
                        {copied ? <Check className="w-6 h-6 text-green-600" /> : <Copy className="w-6 h-6" />}
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-600">
                      <span>ลิงก์เข้าร่วม:</span>
                      <code className="bg-gray-100 text-indigo-600 font-mono px-2.5 py-1 rounded-md border border-gray-200">
                        http://localhost:3000/join
                      </code>
                      <Link
                        href="/join"
                        target="_blank"
                        className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 underline"
                      >
                        เปิดหน้านักเรียนในแท็บใหม่ <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Joined Students Lobby */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-600" />
                        ผู้เล่นที่เข้ามาในห้องแล้ว ({MOCK_WAITING_STUDENTS.length} คน)
                      </h4>
                      <span className="text-xs text-gray-400">อัปเดตอัตโนมัติ</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {MOCK_WAITING_STUDENTS.map((st) => (
                        <div
                          key={st.id}
                          className="p-3 rounded-xl border border-gray-200 bg-white flex items-center gap-3 shadow-sm hover:border-indigo-300 transition-all"
                        >
                          <div
                            className={`w-10 h-10 rounded-xl ${st.color} text-white flex items-center justify-center text-xl shadow-sm`}
                          >
                            {st.avatar}
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-semibold text-gray-800 truncate">{st.name}</p>
                            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> พร้อมเล่น
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Start Game Action */}
                  <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-gray-500">
                      ตั้งค่า: {roomSubject} • {roundCount} รอบ • {timeLimit} วินาที/ข้อ
                    </div>
                    <button
                      onClick={handleStartGame}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-base hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      เริ่มเกมทันที (Start Game)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card p-12 text-center border-dashed border-2 border-gray-300 flex flex-col items-center justify-center min-h-[380px]">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-800">ยังไม่ได้เปิดห้องเกม</h4>
                  <p className="text-sm text-gray-500 max-w-sm mt-1 mb-6">
                    เลือกหมวดคำถามและจำนวนรอบทางด้านซ้าย จากนั้นกด &quot;เปิดห้องรอผู้เล่น&quot; เพื่อสุ่มรหัส PIN ให้นักเรียน
                  </p>
                  <button
                    onClick={handleCreateRoom}
                    className="btn-primary py-2.5 px-6 rounded-xl font-bold"
                  >
                    เปิดห้องรอผู้เล่นเดี๋ยวนี้
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: QUESTION BANK */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">คลังข้อสอบ Knowledge Snake</h3>
                <p className="text-sm text-gray-500">คำถาม 4 ตัวเลือก พร้อมระบบจับเวลา 15 วินาที</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-sm"
              >
                <Plus className="w-4 h-4" />
                เพิ่มคำถามใหม่
              </button>
            </div>

            <div className="grid gap-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="card p-5 hover:border-indigo-200 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-base text-gray-900">{q.question}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="badge badge-primary">{q.category}</span>
                          <span
                            className={`badge ${
                              q.difficulty === 'easy'
                                ? 'bg-green-100 text-green-800'
                                : q.difficulty === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {q.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="ลบคำถาม"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {q.choices.map((choice, cIdx) => (
                      <div
                        key={cIdx}
                        className={`px-3 py-2 rounded-lg text-sm border flex items-center justify-between ${
                          cIdx === q.correctAnswer
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <span>
                          <b className="mr-2 text-xs">{['A', 'B', 'C', 'D'][cIdx]}.</b>
                          {choice}
                        </span>
                        {cIdx === q.correctAnswer && (
                          <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                            คำตอบที่ถูก
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === 'history' && (
          <div className="card overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">ประวัติการจัดห้องเกม</h3>
              <p className="text-xs text-gray-500 mt-1">ประวัติผลการแข่งขันและคะแนนของผู้ชนะ</p>
            </div>
            <div className="divide-y divide-gray-200">
              {[
                {
                  id: 'h1',
                  date: 'วันนี้, 14:30 น.',
                  pin: 'KS8821',
                  subject: 'วิทยาศาสตร์',
                  players: 12,
                  winner: 'น้องสมปอง (อันดับ 1 - 103 คะแนน)',
                },
                {
                  id: 'h2',
                  date: 'เมื่อวาน, 10:15 น.',
                  pin: 'AB9210',
                  subject: 'คณิตศาสตร์',
                  players: 16,
                  winner: 'น้องฟ้าใส (อันดับ 1 - 102 คะแนน)',
                },
                {
                  id: 'h3',
                  date: '28 ก.ย. 2026',
                  pin: 'MK4411',
                  subject: 'รวมทุกวิชา',
                  players: 20,
                  winner: 'น้องน้ำหวาน (อันดับ 1 - 103 คะแนน)',
                },
              ].map((item) => (
                <div key={item.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-gray-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">
                        {item.pin}
                      </span>
                      <span className="font-semibold text-gray-900 text-sm">{item.subject}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {item.date} • ผู้เล่น {item.players} คน • {item.winner}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    จบเกมแล้ว
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal: Add Question */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">เพิ่มคำถามใหม่ในคลัง</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">คำถาม</label>
                <textarea
                  required
                  rows={2}
                  className="input"
                  placeholder="เช่น ดาวเคราะห์ดวงใดอยู่ใกล้ดวงอาทิตย์ที่สุด?"
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">หมวดหมู่</label>
                  <input
                    type="text"
                    className="input"
                    value={newQuestion.category}
                    onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">ระดับความยาก</label>
                  <select
                    className="input"
                    value={newQuestion.difficulty}
                    onChange={(e) =>
                      setNewQuestion({
                        ...newQuestion,
                        difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                      })
                    }
                  >
                    <option value="easy">ง่าย (Easy)</option>
                    <option value="medium">ปานกลาง (Medium)</option>
                    <option value="hard">ยาก (Hard)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  ตัวเลือก 4 ข้อ (เลือกวงกลมที่ข้อที่ถูกต้อง):
                </label>
                <div className="space-y-2">
                  {['A', 'B', 'C', 'D'].map((label, idx) => (
                    <div key={label} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={newQuestion.correctAnswer === idx}
                        onChange={() => setNewQuestion({ ...newQuestion, correctAnswer: idx })}
                        className="w-4 h-4 text-indigo-600 cursor-pointer"
                        title={`เลือกข้อ ${label} เป็นข้อถูก`}
                      />
                      <span className="text-xs font-bold text-gray-500 w-4">{label}.</span>
                      <input
                        type="text"
                        required
                        className="input py-1.5 text-sm"
                        placeholder={`ตัวเลือก ${label}`}
                        value={newQuestion.choices[idx]}
                        onChange={(e) => {
                          const updated = [...newQuestion.choices];
                          updated[idx] = e.target.value;
                          setNewQuestion({ ...newQuestion, choices: updated });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-xs"
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn-primary text-xs font-bold px-4">
                  บันทึกคำถาม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
