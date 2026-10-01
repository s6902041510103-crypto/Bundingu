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
  QrCode,
  RotateCcw,
} from 'lucide-react';
import { authService, TeacherUser, DEMO_TEACHER } from '@/lib/auth/authService';
import { ProductionTransport } from '@/lib/transport/ProductionTransport';
import type { PublicGameState, PublicPlayer } from '@/server/gameState';
import { AVATARS, getJoinBonusMultiplier } from '@/lib/game-data';

interface QuestionItem {
  id: string;
  question: string;
  choices: [string, string, string, string];
  correctAnswer: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

const DEFAULT_QUESTIONS: QuestionItem[] = [
  {
    id: 'q1',
    question: 'เมืองหลวงของประเทศไทยคือกรุงไหน?',
    choices: ['กรุงเทพมหานคร', 'เชียงใหม่', 'ภูเก็ต', 'ขอนแก่น'],
    correctAnswer: 0,
    category: 'สังคมศึกษา',
    difficulty: 'easy',
    explanation: 'กรุงเทพมหานครเป็นเมืองหลวงและศูนย์กลางการปกครองของประเทศไทย',
  },
  {
    id: 'q2',
    question: '2 + 2 × 2 = ?',
    choices: ['6', '8', '4', '10'],
    correctAnswer: 0,
    category: 'คณิตศาสตร์',
    difficulty: 'easy',
    explanation: 'ตามลำดับการคำนวณทางคณิตศาสตร์ ต้องทำการคูณก่อนบวก: 2 + (2 × 2) = 6',
  },
  {
    id: 'q3',
    question: 'สัตว์เลี้ยงลูกด้วยนมที่บินได้คือสัตว์ชนิดใด?',
    choices: ['ค้างคาว', 'นกกระปูด', 'สิงโตทะเล', 'หมูน้ำ'],
    correctAnswer: 0,
    category: 'วิทยาศาสตร์',
    difficulty: 'medium',
    explanation: 'ค้างคาวเป็นสัตว์เลี้ยงลูกด้วยนมเพียงชนิดเดียวที่สามารถบินได้จริง',
  },
  {
    id: 'q4',
    question: 'แม่น้ำที่ยาวที่สุดในโลกคือแม่น้ำไหน?',
    choices: ['แม่น้ำไนล์', 'แม่น้ำอเมซอน', 'แม่น้ำมิสซิสซิปปี้', 'แม่น้ำยางซี'],
    correctAnswer: 0,
    category: 'สังคมศึกษา',
    difficulty: 'medium',
    explanation: 'แม่น้ำไนล์มีความยาวประมาณ 6,650 กิโลเมตร',
  },
  {
    id: 'q5',
    question: 'H2O คือสูตรเคมีของสารประกอบใด?',
    choices: ['น้ำ', 'ออกซิเจน', 'ไฮโดรเจน', 'คาร์บอนไดออกไซด์'],
    correctAnswer: 0,
    category: 'วิทยาศาสตร์',
    difficulty: 'easy',
    explanation: 'H2O หมายถึงน้ำ ซึ่งประกอบด้วยไฮโดรเจน 2 อะตอมและออกซิเจน 1 อะตอม',
  },
];

export default function TeacherDashboardPage() {
  const router = useRouter();

  // Teacher Profile
  const [teacher, setTeacher] = useState<TeacherUser>(DEMO_TEACHER);

  // Active room state
  const [gamePin, setGamePin] = useState<string>('');
  const [roomSubject, setRoomSubject] = useState('รวมทุกวิชา');
  const [roundCount, setRoundCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(15);
  const [isRoomActive, setIsRoomActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'questions' | 'history'>('create');
  const [isAddingBots, setIsAddingBots] = useState(false);

  // Realtime Live Game State
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [transport, setTransport] = useState<ProductionTransport | null>(null);
  const [isCommandPending, setIsCommandPending] = useState(false);

  // Question bank state
  const [questions, setQuestions] = useState<QuestionItem[]>(DEFAULT_QUESTIONS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    choices: ['', '', '', ''],
    correctAnswer: 0,
    category: 'ทั่วไป',
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
    explanation: '',
  });

  // Load teacher session & saved questions on mount
  useEffect(() => {
    const current = authService.getCurrentUser();
    if (current) {
      setTeacher(current);
    }

    try {
      const savedQ = localStorage.getItem('knowledge_snake_question_bank');
      if (savedQ) {
        setQuestions(JSON.parse(savedQ));
      }
    } catch {}
  }, []);

  // Connect transport to live game when pin is active
  useEffect(() => {
    if (!gamePin || !isRoomActive) return;

    const t = new ProductionTransport({ type: 'production' });
    setTransport(t);

    t.connect(gamePin as any).then(() => {
      // connected
    });

    const unsubscribe = t.subscribe((state) => {
      setGameState(state as any);
    });

    return () => {
      unsubscribe();
      t.disconnect();
    };
  }, [gamePin, isRoomActive]);

  // Generate random 6-character PIN
  const generatePin = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pin = '';
    for (let i = 0; i < 6; i++) {
      pin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pin;
  };

  const handleCreateRoom = (customPin?: string) => {
    const pin = customPin || generatePin();
    setGamePin(pin);
    setIsRoomActive(true);
  };

  const handleCloseRoom = () => {
    if (confirm('คุณต้องการปิดห้องเรียนนี้และกลับสู่หน้าตั้งค่าใช่หรือไม่?')) {
      setIsRoomActive(false);
      setGamePin('');
      setGameState(null);
    }
  };

  const handleAddDemoBots = async () => {
    if (!gamePin) return;
    setIsAddingBots(true);
    const demoBots = [
      { name: 'น้องนัท', avatar: 'avatar-09' },
      { name: 'น้องมายด์', avatar: 'avatar-05' },
      { name: 'น้องอาร์ม', avatar: 'avatar-02' },
      { name: 'น้องจูน', avatar: 'avatar-04' },
    ];
    for (let i = 0; i < demoBots.length; i++) {
      const bot = demoBots[i];
      try {
        await fetch(`/api/game/${encodeURIComponent(gamePin)}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'JOIN_GAME',
            gamePin,
            sessionId: `bot-${gamePin.toLowerCase()}-${i + 1}-${Date.now().toString(36)}`,
            displayName: bot.name,
            preferredAvatarId: bot.avatar,
          }),
        });
      } catch (err) {
        console.error(err);
      }
    }
    if (transport) {
      await transport.fetchState().catch(() => {});
    }
    setIsAddingBots(false);
  };

  const handleCopyPin = () => {
    if (!gamePin) return;
    navigator.clipboard.writeText(gamePin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = async () => {
    if (!transport || !gamePin) return;
    setIsCommandPending(true);
    try {
      await transport.sendCommand({
        type: 'START_GAME',
        gamePin: gamePin as any,
        teacherId: teacher.id as any,
      } as any);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCommandPending(false);
    }
  };

  const handleStartQuestion = async () => {
    if (!transport || !gamePin) return;
    setIsCommandPending(true);
    try {
      await transport.sendCommand({
        type: 'START_QUESTION',
        gamePin: gamePin as any,
        teacherId: teacher.id as any,
      } as any);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCommandPending(false);
    }
  };

  const handleAdvanceQuestion = async () => {
    if (!transport || !gamePin) return;
    setIsCommandPending(true);
    try {
      await transport.sendCommand({
        type: 'ADVANCE_QUESTION',
        gamePin: gamePin as any,
        teacherId: teacher.id as any,
      } as any);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCommandPending(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    router.push('/teacher/login');
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
      explanation: newQuestion.explanation.trim(),
    };

    const updated = [item, ...questions];
    setQuestions(updated);
    try {
      localStorage.setItem('knowledge_snake_question_bank', JSON.stringify(updated));
    } catch {}

    setShowAddModal(false);
    setNewQuestion({
      question: '',
      choices: ['', '', '', ''],
      correctAnswer: 0,
      category: 'ทั่วไป',
      difficulty: 'easy',
      explanation: '',
    });
  };

  const handleDeleteQuestion = (id: string) => {
    const updated = questions.filter((q) => q.id !== id);
    setQuestions(updated);
    try {
      localStorage.setItem('knowledge_snake_question_bank', JSON.stringify(updated));
    } catch {}
  };

  const handleResetQuestions = () => {
    if (confirm('คุณต้องการรีเซ็ตคำถามทั้งหมดเป็นคำถามเริ่มต้นใช่หรือไม่?')) {
      setQuestions(DEFAULT_QUESTIONS);
      try {
        localStorage.setItem('knowledge_snake_question_bank', JSON.stringify(DEFAULT_QUESTIONS));
      } catch {}
    }
  };

  // Connected players from authoritative game state
  const livePlayers: PublicPlayer[] = gameState?.players && gameState.players.length > 0
    ? gameState.players.map(p => ({
        playerId: p.playerId as any,
        displayName: p.displayName,
        avatarId: p.avatarId as any,
        position: p.position,
        score: p.finalScore ?? p.score,
        status: p.status,
        isConnected: p.isConnected ?? true,
        joinOrder: p.joinOrder,
        bonusMultiplier: p.bonusMultiplier,
        baseScore: p.baseScore,
        finalScore: p.finalScore,
      }))
    : [];

  const currentPhase = gameState?.gameStatus || 'waiting_for_question';
  const allAnswered = Boolean(gameState?.allPlayersAnswered);

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
                <span className="text-xs text-indigo-600 font-medium">Teacher Portal • ระบบผู้สอน</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {isRoomActive && gamePin ? (
              <Link
                href={`/game/${gamePin}/projector`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>จอโปรเจกเตอร์ห้องเรียน</span>
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
              </Link>
            ) : (
              <button
                onClick={() => handleCreateRoom()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>เปิดห้องเรียนสด</span>
              </button>
            )}

            <div className="flex items-center gap-3 border-l pl-4 border-gray-200">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow">
                ครู
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-800 leading-none">{teacher.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{teacher.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="ออกจากระบบ"
              >
                <LogOut className="w-5 h-5" />
              </button>
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
                ระบบจัดการห้องเรียนสด Real-time
              </div>
              <h2 className="text-2xl font-bold">สวัสดีครับ {teacher.name}!</h2>
              <p className="text-indigo-100 text-sm mt-1">
                {isRoomActive
                  ? `ห้องเรียนสด PIN: ${gamePin} กำลังเปิดอยู่ ให้นักเรียนร่วมแข่งขันตอบคำถามบนกระดาน 100 ช่อง`
                  : 'ตั้งค่าห้องเรียนแล้วกดเปิดห้องเพื่อรับรหัส Game PIN ให้นักเรียนร่วมแข่งขันตอบคำถามบนกระดาน 100 ช่อง'}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {isRoomActive && gamePin ? (
                <>
                  <Link
                    href={`/game/${gamePin}/play`}
                    target="_blank"
                    className="px-4 py-2 rounded-xl bg-white text-indigo-700 font-semibold text-sm hover:bg-indigo-50 transition-all shadow-md flex items-center gap-1.5"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    เข้าหน้าเล่นเกม (Play Screen)
                  </Link>
                  <Link
                    href={`/game/${gamePin}/projector`}
                    target="_blank"
                    className="px-4 py-2 rounded-xl bg-indigo-700/80 hover:bg-indigo-700 text-white font-semibold text-sm transition-all flex items-center gap-1.5"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    เปิดจอใหญ่ (Projector)
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => handleCreateRoom()}
                  className="px-4 py-2.5 rounded-xl bg-white text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  เปิดห้องเรียนสดทันที (สร้าง PIN)
                </button>
              )}
            </div>
          </div>

          <div className="card p-5 flex items-center gap-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">คลังคำถามพร้อมใช้</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{questions.length} ข้อ</h3>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">จับเวลา 15 วินาที/ข้อ</p>
            </div>
          </div>

          <div className="card p-5 flex items-center gap-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
              isRoomActive ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-400'
            }`}>
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">ห้องเกมปัจจุบัน</p>
              {isRoomActive && gamePin ? (
                <>
                  <h3 className="text-2xl font-bold font-mono text-indigo-600 mt-0.5">{gamePin}</h3>
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">● กำลังเปิด ({currentPhase})</p>
                </>
              ) : (
                <>
                  <h3 className="text-base font-bold text-gray-400 mt-0.5">ยังไม่เปิดห้อง</h3>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">พร้อมเปิดห้องใหม่</p>
                </>
              )}
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
            ควบคุมเกมสด (Live Game Controller)
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
            ประวัติเกม & สถิติ
          </button>
        </div>

        {/* TAB 1: LIVE GAME CONTROLLER & LOBBY */}
        {activeTab === 'create' && (
          !isRoomActive ? (
            /* ROOM NOT YET ACTIVE: SETUP & LAUNCH VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Room Settings */}
              <div className="lg:col-span-1 space-y-6">
                <div className="card p-6 bg-white border border-indigo-100 rounded-2xl shadow-sm space-y-5">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">ตั้งค่าและเปิดห้องเรียน</h3>
                      <p className="text-xs text-gray-500">กำหนดกติกาห้องก่อนสร้าง Game PIN</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        หมวดวิชา / ชุดคำถาม
                      </label>
                      <select
                        value={roomSubject}
                        onChange={(e) => setRoomSubject(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

                    <div className="pt-3 space-y-2">
                      <button
                        onClick={() => handleCreateRoom()}
                        className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        ✨ เปิดห้องรอผู้เล่น (สร้าง Game PIN ทันที)
                      </button>

                      <button
                        onClick={() => handleCreateRoom('4827')}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Dice5 className="w-3.5 h-3.5 text-gray-500" />
                        ทดลองเปิดห้อง Demo (PIN: 4827 พร้อม 4 ผู้เล่น)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Instruction Steps & Visual Guide */}
              <div className="lg:col-span-2 space-y-6">
                <div className="card p-6 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-6">
                  <div>
                    <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                      ขั้นตอนการจัดกิจกรรมการเรียนรู้ Knowledge Snake
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      ระบบเกมบันไดงูตอบคำถามสดสำหรับห้องเรียนแบบ Real-time Multi-client
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                        1
                      </div>
                      <h5 className="font-bold text-gray-800 text-sm">เปิดห้องและรับ Game PIN</h5>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        กดปุ่ม &quot;เปิดห้องรอผู้เล่น&quot; ระบบจะสุ่ม PIN 6 หลักและเปิดห้อง Lobby สดพร้อมเชื่อมต่อ Realtime ทันที
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-violet-100 bg-violet-50/40 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold text-sm">
                        2
                      </div>
                      <h5 className="font-bold text-gray-800 text-sm">นักเรียนเข้าร่วมห้อง</h5>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        ให้นักเรียนเปิดเบราว์เซอร์ไปที่ <code className="bg-white px-1.5 py-0.5 rounded border text-indigo-600 font-mono">/join</code> แล้วกรอก PIN พร้อมเลือกอวตารสัตว์น่ารัก 12 แบบ
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/40 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-sm">
                        3
                      </div>
                      <h5 className="font-bold text-gray-800 text-sm">โบนัสความเร็ว 5 คนแรก</h5>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        ระบบคำนวณโบนัสเข้าห้องเร็วอัตโนมัติ: คนที่ 1 รับ ×5, คนที่ 2 รับ ×4, คนที่ 3 รับ ×3, คนที่ 4 รับ ×2, คนที่ 5 รับ ×1
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                        4
                      </div>
                      <h5 className="font-bold text-gray-800 text-sm">ฉายจอใหญ่ & ดำเนินเกม</h5>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        เปิดจอ Projector แสดงกระดาน 100 ช่อง แล้วกด &quot;เริ่มคำถาม&quot; เพื่อให้นักเรียนตอบคำถามและทอยเต๋าเดินบันไดงู
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      รองรับผู้เล่นสูงสุด 40 คนพร้อมกันในห้องเรียน
                    </span>
                    <button
                      onClick={() => handleCreateRoom()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      คลิกเพื่อเริ่มต้นสร้างห้องทันที
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ROOM ACTIVE: LIVE GAME CONTROLLER & LOBBY VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Room Settings & Teacher Action Controls */}
              <div className="lg:col-span-1 space-y-6">
                {/* Live Classroom Controls */}
                <div className="card p-6 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    แผงควบคุมการดำเนินเกม (Teacher Controls)
                  </h3>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">สถานะเกม:</span>
                      <span className="font-bold text-indigo-600 font-mono">{currentPhase}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">รอบที่:</span>
                      <span className="font-bold text-gray-800">{gameState?.currentRound || 1} / {roundCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">ตอบครบทุกคนแล้ว:</span>
                      <span className={`font-bold ${allAnswered ? 'text-green-600' : 'text-gray-500'}`}>
                        {allAnswered ? 'ใช่ (ครบแล้ว)' : 'ยังไม่ครบ'}
                      </span>
                    </div>
                  </div>

                  {/* Primary Game Action Buttons */}
                  <div className="space-y-2 pt-2">
                    {/* Start Question with 3s Countdown */}
                    {(currentPhase === 'waiting_for_question' || currentPhase === 'round_complete') && (
                      <button
                        onClick={handleStartQuestion}
                        disabled={isCommandPending}
                        className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        เริ่มคำถามรอบนี้ (Countdown 3-2-1)
                      </button>
                    )}

                    {/* Advance Question when in question phase */}
                    {currentPhase === 'question' && (
                      <button
                        onClick={handleAdvanceQuestion}
                        disabled={isCommandPending}
                        className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                          allAnswered
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 animate-bounce'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                        {allAnswered ? 'นักเรียนตอบครบแล้ว! กดไปต่อทันที' : 'ไปต่อ (Advance Question)'}
                      </button>
                    )}

                    {/* Start Game from Lobby */}
                    {currentPhase === 'lobby' && (
                      <button
                        onClick={handleStartGame}
                        disabled={isCommandPending}
                        className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        เริ่มเกม (Start Game)
                      </button>
                    )}

                    {/* Open Screens in New Tabs */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Link
                        href={`/game/${gamePin}/play`}
                        target="_blank"
                        className="py-2.5 px-3 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold text-center hover:bg-indigo-100 transition-colors"
                      >
                        หน้าเล่น Play
                      </Link>
                      <Link
                        href={`/game/${gamePin}/projector`}
                        target="_blank"
                        className="py-2.5 px-3 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 text-xs font-bold text-center hover:bg-purple-100 transition-colors"
                      >
                        จอโปรเจกเตอร์
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Room Configuration Settings & Actions */}
                <div className="card p-6 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Dice5 className="w-5 h-5 text-indigo-600" />
                    ข้อมูลห้องเรียน
                  </h3>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">หมวดวิชา:</span>
                      <span className="font-bold text-gray-800">{roomSubject}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">จำนวนรอบ:</span>
                      <span className="font-bold text-gray-800">{roundCount} รอบ</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">เวลาต่อข้อ:</span>
                      <span className="font-bold text-gray-800">{timeLimit} วินาที</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => handleCreateRoom()}
                      className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      สุ่มสร้าง Game PIN ใหม่
                    </button>

                    <button
                      onClick={handleCloseRoom}
                      className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      ปิดห้องเรียนนี้ (กลับหน้าตั้งค่า)
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Active PIN Display & Live Player List */}
              <div className="lg:col-span-2 space-y-6">
                {/* Big PIN Display */}
                <div className="card p-6 bg-white border border-indigo-200 rounded-2xl shadow-md text-center space-y-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold animate-pulse">
                    ● ห้องเรียนสดเปิดอยู่ พร้อมรับนักเรียน
                  </span>
                  <p className="text-sm font-medium text-gray-500">รหัสเข้าร่วมเกมสำหรับนักเรียน (Game PIN)</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono text-5xl sm:text-6xl font-extrabold tracking-widest text-indigo-700 bg-indigo-50/50 px-6 py-2 rounded-2xl border-2 border-indigo-200 shadow-inner">
                      {gamePin}
                    </span>
                    <button
                      onClick={handleCopyPin}
                      className="p-3.5 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-600 transition-colors shadow-sm cursor-pointer"
                      title="คัดลอก PIN"
                    >
                      {copied ? <Check className="w-6 h-6 text-green-600" /> : <Copy className="w-6 h-6" />}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-600 pt-2">
                    <span>ลิงก์เข้าร่วม:</span>
                    <code className="bg-gray-100 text-indigo-600 font-mono px-2.5 py-1 rounded-md border border-gray-200">
                      /join (ใส่ PIN {gamePin})
                    </code>
                    <Link
                      href={`/join?pin=${gamePin}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 underline"
                    >
                      ทดลองเข้าห้องแบบนักเรียน <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Real-time Players List with Join Bonus Badges */}
                <div className="card p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        ผู้เล่นในห้องเรียน ({livePlayers.length} คน)
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        ระบบซิงก์สถานะผู้เล่น Real-time อัตโนมัติ
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAddDemoBots}
                        disabled={isAddingBots}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer disabled:opacity-50"
                        title="เพิ่มผู้เล่นจำลอง 4 คนเพื่อทดสอบ"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isAddingBots ? 'กำลังเพิ่ม...' : '+ ผู้เล่นจำลอง'}
                      </button>
                      <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        Real-time Sync
                      </span>
                    </div>
                  </div>

                  {livePlayers.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-slate-50/50 space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Users className="w-7 h-7" />
                      </div>
                      <h5 className="font-bold text-gray-800 text-base">กำลังรอนักเรียนเข้าร่วมห้อง...</h5>
                      <p className="text-xs text-gray-500 max-w-md mx-auto">
                        แจ้งรหัสนักเรียนให้นำ PIN <span className="font-mono font-bold text-indigo-600">{gamePin}</span> ไปใส่ที่หน้า{' '}
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-indigo-700 font-mono">/join</code>
                      </p>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        5 คนแรกที่เข้าห้องจะได้รับตัวคูณโบนัสคะแนน (×5 ถึง ×1)
                      </div>
                      <div className="pt-2 flex items-center justify-center gap-3">
                        <button
                          onClick={handleAddDemoBots}
                          disabled={isAddingBots}
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-4 h-4" />
                          {isAddingBots ? 'กำลังเพิ่มผู้เล่นจำลอง...' : 'เพิ่มผู้เล่นจำลอง 4 คน (สำหรับทดสอบคนเดียว)'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {livePlayers.map((player, idx) => {
                        const avatar = AVATARS.find((a) => a.id === player.avatarId) || AVATARS[idx % AVATARS.length];
                        const multiplier = player.bonusMultiplier ?? getJoinBonusMultiplier(player.joinOrder ?? idx + 1);

                        return (
                          <div
                            key={player.playerId}
                            className="p-3.5 rounded-xl border border-gray-200 bg-white flex items-center justify-between shadow-sm hover:border-indigo-300 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl shadow-inner border border-gray-200">
                                {avatar.emoji}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-bold text-gray-900">{player.displayName}</p>
                                  {/* Join Order Bonus Badge */}
                                  <span
                                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                      multiplier === 5
                                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                        : multiplier === 4
                                        ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                        : multiplier === 3
                                        ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                        : multiplier === 2
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {multiplier > 1 ? `×${multiplier} โบนัส` : '×1'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {avatar.animal} ({avatar.nameEn}) • เข้าคนที่ {player.joinOrder ?? idx + 1}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs font-semibold text-indigo-600">
                                ช่อง {player.position} / 100
                              </div>
                              <div className="text-xs font-bold text-gray-800">
                                {player.score} คะแนน
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {/* TAB 2: QUESTION BANK */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">คลังข้อสอบ Knowledge Snake</h3>
                <p className="text-sm text-gray-500">คำถาม 4 ตัวเลือก พร้อมระบบจับเวลา 15 วินาที และคำอธิบายเฉลย</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetQuestions}
                  className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  รีเซ็ตคำถามเริ่มต้น
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มคำถามใหม่
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="card p-5 bg-white border border-gray-200 rounded-2xl hover:border-indigo-300 transition-colors space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-base text-gray-900">{q.question}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium border border-indigo-100">
                            {q.category}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                              q.difficulty === 'easy'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : q.difficulty === 'medium'
                                ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.choices.map((choice, cIdx) => (
                      <div
                        key={cIdx}
                        className={`px-3 py-2 rounded-xl text-sm border flex items-center justify-between ${
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

                  {q.explanation && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <span className="font-bold text-slate-900">คำอธิบาย: </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: GAME HISTORY & REPORTS */}
        {activeTab === 'history' && (
          <div className="card bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
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
                  subject: 'รวมทุกวิชา',
                  players: 4,
                  winner: 'น้องนัท (อันดับ 1 - คะแนนโบนัส 500)',
                },
                {
                  id: 'h2',
                  date: 'เมื่อวาน, 10:15 น.',
                  pin: 'AB9210',
                  subject: 'คณิตศาสตร์',
                  players: 6,
                  winner: 'น้องมายด์ (อันดับ 1 - คะแนนโบนัส 408)',
                },
                {
                  id: 'h3',
                  date: '28 ก.ย. 2026',
                  pin: 'MK4411',
                  subject: 'วิทยาศาสตร์',
                  players: 8,
                  winner: 'น้องอาร์ม (อันดับ 1 - คะแนนโบนัส 306)',
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
                    เสร็จสิ้น
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
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newQuestion.category}
                    onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">ระดับความยาก</label>
                  <select
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  ตัวเลือก 4 ข้อ (คลิกเลือกตัวเลือกที่ถูกต้อง):
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
                        className="w-full p-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={`ตัวเลือก ${label}`}
                        value={newQuestion.choices[idx]}
                        onChange={(e) => {
                          const updated = [...newQuestion.choices];
                          updated[idx] = e.target.value;
                          setNewQuestion({ ...newQuestion, choices: updated as any });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">คำอธิบายเฉลย (Optional)</label>
                <input
                  type="text"
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="เช่น ดาวพุธเป็นดาวเคราะห์ที่อยู่ใกล้ดวงอาทิตย์ที่สุด"
                  value={newQuestion.explanation}
                  onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20"
                >
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
