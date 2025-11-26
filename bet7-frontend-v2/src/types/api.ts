/**
 * Types pour les réponses de l'API
 */

export interface ApiTime {
  elapsed: number | null;
  short: string;
  long: string;
  date?: string;
}

export interface ApiLeague {
  id: number;
  name: string;
  country: string;
  flag?: string;
}

export interface ApiTeams {
  home: string;
  away: string;
  logoHome?: string;
  logoAway?: string;
}

export interface ApiScore {
  home?: number;
  away?: number;
}

export interface ApiGoals {
  home?: number;
  away?: number;
}

export interface ApiMarketValue {
  label: string;
  odd: number | string;
  value?: string;
  suspended?: boolean; // Indique si la cote est suspendue (true = locked)
  handicap?: string | number; // Ligne/handicap pour les marchés Over/Under Line (ex: "1.5", "2", "2.25")
  main?: boolean; // Indique si c'est la cote principale (pour les marchés Over/Under Line)
}

export interface ApiMarket {
  id?: number;
  market?: string; // Ancien format
  name?: string; // Nouveau format de l'API
  values: ApiMarketValue[];
}

export interface ApiBookmaker {
  name: string;
  avgOdd?: number;
  markets: ApiMarket[];
}

export interface ApiFixture {
  id: number;
  date?: string;
  venue?: {
    name: string;
  };
  referee?: string;
}

export interface ApiMatchResponse {
  fixtureId?: number;
  fixture?:
    | ApiFixture
    | {
        id: number;
        date?: string;
        status?: {
          short: string;
          elapsed: number;
          long?: string;
        };
        score?: {
          home: number;
          away: number;
        };
      };
  status?: string;
  time?: ApiTime;
  date?: string;
  fixtureDate?: string;
  league?: ApiLeague;
  teams?:
    | ApiTeams
    | {
        home: string | { id: number; name: string };
        away: string | { id: number; name: string };
      };
  score?: ApiScore;
  goals?: ApiGoals;

  // NOUVEAU: Format simple de l'API
  // L'API retourne un objet odds qui contient un tableau de marchés
  odds?:
    | ApiMarket[]
    | {
        odds?: ApiMarket[]; // Tableau de marchés dans l'objet odds
        fixture?: any;
        league?: any;
        teams?: any;
        status?: any;
        update?: string;
        source?: string;
        isLive?: boolean;
      };
  source?: string; // "bet365", "1xbet", etc.

  // Formats existants (pour compatibilité)
  bestBookmaker?: ApiBookmaker;
  optimizedOdds?: any; // Nouveau format de cotes optimisées
  markets?: ApiMarket[]; // Marchés formatés pour l'affichage
}

export interface ApiResponse<T> {
  success: boolean;
  count?: number;
  data: T;
  message?: string;
  error?: string;
  status?: number;
}

export interface OddsComparison {
  fixtureId: number;
  bookmaker: string;
  hasChanges: boolean;
  changesCount: number;
  changes: Array<{
    market: string;
    label: string;
    oldOdd: number | null;
    newOdd: number | null;
    difference: string;
    percentChange: number;
    direction: "up" | "down" | "new" | "removed";
    significance:
      | "major"
      | "significant"
      | "moderate"
      | "minor"
      | "new"
      | "removed";
  }>;
  summary: string;
}

export interface OddsChangesSummary {
  totalFixturesWithChanges: number;
  totalChanges: number;
}

// Types pour les détails d'un match
export interface MatchDetailsFixture {
  id: number;
  date: string;
  timestamp: number;
  timezone: string;
  venue: {
    id: number;
    name: string;
    city: string;
  } | null;
  referee: string | null;
  status: {
    long: string;
    short: string;
    elapsed: number | null;
    seconds?: string | null; // Format "MM:SS" depuis le socket
  };
}

export interface MatchDetailsLeague {
  id: number;
  name: string;
  country: string;
  logo: string | null;
  flag: string | null;
  season: number;
  round: string | null;
}

export interface MatchDetailsTeam {
  id: number;
  name: string;
  logo: string | null;
  winner: boolean | null;
}

