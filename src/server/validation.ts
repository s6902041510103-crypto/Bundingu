/**
 * Server Command Validation
 * Pure validation functions for ServerGameCommand
 * Pure validation only - no state mutation, no game logic
 */

import type {
  ServerGameState,
  ServerGameCommand,
  GameStatus,
  PlayerStatus,
  ChoiceIndex,
  GameId,
  GamePin,
  TeacherId,
  PlayerId,
  QuestionId,
  SessionId,
  ServerPlayer,
  JoinGameCommand,
  RejoinGameCommand,
  SubmitAnswerCommand,
  RollDiceCommand,
  RandomizeAvatarCommand,
  ChangeAvatarCommand,
  StartGameCommand,
  NextQuestionCommand,
  SkipQuestionCommand,
  LeaveGameCommand,
} from './gameState';

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult<T = void> {
  valid: boolean;
  errors: ValidationError[];
  data?: T;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export type ValidationContext = 'client' | 'teacher' | 'system';

// ============================================================================
// Utility Functions
// ============================================================================

function createError(field: string, code: string, message: string): ValidationError {
  return { field, code, message };
}

function createSuccess<T>(data: T): ValidationResult<T> {
  return { valid: true, errors: [], data };
}

function createFailure<T = void>(errors: ValidationError[]): ValidationResult<T> {
  return { valid: false, errors, data: undefined };
}

// ============================================================================
// Core Validation Functions
// ============================================================================

/**
 * Validate a ServerGameCommand structure and required fields
 */
export function validateCommand(command: ServerGameCommand): ValidationResult<ServerGameCommand> {
  const errors: ValidationError[] = [];

  // Base validation - all commands must have type
  if (!command.type) {
    errors.push(createError('type', 'MISSING_TYPE', 'Command type is required'));
  }

  if (errors.length > 0) {
    return createFailure(errors);
  }

  // Validate specific command types
  switch (command.type) {
    case 'JOIN_GAME':
      return validateJoinGameCommand(command);
    case 'REJOIN_GAME':
      return validateRejoinGameCommand(command);
    case 'SUBMIT_ANSWER':
      return validateSubmitAnswerCommand(command);
    case 'ROLL_DICE':
      return validateRollDiceCommand(command);
    case 'RANDOMIZE_AVATAR':
      return validateRandomizeAvatarCommand(command);
    case 'CHANGE_AVATAR':
      return validateChangeAvatarCommand(command);
    case 'START_GAME':
      return validateStartGameCommand(command);
    case 'NEXT_QUESTION':
      return validateNextQuestionCommand(command);
    case 'SKIP_QUESTION':
      return validateSkipQuestionCommand(command);
    case 'LEAVE_GAME':
      return validateLeaveGameCommand(command);
    default:
      errors.push(createError('type', 'UNKNOWN_COMMAND', `Unknown command type: ${(command as any).type}`));
      return createFailure(errors);
  }
}

/**
 * Validate player session
 */
export function validatePlayerSession(
  gameState: any, // ServerGameState - use any to avoid circular import
  playerId: string,
  sessionId: string
): ValidationResult<{ player: any; index: number }> {
  const errors: ValidationError[] = [];

  if (!playerId) {
    errors.push(createError('playerId', 'MISSING_PLAYER_ID', 'Player ID is required'));
  }

  if (!sessionId) {
    errors.push(createError('sessionId', 'MISSING_SESSION_ID', 'Session ID is required'));
  }

  if (errors.length > 0) {
    return createFailure(errors);
  }

  // Find player in game state
  const playerIndex = gameState.players.findIndex(
    (p: any) => p.playerId === playerId && p.sessionId === sessionId
  );

  if (playerIndex === -1) {
    errors.push(createError('sessionId', 'INVALID_SESSION', 'Invalid player session'));
    return createFailure(errors);
  }

  const player = gameState.players[playerIndex];

  if (!player.isConnected) {
    errors.push(createError('playerId', 'PLAYER_DISCONNECTED', 'Player is not connected'));
    return createFailure(errors);
  }

  return createSuccess({ player, index: playerIndex });
}

/**
 * Validate game phase for a command
 */
export function validateGamePhase(
  gameState: any,
  commandType: string,
  requiredPhases: string[]
): ValidationResult<void> {
  const errors: ValidationError[] = [];

  const currentPhase = gameState.gameStatus;

  if (!requiredPhases.includes(currentPhase)) {
    errors.push(createError(
      'gameStatus',
      'INVALID_PHASE',
      `Command requires game phase to be one of: ${requiredPhases.join(', ')}, but current phase is: ${currentPhase}`
    ));
    return createFailure(errors);
  }

  return createSuccess(undefined);
}

/**
 * Validate player permission for a command
 */
export function validatePlayerPermission(
  gameState: any,
  command: any,
  context: ValidationContext
): ValidationResult<void> {
  const errors: ValidationError[] = [];

  switch (context) {
    case 'teacher':
      // Teacher commands require teacherId match
      if (command.teacherId && command.teacherId !== gameState.teacherId) {
        errors.push(createError(
          'teacherId',
          'UNAUTHORIZED',
          'Teacher ID does not match game owner'
        ));
      }
      break;

    case 'client':
      // Client commands require valid player session
      // This is validated in validatePlayerSession
      break;

    case 'system':
      // System commands (internal) - no additional validation
      break;
  }

  return errors.length > 0 ? createFailure(errors) : createSuccess(undefined);
}

// ============================================================================
// Specific Command Validators
// ============================================================================

function validateJoinGameCommand(command: any): ValidationResult<any> {
  const errors: ValidationError[] = [];

  if (!command.gamePin || typeof command.gamePin !== 'string') {
    errors.push(createError('gamePin', 'MISSING_GAME_PIN', 'Game PIN is required'));
  } else if (command.gamePin.length !== 6) {
    errors.push(createError('gamePin', 'INVALID_GAME_PIN', 'Game PIN must be 6 characters'));
  }

  if (!command.displayName || typeof command.displayName !== 'string') {
    errors.push(createError('displayName', 'MISSING_DISPLAY_NAME', 'Display name is required'));
  } else if (command.displayName.length > 20) {
    errors.push(createError('displayName', 'DISPLAY_NAME_TOO_LONG', 'Display name must not exceed 20 characters'));
  }

  if (!command.sessionId) {
    errors.push(createError('sessionId', 'MISSING_SESSION_ID', 'Session ID is required'));
  }

  if (command.preferredAvatarId && typeof command.preferredAvatarId !== 'string') {
    errors.push(createError('preferredAvatarId', 'INVALID_AVATAR_ID', 'Avatar ID must be a string'));
  }

  return errors.length > 0 ? createFailure(errors) : createSuccess(command);
}

function validateRejoinGameCommand(command: any): ValidationResult<any> {
  const errors: ValidationError[] = [];

  if (!command.gamePin) {
    errors.push(createError('gamePin', 'MISSING_GAME_PIN', 'Game PIN is required'));
  }

  if (!command.playerId) {
    errors.push(createError('playerId', 'MISSING_PLAYER_ID', 'Player ID is required'));
  }

  if (!command.sessionId) {
    errors.push(createError('sessionId', 'MISSING_SESSION_ID', 'Session ID is required'));
  }

  return errors.length > 0 ? createFailure(errors) : createSuccess(command);
}

function validateSubmitAnswerCommand(command: any): ValidationResult<any> {
  const errors: ValidationError[] = [];

  if (!command.questionId) {
    errors.push(createError('questionId', 'MISSING_QUESTION_ID', 'Question ID is required'));
  }

  if (typeof command.choiceIndex !== 'number' || command.choiceIndex < 0 || command.choiceIndex > 3) {
    errors.push(createError('choiceIndex', 'INVALID_CHOICE_INDEX', 'Choice index must be 0, 1, 2, or 3'));
  }

  if (typeof command.clientTimestamp !== 'number' || command.clientTimestamp <= 0) {
    errors.push(createError('clientTimestamp', 'INVALID_TIMESTAMP', 'Client timestamp is required'));
  }

  if (!command.playerId) {
    errors.push(createError('playerId', 'MISSING_PLAYER_ID', 'Player ID is required'));
  }

  if (!command.sessionId) {
    errors.push(createError('sessionId', 'MISSING_SESSION_ID', 'Session ID is required'));
  }

  return errors.length > 0 ? createFailure(errors) : createSuccess(command);
}

function validateRollDiceCommand(command: any): ValidationResult<any> {
  const errors: ValidationError[] = [];

  if (!command.playerId) {
    errors.push(createError('playerId', 'MISSING_PLAYER_ID', 'Player ID is required'));
  }

  if (!command.sessionId) {
    errors.push(createError('sessionId', 'MISSING_SESSION_ID', 'Session ID is required'));
  }

  return errors.length > 0 ? createFailure(errors) : createSuccess(command);
}

function validateRandomizeAvatarCommand(command: any): ValidationResult<any> {
  const errors: ValidationError[] = [];

  if (!command.playerId) {
    errors.push(createError('playerId', 'MISSING_PLAYER_ID', 'Player ID is required'));
  }

  if (!command.sessionId) {
    errors.push(createError('sessionId', 'MISSING_SESSION_ID', 'Session ID is required'));
  }

  return errors.length > 0 ? createFailure(errors) : createSuccess(command);
}

function validateChangeAvatarCommand(command: any): ValidationResult<any> {
  const errors: ValidationError[] = [];

  if (!command.playerId) {
    errors.push(createError('playerId', 'MISSING_PLAYER_ID', 'Player ID is required'));
  }

  if (!command.newAvatarId || typeof command.newAvatarId !== 'string') {
    errors.push(createError('newAvatarId', 'MISSING_AVATAR_ID', 'Avatar ID is required'));
  }

  if (!['random', 'pick'].includes(command.mode)) {
    errors.push(createError('mode', 'INVALID_MODE', 'Mode must be "random" or "pick"'));
  }

  if (!command.sessionId) {
    errors.push(createError('sessionId', 'MISSING_SESSION_ID', 'Session ID is required'));
  }

  return errors.length > 0 ? createFailure(errors) : createSuccess(command);
}

function validateStartGameCommand(command: any): ValidationResult<any> {
  const errors: ValidationError[] = [];

  if (!command.gamePin) {
    errors.push(createError('gamePin', 'MISSING_GAME_PIN', 'Game PIN is required'));
  }

  if (!command.teacherId) {
    errors.push(createError('teacherId', 'MISSING_TEACHER_ID', 'Teacher ID is required'));
  }

  if (!command.sessionId) {
    errors.push(createError('sessionId', 'MISSING_SESSION_ID', 'Session ID is required'));
  }

  return errors.length > 0 ? createFailure(errors) : createSuccess(command);
}

function validateNextQuestionCommand(command: any): ValidationResult<any> {
  const errors: ValidationError[] = [];

  if (!command.gamePin) {
    errors.push(createError('gamePin', 'MISSING_GAME_PIN', 'Game PIN is required'));
  }

  if (!command.teacherId) {
    errors.push(createError('teacherId', 'MISSING_TEACHER_ID', 'Teacher ID is required'));
  }

  if (!command.sessionId) {
    errors.push(createError('sessionId', 'MISSING_SESSION_ID', 'Session ID is required'));
  }

  return errors.length > 0 ? createFailure(errors) : createSuccess(command);
}

function validateSkipQuestionCommand(command: any): ValidationResult<any> {
  const errors: ValidationError[] = [];

  if (!command.gamePin) {
    errors.push(createError('gamePin', 'MISSING_GAME_PIN', 'Game PIN is required'));
  }

  if (!command.teacherId) {
    errors.push(createError('teacherId', 'MISSING_TEACHER_ID', 'Teacher ID is required'));
  }

  if (!command.sessionId) {
    errors.push(createError('sessionId', 'MISSING_SESSION_ID', 'Session ID is required'));
  }

  return errors.length > 0 ? createFailure(errors) : createSuccess(command);
}

function validateLeaveGameCommand(command: any): ValidationResult<any> {
  const errors: ValidationError[] = [];

  if (!command.playerId) {
    errors.push(createError('playerId', 'MISSING_PLAYER_ID', 'Player ID is required'));
  }

  if (!command.sessionId) {
    errors.push(createError('sessionId', 'MISSING_SESSION_ID', 'Session ID is required'));
  }

  return errors.length > 0 ? createFailure(errors) : createSuccess(command);
}

// ============================================================================
// Export all validators
// ============================================================================

export const validators = {
  validateCommand,
  validatePlayerSession,
  validateGamePhase,
  validatePlayerPermission,
  validateJoinGameCommand,
  validateRejoinGameCommand,
  validateSubmitAnswerCommand,
  validateRollDiceCommand,
  validateRandomizeAvatarCommand,
  validateChangeAvatarCommand,
  validateStartGameCommand,
  validateNextQuestionCommand,
  validateSkipQuestionCommand,
  validateLeaveGameCommand,
};