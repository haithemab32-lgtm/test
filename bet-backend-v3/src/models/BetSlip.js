import mongoose from "mongoose";
import { config } from "../config/index.js";

const betSchema = new mongoose.Schema(
  {
    fixtureId: {
      type: Number,
      required: true,
    },
    market: {
      type: String,
      required: true,
    },
    selection: {
      type: String,
      required: true,
    },
    odd: {
      type: Number,
      required: true,
    },
    bookmaker: {
      type: String,
      default: null,
    },
    handicap: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const betSlipSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    bets: {
      type: [betSchema],
      required: true,
      validate: {
        validator: (bets) => bets.length > 0,
        message: "Le ticket doit contenir au moins un pari",
      },
    },
    status: {
      type: String,
      enum: ["active", "expired", "used"],
      default: "active",
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index composé pour les requêtes fréquentes
betSlipSchema.index({ code: 1, status: 1 });
betSlipSchema.index({ expiresAt: 1, status: 1 });

// Middleware pre-save : générer expiresAt si non défini
betSlipSchema.pre("save", function (next) {
  if (!this.expiresAt && this.createdAt) {
    const expirationHours = config.betslip.expirationHours || 24;
    this.expiresAt = new Date(
      this.createdAt.getTime() + expirationHours * 60 * 60 * 1000
    );
  }
  next();
});

// Méthode pour vérifier si le ticket est expiré
betSlipSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt || this.status === "expired";
};

// Méthode pour marquer comme expiré
betSlipSchema.methods.markAsExpired = async function () {
  if (this.status === "active") {
    this.status = "expired";
    await this.save();
  }
};

// Méthode statique pour nettoyer les tickets expirés
betSlipSchema.statics.cleanExpired = async function () {
  const now = new Date();
  const result = await this.updateMany(
    {
      $or: [{ expiresAt: { $lt: now } }, { status: "expired" }],
    },
    {
      $set: { status: "expired" },
    }
  );
  return result;
};

const BetSlip = mongoose.model("BetSlip", betSlipSchema);

export default BetSlip;

