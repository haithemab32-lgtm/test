import mongoose from "mongoose";
import { config } from "../config/index.js";
import { logger } from "../config/logger.js";

class DatabaseService {
  constructor() {
    this.isConnected = false;
  }

  /**
   * Connecte à MongoDB avec timeout
   */
  async connect() {
    try {
      if (this.isConnected) {
        logger.info("MongoDB déjà connecté");
        return;
      }

      // Timeout de 5 secondes pour éviter de bloquer le démarrage
      const connectPromise = mongoose.connect(
        config.mongodb.uri,
        config.mongodb.options
      );
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("MongoDB connection timeout")), 5000)
      );

      await Promise.race([connectPromise, timeoutPromise]);

      this.isConnected = true;
      logger.info("✅ MongoDB connected successfully");

      // Gestion des événements de connexion
      mongoose.connection.on("error", (error) => {
        logger.error("MongoDB connection error:", error);
        this.isConnected = false;
      });

      mongoose.connection.on("disconnected", () => {
        logger.warn("MongoDB disconnected");
        this.isConnected = false;
      });

      mongoose.connection.on("reconnected", () => {
        logger.info("MongoDB reconnected");
        this.isConnected = true;
      });
    } catch (error) {
      logger.error("Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  /**
   * Déconnecte de MongoDB
   */
  async disconnect() {
    try {
      if (!this.isConnected) {
        return;
      }

      await mongoose.disconnect();
      this.isConnected = false;
      logger.info("MongoDB disconnected");
    } catch (error) {
      logger.error("Error disconnecting from MongoDB:", error);
      throw error;
    }
  }

  /**
   * Vérifie si MongoDB est connecté
   */
  isAvailable() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

export default new DatabaseService();
