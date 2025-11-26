/**
 * Utilitaire de logging pour BetSlip
 * Permet de filtrer et visualiser les logs liés au BetSlip
 */

const BETSLIP_LOG_PREFIX = "[BetSlip]";

export const betslipLogger = {
  /**
   * Log un événement BetSlip
   */
  log: (message: string, data?: any) => {
    // Logs désactivés
  },

  /**
   * Log un warning BetSlip
   */
  warn: (message: string, data?: any) => {
    // Logs désactivés
  },

  /**
   * Log une erreur BetSlip
   */
  error: (message: string, data?: any) => {
    console.error(`${BETSLIP_LOG_PREFIX} ❌ ${message}`, data || "");
  },

  /**
   * Log un succès BetSlip
   */
  success: (message: string, data?: any) => {
    // Logs désactivés
  },

  /**
   * Log un clic sur une cote
   */
  click: (data: any) => {
    // Logs désactivés
  },

  /**
   * Log la création d'un bet
   */
  betCreated: (bet: any) => {
    // Logs désactivés
  },

  /**
   * Log l'ajout d'un bet
   */
  betAdded: (bet: any, total: number) => {
    // Logs désactivés
  },

  /**
   * Log les bets actuels
   */
  currentBets: (bets: any[]) => {
    // Logs désactivés
  },
};

/**
 * Instructions pour filtrer les logs dans la console du navigateur
 */
export const BETSLIP_FILTER_INSTRUCTIONS = `
🔍 FILTRES DE CONSOLE POUR BETSLIP:

1. Dans la console Chrome/Edge:
   - Tapez dans le filtre: [BetSlip]
   - Ou utilisez: -[BetSlip] pour exclure les autres logs

2. Filtres spécifiques:
   - [BetSlip] 🖱️  → Voir uniquement les clics
   - [BetSlip] 🎯  → Voir uniquement les créations de bet
   - [BetSlip] ✅  → Voir uniquement les succès
   - [BetSlip] ⚠️  → Voir uniquement les warnings
   - [BetSlip] ❌  → Voir uniquement les erreurs
   - [BetSlip] 📋  → Voir uniquement les états des bets

3. Combinaisons:
   - [BetSlip] 🖱️|🎯|✅  → Voir clics, créations et succès
   - [BetSlip] -⚠️       → Voir tout sauf les warnings

4. Pour Firefox:
   - Utilisez le filtre de recherche avec: [BetSlip]
`;

// Instructions désactivées
