import type {
  AirlineId,
  AccountId,
  AirportCode,
  CountryCode,
  Instant,
  Money,
  WorldId,
} from '@airline/shared';

export const BUSINESS_MODELS = ['lowcost', 'fullservice', 'regional', 'charter'] as const;
export type BusinessModel = (typeof BUSINESS_MODELS)[number];

/** Quién toma las decisiones de la compañía. No altera ninguna regla (ADR-003). */
export const AIRLINE_CONTROLLERS = ['player', 'npc'] as const;
export type AirlineController = (typeof AIRLINE_CONTROLLERS)[number];

export const NPC_STRATEGIES = [
  'lowcost',
  'premium',
  'regional',
  'hub_and_spoke',
  'point_to_point',
  'conservative',
  'aggressive',
] as const;
export type NpcStrategy = (typeof NPC_STRATEGIES)[number];

export interface Airline {
  readonly id: AirlineId;
  readonly worldId: WorldId;
  /** Nulo en las compañías artificiales: no pertenecen a ninguna cuenta. */
  readonly accountId: AccountId | null;

  readonly name: string;
  readonly iataCode: string;
  readonly icaoCode: string;
  readonly country: CountryCode;
  readonly hub: AirportCode;
  readonly businessModel: BusinessModel;

  readonly controller: AirlineController;
  readonly npcStrategy: NpcStrategy | null;

  /** Saldo materializado. La verdad es la suma del ledger (ADR-007). */
  readonly cash: Money;
  readonly reputation: number;
  readonly onTimeRate: number;
  readonly foundedAt: Instant;
  readonly isActive: boolean;
}
