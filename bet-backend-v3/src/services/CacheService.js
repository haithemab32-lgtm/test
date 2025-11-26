import { createClient } from "redis";
import { gzipSync, gunzipSync } from "zlib";
import { config } from "../config/index.js";
import { logger } from "../config/logger.js";
import { CacheError } from "../utils/errors.js";

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      errors: 0,
    };
  }

  async connect() {
    try {
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error("Redis: Max reconnection attempts reached");
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },
        password: config.redis.password,
      });

      this.client.on("error", (err) => {
        logger.error(`Redis Client Error: ${err.message}`);
        this.isConnected = false;
        this.stats.errors++;
      });

      this.client.on("connect", () => {
        logger.info("Redis: Connecting...");
      });

      this.client.on("ready", () => {
        logger.info("Redis: Connected and ready");
        this.isConnected = true;
        this.configureRedisSettings();
      });

      this.client.on("end", () => {
        logger.warn("Redis: Connection ended");
        this.isConnected = false;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      logger.error(`Redis connection failed: ${error.message}`);
      this.isConnected = false;
      throw new CacheError(`Failed to connect to Redis: ${error.message}`);
    }
  }

  async configureRedisSettings() {
    try {
      await this.client.configSet("maxmemory-policy", "allkeys-lru");

      if (config.redis.maxMemory) {
        let maxMemoryBytes = config.redis.maxMemory;
        if (typeof maxMemoryBytes === "string") {
          const match = maxMemoryBytes.match(/^(\d+)([kmg]?b?)$/i);
          if (match) {
            const value = parseInt(match[1], 10);
            const unit = match[2].toLowerCase();
            const multipliers = {
              b: 1,
              kb: 1024,
              mb: 1024 * 1024,
              gb: 1024 * 1024 * 1024,
            };
            maxMemoryBytes = value * (multipliers[unit] || 1);
          }
        }
        await this.client.configSet("maxmemory", maxMemoryBytes.toString());
      }

      logger.info("Redis settings configured");
    } catch (error) {
      logger.warn(`Failed to configure Redis settings: ${error.message}`);
    }
  }

  async get(key) {
    if (!this.isConnected || !this.client) {
      this.stats.misses++;
      return null;
    }

    try {
      const value = await this.client.get(key);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;

      if (value.startsWith("gz:")) {
        const compressed = Buffer.from(value.slice(3), "base64");
        const decompressed = gunzipSync(compressed);
        return JSON.parse(decompressed.toString());
      }

      return JSON.parse(value);
    } catch (error) {
      logger.error(`Cache get error for key ${key}: ${error.message}`);
      this.stats.errors++;
      this.stats.misses++;
      return null;
    }
  }

  async set(key, value, ttlSeconds = null) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      let serialized = JSON.stringify(value);

      if (serialized.length > config.redis.compressionThreshold) {
        const compressed = gzipSync(serialized);
        const compressedSize = compressed.length;
        const originalSize = serialized.length;

        if (compressedSize < originalSize * 0.9) {
          serialized = "gz:" + compressed.toString("base64");
        }
      }

      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}: ${error.message}`);
      this.stats.errors++;
      return false;
    }
  }

  async delete(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}: ${error.message}`);
      return false;
    }
  }

  async getKeys(pattern) {
    if (!this.isConnected || !this.client) {
      return [];
    }

    try {
      const keys = [];
      for await (const key of this.client.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      })) {
        keys.push(key);
      }
      return keys;
    } catch (error) {
      logger.error(`Cache getKeys error for ${pattern}: ${error.message}`);
      return [];
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate:
        total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + "%" : "0%",
      totalRequests: total,
    };
  }

  isAvailable() {
    return this.isConnected && this.client !== null;
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info("Redis: Disconnected");
    }
  }

  generateKey(prefix, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join("|");

    return sortedParams ? `${prefix}|${sortedParams}` : prefix;
  }
}

export default new CacheService();
