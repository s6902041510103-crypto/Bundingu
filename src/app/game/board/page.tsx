'use client';

import { GameBoard } from '@/components/game';
import { SNAKES, LADDERS, SPECIAL_CELLS, GAME_CONFIG } from '@/lib/game-data';

const MOCK_PLAYERS = [
  {
    playerId: 'player-1',
    displayName: 'สมชาย',
    avatarId: 'avatar-01',
    position: 45,
    score: 45,
    color: 'bg-indigo-500',
  },
  {
    playerId: 'player-2',
    displayName: 'สมหญิง',
    avatarId: 'avatar-02',
    position: 67,
    score: 67,
    color: 'bg-red-500',
  },
  {
    playerId: 'player-3',
    displayName: 'สมศักดิ์',
    avatarId: 'avatar-03',
    position: 23,
    score: 23,
    color: 'bg-green-500',
  },
  {
    playerId: 'player-4',
    displayName: 'สมปอง',
    avatarId: 'avatar-04',
    position: 67,
    score: 67,
    color: 'bg-yellow-500',
  },
  {
    playerId: 'player-5',
    displayName: 'สมชาย 2',
    avatarId: 'avatar-05',
    position: 89,
    score: 89,
    color: 'bg-pink-500',
  },
  {
    playerId: 'player-6',
    displayName: 'สมหญิง 2',
    avatarId: 'avatar-06',
    position: 12,
    score: 12,
    color: 'bg-purple-500',
  },
];

export default function BoardPreviewPage() {
  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 animate-in">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            กระดานเกม Knowledge Snake (Preview)
          </h1>
          <p className="mt-2 text-gray-600">
            10×10 = 100 ช่อง Zigzag Numbering | Snake 4 ตัว | Ladder 4 ตัว
          </p>
        </div>

        <div className="card overflow-hidden animate-in stagger-1">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Board Preview — Phase 1</h2>
            <p className="text-sm text-gray-500">GameBoard Component แบบเต็มรูปแบบ พร้อม Snake/Ladder SVG Overlay, Dice, Player Avatars</p>
          </div>
          <div className="p-4">
            <GameBoard
              players={MOCK_PLAYERS}
              currentPlayerId="player-1"
              diceValue={4}
              isRolling={false}
              round={3}
              gameStatus="rolling"
              mode="preview"
            />
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in stagger-2">
          <InfoCard
            title="Snake (งู) - 4 ตัว"
            items={SNAKES.map((s) => `${s.from} → ${s.to}`).join(', ')}
            color="red"
          />
          <InfoCard
            title="Ladder (บันได) - 4 ตัว"
            items={LADDERS.map((l) => `${l.from} → ${l.to}`).join(', ')}
            color="green"
          />
          <InfoCard
            title="Special Cells (Disabled in MVP)"
            items={SPECIAL_CELLS.map((c) => `${c.cell} ${c.type}`).join(', ')}
            color="yellow"
          />
          <InfoCard
            title="Finish Bonus"
            items="1st +3, 2nd +2, 3rd +1"
            color="violet"
          />
        </div>

        <div className="mt-8 animate-in stagger-3">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ทดสอบ Interaction (Manual)</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <GameBoard
                players={MOCK_PLAYERS.slice(0, 2)}
                currentPlayerId="player-1"
                diceValue={3}
                round={1}
                gameStatus="rolling"
                mode="play"
                onRollDice={() => alert('ทอยลูกเต๋า! (Mock)')}
                className="h-auto"
              />
              <GameBoard
                players={MOCK_PLAYERS.slice(2, 4)}
                currentPlayerId="player-3"
                diceValue={6}
                round={5}
                gameStatus="moving"
                mode="play"
                onRollDice={() => alert('ทอยลูกเต๋า! (Mock)')}
                className="h-auto"
              />
              <GameBoard
                players={MOCK_PLAYERS.slice(4, 6)}
                currentPlayerId="player-5"
                diceValue={2}
                round={10}
                gameStatus="finished"
                mode="play"
                className="h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  title,
  items,
  color,
}: {
  title: string;
  items: string;
  color: string;
}) {
  const colorMap = {
    red: 'bg-red-50 border-red-200 text-red-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    violet: 'bg-violet-50 border-violet-200 text-violet-800',
  };

  return (
    <div className={`card p-4 ${colorMap[color as keyof typeof colorMap] || 'bg-gray-50'}`}>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm">{items}</p>
    </div>
  );
}