'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PublicQuestion, ChoiceIndex } from '@/domain/types';
import { CheckCircle2, XCircle, Clock, Sparkles, Loader2, Trophy } from 'lucide-react';

export type AnswerStatus = 'idle' | 'answered' | 'time_up' | 'evaluating' | 'result';

export interface ChoiceOptionProps {
  index: ChoiceIndex;
  label: string;
  isSelected: boolean;
  isDisabled: boolean;
  isCorrect?: boolean;
  isIncorrect?: boolean;
  onClick: () => void;
}

export function ChoiceOption({ index, label, isSelected, isDisabled, isCorrect, isIncorrect, onClick }: ChoiceOptionProps) {
  const letters = ['A', 'B', 'C', 'D'] as const;

  let baseStyle = '';
  if (isCorrect) {
    baseStyle = 'bg-green-50 border-green-500 shadow-lg shadow-green-100';
  } else if (isIncorrect) {
    baseStyle = 'bg-red-50 border-red-500 shadow-lg shadow-red-100';
  } else if (isSelected) {
    baseStyle = 'bg-indigo-50 border-indigo-500 shadow-lg shadow-indigo-100';
  } else if (isDisabled) {
    baseStyle = 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed';
  } else {
    baseStyle = 'bg-white border-gray-200 hover:bg-indigo-50 hover:border-indigo-300';
  }

  let iconStyle = '';
  if (isCorrect) {
    iconStyle = 'bg-green-500 text-white border-2 border-green-500';
  } else if (isIncorrect) {
    iconStyle = 'bg-red-500 text-white border-2 border-red-500';
  } else if (isSelected) {
    iconStyle = 'bg-indigo-500 text-white border-2 border-indigo-500';
  } else if (isDisabled) {
    iconStyle = 'bg-gray-200 text-gray-400 border-2 border-gray-300';
  } else {
    iconStyle = 'bg-white text-gray-700 border-2 border-gray-300';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`
        w-full text-left p-4 rounded-xl border-2 transition-all duration-300
        flex items-center gap-4 ${baseStyle}
      `}
    >
      <span className={`
        w-10 h-10 rounded-full flex items-center justify-center font-bold text-base transition-all duration-300
        ${iconStyle}
      `}>
        {letters[index]}
      </span>
      <span className={`
        flex-1 text-lg font-medium
        ${isDisabled ? 'text-gray-400' : 'text-gray-900'}
      `}>
        {label}
      </span>
      {isCorrect && (
        <span className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
          <CheckCircle2 className="w-4 h-4" />
        </span>
      )}
      {isIncorrect && (
        <span className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-sm">
          <XCircle className="w-4 h-4" />
        </span>
      )}
      {isSelected && !isCorrect && !isIncorrect && (
        <span className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm">
          ✓
        </span>
      )}
    </button>
  );
}

export interface QuestionViewProps {
  question: PublicQuestion;
  round: number;
  totalRounds: number;
  timeRemaining: number;
  onAnswer: (choiceIndex: ChoiceIndex) => void;
  currentAnswer?: ChoiceIndex;
  isAnswered: boolean;
  onTimeUp?: () => void;
  // Mock evaluation
  correctAnswer?: ChoiceIndex;
  explanation?: string;
  onEvaluationComplete?: (isCorrect: boolean) => void;
}

