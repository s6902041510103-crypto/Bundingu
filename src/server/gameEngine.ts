/**
 * Game Engine Core (Task 4.4D)
 * Orchestration layer that coordinates command validation, rules execution,
 * state mutations, timing logic, and event broadcasting.
 *
 * Server-authoritative single source of truth for game mechanics.
 * Pure rules (4.4C-1 to 4.4C-4) are preserved and orchestrated without logic duplication.
 */

import type {
  ServerGameState,
  ServerGameCommand,
  SubmitAnswerCommand,
  RollDiceCommand,
  ServerGameEvent,
  CommandResult,
  PublicGameState,
  ServerQuestion,
  ServerPlayer,
  PlayerId,
  GameStatus,
  SpecialEventState,
  StartQuestionCommand,
  AdvanceQuestionCommand,
  CompleteSpecialEventCommand,
  DiceRolledEvent,
  PlayerMovingEvent,
  PlayerMovedEvent,
  PhaseChangedEvent,
  GameStateUpdatedEvent,
  RollQueueUpdatedEvent,
  AnswerEvaluatedEvent,
} from './gameState';

import { toPublicGameState } from './gameState';

import { applyCommand } from './commandHandler';

import {
  updateGamePhase,
  updatePlayer,
  updateState,
} from './gameStateRules';

import { realtimePublisher } from './realtimePublisher';

import {
  validateCommand,
} from './validation';

import {
  canSubmitAnswer,
  canRollDice,
} from './gamePhaseRules';

import {
  addToRollQueue,
  removeFromRollQueue,
  getCurrentRollPlayer,
  type RollQueue,
} from './rollQueueRules';

import {
  evaluateAnswerComplete,
  canPlayerAnswer,
  validateQuestionForGame,
} from './questionRules';

import {
  calculateFinalPosition,
  isFinishCell,
  calculateFinishBonus,
  calculateFinalScore,
} from './boardRules';

import {
  GAME_CONFIG,
  SNAKES,
  LADDERS,
  SPECIAL_CELLS,
  getSpecialCellAt,
  getSnakeAt,
  getLadderAt,
  calculateNextPosition,
} from '@/lib/game-data';

// Question bank for server authoritative game questions
export const DEFAULT_QUESTIONS: ServerQuestion[] = [
  {
    questionId: 'q1' as any,
    question: 'เมืองหลวงของประเทศไทยคือกรุงไหน?',
    choices: ['กรุงเทพมหานคร', 'เชียงใหม่', 'ภูเก็ต', 'ขอนแก่น'],
    correctAnswer: 0,
    explanation: 'กรุงเทพมหานครเป็นเมืองหลวงและนครใหญ่ที่สุดของประเทศไทย',
    category: 'สังคมศึกษา',
    difficulty: 'easy',
  },
  {
    questionId: 'q2' as any,
    question: '2 + 2 × 2 = ?',
    choices: ['6', '8', '4', '10'],
    correctAnswer: 0,
    explanation: 'ตามลำดับการดำเนินการทางคณิตศาสตร์ ให้คูณก่อนบวก: 2 + (2 × 2) = 6',
    category: 'คณิตศาสตร์',
    difficulty: 'easy',
  },
  {
    questionId: 'q3' as any,
    question: 'สัตว์เลี้ยงลูกด้วยนมที่บินได้คือสัตว์ชนิดใด?',
    choices: ['ค้างคาว', 'นกกระปูด', 'สิงโตทะเล', 'หมูน้ำ'],
    correctAnswer: 0,
    explanation: 'ค้างคาวเป็นสัตว์เลี้ยงลูกด้วยนมเพียงชนิดเดียวที่บินได้จริง',
    category: 'วิทยาศาสตร์',
    difficulty: 'medium',
  },
  {
    questionId: 'q4' as any,
    question: 'แม่น้ำที่ยาวที่สุดในโลกคือแม่น้ำไหน?',
    choices: ['แม่น้ำไนล์', 'แม่น้ำอเมซอน', 'แม่น้ำมิสซิสซิปปี้', 'แม่น้ำยางซี'],
    correctAnswer: 0,
    explanation: 'แม่น้ำไนล์ยาวประมาณ 6,650 กิโลเมตร',
    category: 'สังคมศึกษา',
    difficulty: 'medium',
  },
  {
    questionId: 'q5' as any,
    question: 'H2O คือสูตรเคมีของสารประกอบใด?',
    choices: ['น้ำ', 'ออกซิเจน', 'ไฮโดรเจน', 'คาร์บอนไดออกไซด์'],
    correctAnswer: 0,
    explanation: 'H2O หมายถึงน้ำ ประกอบด้วย H 2 ตัว และ O 1 ตัว',
    category: 'วิทยาศาสตร์',
    difficulty: 'easy',
  },
];

// ============================================================================
// Types
// ============================================================================

export interface CommandDispatchResult {
  success: boolean;
  state: ServerGameState | null;
  events: ServerGameEvent[];
  commandResult: CommandResult<any>;
  error?: { code: string; message: string };
}

type EventListener = (payload: any) => void;

// ============================================================================
// Game Engine Class
// ============================================================================

export class GameEngine {
  private state: ServerGameState | null = null;
  private eventListeners: Map<string, EventListener[]> = new Map();
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Initialize engine with authoritative game state
   */
  initialize(state: ServerGameState): void {
    this.stopPhaseTimer();
    this.state = state;

    // Restore countdown timer if initializing in question phase with an active end time
    if (this.state.gameStatus === 'question' && this.state.phaseEndsAt) {
      const remainingMs = this.getRemainingPhaseTimeMs();
      if (remainingMs > 0) {
        this.startPhaseTimer(remainingMs);
      } else {
        this.handlePhaseTimeout();
      }
    }
  }

