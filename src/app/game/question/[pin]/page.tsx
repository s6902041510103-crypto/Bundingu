'use client';

import { QuestionView } from '@/components/game/QuestionView';
import { useParams } from 'next/navigation';

export default function QuestionPage() {
  useParams();

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
      />
    </main>
  );
}