export function QuestionView({
  question,
  round,
  totalRounds,
  timeRemaining,
  onAnswer,
  currentAnswer,
  isAnswered,
  onTimeUp,
  correctAnswer = 0, // Default for mock
  explanation,
  onEvaluationComplete,
}: QuestionViewProps) {
  const [countdown, setCountdown] = useState(timeRemaining);
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('idle');
  const [selectedAnswer, setSelectedAnswer] = useState<ChoiceIndex | null>(currentAnswer ?? null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTriggeredTimeUp = useRef(false);
  const evaluationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with parent's timeRemaining prop
  useEffect(() => {
    setCountdown(timeRemaining);
  }, [timeRemaining]);

  // Timer logic
  useEffect(() => {
    if (answerStatus === 'idle' && countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            if (timerRef.current) clearInterval(timerRef.current!);
            setAnswerStatus('time_up');
            hasTriggeredTimeUp.current = true;
          }
          return Math.max(0, next);
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current!);
      };
    }
  }, [countdown, answerStatus]);

  // Handle answer selection
  const handleChoiceClick = useCallback(
    (index: ChoiceIndex) => {
      if (answerStatus === 'idle') {
        setSelectedAnswer(index);
        setAnswerStatus('evaluating');
        if (timerRef.current) clearInterval(timerRef.current!);
        
        // Mock evaluation delay
        evaluationTimerRef.current = setTimeout(() => {
          const correct = index === correctAnswer;
          setIsCorrect(correct);
          setAnswerStatus('result');
          onAnswer(index);
          onEvaluationComplete?.(correct);
        }, 800); // Mock evaluation delay
      }
    },
    [answerStatus, onAnswer, correctAnswer]
  );

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (answerStatus !== 'idle') return;

      const keyMap: Record<string, ChoiceIndex> = {
        '1': 0, '2': 1, '3': 2, '4': 3,
        'a': 0, 'b': 1, 'c': 2, 'd': 3,
        'A': 0, 'B': 1, 'C': 2, 'D': 3,
      };

      const index = keyMap[e.key];
      if (index !== undefined) {
        setSelectedAnswer(index);
        setAnswerStatus('evaluating');
        if (timerRef.current) clearInterval(timerRef.current!);
        
        evaluationTimerRef.current = setTimeout(() => {
          const correct = index === correctAnswer;
          setIsCorrect(correct);
          setAnswerStatus('result');
          onAnswer(index);
          onEvaluationComplete?.(correct);
        }, 800);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answerStatus, onAnswer, correctAnswer]);

  // Trigger onTimeUp when time runs out
  useEffect(() => {
    if (answerStatus === 'time_up' && !hasTriggeredTimeUp.current) {
      hasTriggeredTimeUp.current = true;
      onTimeUp?.();
    }
  }, [answerStatus, onTimeUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current!);
      if (evaluationTimerRef.current) clearTimeout(evaluationTimerRef.current!);
    };
  }, []);

  const progressPercent = (countdown / 15) * 100;
  const isDisabled = answerStatus !== 'idle';

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Knowledge Snake</h1>
            <p className="text-sm text-gray-500">เกมบันไดงูพิชิตความรู้</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">รอบที่ {round} / {totalRounds}</p>
          <p className="text-sm text-gray-500">คำถามที่ 1</p>
        </div>
      </div>

      {/* Countdown Timer */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">เวลาคงเหลือ</span>
          </div>
          <span className={`text-lg font-bold tabular-nums ${
            countdown <= 5 ? 'text-red-500 animate-pulse' : 'text-indigo-600'
          }`}>
            {countdown}s
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              countdown <= 5 ? 'bg-red-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="card p-6 mb-6 text-center">
        <p className="text-2xl font-semibold text-gray-900 leading-relaxed mb-8">
          {question.question}
        </p>

        {/* Choices */}
        <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
          {question.choices.map((choice, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectChoice = index === correctAnswer;
            const isUserAnswer = selectedAnswer === index && (answerStatus === 'result' || answerStatus === 'time_up');
            const showCorrect = answerStatus === 'result' && isCorrectChoice;
            const showIncorrect = isUserAnswer && !isCorrectChoice;
            
            return (
              <ChoiceOption
                key={index}
                index={index as ChoiceIndex}
                label={choice}
                isSelected={isSelected && (answerStatus === 'evaluating' || answerStatus === 'idle')}
                isDisabled={answerStatus !== 'idle' && answerStatus !== 'evaluating'}
                isCorrect={showCorrect}
                isIncorrect={showIncorrect}
                onClick={() => handleChoiceClick(index as ChoiceIndex)}
              />
            );
          })}
        </div>

        {/* Evaluation / Result Status */}
        {answerStatus === 'evaluating' && (
          <div className="mt-6 p-6 rounded-xl bg-indigo-50 border border-indigo-200 animate-in flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-indigo-700 font-medium">กำลังตรวจสอบคำตอบ...</p>
          </div>
        )}

        {answerStatus === 'result' && isCorrect === true && (
          <div className="mt-6 p-6 rounded-xl bg-green-50 border border-green-200 animate-in flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <p className="text-green-700 font-bold text-xl">ตอบถูกต้อง!</p>
            <p className="text-green-600 mt-1">คุณได้สิทธิ์ทอยลูกเต๋า</p>
            {explanation && (
              <p className="text-sm text-green-500 mt-2 p-3 bg-white rounded-lg border border-green-100">
                💡 {explanation}
              </p>
            )}
          </div>
        )}

        {answerStatus === 'result' && isCorrect === false && (
          <div className="mt-6 p-6 rounded-xl bg-red-50 border border-red-200 animate-in flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-white" />
            </div>
            <p className="text-red-700 font-bold text-xl">ตอบผิด</p>
            <p className="text-red-600 mt-1">คำตอบที่ถูกคือ <span className="font-bold">{['A', 'B', 'C', 'D'][correctAnswer]}</span></p>
            {explanation && (
              <p className="text-sm text-red-500 mt-2 p-3 bg-white rounded-lg border border-red-100">
                💡 {explanation}
              </p>
            )}
          </div>
        )}

        {answerStatus === 'time_up' && (
          <div className="mt-6 p-6 rounded-xl bg-yellow-50 border border-yellow-200 animate-in flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <p className="text-yellow-700 font-bold text-xl">หมดเวลาแล้ว</p>
            {selectedAnswer !== null && (
              <p className="text-yellow-600 mt-1">
                คำตอบของคุณ: <span className="font-bold">{['A', 'B', 'C', 'D'][selectedAnswer]}</span>
                {selectedAnswer === correctAnswer ? ' (ถูกต้อง!)' : ' (ผิด)'}
              </p>
            )}
            {selectedAnswer === null && (
              <p className="text-yellow-600 mt-1">คุณไม่ได้ตอบภายในเวลา</p>
            )}
            {explanation && (
              <p className="text-sm text-yellow-500 mt-2 p-3 bg-white rounded-lg border border-yellow-100">
                💡 {explanation}
              </p>
            )}
            <p className="text-sm text-yellow-500 mt-2">รอบนี้คุณไม่ได้สิทธิ์ทอยลูกเต๋า</p>
          </div>
        )}
      </div>

      {/* Waiting Message */}
      {answerStatus === 'idle' && countdown > 0 && (
        <div className="text-center text-gray-500 text-sm animate-pulse">
          <Sparkles className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
          กรุณาเลือกคำตอบภายใน {countdown} วินาที
        </div>
      )}

      {/* Roll Queue Preview (Mock) */}
      {(answerStatus === 'result' || answerStatus === 'time_up') && (
        <div className="mt-6 p-4 rounded-xl bg-indigo-50 border border-indigo-200 animate-in">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-indigo-500" />
            <span className="font-semibold text-indigo-700">Roll Queue (จำลอง)</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-white text-indigo-600 text-sm font-medium border border-indigo-200">
                #{i + 1} Player {i + 1}
              </span>
            ))}
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-400 text-sm border border-gray-200">
              +{Math.floor(Math.random() * 5) + 2} อื่นๆ
            </span>
          </div>
          <p className="text-xs text-indigo-500 mt-2 text-center">คุณอยู่ที่ #1 ในคิวทอยลูกเต๋า</p>
        </div>
      )}
    </div>
  );
}

export function QuestionPage({ gamePin }: { gamePin: string }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-violet-50 py-8 px-4">
      <QuestionView
        question={{
          questionId: 'q1' as any,
          question: 'เมืองหลวงของประเทศไทยคือกรุงไหน?',
          choices: ['กรุงเทพมหานคร', 'เชียงใหม่', 'ภูเก็ต', 'ขอนแก่น'],
          category: 'สังคมศึกษา',
          difficulty: 'easy',
        }}
        round={1}
        totalRounds={10}
        timeRemaining={15}
        onAnswer={() => {}}
        isAnswered={false}
        correctAnswer={0} // A = กรุงเทพมหานคร
        explanation="กรุงเทพมหานครเป็นเมืองหลวงและนครใหญ่ที่สุดของประเทศไทย ตั้งแต่รัชกาลที่ 1 จนถึงปัจจุบัน"
      />
    </main>
  );
}