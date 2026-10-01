import { NextRequest, NextResponse } from 'next/server';
import { getGameEngineForPin } from '@/server/gameEngine';
import { validateCommand } from '@/server/validation';
import { stripDiceSeed, toPublicGameState } from '@/server/gameState';
import type { ServerGameCommand } from '@/server/gameState';
import type { CommandResult } from '@/domain/types';
import { realtimePublisher } from '@/server/realtimePublisher';
import { gameStorage } from '@/server/storage';

/**
 * Sanitize CommandResult to guarantee no sensitive server data leaks to client.
 * Enforces STEP 5: No correctAnswer, rngSeed, sessionId, teacherId.
 */
function sanitizeCommandResult<T>(result: CommandResult<T>): CommandResult<T> {
  if (!result || !result.data) {
    return result;
  }

  const sanitizedData = { ...(result.data as any) };

  // If nested gameState is present, sanitize to public game state
  if (sanitizedData.gameState) {
    sanitizedData.gameState = toPublicGameState(sanitizedData.gameState);
  }

  // If dice result is present, strip rngSeed
  if (sanitizedData.dice && sanitizedData.dice.rngSeed) {
    sanitizedData.dice = stripDiceSeed(sanitizedData.dice);
  }

  // Strip server-only sensitive properties
  delete sanitizedData.correctAnswer;
  delete sanitizedData.rngSeed;
  delete sanitizedData.sessionId;
  delete sanitizedData.teacherId;

  return {
    ...result,
    data: sanitizedData,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { pin: string } }
) {
  try {
    const { pin } = await Promise.resolve(params);

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json<CommandResult>(
        {
          success: false,
          error: {
            code: 'INVALID_GAME_PIN',
            message: 'Game PIN is required.',
          },
        },
        { status: 400 }
      );
    }

    const normalizedPin = pin.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(normalizedPin)) {
      return NextResponse.json<CommandResult>(
        {
          success: false,
          error: {
            code: 'INVALID_GAME_PIN',
            message: 'Game PIN must be a 4 to 8 character alphanumeric code.',
          },
        },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<CommandResult>(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON.',
          },
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object' || !body.type) {
      return NextResponse.json<CommandResult>(
        {
          success: false,
          error: {
            code: 'INVALID_COMMAND',
            message: 'Command type is required.',
          },
        },
        { status: 400 }
      );
    }

    // Attach route pin and default sessionId if missing
    const commandPayload: any = {
      ...body,
      gamePin: normalizedPin,
      sessionId: body.sessionId || body.playerId || `session-${normalizedPin}-${Date.now()}`,
    };

    // Normalize client domain command types to server-authoritative command types
    if (commandPayload.type === 'ANSWER') {
      commandPayload.type = 'SUBMIT_ANSWER';
    } else if (commandPayload.type === 'TEACHER_START_GAME') {
      commandPayload.type = 'START_GAME';
    } else if (commandPayload.type === 'TEACHER_NEXT_ROUND') {
      commandPayload.type = 'NEXT_QUESTION';
    }

    // Validate command according to server rules
    const validation = validateCommand(commandPayload as ServerGameCommand);
    if (!validation.valid) {
      const errorMsg = validation.errors.map(e => e.message).join(', ');
      return NextResponse.json<CommandResult>(
        {
          success: false,
          error: {
            code: validation.errors[0]?.code || 'VALIDATION_ERROR',
            message: errorMsg,
          },
        },
        { status: 400 }
      );
    }

    // Forward command to Server-Authoritative GameEngine
    const engine = getGameEngineForPin(normalizedPin);
    const storedState = await gameStorage.getGameState(normalizedPin);
    if (storedState) {
      engine.initialize(storedState);
    }
    const dispatchResult = engine.dispatch(commandPayload as ServerGameCommand);

    // Persist updated authoritative state to Vercel KV Database
    if (dispatchResult.success && dispatchResult.state) {
      await gameStorage.saveGameState(normalizedPin, dispatchResult.state);
      await realtimePublisher.publishState(normalizedPin, dispatchResult.state);
      await realtimePublisher.publishEvents(normalizedPin, dispatchResult.events);
    }

    // Sanitize response to guarantee no sensitive data exposure
    const publicResult = sanitizeCommandResult(dispatchResult.commandResult);

    const httpStatus = publicResult.success ? 200 : 400;
    return NextResponse.json(publicResult, { status: httpStatus });
  } catch (error: any) {
    return NextResponse.json<CommandResult>(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message || 'An unexpected error occurred while processing command.',
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { pin: string } }
) {
  try {
    const { pin } = await Promise.resolve(params);
    if (!pin || typeof pin !== 'string') {
      return NextResponse.json<CommandResult>(
        {
          success: false,
          error: {
            code: 'INVALID_GAME_PIN',
            message: 'Game PIN is required.',
          },
        },
        { status: 400 }
      );
    }

    const normalizedPin = pin.trim().toUpperCase();
    const storedState = await gameStorage.getGameState(normalizedPin);
    const engine = getGameEngineForPin(normalizedPin);
    if (storedState && (!engine.getState() || (storedState.version || 0) > (engine.getState()?.version || 0))) {
      engine.initialize(storedState);
    }

    // Serverless-friendly phase expiry check: advances countdown / question phase automatically
    if (engine.isPhaseExpired()) {
      engine.handlePhaseTimeout();
      const updated = engine.getState();
      if (updated) {
        await gameStorage.saveGameState(normalizedPin, updated);
      }
    }

    const state = engine.getState() || storedState;
    const publicState = state ? toPublicGameState(state) : null;

    return NextResponse.json({
      success: true,
      data: {
        gameState: publicState,
      },
    });
  } catch (error: any) {
    return NextResponse.json<CommandResult>(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message || 'Failed to fetch game state.',
        },
      },
      { status: 500 }
    );
  }
}

