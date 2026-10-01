/**
 * Transport Factory & Exports
 * Single entry point for GameStateTransport implementations
 */

import {
  GameStateTransport,
  TransportConfig,
  TransportFactory,
  TRANSPORT_TYPES,
  createTransportKey,
} from './GameStateTransport';

export type {
  GameStateTransport,
  TransportConfig,
  TransportFactory,
  TRANSPORT_TYPES,
  createTransportKey,
} from './GameStateTransport';

import { MockTransport, mockTransport } from './MockTransport';
import { ProductionTransport, createProductionTransport, canUseProductionTransport } from './ProductionTransport';

export { MockTransport, mockTransport };
export { ProductionTransport, createProductionTransport, canUseProductionTransport };

// Re-export types for convenience
export type {
  TransportType,
  TransportState,
} from '@/domain/types';

// Environment-based transport selection
export function getDefaultTransportConfig(): TransportConfig {
  const env = process.env.NEXT_PUBLIC_TRANSPORT_TYPE || 'mock';

  switch (env) {
    case 'production':
      return {
        type: TRANSPORT_TYPES.PRODUCTION,
        productionApiUrl: process.env.NEXT_PUBLIC_GAME_LOGIC_URL,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      };
    case 'dev-server':
      return {
        type: TRANSPORT_TYPES.DEV_SERVER,
        devServerUrl: process.env.NEXT_PUBLIC_DEV_SERVER_URL || 'http://localhost:3001',
      };
    default:
      return { type: TRANSPORT_TYPES.MOCK };
  }
}

export function createTransport(config: TransportConfig): GameStateTransport {
  switch (config.type) {
    case TRANSPORT_TYPES.MOCK:
      return mockTransport as GameStateTransport;

    case TRANSPORT_TYPES.DEV_SERVER:
      throw new Error('DevServerTransport not implemented yet (Phase 1)');

    case TRANSPORT_TYPES.PRODUCTION:
      if (!canUseProductionTransport()) {
        throw new Error(
          'Supabase credentials not configured. ' +
          'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
        );
      }
      return createProductionTransport(config) as GameStateTransport;

    default:
      throw new Error(`Unknown transport type: ${config.type}`);
  }
}