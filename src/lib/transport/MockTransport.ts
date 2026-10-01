/**
 * MockTransport — BroadcastChannel-based implementation for local development
 * Simulates Server Game Logic + Supabase Realtime distribution in a single browser context
 * Supports multi-tab testing for state synchronization verification
 */

import {
  GameState,
  GameCommand,
  GameEvent,
  CommandResult,
  GamePin,
  PlayerId,
  TransportState,
  TransportType,
  Player,
  PublicQuestion,
  DiceResult,
  GameStatus,
  PlayerStatus,
  ChoiceIndex,
  AvatarId,
  QuestionId,
} from '@/domain/types';
import { GameStateTransport, TRANSPORT_TYPES } from './GameStateTransport';
import {
  GAME_CONFIG,
  SNAKES,
  LADDERS,
  SPECIAL_CELLS,
  AVATARS,
  getRandomAvatarId,
  calculateFinalPosition,
  isFinishCell,
} from '@/lib/game-data';

// ============================================================================
// Mock Game Logic (Simulates Server Game Logic)
// ============================================================================

interface MockGameSession {
  gameState: GameState;
  subscribers: Set<(state: GameState) => void>;
  eventSubscribers: Set<(event: GameEvent) => void>;
}

const mockSessions = new Map<string, MockGameSession>();

