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
  PlayerId,
  GameStatus,
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
    if (!this.state || this.state.gameStatus !== 'question') {
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
      // No correct answers in this round -> advance to round_complete
      const phaseResult = updateGamePhase(this.state, 'round_complete', new Date().toISOString());
      const newState: ServerGameState = phaseResult.success ? phaseResult.state : updateState(this.state, { gameStatus: 'round_complete' });
      this.state = updateState(newState, { phaseEndsAt: undefined });

      const phaseEvent: PhaseChangedEvent = {
        type: 'PHASE_CHANGED',
        fromStatus: 'question',
        toStatus: 'round_complete',
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

    // 4. Validate current question exists
    const currentQuestion = this.state.currentQuestion;
    if (!currentQuestion) {
      return {
        success: false,
        state: this.state,
        events: [],
        commandResult: { success: false, error: { code: 'NO_CURRENT_QUESTION', message: 'No current question to answer' } },
        error: { code: 'NO_CURRENT_QUESTION', message: 'No current question to answer' },
      };
    }

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
    const playerUpdateResult = updatePlayer(this.state, command.playerId, {
      status: 'answered' as const,
      answeredAt: answerTimestamp,
      answerTimeMs: evaluation.answerTimeMs,
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

    // 9. Early phase advancement if all connected players have answered
    const allAnswered = newState.players.length > 0 &&
      newState.players.every(p => p.status === 'answered' || !p.isConnected);

    if (allAnswered) {
      this.stopPhaseTimer();
      if (newState.rollQueue.length > 0) {
        const firstRoller = newState.rollQueue[0];
        const phaseResult = updateGamePhase(newState, 'rolling', new Date().toISOString());
        newState = phaseResult.success ? phaseResult.state : updateState(newState, { gameStatus: 'rolling' });
        newState = updateState(newState, {
          currentPlayerId: firstRoller,
          phaseEndsAt: undefined,
        });

        const phaseEvent: PhaseChangedEvent = {
          type: 'PHASE_CHANGED',
          fromStatus: 'question',
          toStatus: 'rolling',
          timestamp: new Date().toISOString(),
        };
        events.push(phaseEvent);
      } else {
        const phaseResult = updateGamePhase(newState, 'round_complete', new Date().toISOString());
        newState = phaseResult.success ? phaseResult.state : updateState(newState, { gameStatus: 'round_complete' });
        newState = updateState(newState, { phaseEndsAt: undefined });

        const phaseEvent: PhaseChangedEvent = {
          type: 'PHASE_CHANGED',
          fromStatus: 'question',
          toStatus: 'round_complete',
          timestamp: new Date().toISOString(),
        };
        events.push(phaseEvent);
      }
    }

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

    let finishOrder = player.finishOrder;
    let finishBonus = player.finishBonus;
    if (finished && finishOrder === undefined) {
      const alreadyFinishedCount = this.state.players.filter(p => p.finishOrder !== undefined).length;
      finishOrder = alreadyFinishedCount + 1;
      finishBonus = calculateFinishBonus(finishOrder);
    }

    const finalScore = calculateFinalScore(toPosition, finishBonus || 0);

    // 5. Update player state
    let newState = this.state;
    const playerUpdateResult = updatePlayer(newState, command.playerId, {
      position: toPosition,
      score: finalScore,
      lastRoll: diceValue,
      status: finished ? ('finished' as const) : ('waiting' as const),
      finishOrder,
      finishBonus,
    });
    newState = playerUpdateResult.success ? playerUpdateResult.state : newState;

    // 6. Manage roll queue using rollQueueRules
    const currentQueue: RollQueue = newState.rollQueue.map(pid => {
      const p = newState.players.find(pl => pl.playerId === pid);
      return { playerId: pid as PlayerId, answerTimeMs: p?.answerTimeMs ?? 0 };
    });
    const remainingQueue = removeFromRollQueue(currentQueue, command.playerId as PlayerId);
    const remainingPlayerIds = remainingQueue.map(e => e.playerId);
    const nextRoller = getCurrentRollPlayer(remainingQueue);

    // 7. Phase progression
    const nextPhase: GameStatus = remainingPlayerIds.length > 0 ? 'rolling' : 'round_complete';
    newState = updateState(newState, {
      dice: diceResult,
      rollQueue: remainingPlayerIds,
      currentPlayerId: nextRoller || undefined,
      gameStatus: nextPhase,
      phaseStartedAt: new Date().toISOString(),
      phaseEndsAt: undefined,
    });

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

    if (remainingPlayerIds.length > 0) {
      const queueEvent: RollQueueUpdatedEvent = {
        type: 'ROLL_QUEUE_UPDATED',
        rollQueue: remainingPlayerIds,
        currentPlayerId: remainingPlayerIds[0],
        timestamp: new Date().toISOString(),
      };
      events.push(queueEvent);
    }

    if (nextPhase === 'round_complete') {
      const phaseEvent: PhaseChangedEvent = {
        type: 'PHASE_CHANGED',
        fromStatus: 'rolling',
        toStatus: 'round_complete',
        timestamp: new Date().toISOString(),
      };
      events.push(phaseEvent);
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

export function getGameEngine(): GameEngine {
  if (!gameEngineInstance) {
    gameEngineInstance = new GameEngine();
  }
  return gameEngineInstance;
}

export function resetGameEngine(): void {
  if (gameEngineInstance) {
    gameEngineInstance.destroy();
  }
  gameEngineInstance = null;
}

export function createGameEngine(initialState?: ServerGameState): GameEngine {
  const engine = new GameEngine();
  if (initialState) {
    engine.initialize(initialState);
  }
  return engine;
}

export default GameEngine;