  /**
   * Get authoritative server game state (server-only)
   */
  getState(): ServerGameState | null {
    return this.state;
  }

  /**
   * Get sanitized public game state (safe for clients)
   */
  getPublicState(): PublicGameState | null {
    if (!this.state) return null;
    return toPublicGameState(this.state);
  }

  /**
   * Convert state to public state
   */
  toPublicGameState(state?: ServerGameState): PublicGameState | null {
    const target = state || this.state;
    if (!target) return null;
    return toPublicGameState(target);
  }

  // ==========================================================================
  // Timing Logic (Task 4.4D)
  // ==========================================================================

  /**
   * Get remaining milliseconds in the current phase countdown
   */
  getRemainingPhaseTimeMs(): number {
    if (!this.state?.phaseEndsAt) return 0;
    const diff = new Date(this.state.phaseEndsAt).getTime() - Date.now();
    return Math.max(0, diff);
  }

  /**
   * Check if current phase countdown has expired
   */
  isPhaseExpired(): boolean {
    if (!this.state?.phaseEndsAt) return false;
    return Date.now() >= new Date(this.state.phaseEndsAt).getTime();
  }

  /**
   * Start phase timer with automatic transition on expiration
   */
  startPhaseTimer(durationMs: number, onTimeout?: () => void): void {
    this.stopPhaseTimer();
    this.phaseTimer = setTimeout(() => {
      this.phaseTimer = null;
      if (onTimeout) {
        onTimeout();
      } else {
        this.handlePhaseTimeout();
      }
    }, durationMs);
  }

  /**
   * Stop any active phase timer
   */
  stopPhaseTimer(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  /**
   * Handle phase timeout (e.g. 15s question countdown expiration)
   */
  handlePhaseTimeout(): ServerGameEvent[] {
    if (!this.state) {
      return [];
    }
    if (this.state.gameStatus === 'countdown') {
      return this.handleCountdownFinished();
    }
    if (this.state.gameStatus !== 'question') {
      return [];
    }

    const events: ServerGameEvent[] = [];
    const rollQueue = this.state.rollQueue;

    if (rollQueue.length > 0) {
      // Transition to rolling phase with the fastest correct answerer
      const phaseResult = updateGamePhase(this.state, 'rolling', new Date().toISOString());
      let newState: ServerGameState = phaseResult.success ? phaseResult.state : updateState(this.state, { gameStatus: 'rolling' });
      newState = updateState(newState, {
        currentPlayerId: rollQueue[0],
        phaseEndsAt: undefined,
      });

      const phaseEvent: PhaseChangedEvent = {
        type: 'PHASE_CHANGED',
        fromStatus: 'question',
        toStatus: 'rolling',
        timestamp: new Date().toISOString(),
      };
      events.push(phaseEvent);
      this.state = newState;
    } else {
      // No correct answers in this round -> advance to waiting_for_question for teacher to start next question
      const phaseResult = updateGamePhase(this.state, 'waiting_for_question', new Date().toISOString());
      const newState: ServerGameState = phaseResult.success ? phaseResult.state : updateState(this.state, { gameStatus: 'waiting_for_question' });
      this.state = updateState(newState, { phaseEndsAt: undefined });

      const phaseEvent: PhaseChangedEvent = {
        type: 'PHASE_CHANGED',
        fromStatus: 'question',
        toStatus: 'waiting_for_question',
        timestamp: new Date().toISOString(),
      };
      events.push(phaseEvent);
    }

    // Broadcast state update
    const stateUpdatedEvent: GameStateUpdatedEvent = {
      type: 'GAME_STATE_UPDATED',
      gameState: toPublicGameState(this.state!),
      timestamp: new Date().toISOString(),
    };
    events.push(stateUpdatedEvent);

    for (const event of events) {
      this.emit('game_event', event);
      this.emit(event.type, event);
    }

    return events;
  }

  // ==========================================================================
  // Command Dispatcher (Orchestration Pipeline)
  // Command -> Validation -> Command Handler / Rules -> State Mutation -> Events
  // ==========================================================================

  /**
   * Dispatch a game command through the orchestration pipeline (alias for dispatchCommand)
   */
  dispatch(command: ServerGameCommand): CommandDispatchResult {
    return this.dispatchCommand(command);
  }

  /**
   * Dispatch a game command through the orchestration pipeline
   */
  dispatchCommand(command: ServerGameCommand): CommandDispatchResult {
    if (!this.state) {
      return {
        success: false,
        state: null,
        events: [],
        commandResult: {
          success: false,
          error: { code: 'NO_GAME_STATE', message: 'Game engine not initialized' },
        },
        error: { code: 'NO_GAME_STATE', message: 'Game engine not initialized' },
      };
    }

    // 1. Validation
    const validation = validateCommand(command);
    if (!validation.valid) {
      const errorMsg = validation.errors.map((e: any) => e.message).join(', ');
      return {
        success: false,
        state: this.state,
        events: [],
        commandResult: {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: errorMsg },
        },
        error: { code: 'VALIDATION_ERROR', message: errorMsg },
      };
    }

    // 2. Pure Rules-orchestrated Commands
    if (command.type === 'SUBMIT_ANSWER') {
      return this.handleSubmitAnswer(command);
    }

    if (command.type === 'ROLL_DICE') {
      return this.handleRollDice(command);
    }

    if (command.type === 'START_QUESTION') {
      return this.handleStartQuestion(command);
    }

    if (command.type === 'ADVANCE_QUESTION') {
      return this.handleAdvanceQuestion(command);
    }

    if (command.type === 'COMPLETE_SPECIAL_EVENT') {
      return this.handleCompleteSpecialEvent(command);
    }

    // 3. Command Handler Delegation for standard commands (JOIN_GAME, START_GAME, NEXT_QUESTION, etc.)
    const result = applyCommand(this.state, command);

    if (result.commandResult.success) {
      this.state = result.newState;

      // Coordinate phase timer for transitions triggered by commands
      if (this.state.gameStatus === 'question') {
        const remaining = this.getRemainingPhaseTimeMs();
        this.startPhaseTimer(remaining > 0 ? remaining : 15000);
      } else {
        this.stopPhaseTimer();
      }

      // Emit generated events
      for (const event of result.events) {
        this.emit('game_event', event);
        this.emit(event.type, event);
      }

      // Emit GAME_STATE_UPDATED with sanitized client-safe public state
      const publicState = toPublicGameState(this.state);
      const stateUpdatedEvent: GameStateUpdatedEvent = {
        type: 'GAME_STATE_UPDATED',
        gameState: publicState,
        timestamp: new Date().toISOString(),
      };
      this.emit('GAME_STATE_UPDATED', stateUpdatedEvent);
      this.emit('game_event', stateUpdatedEvent);

      return {
        success: true,
        state: this.state,
        events: [...result.events, stateUpdatedEvent],
        commandResult: result.commandResult,
      };
    }

    return {
      success: false,
      state: this.state,
      events: result.events,
      commandResult: result.commandResult,
      error: result.commandResult.error,
    };
  }

