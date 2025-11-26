// =========================
// Définition des cotes
// =========================
export interface Odds {
  _1x2: { _1: number | string; X: number | string; _2: number | string };
  doubleChance: {
    _1X: number | string;
    _12: number | string;
    X2: number | string;
  };
  totalGoals: {
    value: string;
    over: number | string;
    under: number | string;
    allLines?: Record<
      string,
      { over: number | string; under: number | string }
    >;
  };
  ggNg: { GG: number | string; NG: number | string };
  pairImpaire: { Pair: number | string; Impaire: number | string };
}

// =========================
// Définition d’un match
// =========================
export interface Match {
  id: string;
  status: string;
  minute?: number;
  time?: {
    elapsed: number;
    short: string;
    long: string;
  };
  date?: string;
  dateTime?: {
    day: string;
    time: string;
  };
  league:
    | {
        id?: number;
        name: string;
        country: string;
        flag: string;
      }
    | string;
  homeTeam: {
    name: string;
    score: number;
  };
  awayTeam: {
    name: string;
    score: number;
  };
  odds: {
    _1x2?: { _1: number | string; X: number | string; _2: number | string };
    doubleChance?: {
      _1X: number | string;
      _12: number | string;
      X2: number | string;
    };
    totalGoals?: {
      value: string;
      over: number | string;
      under: number | string;
      allLines?: Record<
        string,
        { over: number | string; under: number | string }
      >;
    };
    ggNg?: { GG: number | string; NG: number | string };
    pairImpaire?: { Pair: number | string; Impaire: number | string };
    [key: string]: any; // Pour gérer dynamiquement les autres marchés
  };
  bestBookmakerName?: string;
  fixtureDate?: string | null;
  rawMarkets?: any[];
  hasMoreOptions?: boolean;
  venue?: string;
  referee?: string;
  round?: string | null;
  oddsChanges?: Record<string, Record<string, "up" | "down">>; // market -> label -> direction
}
