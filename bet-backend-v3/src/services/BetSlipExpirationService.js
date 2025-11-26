import cron from "node-cron";
import { logger } from "../config/logger.js";
import BetSlip from "../models/BetSlip.js";

class BetSlipExpirationService {
  constructor() {
    this.job = null;
  }

  /**
   * Démarre le service d'expiration automatique
   * Exécute la tâche toutes les heures
   */
  start() {
    // Exécuter toutes les heures à la minute 0
    this.job = cron.schedule("0 * * * *", async () => {
      await this.cleanExpired();
    });

    // Exécuter aussi au démarrage
    this.cleanExpired();

    logger.info("✅ BetSlip expiration service started");
  }

  /**
   * Arrête le service d'expiration
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info("BetSlip expiration service stopped");
    }
  }

  /**
   * Nettoie les tickets expirés
   */
  async cleanExpired() {
    try {
      const result = await BetSlip.cleanExpired();
      const updatedCount = result.modifiedCount || 0;

      if (updatedCount > 0) {
        logger.info(`🧹 ${updatedCount} ticket(s) marqué(s) comme expiré(s)`);
      }
    } catch (error) {
      logger.error("Erreur lors du nettoyage des tickets expirés:", error);
    }
  }

  /**
   * Nettoie manuellement les tickets expirés
   * Utile pour les tests ou le nettoyage ponctuel
   */
  async manualClean() {
    return await this.cleanExpired();
  }
}

export default new BetSlipExpirationService();