  // ==========================================================================
  // Handlers for Pure Rules Orchestration
  // ==========================================================================

  /**
   * Handle SUBMIT_ANSWER using questionRules, rollQueueRules, and gameStateRules
   */
  private handleSubmitAnswer(command: SubmitAnswerCommand): CommandDispatchResult {
    if (!this.state) {
      return {
        success: false,
        state: null,
        events: [],
        commandResult: { success: false, error: { code: 'NO_GAME_STATE', message: 'Game engine not initialized' } },
        error: { code: 'NO_GAME_STATE', message: 'Game engine not initialized' },
      };
    }

    // 1. Validate game phase
    if (!canSubmitAnswer(this.state.gameStatus)) {
      return {
        success: false,
        state: this.state,
        events: [],
        commandResult: { success: false, error: { code: 'INVALID_PHASE', message: 'Cannot submit answer in current game phase' } },
        error: { code: 'INVALID_PHASE', message: 'Cannot submit answer in current game phase' },
      };
    }

    // 2. Validate question
    const questionValidation = validateQuestionForGame(this.state, command.questionId);
    if (!questionValidation.valid) {
      return {
        success: false,
        state: this.state,
        events: [],
        commandResult: { success: false, error: { code: questionValidation.error!, message: questionValidation.error! } },
        error: { code: questionValidation.error!, message: questionValidation.error! },
      };
    }

    // 3. Validate player can answer
    const playerCheck = canPlayerAnswer(this.state, command.playerId);
    if (!playerCheck.canAnswer) {
      return {
        success: false,
        state: this.state,
        events: [],
        commandResult: { success: false, error: { code: playerCheck.reason!, message: `Player cannot answer: ${playerCheck.reason}` } },
        error: { code: playerCheck.reason!, message: `Player cannot answer: ${playerCheck.reason}` },
      };
    }

    // 4. Validate current question exists (with fallback to default question)
    const currentQuestion = this.state.currentQuestion || DEFAULT_QUESTIONS[0];

    // 5. Pure question evaluation (uses ServerQuestion.correctAnswer securely)
    const startTime = this.state.questionStartTime || this.state.phaseStartedAt;
    const answerTimestamp = new Date(command.clientTimestamp || Date.now()).toISOString();
    const evaluation = evaluateAnswerComplete(
      currentQuestion,
      command.choiceIndex,
      startTime,
      answerTimestamp
    );

    // 6. Update player state
    const answeringPlayer = this.state.players.find(p => p.playerId === command.playerId);
    const correctCount = (answeringPlayer?.correctAnswersCount || 0) + (evaluation.correct ? 1 : 0);
    const wrongCount = (answeringPlayer?.wrongAnswersCount || 0) + (evaluation.correct ? 0 : 1);

    const playerUpdateResult = updatePlayer(this.state, command.playerId, {
      status: 'answered' as const,
      answeredAt: answerTimestamp,
      answerTimeMs: evaluation.answerTimeMs,
      correctAnswersCount: correctCount,
      wrongAnswersCount: wrongCount,
    });
    let newState: ServerGameState = playerUpdateResult.success ? playerUpdateResult.state : this.state;

    const events: ServerGameEvent[] = [];
    let queuePosition: number | undefined;

    // 7. Manage Roll Queue via rollQueueRules if answer is correct
    if (evaluation.correct) {
      const currentQueue: RollQueue = newState.rollQueue.map(pid => {
        const p = newState.players.find(pl => pl.playerId === pid);
        return { playerId: pid as PlayerId, answerTimeMs: p?.answerTimeMs ?? 0 };
      });

      const updatedQueue = addToRollQueue(currentQueue, {
        playerId: command.playerId as PlayerId,
        answerTimeMs: evaluation.answerTimeMs,
      });

      const newRollQueuePlayerIds = updatedQueue.map(e => e.playerId);
      queuePosition = newRollQueuePlayerIds.indexOf(command.playerId as PlayerId) + 1;

      newState = updateState(newState, { rollQueue: newRollQueuePlayerIds });

      const rollQueueEvent: RollQueueUpdatedEvent = {
        type: 'ROLL_QUEUE_UPDATED',
        rollQueue: newRollQueuePlayerIds,
        currentPlayerId: newRollQueuePlayerIds[0],
        timestamp: new Date().toISOString(),
      };
      events.push(rollQueueEvent);
    }

    // 8. ANSWER_EVALUATED event
    const answerEvaluatedEvent: AnswerEvaluatedEvent = {
      type: 'ANSWER_EVALUATED',
      playerId: command.playerId,
      correct: evaluation.correct,
      answerTimeMs: evaluation.answerTimeMs,
      earnedRoll: evaluation.correct,
      queuePosition: evaluation.correct ? queuePosition : undefined,
      timestamp: new Date().toISOString(),
    };
    events.push(answerEvaluatedEvent);

    // 9. Update allPlayersAnswered flag (Requirement 4 & 5)
    // Teacher can advance early via ADVANCE_QUESTION when all connected players have answered,
    // or game will advance automatically when the 15-second timer expires.
    const connectedPlayers = newState.players.filter(p => p.isConnected !== false);
    const allAnswered = connectedPlayers.length > 0 &&
      connectedPlayers.every(p => p.status === 'answered');
    newState = updateState(newState, { allPlayersAnswered: allAnswered });

    // Update internal state
    this.state = newState;

    // Emit all events
    for (const event of events) {
      this.emit('game_event', event);
      this.emit(event.type, event);
    }

    // Emit state update event
    const publicState = toPublicGameState(this.state);
    const stateUpdatedEvent: GameStateUpdatedEvent = {
      type: 'GAME_STATE_UPDATED',
      gameState: publicState,
      timestamp: new Date().toISOString(),
    };
    events.push(stateUpdatedEvent);
    this.emit('GAME_STATE_UPDATED', stateUpdatedEvent);
    this.emit('game_event', stateUpdatedEvent);

    return {
      success: true,
      state: this.state,
      events,
      commandResult: {
        success: true,
        data: {
          correct: evaluation.correct,
          answerTimeMs: evaluation.answerTimeMs,
          earnedRoll: evaluation.correct,
          queuePosition,
        },
      },
    };
  }

