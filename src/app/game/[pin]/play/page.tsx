'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { QuestionView } from '@/components/game/QuestionView';
import { GameBoard } from '@/components/game/GameBoard';
import { Dice, DiceTray } from '@/components/game/Dice';
import { GAME_CONFIG, calculateFinalPosition, isFinishCell, getRandomAvatarId, AVATARS } from '@/lib/game-data';
import { Sparkles, ArrowLeft, Loader2, Trophy, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, CheckCircle2, XCircle, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PublicQuestion, ChoiceIndex } from '@/domain/types';

interface MockPlayer {
  playerId: string;
  displayName: string;
  avatarId: string;
  position: number;
  score: number;
  color: string;
}

type GamePhase = 'question' | 'roll_queue' | 'rolling' | 'moving' | 'result_show' | 'round_complete';

const PLAYER_COLORS = [
  'bg-indigo-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500',
  'bg-pink-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500',
];

const MOCK_QUESTIONS: Array<{
  questionId: string;
  question: string;
  choices: readonly [string, string, string, string];
  correctAnswer: ChoiceIndex;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}> = [
  {
    questionId: 'q1',
    question: 'เมืองหลวงของประเทศไทยคือกรุงไหน?',
    choices: ['กรุงเทพมหานคร', 'เชียงใหม่', 'ภูเก็ต', 'ขอนแก่น'] as const,
    correctAnswer: 0 as ChoiceIndex,
    explanation: 'กรุงเทพมหานครเป็นเมืองหลวงและนครใหญ่ที่สุดของประเทศไทย',
    category: 'สังคมศึกษา',
    difficulty: 'easy',
  },
  {
    questionId: 'q2',
    question: '2 + 2 × 2 = ?',
    choices: ['6', '8', '4', '10'] as const,
    correctAnswer: 0 as ChoiceIndex,
    explanation: 'ตามลำดับการดำเนินการ คูณก่อนบวก: 2 + (2 × 2) = 2 + 4 = 6',
    category: 'คณิตศาสตร์',
    difficulty: 'easy',
  },
  {
    questionId: 'q3',
    question: 'สัตว์เลี้ยงลูกด้วยนมที่บินได้คือสัตว์ชนิดใด?',
    choices: ['ค้างคาว', 'นกกระปูด', 'สิงโตทะเล', 'หมูน้ำ'] as const,
    correctAnswer: 0 as ChoiceIndex,
    explanation: 'ค้างคาวเป็นสัตว์เลี้ยงลูกด้วยนมเพียงชนิดเดียวที่บินได้จริงๆ',
    category: 'วิทยาศาสตร์',
    difficulty: 'medium',
  },
  {
    questionId: 'q4',
    question: 'แม่น้ำที่ยาวที่สุดในโลกคือแม่น้ำไหน?',
    choices: ['แม่น้ำไนล์', 'แม่น้ำอเมซอน', 'แม่น้ำมิสซิสซิปปี้', 'แม่น้ำยางซี'] as const,
    correctAnswer: 0 as ChoiceIndex,
    explanation: 'แม่น้ำไนล์ยาวประมาณ 6,650 กิโลเมตร เป็นแม่น้ำที่ยาวที่สุดในโลก',
    category: 'สังคมศึกษา',
    difficulty: 'medium',
  },
  {
    questionId: 'q5',
    question: 'H2O คือสูตรเคมีของสารประกอบใด?',
    choices: ['น้ำ', 'ออกซิเจน', 'ไฮโดรเจน', 'คาร์บอนไดออกไซด์'] as const,
    correctAnswer: 0 as ChoiceIndex,
    explanation: 'H2O หมายถึงโมเลกุลน้ำ ประกอบด้วยอะตอมไฮโดรเจน 2 ตัวและออกซิเจน 1 ตัว',
    category: 'วิทยาศาสตร์',
    difficulty: 'easy',
  },
];

