'use client';

import React, { useState } from 'react';
import { QuestionView } from '@/components/game/QuestionView';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, Sparkles } from 'lucide-react';
import { ChoiceIndex } from '@/domain/types';

const PRACTICE_QUESTIONS = [
  {
    questionId: 'q1',
    question: 'เมืองหลวงของประเทศไทยคือกรุงไหน?',
    choices: ['กรุงเทพมหานคร', 'เชียงใหม่', 'ภูเก็ต', 'ขอนแก่น'] as const,
    correctAnswer: 0 as ChoiceIndex,
    explanation: 'กรุงเทพมหานครเป็นเมืองหลวงของประเทศไทย',
    category: 'สังคมศึกษา',
    difficulty: 'easy' as const,
  },
  {
    questionId: 'q2',
    question: '2 + 2 × 2 = ?',
    choices: ['6', '8', '4', '10'] as const,
    correctAnswer: 0 as ChoiceIndex,
    explanation: '2 + (2 × 2) = 2 + 4 = 6',
    category: 'คณิตศาสตร์',
    difficulty: 'easy' as const,
  },
  {
    questionId: 'q3',
    question: 'สัตว์เลี้ยงลูกด้วยนมที่บินได้คือสัตว์ชนิดใด?',
    choices: ['ค้างคาว', 'นกกระจอกเทศ', 'เพนกวิน', 'ปลาบิน'] as const,
    correctAnswer: 0 as ChoiceIndex,
    explanation: 'ค้างคาวเป็นสัตว์เลี้ยงลูกด้วยนมเพียงชนิดเดียวที่บินได้จริง',
    category: 'วิทยาศาสตร์',
    difficulty: 'medium' as const,
  },
];

export default function QuestionPage() {
  const params = useParams();
  const rawPin = params.pin as string;
  const pin = rawPin ? rawPin.toUpperCase() : 'DEMO99';

  const [currentIdx, setCurrentIdx] = useState(0);
  const q = PRACTICE_QUESTIONS[currentIdx % PRACTICE_QUESTIONS.length];

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-violet-50 py-8 px-4 font-thai">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/game/${pin}/play`}
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปหน้าเล่นเกมกระดาน
          </Link>
          <span className="font-mono text-xs bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-bold">
            PIN: {pin}
          </span>
        </div>

        <div className="card p-6 shadow-sm border-indigo-100">
          <div className="text-center mb-6">
            <span className="badge badge-primary mb-2">โหมดฝึกซ้อมตอบคำถาม</span>
            <h2 className="text-2xl font-bold text-gray-900">คำถามข้อที่ {currentIdx + 1} / {PRACTICE_QUESTIONS.length}</h2>
          </div>

          <QuestionView
            key={q.questionId}
            question={{
              questionId: q.questionId as any,
              question: q.question,
              choices: q.choices,
              category: q.category,
              difficulty: q.difficulty,
            }}
            round={currentIdx + 1}
            totalRounds={PRACTICE_QUESTIONS.length}
            timeRemaining={15}
            onAnswer={() => {}}
            isAnswered={false}
            correctAnswer={q.correctAnswer}
            explanation={q.explanation}
            onEvaluationComplete={() => {}}
            onTimeUp={() => {}}
          />

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setCurrentIdx((prev) => (prev + 1) % PRACTICE_QUESTIONS.length)}
              className="btn-secondary text-sm"
            >
              ข้อถัดไป
            </button>
            <Link
              href={`/game/${pin}/play`}
              className="btn-primary text-sm font-bold flex items-center gap-1.5"
            >
              <Play className="w-4 h-4 fill-current" />
              เล่นเกมเต็มรูปแบบ
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}