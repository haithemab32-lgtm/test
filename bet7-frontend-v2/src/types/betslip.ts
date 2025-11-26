/**
 * Types pour l'API BetSlip
 */

export interface Bet {
  fixtureId: number;
  market: string;
  selection: string;
  odd: number;
  bookmaker?: string;
  handicap?: string | null;
  timestamp?: string;
  // Informations supplémentaires pour l'affichage
  homeTeam?: string;
  awayTeam?: string;
  leagueName?: string;
}

export interface BetSlip {
  code: string;
  userId?: string;
  bets: Bet[];
  status: "active" | "expired" | "used";
  createdAt: string;
  expiresAt: string;
}

export interface MatchInfo {
  fixtureId: number;
  isLive: boolean;
  status: {
    short: string;
    long: string;
    elapsed: number | null;
  };
  score: {
    home: number;
    away: number;
  } | null;
  teams: {
    home: {
      id: number;
      name: string;
      logo: string | null;
    };
    away: {
      id: number;
      name: string;
      logo: string | null;
    };
  } | null;
  league: {
    id: number;
    name: string;
    country: string;
  } | null;
}

/**
 * Codes de validation retournés par le backend
 */
export type ValidationCode =
  | "ACCEPTED"
  | "REJECTED_MATCH_FINISHED"
  | "REJECTED_MATCH_CANCELLED"
  | "REJECTED_MATCH_POSTPONED"
  | "REJECTED_MARKET_CLOSED"
  | "REJECTED_MARKET_SUSPENDED"
  | "ODDS_CHANGED"
  | "REJECTED_CRITICAL_EVENT"
  | "REJECTED_LIVE_DELAY"
  | "REJECTED_TICKET_EXPIRED"
  | "ERROR";

export interface BetSlipValidationResponse {
  valid: boolean;
  code?: ValidationCode;
  message: string;
  changes: Array<{
    fixtureId: number;
    market: string;
    selection: string;
    handicap: string | null;
    oldOdd: number;
    newOdd: number;
    changePercent: string;
    code?: ValidationCode;
  }>;
  closed: Array<{
    fixtureId: number;
    market: string;
    selection: string;
    message: string;
    code?: ValidationCode;
  }>;
  rejected?: Array<{
    fixtureId: number;
    market?: string;
    selection?: string;
    code: ValidationCode;
    message: string;
    status?: any;
    lockUntil?: string;
  }>;
  errors: Array<{
    fixtureId: number;
    error: string;
    code?: ValidationCode;
  }>;
  matchInfo?: Record<string, MatchInfo>; // Clé = fixtureId (string)
}

export interface BetSlipSaveResponse {
  code: string;
  expiresAt: string;
  createdAt: string;
}
