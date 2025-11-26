/**
 * Tests pour la validation du BetSlip
 *
 * Pour exécuter: npm test ou node tests/betslip-validation.test.js
 */

import betSlipService, {
  VALIDATION_CODES,
} from "../src/services/BetSlipService.js";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

// Mock des services
jest.mock("../src/services/ApiFootballService.js");
jest.mock("../src/services/CacheService.js");

describe("BetSlip Validation", () => {
  describe("Vérification du statut du match", () => {
    it("devrait rejeter un pari sur un match terminé (FT)", async () => {
      const bets = [
        {
          fixtureId: 123456,
          market: "Match Winner",
          selection: "Home",
          odd: 1.5,
        },
      ];

      // Mock: Match terminé
      mockFixtureStatus(123456, { short: "FT", long: "Match Finished" });

      const result = await betSlipService.validateOdds(bets);

      expect(result.valid).toBe(false);
      expect(result.code).toBe(VALIDATION_CODES.REJECTED_MATCH_FINISHED);
      expect(result.rejected.length).toBeGreaterThan(0);
      expect(result.rejected[0].code).toBe(
        VALIDATION_CODES.REJECTED_MATCH_FINISHED
      );
    });

    it("devrait rejeter un pari sur un match annulé (CANC)", async () => {
      const bets = [
        {
          fixtureId: 123457,
          market: "Match Winner",
          selection: "Home",
          odd: 1.5,
        },
      ];

      mockFixtureStatus(123457, { short: "CANC", long: "Cancelled" });

      const result = await betSlipService.validateOdds(bets);

      expect(result.valid).toBe(false);
      expect(result.code).toBe(VALIDATION_CODES.REJECTED_MATCH_CANCELLED);
    });

    it("devrait rejeter un pari sur un match reporté (PST)", async () => {
      const bets = [
        {
          fixtureId: 123458,
          market: "Match Winner",
          selection: "Home",
          odd: 1.5,
        },
      ];

      mockFixtureStatus(123458, { short: "PST", long: "Postponed" });

      const result = await betSlipService.validateOdds(bets);

      expect(result.valid).toBe(false);
      expect(result.code).toBe(VALIDATION_CODES.REJECTED_MATCH_POSTPONED);
    });

    it("devrait accepter un pari sur un match non commencé (NS)", async () => {
      const bets = [
        {
          fixtureId: 123459,
          market: "Match Winner",
          selection: "Home",
          odd: 1.5,
        },
      ];

      mockFixtureStatus(123459, { short: "NS", long: "Not Started" });
      mockOdds(123459, {
        "Match Winner": {
          values: [{ value: "Home", odd: 1.5, suspended: false }],
        },
      });

      const result = await betSlipService.validateOdds(bets);

      expect(result.valid).toBe(true);
      expect(result.code).toBe(VALIDATION_CODES.ACCEPTED);
    });
  });

  describe("Vérification des marchés", () => {
    it("devrait rejeter un pari sur un marché fermé", async () => {
      const bets = [
        {
          fixtureId: 123460,
          market: "Total Goals",
          selection: "Over 2.5",
          odd: 1.8,
        },
      ];

      mockFixtureStatus(123460, { short: "NS" });
      mockOdds(123460, {
        "Match Winner": {
          values: [{ value: "Home", odd: 1.5, suspended: false }],
        },
        // Total Goals n'existe pas = marché fermé
      });

      const result = await betSlipService.validateOdds(bets);

      expect(result.valid).toBe(false);
      expect(result.closed.length).toBeGreaterThan(0);
      expect(result.closed[0].code).toBe(
        VALIDATION_CODES.REJECTED_MARKET_CLOSED
      );
    });

    it("devrait rejeter un pari sur un marché suspendu", async () => {
      const bets = [
        {
          fixtureId: 123461,
          market: "Match Winner",
          selection: "Home",
          odd: 1.5,
        },
      ];

      mockFixtureStatus(123461, { short: "NS" });
      mockOdds(123461, {
        "Match Winner": {
          suspended: true, // Marché suspendu
          values: [{ value: "Home", odd: 1.5, suspended: false }],
        },
      });

      const result = await betSlipService.validateOdds(bets);

      expect(result.valid).toBe(false);
      expect(result.closed.length).toBeGreaterThan(0);
      expect(result.closed[0].code).toBe(
        VALIDATION_CODES.REJECTED_MARKET_SUSPENDED
      );
    });
  });

  describe("Comparaison des cotes", () => {
    it("devrait détecter un changement de cote significatif", async () => {
      const bets = [
        {
          fixtureId: 123462,
          market: "Match Winner",
          selection: "Home",
          odd: 1.5, // Cote originale
        },
      ];

      mockFixtureStatus(123462, { short: "NS" });
      mockOdds(123462, {
        "Match Winner": {
          values: [{ value: "Home", odd: 1.6, suspended: false }], // Cote actuelle
        },
      });

      const result = await betSlipService.validateOdds(bets);

      expect(result.valid).toBe(false);
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.changes[0].code).toBe(VALIDATION_CODES.ODDS_CHANGED);
      expect(result.changes[0].oldOdd).toBe(1.5);
      expect(result.changes[0].newOdd).toBe(1.6);
    });

    it("devrait accepter un changement de cote dans la tolérance", async () => {
      const bets = [
        {
          fixtureId: 123463,
          market: "Match Winner",
          selection: "Home",
          odd: 1.5,
        },
      ];

      mockFixtureStatus(123463, { short: "NS" });
      mockOdds(123463, {
        "Match Winner": {
          values: [{ value: "Home", odd: 1.505, suspended: false }], // Différence < 0.01
        },
      });

      const result = await betSlipService.validateOdds(bets);

      expect(result.valid).toBe(true);
      expect(result.changes.length).toBe(0);
    });
  });

  describe("Événements critiques", () => {
    it("devrait bloquer un pari après un but récent", async () => {
      const bets = [
        {
          fixtureId: 123464,
          market: "Match Winner",
          selection: "Home",
          odd: 1.5,
        },
      ];

      mockFixtureStatus(123464, { short: "LIVE", elapsed: 45 });
      mockOdds(123464, {
        "Match Winner": {
          values: [{ value: "Home", odd: 1.5, suspended: false }],
        },
      });

      // Mock: But récent (il y a 2 secondes)
      mockFixtureEvents(123464, [
        {
          type: "Goal",
          time: { elapsed: 45 },
          team: { id: 1, name: "Team A" },
        },
      ]);

      // Simuler que l'événement vient d'arriver
      const lockKey = `critical_event_lock:123464`;
      await cacheService.set(lockKey, {
        lockUntil: Date.now() + 5000,
        events: [{ type: "Goal", time: { elapsed: 45 } }],
      });

      const result = await betSlipService.validateOdds(bets);

      expect(result.valid).toBe(false);
      expect(result.code).toBe(VALIDATION_CODES.REJECTED_CRITICAL_EVENT);
      expect(result.rejected.length).toBeGreaterThan(0);
      expect(result.rejected[0].code).toBe(
        VALIDATION_CODES.REJECTED_CRITICAL_EVENT
      );
    });
  });

  describe("Expiration des tickets", () => {
    it("devrait rejeter un ticket expiré", async () => {
      const bets = [
        {
          fixtureId: 123465,
          market: "Match Winner",
          selection: "Home",
          odd: 1.5,
        },
      ];

      // Mock: Ticket expiré
      mockExpiredTicket("EXPIRED");

      const result = await betSlipService.validateOdds(bets, {
        code: "EXPIRED",
        checkExpiration: true,
      });

      expect(result.valid).toBe(false);
      expect(result.code).toBe(VALIDATION_CODES.REJECTED_TICKET_EXPIRED);
    });
  });

  describe("Validation complète", () => {
    it("devrait valider un ticket avec plusieurs paris valides", async () => {
      const bets = [
        {
          fixtureId: 123466,
          market: "Match Winner",
          selection: "Home",
          odd: 1.5,
        },
        {
          fixtureId: 123467,
          market: "Total Goals",
          selection: "Over 2.5",
          odd: 1.8,
        },
      ];

      mockFixtureStatus(123466, { short: "NS" });
      mockFixtureStatus(123467, { short: "NS" });
      mockOdds(123466, {
        "Match Winner": {
          values: [{ value: "Home", odd: 1.5, suspended: false }],
        },
      });
      mockOdds(123467, {
        "Total Goals": {
          values: [{ value: "Over 2.5", odd: 1.8, suspended: false }],
        },
      });

      const result = await betSlipService.validateOdds(bets);

      expect(result.valid).toBe(true);
      expect(result.code).toBe(VALIDATION_CODES.ACCEPTED);
      expect(result.changes.length).toBe(0);
      expect(result.closed.length).toBe(0);
      expect(result.rejected.length).toBe(0);
    });

    it("devrait gérer un mélange de paris valides et invalides", async () => {
      const bets = [
        {
          fixtureId: 123468,
          market: "Match Winner",
          selection: "Home",
          odd: 1.5,
        },
        {
          fixtureId: 123469,
          market: "Match Winner",
          selection: "Home",
          odd: 1.5,
        },
      ];

      // Premier match: valide
      mockFixtureStatus(123468, { short: "NS" });
      mockOdds(123468, {
        "Match Winner": {
          values: [{ value: "Home", odd: 1.5, suspended: false }],
        },
      });

      // Deuxième match: terminé
      mockFixtureStatus(123469, { short: "FT" });

      const result = await betSlipService.validateOdds(bets);

      expect(result.valid).toBe(false);
      expect(result.rejected.length).toBeGreaterThan(0);
      expect(result.rejected[0].fixtureId).toBe(123469);
    });
  });
});

// Fonctions helper pour les mocks
function mockFixtureStatus(fixtureId, status) {
  // Mock implementation
}

function mockOdds(fixtureId, odds) {
  // Mock implementation
}

function mockFixtureEvents(fixtureId, events) {
  // Mock implementation
}

function mockExpiredTicket(code) {
  // Mock implementation
}