  /**
   * Handle ROLL_DICE using boardRules, rollQueueRules, and gameStateRules
   */
  private handleRollDice(command: RollDiceCommand): CommandDispatchResult {
    if (!this.state) {
      return {
        success: false,
        state: null,
        events: [],
        commandResult: { success: false, error: { code: 'NO_GAME_STATE', message: 'Game engine not initialized' } },
        error: { code: 'NO_GAME_STATE', message: 'Game engine not initialized' },
      };
    }

    // 1. Validate game phase
    if (!canRollDice(this.state.gameStatus)) {
      return {
        success: false,
        state: this.state,
        events: [],
        commandResult: { success: false, error: { code: 'INVALID_PHASE', message: 'Cannot roll dice in current game phase' } },
        error: { code: 'INVALID_PHASE', message: 'Cannot roll dice in current game phase' },
      };
    }

    // 2. Validate turn order
    const rollQueue = this.state.rollQueue;
    const currentRoller = this.state.currentPlayerId || (rollQueue.length > 0 ? rollQueue[0] : null);
    if (!currentRoller || currentRoller !== command.playerId) {
      return {
        success: false,
        state: this.state,
        events: [],
        commandResult: { success: false, error: { code: 'NOT_PLAYER_TURN', message: "It is not this player's turn to roll" } },
        error: { code: 'NOT_PLAYER_TURN', message: "It is not this player's turn to roll" },
      };
    }

    const player = this.state.players.find(p => p.playerId === command.playerId);
    if (!player) {
      return {
        success: false,
        state: this.state,
        events: [],
        commandResult: { success: false, error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found in game' } },
        error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found in game' },
      };
    }

    const events: ServerGameEvent[] = [];

    // 3. Secure dice roll
    const diceValue = (Math.floor(Math.random() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
    const animationSeed = `seed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const diceResult = {
      value: diceValue,
      animationSeed,
      rolledAt: new Date().toISOString(),
      rolledBy: command.playerId as PlayerId,
      rngSeed: `rng-${Date.now()}-${Math.random()}`,
    };

    // 4. Pure board movement rules (bounce, snake, ladder, finish)
    const fromPosition = player.position;
    const movement = calculateFinalPosition(fromPosition, diceValue);
    const toPosition = movement.position;
    const path = movement.path;
    const bounced = movement.bounced;
    const finished = isFinishCell(toPosition);

    const { position: afterDice } = calculateNextPosition(fromPosition, diceValue);
    const hitSnake = Boolean(getSnakeAt(afterDice));
    const hitLadder = Boolean(getLadderAt(afterDice));

    let finishOrder = player.finishOrder;
    let finishBonus = player.finishBonus;
    if (finished && finishOrder === undefined) {
      const alreadyFinishedCount = this.state.players.filter(p => p.finishOrder !== undefined).length;
      finishOrder = alreadyFinishedCount + 1;
      finishBonus = calculateFinishBonus(finishOrder);
    }

    const baseScore = toPosition + (finishBonus || 0);
    const bonusMultiplier = player.bonusMultiplier || 1;
    const finalScore = baseScore * bonusMultiplier;

    // 5. Update player state
    let newState = this.state;
    const playerUpdateResult = updatePlayer(newState, command.playerId, {
      position: toPosition,
      baseScore,
      finalScore,
      score: finalScore,
      lastRoll: diceValue,
      status: finished ? ('finished' as const) : ('waiting' as const),
      finishOrder,
      finishBonus,
      diceRollsCount: (player.diceRollsCount || 0) + 1,
      snakesHitCount: (player.snakesHitCount || 0) + (hitSnake ? 1 : 0),
      laddersUsedCount: (player.laddersUsedCount || 0) + (hitLadder ? 1 : 0),
    });
    newState = playerUpdateResult.success ? playerUpdateResult.state : newState;

    // Update leaderboard sorted by finalScore/score descending, then position descending
    const updatedLeaderboard = [...newState.players]
      .sort((a, b) => (b.finalScore ?? b.score) - (a.finalScore ?? a.score) || b.position - a.position)
      .map(p => ({
        playerId: p.playerId,
        displayName: p.displayName,
        avatarId: p.avatarId,
        position: p.position,
        score: p.finalScore ?? p.score,
        status: p.status,
      }));
    newState = updateState(newState, { leaderboard: updatedLeaderboard });

    // 6. Manage roll queue using rollQueueRules
    const currentQueue: RollQueue = newState.rollQueue.map(pid => {
      const p = newState.players.find(pl => pl.playerId === pid);
      return { playerId: pid as PlayerId, answerTimeMs: p?.answerTimeMs ?? 0 };
    });
    const remainingQueue = removeFromRollQueue(currentQueue, command.playerId as PlayerId);
    const remainingPlayerIds = remainingQueue.map(e => e.playerId);
    const nextRoller = getCurrentRollPlayer(remainingQueue);

    // 7. Check Special Cell (Requirement 7 & 8: Special cells 25, 50, 75 PAUSE game)
    const specialCell = getSpecialCellAt(toPosition);
    let nextPhase: GameStatus;

    if (specialCell) {
      nextPhase = 'special_event';
      const specialEventState: SpecialEventState = {
        playerId: command.playerId as PlayerId,
        cell: toPosition,
        type: specialCell.type,
        label: specialCell.label,
      };
      newState = updateState(newState, {
        dice: diceResult,
        rollQueue: remainingPlayerIds,
        currentPlayerId: undefined,
        gameStatus: 'special_event',
        specialEvent: specialEventState,
        phaseStartedAt: new Date().toISOString(),
        phaseEndsAt: undefined,
      });

      const phaseEvent: PhaseChangedEvent = {
        type: 'PHASE_CHANGED',
        fromStatus: 'rolling',
        toStatus: 'special_event',
        timestamp: new Date().toISOString(),
      };
      events.push(phaseEvent);
    } else {
      nextPhase = remainingPlayerIds.length > 0 ? 'rolling' : 'waiting_for_question';
      newState = updateState(newState, {
        dice: diceResult,
        rollQueue: remainingPlayerIds,
        currentPlayerId: nextRoller || undefined,
        gameStatus: nextPhase,
        specialEvent: undefined,
        phaseStartedAt: new Date().toISOString(),
        phaseEndsAt: undefined,
      });

      if (nextPhase === 'waiting_for_question') {
        const phaseEvent: PhaseChangedEvent = {
          type: 'PHASE_CHANGED',
          fromStatus: 'rolling',
          toStatus: 'waiting_for_question',
          timestamp: new Date().toISOString(),
        };
        events.push(phaseEvent);
      }
    }

    // 8. Events
    const diceEvent: DiceRolledEvent = {
      type: 'DICE_ROLLED',
      dice: { value: diceValue, animationSeed },
      playerId: command.playerId,
      timestamp: new Date().toISOString(),
    };
    events.push(diceEvent);

    const movingEvent: PlayerMovingEvent = {
      type: 'PLAYER_MOVING',
      playerId: command.playerId,
      fromPosition,
      toPosition,
      path,
      diceValue,
      bounced,
      timestamp: new Date().toISOString(),
    };
    events.push(movingEvent);

    const movedEvent: PlayerMovedEvent = {
      type: 'PLAYER_MOVED',
      playerId: command.playerId,
      finalPosition: toPosition,
      score: finalScore,
      finished,
      finishOrder,
      finishBonus,
      timestamp: new Date().toISOString(),
    };
    events.push(movedEvent);

    if (remainingPlayerIds.length > 0 && nextPhase === 'rolling') {
      const queueEvent: RollQueueUpdatedEvent = {
        type: 'ROLL_QUEUE_UPDATED',
        rollQueue: remainingPlayerIds,
        currentPlayerId: remainingPlayerIds[0],
        timestamp: new Date().toISOString(),
      };
      events.push(queueEvent);
    }

    // Update internal state
    this.state = newState;

    for (const event of events) {
      this.emit('game_event', event);
      this.emit(event.type, event);
    }

    const publicState = toPublicGameState(this.state);
    const stateUpdatedEvent: GameStateUpdatedEvent = {
      type: 'GAME_STATE_UPDATED',
      gameState: publicState,
      timestamp: new Date().toISOString(),
    };
    events.push(stateUpdatedEvent);
    this.emit('GAME_STATE_UPDATED', stateUpdatedEvent);
    this.emit('game_event', stateUpdatedEvent);

    return {
      success: true,
      state: this.state,
      events,
      commandResult: {
        success: true,
        data: {
          dice: diceResult,
          finalPosition: toPosition,
          score: finalScore,
          finished,
        },
      },
    };
  }

  /**
   * Handle START_QUESTION initiated by Teacher (Requirement 2 & 3)
   * Starts a 3-second countdown (3 -> 2 -> 1) before question opens
   */
  private handleStartQuestion(command: StartQuestionCommand): CommandDispatchResult {
    if (!this.state) {
      return {
        success: false,
        state: null,
        events: [],
        commandResult: { success: false, error: { code: 'NO_GAME_STATE', message: 'Game engine not initialized' } },
        error: { code: 'NO_GAME_STATE', message: 'Game engine not initialized' },
      };
    }

    // Requirement 9: During Special Event, Teacher cannot start new question
    if (this.state.gameStatus === 'special_event') {
      return {
        success: false,
        state: this.state,
        events: [],
        commandResult: { success: false, error: { code: 'SPECIAL_EVENT_ACTIVE', message: 'Cannot start question while special event is in progress' } },
        error: { code: 'SPECIAL_EVENT_ACTIVE', message: 'Cannot start question while special event is in progress' },
      };
    }

    // Question can be started from waiting_for_question, lobby, or round_complete
    if (
      this.state.gameStatus !== 'waiting_for_question' &&
      this.state.gameStatus !== 'lobby' &&
      this.state.gameStatus !== 'round_complete'
    ) {
      return {
        success: false,
        state: this.state,
        events: [],
        commandResult: { success: false, error: { code: 'INVALID_PHASE', message: `Cannot start question in phase ${this.state.gameStatus}` } },
        error: { code: 'INVALID_PHASE', message: `Cannot start question in phase ${this.state.gameStatus}` },
      };
    }

    const nextRound = this.state.currentRound + 1;
    const nextQuestion = DEFAULT_QUESTIONS[(nextRound - 1) % DEFAULT_QUESTIONS.length];

    const now = new Date();
    const countdownEndsAt = new Date(now.getTime() + 3000).toISOString();

    // Reset players for new question round
    const resetPlayers = this.state.players.map(p => ({
      ...p,
      status: 'waiting' as const,
      answeredAt: undefined,
      answerTimeMs: undefined,
    }));

    let newState = updateState(this.state, {
      gameStatus: 'countdown' as const,
      currentRound: nextRound,
      currentQuestion: nextQuestion,
      players: resetPlayers,
      rollQueue: [],
      specialEvent: undefined,
      allPlayersAnswered: false,
      phaseStartedAt: now.toISOString(),
      phaseEndsAt: countdownEndsAt,
    });

    this.state = newState;

    const events: ServerGameEvent[] = [
      {
        type: 'PHASE_CHANGED',
        fromStatus: (this.state as ServerGameState).gameStatus,
        toStatus: 'countdown',
        timestamp: now.toISOString(),
      } as any,
    ];

    // Start 3000ms countdown timer
    this.stopPhaseTimer();
    this.startPhaseTimer(3000, () => {
      this.handleCountdownFinished();
    });

    const publicState = toPublicGameState(this.state as ServerGameState);
    const stateUpdatedEvent: GameStateUpdatedEvent = {
      type: 'GAME_STATE_UPDATED',
      gameState: publicState,
      timestamp: now.toISOString(),
    };
    events.push(stateUpdatedEvent);
    this.emit('GAME_STATE_UPDATED', stateUpdatedEvent);
    this.emit('game_event', stateUpdatedEvent);

    return {
      success: true,
      state: this.state,
      events,
      commandResult: { success: true, data: { gameState: publicState } },
    };
  }

  /**
   * Called when 3s countdown finishes to start the actual 15s question phase
   */
  private handleCountdownFinished(): ServerGameEvent[] {
    if (!this.state || this.state.gameStatus !== 'countdown') {
      return [];
    }

    const now = new Date();
    const questionEndsAt = new Date(now.getTime() + 15000).toISOString();

    let newState = updateState(this.state, {
      gameStatus: 'question' as const,
      questionStartTime: now.toISOString(),
      phaseStartedAt: now.toISOString(),
      phaseEndsAt: questionEndsAt,
      allPlayersAnswered: false,
    });

    this.state = newState;

    const events: ServerGameEvent[] = [
      {
        type: 'PHASE_CHANGED',
        fromStatus: 'countdown',
        toStatus: 'question',
        timestamp: now.toISOString(),
      } as any,
      {
        type: 'QUESTION_STARTED',
        question: toPublicGameState(this.state as ServerGameState).currentQuestion,
        round: (this.state as ServerGameState).currentRound,
        countdownSeconds: 15,
        questionStartTime: now.toISOString(),
        timestamp: now.toISOString(),
      } as any,
    ];

    // Start 15s question phase timer
    this.stopPhaseTimer();
    this.startPhaseTimer(15000, () => {
      this.handlePhaseTimeout();
    });

    const publicState = toPublicGameState(this.state as ServerGameState);
    const stateUpdatedEvent: GameStateUpdatedEvent = {
      type: 'GAME_STATE_UPDATED',
      gameState: publicState,
      timestamp: now.toISOString(),
    };
    events.push(stateUpdatedEvent);

    for (const ev of events) {
      this.emit('game_event', ev);
      this.emit(ev.type, ev);
    }

    return events;
  }

  /**
   * Handle ADVANCE_QUESTION (Requirement 4 & 5)
   * Teacher clicks "ไปต่อ" when all players have answered before time runs out
   */
  private handleAdvanceQuestion(command: AdvanceQuestionCommand): CommandDispatchResult {
    if (!this.state || this.state.gameStatus !== 'question') {
      return {
        success: false,
        state: this.state,
        events: [],
        commandResult: { success: false, error: { code: 'INVALID_PHASE', message: 'Cannot advance outside question phase' } },
        error: { code: 'INVALID_PHASE', message: 'Cannot advance outside question phase' },
      };
    }

    const connectedPlayers = this.state.players.filter(p => p.isConnected !== false);
    const allAnswered = connectedPlayers.length > 0 && connectedPlayers.every(p => p.status === 'answered');
    const isExpired = this.isPhaseExpired();

    if (!allAnswered && !isExpired) {
      return {
        success: false,
        state: this.state,
        events: [],
        commandResult: { success: false, error: { code: 'NOT_ALL_ANSWERED', message: 'Cannot advance until all players have answered or time is expired' } },
        error: { code: 'NOT_ALL_ANSWERED', message: 'Cannot advance until all players have answered or time is expired' },
      };
    }

    this.stopPhaseTimer();
    const events = this.handlePhaseTimeout();

    const publicState = toPublicGameState(this.state);
    return {
      success: true,
      state: this.state,
      events,
      commandResult: { success: true, data: { gameState: publicState } },
    };
  }

  /**
   * Handle COMPLETE_SPECIAL_EVENT (Requirement 8, 10, 11)
   * Student completes special event on cell 25, 50, or 75
   */
  private handleCompleteSpecialEvent(command: CompleteSpecialEventCommand): CommandDispatchResult {
    if (!this.state || this.state.gameStatus !== 'special_event') {
      return {
        success: false,
        state: this.state,
        events: [],
        commandResult: { success: false, error: { code: 'INVALID_PHASE', message: 'Game is not in special event phase' } },
        error: { code: 'INVALID_PHASE', message: 'Game is not in special event phase' },
      };
    }

    const specialEvent = this.state.specialEvent;
    if (!specialEvent) {
      return {
        success: false,
        state: this.state,
        events: [],
        commandResult: { success: false, error: { code: 'NO_SPECIAL_EVENT', message: 'No active special event' } },
        error: { code: 'NO_SPECIAL_EVENT', message: 'No active special event' },
      };
    }

    const player = this.state.players.find(p => p.playerId === command.playerId);
    if (!player) {
      return {
        success: false,
        state: this.state,
        events: [],
        commandResult: { success: false, error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' } },
        error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' },
      };
    }

    let newPosition = player.position;
    let newRollQueue = [...this.state.rollQueue];
    let extraBonus = 0;

    // Apply special cell effect
    if (specialEvent.cell === 25) {
      // Cell 25: BONUS - Roll Again -> Put player at front of rollQueue
      newRollQueue = [player.playerId, ...newRollQueue.filter(id => id !== player.playerId)];
      extraBonus = 10;
    } else if (specialEvent.cell === 50) {
      // Cell 50: GIFT - Move Up 3 -> Move position forward 3 cells
      newPosition = Math.min(100, player.position + 3);
    } else if (specialEvent.cell === 75) {
      // Cell 75: BOOST - Free Roll Next Turn / +50 score bonus
      extraBonus = 50;
    }

    const baseScore = newPosition + (player.finishBonus || 0);
    const bonusMultiplier = player.bonusMultiplier || 1;
    const finalScore = baseScore * bonusMultiplier + extraBonus;

    const playerUpdateResult = updatePlayer(this.state, player.playerId, {
      position: newPosition,
      baseScore,
      finalScore,
      score: finalScore,
      specialEventsCount: (player.specialEventsCount || 0) + 1,
    });
    let newState = playerUpdateResult.success ? playerUpdateResult.state : this.state;

    // Update leaderboard
    const updatedLeaderboard = [...newState.players]
      .sort((a, b) => (b.finalScore ?? b.score) - (a.finalScore ?? a.score) || b.position - a.position)
      .map(p => ({
        playerId: p.playerId,
        displayName: p.displayName,
        avatarId: p.avatarId,
        position: p.position,
        score: p.finalScore ?? p.score,
        status: p.status,
      }));

    const nextPhase: GameStatus = newRollQueue.length > 0 ? 'rolling' : 'waiting_for_question';
    const nextRoller = newRollQueue.length > 0 ? newRollQueue[0] : undefined;

    newState = updateState(newState, {
      gameStatus: nextPhase,
      specialEvent: undefined,
      rollQueue: newRollQueue,
      currentPlayerId: nextRoller,
      leaderboard: updatedLeaderboard,
      phaseStartedAt: new Date().toISOString(),
      phaseEndsAt: undefined,
    });

    this.state = newState;

    const events: ServerGameEvent[] = [
      {
        type: 'PHASE_CHANGED',
        fromStatus: 'special_event',
        toStatus: nextPhase,
        timestamp: new Date().toISOString(),
      } as any,
    ];

    const publicState = toPublicGameState(this.state as ServerGameState);
    const stateUpdatedEvent: GameStateUpdatedEvent = {
      type: 'GAME_STATE_UPDATED',
      gameState: publicState,
      timestamp: new Date().toISOString(),
    };
    events.push(stateUpdatedEvent);
    this.emit('GAME_STATE_UPDATED', stateUpdatedEvent);
    this.emit('game_event', stateUpdatedEvent);

    return {
      success: true,
      state: this.state,
      events,
      commandResult: { success: true, data: { gameState: publicState } },
    };
  }

  // ==========================================================================
  // Event Subscription
  // ==========================================================================

  /**
   * Subscribe to game events
   */
  on(eventType: string, listener: EventListener): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);

    return () => {
      const listeners = this.eventListeners.get(eventType) || [];
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event to registered listeners
   */
  private emit(eventType: string, payload: any): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.forEach(listener => {
      try {
        listener(payload);
      } catch (error) {
        console.error(`Error in event listener for ${eventType}:`, error);
      }
    });
  }

  // ==========================================================================
  // State Inspection Getters
  // ==========================================================================

  /**
   * Get current game phase
   */
  getCurrentPhase(): GameStatus | null {
    return this.state?.gameStatus || null;
  }

  /**
   * Check if game is in active progress (not lobby or finished)
   */
  isGameActive(): boolean {
    return this.state !== null &&
           this.state.gameStatus !== 'lobby' &&
           this.state.gameStatus !== 'finished';
  }

  /**
   * Get total player count
   */
  getPlayerCount(): number {
    return this.state?.players.length || 0;
  }

  /**
   * Get current player ID whose turn it is to roll
   */
  getCurrentPlayer(): string | null {
    return this.state?.currentPlayerId || null;
  }

  /**
   * Get active roll queue
   */
  getRollQueue(): string[] {
    return this.state?.rollQueue || [];
  }

  /**
   * Get current server question
   */
  getCurrentQuestion(): ServerQuestion | null {
    return this.state?.currentQuestion || null;
  }

  /**
   * Get current round number
   */
  getCurrentRound(): number {
    return this.state?.currentRound || 0;
  }

  /**
   * Get total rounds configured
   */
  getTotalRounds(): number {
    return this.state?.totalRounds || 0;
  }

  /**
   * Clean up timers and resources
   */
  destroy(): void {
    this.stopPhaseTimer();
    this.eventListeners.clear();
  }
}

// ============================================================================
// Singleton & Factory Functions
// ============================================================================

let gameEngineInstance: GameEngine | null = null;
const gameEnginesByPin: Map<string, GameEngine> = new Map();

export function getGameEngine(): GameEngine {
  if (!gameEngineInstance) {
    gameEngineInstance = new GameEngine();
  }
  return gameEngineInstance;
}

export function getGameEngineForPin(pin: string): GameEngine {
  const normalizedPin = pin.toUpperCase();
  let engine = gameEnginesByPin.get(normalizedPin);
  if (!engine) {
    engine = new GameEngine();
    const now = new Date().toISOString();
    const defaultPlayers: ServerPlayer[] = [
      {
        playerId: 'p1' as any,
        displayName: 'นัท',
        avatarId: 'avatar-09' as any,
        position: 1,
        score: 5,
        baseScore: 1,
        finalScore: 5,
        joinOrder: 1,
        bonusMultiplier: 5,
        status: 'waiting',
        isConnected: true,
        joinedAt: now,
      },
      {
        playerId: 'p2' as any,
        displayName: 'มายด์',
        avatarId: 'avatar-05' as any,
        position: 1,
        score: 4,
        baseScore: 1,
        finalScore: 4,
        joinOrder: 2,
        bonusMultiplier: 4,
        status: 'waiting',
        isConnected: true,
        joinedAt: now,
      },
      {
        playerId: 'p3' as any,
        displayName: 'อาร์ม',
        avatarId: 'avatar-02' as any,
        position: 1,
        score: 3,
        baseScore: 1,
        finalScore: 3,
        joinOrder: 3,
        bonusMultiplier: 3,
        status: 'waiting',
        isConnected: true,
        joinedAt: now,
      },
      {
        playerId: 'p4' as any,
        displayName: 'จูน',
        avatarId: 'avatar-04' as any,
        position: 1,
        score: 2,
        baseScore: 1,
        finalScore: 2,
        joinOrder: 4,
        bonusMultiplier: 2,
        status: 'waiting',
        isConnected: true,
        joinedAt: now,
      },
    ];
    const isDemoPin = normalizedPin === '4827' || normalizedPin === 'DEMO99' || normalizedPin === 'KS8821';
    const initialPlayers: ServerPlayer[] = isDemoPin ? defaultPlayers : [];
    const initialStatus: GameStatus = isDemoPin ? 'waiting_for_question' : 'lobby';

    const initialState: ServerGameState = {
      gameId: `game-${normalizedPin.toLowerCase()}` as any,
      gamePin: normalizedPin as any,
      teacherId: `teacher-${normalizedPin.toLowerCase()}` as any,
      totalRounds: GAME_CONFIG.rounds.default,
      board: {
        snakes: SNAKES,
        ladders: LADDERS,
        specialCells: SPECIAL_CELLS,
        totalCells: GAME_CONFIG.board.totalCells,
      },
      gameStatus: initialStatus,
      currentRound: 0,
      players: initialPlayers,
      rollQueue: [],
      leaderboard: initialPlayers.map(p => ({
        playerId: p.playerId,
        displayName: p.displayName,
        avatarId: p.avatarId,
        position: p.position,
        score: p.score,
        status: p.status,
      })),
      phaseStartedAt: now,
      phaseEndsAt: undefined,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    engine.initialize(initialState);
    realtimePublisher.attachEngine(normalizedPin, engine);
    gameEnginesByPin.set(normalizedPin, engine);
  }
  return engine;
}

export function resetGameEngine(): void {
  if (gameEngineInstance) {
    gameEngineInstance.destroy();
  }
  gameEngineInstance = null;
  gameEnginesByPin.forEach((engine, pin) => {
    engine.destroy();
    realtimePublisher.detachEngine(pin);
  });
  gameEnginesByPin.clear();
}

export function createGameEngine(initialState?: ServerGameState): GameEngine {
  const engine = new GameEngine();
  if (initialState) {
    engine.initialize(initialState);
  }
  return engine;
}

export default GameEngine;