export interface MatchDetailsScore {
  halftime: { home: number | null; away: number | null } | null;
  fulltime: { home: number | null; away: number | null } | null;
  extratime: { home: number | null; away: number | null } | null;
  penalty: { home: number | null; away: number | null } | null;
}

export interface MatchDetailsStatistic {
  team: {
    id: number;
    name: string;
    logo: string | null;
  };
  statistics: Array<{
    type: string;
    value: number | string | null;
  }>;
}

export interface MatchDetailsEvent {
  time: {
    elapsed: number;
    extra: number | null;
  };
  team: {
    id: number;
    name: string;
    logo: string | null;
  };
  player: {
    id: number;
    name: string;
  };
  assist: {
    id: number | null;
    name: string | null;
  } | null;
  type: string;
  detail: string;
  comments: string | null;
}

export interface MatchDetailsLineup {
  team: {
    id: number;
    name: string;
    logo: string | null;
    colors: {
      player: {
        primary: string | null;
        number: string | null;
        border: string | null;
      } | null;
      goalkeeper: {
        primary: string | null;
        number: string | null;
        border: string | null;
      } | null;
    } | null;
  };
  coach: {
    id: number;
    name: string;
    photo: string | null;
  };
  formation: string | null;
  startXI: Array<{
    player: {
      id: number;
      name: string;
      number: number;
      pos: string;
      grid: string | null;
    };
  }>;
  substitutes: Array<{
    player: {
      id: number;
      name: string;
      number: number;
      pos: string;
      grid: string | null;
    };
  }>;
}

export interface MatchDetailsPlayer {
  team: {
    id: number;
    name: string;
    logo: string | null;
  };
  players: Array<{
    player: {
      id: number;
      name: string;
      photo: string | null;
    };
    statistics: Array<{
      games: {
        minutes: number | null;
        number: number | null;
        position: string | null;
        rating: string | null;
        captain: boolean;
        substitute: boolean;
      };
      offsides: number | null;
      shots: {
        total: number | null;
        on: number | null;
      };
      goals: {
        total: number | null;
        conceded: number | null;
        assists: number | null;
        saves: number | null;
      };
      passes: {
        total: number | null;
        key: number | null;
        accuracy: string | null;
      };
      tackles: {
        total: number | null;
        blocks: number | null;
        interceptions: number | null;
      };
      duels: {
        total: number | null;
        won: number | null;
      };
      dribbles: {
        attempts: number | null;
        success: number | null;
        past: number | null;
      };
      fouls: {
        drawn: number | null;
        committed: number | null;
      };
      cards: {
        yellow: number | null;
        red: number | null;
      };
      penalty: {
        won: number | null;
        commited: number | null;
        scored: number | null;
        missed: number | null;
        saved: number | null;
      };
    }>;
  }>;
}

export interface MatchDetailsHeadToHead {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    periods: {
      first: number | null;
      second: number | null;
    };
    venue: {
      id: number;
      name: string;
      city: string;
    };
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string | null;
    flag: string | null;
    season: number;
    round: string | null;
  };
  teams: {
    home: MatchDetailsTeam;
    away: MatchDetailsTeam;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: MatchDetailsScore;
}

export interface MatchDetailsSidelined {
  team: {
    id: number;
    name: string;
    logo: string | null;
  };
  players: Array<{
    player: {
      id: number;
      name: string;
      photo: string | null;
    };
    type: string;
    reason: string;
  }>;
}

export interface MatchDetails {
  fixture: MatchDetailsFixture;
  league: MatchDetailsLeague;
  teams: {
    home: MatchDetailsTeam;
    away: MatchDetailsTeam;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: MatchDetailsScore;
  statistics: MatchDetailsStatistic[] | null;
  events: MatchDetailsEvent[] | null;
  lineups: MatchDetailsLineup[] | null;
  players: MatchDetailsPlayer[] | null;
  odds: any | null; // Utiliser le même format que les odds des matchs
  headToHead: MatchDetailsHeadToHead[] | null;
  sidelined: MatchDetailsSidelined[] | null;
  isLive: boolean;
}