function getDiceIcon(value: number, className?: string) {
  const icons = [null, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
  const Icon = icons[value] || Dice1;
  return <Icon className={className} />;
}

export default function GamePlayPage() {
  const params = useParams();
  const pin = params.pin as string;

  const [gamePhase, setGamePhase] = useState<GamePhase>('question');
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds] = useState(10);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [players, setPlayers] = useState<MockPlayer[]>([
    {
      playerId: 'player-1',
      displayName: 'คุณ (นักเรียน)',
      avatarId: 'avatar-01',
      position: 1,
      score: 1,
      color: PLAYER_COLORS[0],
    },
    // Mock other players
    ...Array.from({ length: 5 }, (_, i) => ({
      playerId: `player-${i + 2}`,
      displayName: `Player ${i + 2}`,
      avatarId: `avatar-${String(i + 2).padStart(2, '0')}`,
      position: Math.floor(Math.random() * 50) + 1,
      score: Math.floor(Math.random() * 50) + 1,
      color: PLAYER_COLORS[(i + 1) % PLAYER_COLORS.length],
    })),
  ]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceValue, setDiceValue] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [isRolling, setIsRolling] = useState(false);
  const [diceAnimationSeed] = useState('mock-seed');
  const [animatingPlayer, setAnimatingPlayer] = useState<string | null>(null);
  const [animationPath, setAnimationPath] = useState<number[]>([]);
  const [rollQueue, setRollQueue] = useState<string[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [moveComplete, setMoveComplete] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [answerCorrect, setAnswerCorrect] = useState(false);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);
  const [questionExplanation, setQuestionExplanation] = useState('');

  const currentPlayer = useMemo(() => players[currentPlayerIndex], [players, currentPlayerIndex]);
  const currentQuestion = MOCK_QUESTIONS[currentQuestionIndex % MOCK_QUESTIONS.length];

  // Generate roll queue when answer is correct
  const generateRollQueue = useCallback(() => {
    const numPlayers = Math.floor(Math.random() * 4) + 3; // 3-6 players in queue
    const queue = Array.from({ length: numPlayers }, (_, i) => `Player ${i + 1}`);
    // Ensure current player is at position 0 (first in queue)
    if (queue[0] !== 'Player 1') {
      const idx = queue.indexOf('Player 1');
      if (idx !== -1) {
        [queue[0], queue[idx]] = [queue[idx], queue[0]];
      }
    }
    setRollQueue(queue);
    setQueuePosition(queue.indexOf('Player 1') + 1);
    setIsPlayerTurn(true);
  }, []);

  // Handle answer evaluation
  const handleAnswerEvaluation = useCallback((isCorrect: boolean) => {
    if (isCorrect) {
      setAnswerCorrect(true);
      setShowCorrectAnswer(true);
      generateRollQueue();
      setGamePhase('roll_queue');
    } else {
      setAnswerCorrect(false);
      setShowCorrectAnswer(true);
      setGamePhase('result_show');
    }
  }, []);

  // Handle time up
  const handleTimeUp = useCallback(() => {
    setShowCorrectAnswer(true);
    setAnswerCorrect(false);
    setGamePhase('result_show');
  }, []);

  // Handle roll dice
  const handleRollDice = useCallback(() => {
    setIsRolling(true);
    setGamePhase('rolling');
    
    // Mock dice roll animation
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1 as 1 | 2 | 3 | 4 | 5 | 6;
      setDiceValue(roll);
      setDiceResult(roll);
      setIsRolling(false);
      setGamePhase('moving');
      
      // Calculate movement
      const player = players[currentPlayerIndex];
      const { path } = calculateFinalPosition(player.position, diceValue);
      
      // Update player position after animation
      setTimeout(() => {
        const finalPos = path[path.length - 1];
        setPlayers(prev => prev.map(p => 
          p.playerId === players[currentPlayerIndex].playerId 
            ? { ...p, position: finalPos, score: finalPos }
            : p
        ));
        
        // Check for finish
        if (isFinishCell(finalPos)) {
          // Player finished
        }
        
        setMoveComplete(true);
        setGamePhase('round_complete');
      }, 2000); // Wait for movement animation
    }, 1500);
  }, [currentPlayerIndex, players, diceValue]);

  // Handle next question/round
  const handleNextQuestion = useCallback(() => {
    setShowCorrectAnswer(false);
    setAnswerCorrect(false);
    setDiceResult(null);
    setMoveComplete(false);
    setRollQueue([]);
    setIsPlayerTurn(false);
    setQueuePosition(0);
    setGamePhase('question');
    
    // Move to next question
    setCurrentQuestionIndex(prev => prev + 1);
    
    // If round complete, move to next round
    if (currentQuestionIndex + 1 >= totalRounds) {
      setCurrentRound(prev => prev + 1);
      setCurrentQuestionIndex(0);
    }
  }, [currentQuestionIndex, totalRounds]);

  // Handle question answer
  const handleQuestionAnswer = useCallback((choiceIndex: number) => {
    const isCorrect = choiceIndex === currentQuestion.correctAnswer;
    if (isCorrect) {
      setCorrectAnswerIndex(currentQuestion.correctAnswer);
      setQuestionExplanation(currentQuestion.explanation);
    }
  }, [currentQuestion]);

  // Handle question evaluation complete
  const handleEvaluationComplete = useCallback((isCorrect: boolean) => {
    // This is called after the mock evaluation delay
    console.log('Evaluation complete:', isCorrect);
  }, []);

  // Get current question for display
  const displayQuestion = MOCK_QUESTIONS[currentQuestionIndex % MOCK_QUESTIONS.length];

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-violet-50 py-4 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6 animate-in">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-indigo-600 hover:text-indigo-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Knowledge Snake</h1>
              <p className="text-sm text-gray-500">Game PIN: {pin}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">รอบที่ {currentRound} / {totalRounds}</p>
            <p className="text-sm text-gray-500">คำถามที่ {currentQuestionIndex + 1}</p>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content Area */}
          <main className="flex-1">
            {/* Question Phase */}
            {(gamePhase === 'question' || gamePhase === 'result_show') && (
              <QuestionView
                question={{
                  questionId: displayQuestion.questionId as any,
                  question: displayQuestion.question,
                  choices: displayQuestion.choices,
                  category: displayQuestion.category,
                  difficulty: displayQuestion.difficulty,
                }}
                round={currentRound}
                totalRounds={totalRounds}
                timeRemaining={15}
                onAnswer={handleQuestionAnswer}
                isAnswered={false}
                correctAnswer={displayQuestion.correctAnswer}
                explanation={displayQuestion.explanation}
                onEvaluationComplete={handleEvaluationComplete}
                onTimeUp={handleTimeUp}
              />
            )}

            {/* Roll Queue Phase */}
            {gamePhase === 'roll_queue' && (
              <div className="card p-6 animate-in">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-500 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-700">ตอบถูกต้อง!</h2>
                  <p className="text-green-600 mt-1">คุณได้สิทธิ์ทอยลูกเต๋า</p>
                </div>

                {/* Roll Queue Display */}
                <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-indigo-500" />
                    <span className="font-semibold text-indigo-700">Roll Queue</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mb-3">
                    {rollQueue.map((player, index) => (
                      <span
                        key={player}
                        className={`px-3 py-1 rounded-full text-sm font-medium border ${
                          index === 0
                            ? 'bg-indigo-100 text-indigo-700 border-indigo-300 ring-2 ring-indigo-500/20'
                            : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        #{index + 1} {player}
                        {index === 0 && <span className="ml-1 text-indigo-500">← คุณ</span>}
                      </span>
                    ))}
                  </div>
                  <div className="text-center">
                    <p className="text-indigo-600 font-medium">
                      คุณอยู่ที่ #{queuePosition} ในคิว
                    </p>
                  </div>
                </div>

                {isPlayerTurn && queuePosition === 1 && (
                  <div className="text-center">
                    <button
                      onClick={handleRollDice}
                      className="w-full btn-primary text-lg py-4 flex items-center justify-center gap-3"
                    >
                      <Sparkles className="w-6 h-6" />
                      ทอยลูกเต๋า
                    </button>
                    <p className="text-sm text-indigo-500 mt-2">ถึงตาคุณแล้ว! กดเพื่อทอยลูกเต๋า</p>
                  </div>
                )}
              </div>
            )}

            {/* Rolling Phase */}
            {gamePhase === 'rolling' && (
              <div className="card p-8 text-center animate-in">
                <div className="w-24 h-24 mx-auto mb-6 relative">
                  {isRolling ? (
                    <Loader2 className="w-full h-full animate-spin text-indigo-500" />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl">
                      {getDiceIcon(diceValue)}
                    </div>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {isRolling ? 'กำลังทอยลูกเต๋า...' : `ได้ ${diceValue}!`}
                </h2>
                <p className="text-gray-500">
                  {isRolling ? 'กรุณารอสักครู่...' : 'กำลังคำนวณการเคลื่อนที่...'}
                </p>
              </div>
            )}

            {/* Moving Phase */}
            {gamePhase === 'moving' && (
              <div className="card p-8 text-center animate-in">
                <div className="w-24 h-24 mx-auto mb-6">
                  {getDiceIcon(diceValue)}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">กำลังเคลื่อนที่...</h2>
                <p className="text-gray-500">ลูกเต๋าได้ {diceValue} • กำลังเคลื่อนที่บนกระดาน</p>
                <div className="mt-6 h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            )}

            {/* Round Complete */}
            {gamePhase === 'round_complete' && (
              <div className="card p-6 animate-in">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-indigo-700">รอบที่ {currentRound} เสร็จสิ้น</h2>
                  <p className="text-indigo-600 mt-1">ลูกเต๋าได้ {diceResult} • เคลื่อนที่เสร็จสิ้น</p>
                </div>

                <div className="card p-4 mb-6 bg-indigo-50 border-indigo-100">
                  <h3 className="font-semibold text-indigo-700 mb-3">ตำแหน่งผู้เล่น (จำลอง)</h3>
                  <div className="space-y-2">
                    {players
                      .slice()
                      .sort((a, b) => b.score - a.score)
                      .map((p, i) => (
                        <div key={p.playerId} className="flex items-center gap-3 p-2 rounded-lg bg-white">
                          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                            {i + 1}
                          </span>
                          <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[11px]"
                               style={{ backgroundImage: `url(/avatars/${p.avatarId}.svg)` }}>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{p.displayName}</p>
                            <p className="text-xs text-gray-500">ช่องที่ {p.position} • {p.score} คะแนน</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <button
                  onClick={handleNextQuestion}
                  className="w-full btn-primary text-lg py-3 flex items-center justify-center gap-2"
                >
                  <ChevronRight className="w-5 h-5" />
                  คำถามถัดไป / รอบถัดไป
                </button>
              </div>
            )}

            {/* Incorrect / Time Up Result */}
            {gamePhase === 'result_show' && !answerCorrect && (
              <div className="card p-6 animate-in">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-yellow-500 flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-yellow-700">
                    {showCorrectAnswer ? 'ตอบผิด' : 'หมดเวลาแล้ว'}
                  </h2>
                  <p className="text-yellow-600 mt-1">
                    {showCorrectAnswer
                      ? `คำตอบที่ถูกคือ <span className="font-bold">{['A', 'B', 'C', 'D'][correctAnswerIndex]}</span>`
                      : 'คุณไม่ได้ตอบภายในเวลา'}
                  </p>
                  {questionExplanation && (
                    <p className="text-sm text-yellow-500 mt-2 p-3 bg-white rounded-lg border border-yellow-100">
                      💡 {questionExplanation}
                    </p>
                  )}
                  <p className="text-sm text-yellow-500 mt-2">รอบนี้คุณไม่ได้สิทธิ์ทอยลูกเต๋า</p>
                </div>

                <button
                  onClick={handleNextQuestion}
                  className="w-full btn-secondary text-lg py-3 flex items-center justify-center gap-2"
                >
                  <ChevronRight className="w-5 h-5" />
                  คำถามถัดไป / รอบถัดไป
                </button>
              </div>
            )}
          </main>

          {/* Sidebar - Player Info */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="card p-4 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-3">ผู้เล่น ({players.length}/40)</h3>
              <div className="space-y-2">
                {players
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((p, i) => (
                    <div
                      key={p.playerId}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                        p.playerId === currentPlayer?.playerId ? 'bg-indigo-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                        {i + 1}
                      </span>
                      <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[11px]"
                           style={{ backgroundImage: `url(/avatars/${p.avatarId}.svg)` }}>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.displayName}</p>
                        <p className="text-xs text-gray-500">ช่อง {p.position} • {p.score} คะแนน</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Dice Tray in Sidebar when rolling phase */}
            {(gamePhase === 'roll_queue' && isPlayerTurn) && (
              <div className="mt-4 card p-4">
                <h4 className="font-medium text-gray-900 mb-3">ทอยลูกเต๋า</h4>
                <DiceTray
                  value={diceValue}
                  isRolling={isRolling}
                  animationSeed={diceAnimationSeed}
                  onRoll={handleRollDice}
                  disabled={!isPlayerTurn || gamePhase !== 'roll_queue'}
                />
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}