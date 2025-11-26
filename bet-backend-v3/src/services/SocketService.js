import { Server } from "socket.io";
import { logger } from "../config/logger.js";
import { config } from "../config/index.js";

class SocketService {
  constructor() {
    this.io = null;
    this.connectedClients = 0;
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: config.cors.origin || "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.io.on("connection", (socket) => {
      this.connectedClients++;
      logger.info(
        `Socket client connected: ${socket.id} (Total: ${this.connectedClients})`
      );

      socket.on("disconnect", () => {
        this.connectedClients--;
        logger.info(
          `Socket client disconnected: ${socket.id} (Total: ${this.connectedClients})`
        );
      });

      socket.on("subscribe:fixture", (data) => {
        const fixtureId = typeof data === "object" ? data.fixtureId : data;
        socket.join(`fixture:${fixtureId}`);
        logger.info(`Client ${socket.id} subscribed to fixture ${fixtureId}`);
      });

      socket.on("unsubscribe:fixture", (data) => {
        const fixtureId = typeof data === "object" ? data.fixtureId : data;
        socket.leave(`fixture:${fixtureId}`);
        logger.info(
          `Client ${socket.id} unsubscribed from fixture ${fixtureId}`
        );
      });

      socket.on("subscribe:live", () => {
        socket.join("live:matches");
      });

      socket.on("unsubscribe:live", () => {
        socket.leave("live:matches");
      });
    });

    logger.info("✅ Socket.io initialized");
    return this.io;
  }

  emitOddsUpdate(fixtureId, update) {
    if (!this.io) {
      logger.warn("Socket.io not initialized, cannot emit odds update");
      return;
    }

    const eventData = {
      fixtureId,
      timestamp: new Date().toISOString(),
      ...update,
    };

    this.io.to(`fixture:${fixtureId}`).emit("oddsUpdate", eventData);
    this.io.to("live:matches").emit("oddsUpdate", eventData);
  }

  emitFixtureUpdate(fixtureId, fixtureData) {
    if (!this.io) {
      logger.warn("Socket.io not initialized, cannot emit fixture update");
      return;
    }

    const eventData = {
      fixtureId,
      timestamp: new Date().toISOString(),
      ...fixtureData,
    };

    this.io.to(`fixture:${fixtureId}`).emit("fixtureUpdate", eventData);
    this.io.to("live:matches").emit("fixtureUpdate", eventData);
  }

  emit(event, data) {
    if (!this.io) {
      logger.warn("Socket.io not initialized, cannot emit event");
      return;
    }

    this.io.emit(event, data);
  }
}

export default new SocketService();