// Generate a simple mock GameState for a given PIN
function createMockGameState(gamePin: GamePin): GameState {
  const now = new Date().toISOString();
  const gameId = `game-${gamePin.toLowerCase()}` as any;
  const teacherId = `teacher-${gamePin.toLowerCase()}` as any;

  return {
    gameId,
    gamePin,
    teacherId,
    totalRounds: GAME_CONFIG.rounds.default,
    board: {
      snakes: SNAKES,
      ladders: LADDERS,
      specialCells: SPECIAL_CELLS,
      totalCells: GAME_CONFIG.board.totalCells,
    },
    gameStatus: GameStatus.LOBBY,
    currentRound: 0,
    players: [],
    rollQueue: [],
    leaderboard: [],
    phaseStartedAt: now,
    phaseEndsAt: undefined,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

function getOrCreateSession(gamePin: GamePin): MockGameSession {
  const pinKey = gamePin.toUpperCase();
  if (!mockSessions.has(pinKey)) {
    mockSessions.set(pinKey, {
      gameState: createMockGameState(gamePin),
      subscribers: new Set(),
      eventSubscribers: new Set(),
    });
  }
  return mockSessions.get(pinKey)!;
}

function broadcastState(session: MockGameSession) {
  session.subscribers.forEach(cb => cb(session.gameState));
}

function broadcastEvent(session: MockGameSession, event: GameEvent) {
  session.eventSubscribers.forEach(cb => cb(event));
}

function updateGameState(session: MockGameSession, updates: Partial<GameState>) {
  session.gameState = {
    ...session.gameState,
    ...updates,
    updatedAt: new Date().toISOString(),
    version: session.gameState.version + 1,
  };
  broadcastState(session);
}

// Mock Question Bank
const MOCK_QUESTIONS: Array<{
  questionId: QuestionId;
  question: string;
  choices: readonly [string, string, string, string];
  correctAnswer: ChoiceIndex;
  explanation?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}> = [
  {
    questionId: 'q1' as QuestionId,
    question: 'เมืองหลวงของประเทศไทยคือกรุงไหน?',
    choices: ['กรุงเทพมหานคร', 'เชียงใหม่', 'ภูเก็ต', 'ขอนแก่น'],
    correctAnswer: 0,
    explanation: 'กรุงเทพมหานครเป็นเมืองหลวงและนครใหญ่ที่สุดของประเทศไทย',
    category: 'สังคมศึกษา',
    difficulty: 'easy',
  },
  {
    questionId: 'q2' as QuestionId,
    question: '2 + 2 × 2 = ?',
    choices: ['6', '8', '4', '10'],
    correctAnswer: 0,
    explanation: 'ตามลำดับการดำเนินการ คูณก่อนบวก: 2 + (2 × 2) = 2 + 4 = 6',
    category: 'คณิตศาสตร์',
    difficulty: 'easy',
  },
  {
    questionId: 'q3' as QuestionId,
    question: 'สัตว์เลี้ยงลูกด้วยนมที่บินได้คือสัตว์ชนิดใด?',
    choices: ['ค้างคาว', 'นกกระปูด', 'สิงโตทะเล', 'หมูน้ำ'],
    correctAnswer: 0,
    explanation: 'ค้างคาวเป็นสัตว์เลี้ยงลูกด้วยนมเพียงชนิดเดียวที่บินได้จริงๆ',
    category: 'วิทยาศาสตร์',
    difficulty: 'medium',
  },
  {
    questionId: 'q4' as QuestionId,
    question: 'แม่น้ำที่ยาวที่สุดในโลกคือแม่น้ำไหน?',
    choices: ['แม่น้ำไนล์', 'แม่น้ำอเมซอน', 'แม่น้ำมิสซิสซิปปี้', 'แม่น้ำยางซี'],
    correctAnswer: 0,
    explanation: 'แม่น้ำไนล์ยาวประมาณ 6,650 กิโลเมตร เป็นแม่น้ำที่ยาวที่สุดในโลก',
    category: 'สังคมศึกษา',
    difficulty: 'medium',
  },
  {
    questionId: 'q5' as QuestionId,
    question: 'H2O คือสูตรเคมีของสารประกอบใด?',
    choices: ['น้ำ', 'ออกซิเจน', 'ไฮโดรเจน', 'คาร์บอนไดออกไซด์'],
    correctAnswer: 0,
    explanation: 'H2O หมายถึงโมเลกุลน้ำ ประกอบด้วยอะตอมไฮโดรเจน 2 ตัวและออกซิเจน 1 ตัว',
    category: 'วิทยาศาสตร์',
    difficulty: 'easy',
  },
];

function getRandomQuestion(): PublicQuestion {
  const q = MOCK_QUESTIONS[Math.floor(Math.random() * MOCK_QUESTIONS.length)];
  return {
    questionId: q.questionId,
    question: q.question,
    choices: q.choices,
    category: q.category,
    difficulty: q.difficulty,
  };
}

function getServerQuestion(questionId: QuestionId) {
  return MOCK_QUESTIONS.find(q => q.questionId === questionId);
}

// Mock Game Logic Command Handlers
function handleJoinGame(session: MockGameSession, command: any): CommandResult<{ playerId: PlayerId; gameState: GameState }> {
  const { displayName, preferredAvatarId } = command;
  const usedAvatars = session.gameState.players.map(p => p.avatarId);
  const avatarId = (preferredAvatarId && !usedAvatars.includes(preferredAvatarId))
    ? preferredAvatarId
    : getRandomAvatarId(usedAvatars);

  const newPlayer: Player = {
    playerId: `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` as PlayerId,
    displayName,
    avatarId,
    position: 1,
    score: 1,
    status: PlayerStatus.WAITING,
    joinedAt: new Date().toISOString(),
  };

  const updatedPlayers = [...session.gameState.players, newPlayer];
  updateGameState(session, { players: updatedPlayers });

  broadcastEvent(session, {
    type: 'PLAYER_JOINED',
    player: {
      playerId: newPlayer.playerId,
      displayName: newPlayer.displayName,
      avatarId: newPlayer.avatarId,
      position: newPlayer.position,
      score: newPlayer.score,
      status: newPlayer.status,
    },
    playerCount: updatedPlayers.length,
    timestamp: new Date().toISOString(),
  });

  return {
    success: true,
    data: {
      playerId: newPlayer.playerId,
      gameState: session.gameState,
    },
  };
}

function handleRejoinGame(session: MockGameSession, command: any): CommandResult<{ playerId: PlayerId; gameState: GameState }> {
  const { playerId } = command;
  const player = session.gameState.players.find(p => p.playerId === playerId);

  if (!player) {
    return { success: false, error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found in this game' } };
  }

  return { success: true, data: { playerId, gameState: session.gameState } };
}

function handleAnswerCommand(session: MockGameSession, command: any, playerId: PlayerId): CommandResult<{ correct: boolean; answerTimeMs: number; earnedRoll: boolean; queuePosition?: number }> {
  if (session.gameState.gameStatus !== GameStatus.QUESTION) {
    return { success: false, error: { code: 'WRONG_PHASE', message: 'Not in question phase' } };
  }

  const player = session.gameState.players.find(p => p.playerId === playerId);
  if (!player || player.status !== PlayerStatus.ANSWERING && player.status !== PlayerStatus.WAITING) {
    return { success: false, error: { code: 'INVALID_PLAYER_STATE', message: 'Player cannot answer now' } };
  }

  const serverQuestion = getServerQuestion(command.questionId);
  if (!serverQuestion) {
    return { success: false, error: { code: 'QUESTION_NOT_FOUND', message: 'Question not found' } };
  }

  const correct = command.choiceIndex === serverQuestion.correctAnswer;
  const answerTimeMs = command.clientTimestamp ? Date.now() - command.clientTimestamp : 0;
  const earnedRoll = correct;

  let updatedPlayers = session.gameState.players.map(p =>
    p.playerId === playerId
      ? { ...p, status: 'answered' as any, answeredAt: new Date().toISOString(), answerTimeMs }
      : p
  );

  let updatedRollQueue = [...session.gameState.rollQueue];
  let queuePosition: number | undefined;

  if (earnedRoll && !updatedRollQueue.includes(playerId)) {
    updatedRollQueue.push(playerId);
    queuePosition = updatedRollQueue.length;
  }

  updateGameState(session, {
    players: updatedPlayers,
    rollQueue: updatedRollQueue,
  });

  broadcastEvent(session, {
    type: 'ANSWER_RESULT',
    playerId,
    correct,
    answerTimeMs,
    earnedRoll,
    queuePosition,
    timestamp: new Date().toISOString(),
  });

  if (updatedRollQueue.length > 0 && session.gameState.gameStatus === GameStatus.QUESTION) {
    updateGameState(session, { gameStatus: GameStatus.ROLLING });
    broadcastEvent(session, {
      type: 'PHASE_CHANGED',
      fromStatus: GameStatus.QUESTION,
      toStatus: GameStatus.ROLLING,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastEvent(session, {
    type: 'ROLL_QUEUE_UPDATED',
    rollQueue: updatedRollQueue,
    currentPlayerId: updatedRollQueue[0],
    timestamp: new Date().toISOString(),
  });

  return { success: true, data: { correct, answerTimeMs, earnedRoll, queuePosition } };
}

function handleRollDiceCommand(session: MockGameSession, command: any, playerId: PlayerId): CommandResult<{ dice: DiceResult }> {
  if (session.gameState.gameStatus !== GameStatus.ROLLING) {
    return { success: false, error: { code: 'WRONG_PHASE', message: 'Not in rolling phase' } };
  }

  if (session.gameState.rollQueue[0] !== playerId) {
    return { success: false, error: { code: 'NOT_YOUR_TURN', message: 'Wait for your turn' } };
  }

  const value = Math.floor(Math.random() * 6) + 1 as 1 | 2 | 3 | 4 | 5 | 6;
  const animationSeed = `seed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const dice: DiceResult = {
    value,
    animationSeed,
    rolledAt: new Date().toISOString(),
    rolledBy: playerId,
  };

  updateGameState(session, { dice });
  broadcastEvent(session, {
    type: 'DICE_ROLLED',
    dice,
    playerId,
    timestamp: new Date().toISOString(),
  });

  return { success: true, data: { dice } };
}

function handleChangeAvatarCommand(session: MockGameSession, command: any, playerId: PlayerId): CommandResult<{ newAvatarId: AvatarId }> {
  const { newAvatarId, mode } = command;
  const player = session.gameState.players.find(p => p.playerId === playerId);
  if (!player) {
    return { success: false, error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' } };
  }

  const usedAvatars = session.gameState.players
    .filter(p => p.playerId !== playerId)
    .map(p => p.avatarId);

  let targetAvatarId = newAvatarId;

  if (mode === 'random') {
    targetAvatarId = getRandomAvatarId(usedAvatars) as AvatarId;
  } else if (usedAvatars.includes(newAvatarId)) {
    return { success: false, error: { code: 'AVATAR_TAKEN', message: 'Avatar already in use' } };
  }

  const updatedPlayers = session.gameState.players.map(p =>
    p.playerId === playerId ? { ...p, avatarId: targetAvatarId } : p
  );

  updateGameState(session, { players: updatedPlayers });

  broadcastEvent(session, {
    type: 'PLAYER_AVATAR_CHANGED',
    playerId,
    newAvatarId: targetAvatarId,
    timestamp: new Date().toISOString(),
  });

  return { success: true, data: { newAvatarId: targetAvatarId } };
}

function handleTeacherStartGame(session: MockGameSession, command: any): CommandResult<void> {
  if (session.gameState.gameStatus !== GameStatus.LOBBY) {
    return { success: false, error: { code: 'WRONG_PHASE', message: 'Game already started' } };
  }

  if (session.gameState.players.length === 0) {
    return { success: false, error: { code: 'NO_PLAYERS', message: 'No players in lobby' } };
  }

  const question = getRandomQuestion();
  const now = new Date().toISOString();

  const updatedPlayers = session.gameState.players.map(p => ({
    ...p,
    status: PlayerStatus.ANSWERING,
    answerTimeMs: undefined,
    answeredAt: undefined,
  }));

  updateGameState(session, {
    gameStatus: GameStatus.QUESTION,
    currentRound: 1,
    currentQuestion: question,
    questionStartTime: now,
    players: updatedPlayers,
    phaseStartedAt: now,
    phaseEndsAt: new Date(Date.now() + GAME_CONFIG.question.countdownSeconds * 1000).toISOString(),
  });

  broadcastEvent(session, {
    type: 'PHASE_CHANGED',
    fromStatus: GameStatus.LOBBY,
    toStatus: GameStatus.QUESTION,
    timestamp: now,
  });

  broadcastEvent(session, {
    type: 'QUESTION_STARTED',
    question,
    round: 1,
    countdownSeconds: GAME_CONFIG.question.countdownSeconds,
    questionStartTime: now,
    timestamp: now,
  });

  return { success: true };
}

function handleCommand(session: MockGameSession, command: GameCommand, playerId?: PlayerId): CommandResult<
  | { playerId: PlayerId; gameState: GameState }
  | { correct: boolean; answerTimeMs: number; earnedRoll: boolean; queuePosition?: number }
  | { dice: DiceResult }
  | { newAvatarId: AvatarId }
  | void
> {
  switch (command.type) {
    case 'JOIN_GAME':
      return handleJoinGame(session, command);
    case 'REJOIN_GAME':
      return handleRejoinGame(session, command);
    case 'ANSWER':
      if (!playerId) return { success: false, error: { code: 'NO_PLAYER_ID', message: 'Player ID required' } };
      return handleAnswerCommand(session, command, playerId);
    case 'ROLL_DICE':
      if (!playerId) return { success: false, error: { code: 'NO_PLAYER_ID', message: 'Player ID required' } };
      return handleRollDiceCommand(session, command, playerId);
    case 'CHANGE_AVATAR':
      if (!playerId) return { success: false, error: { code: 'NO_PLAYER_ID', message: 'Player ID required' } };
      return handleChangeAvatarCommand(session, command, playerId);
    case 'TEACHER_START_GAME':
      return handleTeacherStartGame(session, command);
    default:
      return { success: false, error: { code: 'UNKNOWN_COMMAND', message: `Unknown command: ${(command as any).type}` } };
  }
}

// ============================================================================
// MockTransport Implementation
// ============================================================================

const CHANNEL_NAME = 'knowledge-snake-mock';
const broadcastChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

export class MockTransport implements GameStateTransport {
  readonly type = TRANSPORT_TYPES.MOCK;
  readonly name = 'MockTransport (BroadcastChannel)';

  private gamePin?: GamePin;
  private playerId?: PlayerId;
  private session?: MockGameSession;
  private stateUnsubscribe?: () => void;
  private eventUnsubscribe?: () => void;
  private pendingCommands = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void }>();

  constructor() {
    if (broadcastChannel) {
      broadcastChannel.onmessage = (event) => this.handleBroadcastMessage(event.data);
    }
  }

  private handleBroadcastMessage(data: any) {
    if (data.type === 'COMMAND' && data.targetPin === this.gamePin) {
      // Another tab sent a command, process it locally
      if (this.session) {
        const result = handleCommand(this.session, data.command, data.playerId);
        // Send result back to originating tab
        if (broadcastChannel) {
          broadcastChannel.postMessage({
            type: 'COMMAND_RESULT',
            requestId: data.requestId,
            result,
            targetPin: data.targetPin,
          });
        }
      }
    } else if (data.type === 'COMMAND_RESULT' && data.requestId && this.pendingCommands.has(data.requestId)) {
      const pending = this.pendingCommands.get(data.requestId)!;
      this.pendingCommands.delete(data.requestId);
      pending.resolve(data.result);
    } else if (data.type === 'STATE_SYNC' && data.gamePin === this.gamePin) {
      // Sync state from another tab
      if (this.session && data.gameState.version > this.session.gameState.version) {
        this.session.gameState = data.gameState;
        this.session.subscribers.forEach(cb => cb(this.session!.gameState));
      }
    }
  }

  async connect(gamePin: GamePin, playerId?: PlayerId): Promise<void> {
    this.gamePin = gamePin;
    this.playerId = playerId;
    this.session = getOrCreateSession(gamePin);

    // Subscribe to local session updates
    this.stateUnsubscribe = this.session.subscribers.add((state) => {
      // No-op, handled by subscribe()
    }) as any;

    // Request state sync from other tabs
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'STATE_REQUEST',
        gamePin,
      });
    }
  }

  async disconnect(): Promise<void> {
    this.stateUnsubscribe?.();
    this.eventUnsubscribe?.();
    this.gamePin = undefined;
    this.playerId = undefined;
    this.session = undefined;
  }

  subscribe(onStateUpdate: (state: GameState) => void): () => void {
    if (!this.session) throw new Error('Not connected');
    this.session.subscribers.add(onStateUpdate);
    // Send current state immediately
    onStateUpdate(this.session.gameState);
    return () => this.session!.subscribers.delete(onStateUpdate);
  }

  subscribeToEvents(onEvent: (event: GameEvent) => void): () => void {
    if (!this.session) throw new Error('Not connected');
    this.session.eventSubscribers.add(onEvent);
    return () => this.session!.eventSubscribers.delete(onEvent);
  }

  async sendCommand<T = void>(command: GameCommand): Promise<CommandResult<T>> {
    if (!this.session || !this.gamePin) {
      return { success: false, error: { code: 'NOT_CONNECTED', message: 'Transport not connected' } };
    }

    // For multi-tab: send command via BroadcastChannel so all tabs process it
    const requestId = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (broadcastChannel) {
      return new Promise((resolve, reject) => {
        this.pendingCommands.set(requestId, { resolve, reject });
        broadcastChannel!.postMessage({
          type: 'COMMAND',
          requestId,
          command,
          playerId: this.playerId,
          targetPin: this.gamePin,
        });
        // Timeout fallback
        setTimeout(() => {
          if (this.pendingCommands.has(requestId)) {
            this.pendingCommands.delete(requestId);
            resolve({ success: false, error: { code: 'TIMEOUT', message: 'Command timeout' } });
          }
        }, 5000);
      });
    } else {
      // Single-tab fallback: process locally
      return Promise.resolve(handleCommand(this.session, command, this.playerId)) as Promise<CommandResult<T>>;
    }
  }

  getState(): TransportState {
    return {
      connected: !!this.session,
      gamePin: this.gamePin,
      playerId: this.playerId,
    };
  }

  getCurrentGameState(): GameState | null {
    return this.session?.gameState ?? null;
  }
}

// Export singleton instance for easy use
export const mockTransport = new MockTransport();