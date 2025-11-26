/**
 * Configuration centralisée pour les appels API
 * Backend v2 - Architecture modulaire
 */

// Vite utilise import.meta.env au lieu de process.env
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const API_ENDPOINTS = {
  /**
   * Matchs en direct
   * GET /api/live-matches
   */
  LIVE_MATCHES: () => {
    return `${API_BASE_URL}/api/live-matches`;
  },
  /**
   * Statistiques des matchs en direct
   * GET /api/live-matches/stats
   */
  LIVE_MATCHES_STATS: () => {
    return `${API_BASE_URL}/api/live-matches/stats`;
  },
  /**
   * Matchs à venir
   * GET /api/upcoming-matches
   * Query params: leagueId (optionnel), limit (optionnel)
   */
  UPCOMING_MATCHES: (leagueId?: number, limit?: number) => {
    const base = `${API_BASE_URL}/api/upcoming-matches`;
    const params = new URLSearchParams();
    if (leagueId) params.append("leagueId", leagueId.toString());
    if (limit !== undefined) params.append("limit", limit.toString());
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
  },
  /**
   * Matchs dans les prochaines heures
   * GET /api/upcoming-matches/in-hours
   * Query params: hours (défaut: 8), limit (optionnel)
   */
  UPCOMING_MATCHES_IN_HOURS: (hours?: number, limit?: number) => {
    const base = `${API_BASE_URL}/api/upcoming-matches/in-hours`;
    const params = new URLSearchParams();
    if (hours !== undefined) params.append("hours", hours.toString());
    if (limit !== undefined) params.append("limit", limit.toString());
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
  },
  /**
   * Matchs pour une date spécifique
   * GET /api/daily-matches
   * Query params: start (requis, YYYY-MM-DD), end (optionnel), leagueId (optionnel), season (optionnel)
   */
  DAILY_MATCHES: (
    date: string,
    endDate?: string,
    leagueId?: number,
    season?: number
  ) => {
    const base = `${API_BASE_URL}/api/daily-matches`;
    const params = new URLSearchParams();
    params.append("start", date);
    if (endDate) params.append("end", endDate);
    if (leagueId) params.append("leagueId", leagueId.toString());
    if (season) params.append("season", season.toString());
    return `${base}?${params.toString()}`;
  },
  /**
   * Matchs pour une ligue spécifique
   * GET /api/league-matches
   * Query params: leagueId (requis), season (optionnel), next (défaut: 10)
   */
  LEAGUE_MATCHES: (leagueId: number, season?: number, next?: number) => {
    const base = `${API_BASE_URL}/api/league-matches`;
    const params = new URLSearchParams();
    params.append("leagueId", leagueId.toString());
    if (season) params.append("season", season.toString());
    if (next !== undefined) params.append("next", next.toString());
    return `${base}?${params.toString()}`;
  },
  /**
   * Sauvegarder un BetSlip
   * POST /api/betslip/save
   */
  BETSLIP_SAVE: () => {
    return `${API_BASE_URL}/api/betslip/save`;
  },
  /**
   * Récupérer un BetSlip par code
   * GET /api/betslip/:code
   */
  BETSLIP_GET: (code: string) => {
    return `${API_BASE_URL}/api/betslip/${code}`;
  },
  /**
   * Valider un BetSlip
   * POST /api/betslip/validate
   */
  BETSLIP_VALIDATE: () => {
    return `${API_BASE_URL}/api/betslip/validate`;
  },
  /**
   * Détails d'un match
   * GET /api/match-details/:fixtureId
   */
  MATCH_DETAILS: (fixtureId: number) => {
    return `${API_BASE_URL}/api/match-details/${fixtureId}`;
  },
} as const;

export const SOCKET_CONFIG = {
  URL: SOCKET_URL,
  OPTIONS: {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  },
};

export default API_ENDPOINTS;
